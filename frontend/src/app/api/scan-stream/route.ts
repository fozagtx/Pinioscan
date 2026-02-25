import { NextRequest } from 'next/server';
import { fetchAllTokenData } from '@/lib/fetcher';
import { analyzeToken } from '@/lib/analyzer';
import { submitAttestation } from '@/lib/attester';
import { ethers } from 'ethers';
import { checkRateLimit, withSecurityHeaders, sanitizeError } from '@/lib/security';
import { cacheGet, cacheSet } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req: NextRequest) {
  // Rate limit disabled — enable for production
  // const limited = checkRateLimit(req);
  // if (limited) return withSecurityHeaders(limited, req);

  const address = req.nextUrl.searchParams.get('address');

  if (!address || !ethers.isAddress(address.toLowerCase())) {
    const res = new Response(
      JSON.stringify({ error: 'Invalid token address' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
    return withSecurityHeaders(res, req);
  }

  const normalizedAddress = ethers.getAddress(address.toLowerCase());
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(sseEvent(data)));
      };

      try {
        // Check cache first
        const cacheKey = `scan:${normalizedAddress}`;
        const cached = await cacheGet<Record<string, unknown>>(cacheKey);
        if (cached) {
          send({ status: 'fetching' });
          send({ status: 'fetching_done', tokenName: (cached as any).token?.name || 'Unknown', tokenSymbol: (cached as any).token?.symbol || '???' });
          send({ status: 'analyzing' });
          send({ status: 'analyzing_done' });

          // If cached result has no attestation, submit one now
          const contractAddress = process.env.PINIOSCAN_CONTRACT_ADDRESS?.trim();
          if (!(cached as any).attestationTx && contractAddress && process.env.DEPLOYER_PRIVATE_KEY) {
            send({ status: 'attesting' });
            try {
              const { submitAttestation } = await import('@/lib/attester');
              const txHash = await submitAttestation(cached as any, contractAddress);
              (cached as any).attestationTx = txHash;
              await cacheSet(cacheKey, cached);
            } catch (err: any) {
              console.warn('Attestation for cached result failed (non-fatal):', err.message);
            }
          }

          send({ status: 'complete', data: cached });
          // closed in finally
          return;
        }

        // Phase 1: Fetching
        send({ status: 'fetching' });
        let tokenData;
        try {
          tokenData = await fetchAllTokenData(normalizedAddress);
        } catch (fetchErr: any) {
          console.error('fetchAllTokenData failed:', fetchErr.message);
          send({
            status: 'error',
            error: `Failed to fetch token data for ${normalizedAddress}. The contract may not be a standard ERC20 token, may be self-destructed, or may not exist. (${fetchErr.message?.slice(0, 120) || 'Unknown error'})`,
          });
          // closed in finally
          return;
        }
        send({
          status: 'fetching_done',
          tokenName: tokenData.tokenInfo?.name || 'Unknown',
          tokenSymbol: tokenData.tokenInfo?.symbol || '???',
        });

        // Phase 2: Analyzing
        send({ status: 'analyzing' });
        const report = await analyzeToken(tokenData);
        send({ status: 'analyzing_done' });

        // Phase 3: Attesting
        const contractAddress = process.env.PINIOSCAN_CONTRACT_ADDRESS?.trim();
        if (contractAddress && process.env.DEPLOYER_PRIVATE_KEY) {
          send({ status: 'attesting' });
          try {
            const txHash = await submitAttestation(report, contractAddress);
            report.attestationTx = txHash;
          } catch (err: any) {
            console.warn('Attestation failed (non-fatal):', err.message);
            send({ status: 'attestation_error', error: err.message?.slice(0, 200) });
          }
        } else {
          send({ status: 'attestation_skipped', reason: !contractAddress ? 'no_contract_address' : 'no_deployer_key' });
        }

        // Phase 4: Complete — cache and send
        await cacheSet(`scan:${normalizedAddress}`, report);
        send({ status: 'complete', data: report });
      } catch (err: any) {
        send({ status: 'error', error: sanitizeError(err) });
      } finally {
        try { controller.close(); } catch {}
      }
    },
  });

  const res = new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
  return withSecurityHeaders(res, req);
}
