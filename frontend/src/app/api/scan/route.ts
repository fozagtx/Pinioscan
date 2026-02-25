import { NextRequest, NextResponse } from 'next/server';
import { fetchAllTokenData } from '@/lib/fetcher';
import { analyzeToken } from '@/lib/analyzer';
import { submitAttestation } from '@/lib/attester';
import { ethers } from 'ethers';
import { checkRateLimit, withSecurityHeaders, sanitizeError } from '@/lib/security';

// Simple in-memory cache (1 hour TTL)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

export async function OPTIONS(req: NextRequest) {
  const res = new NextResponse(null, { status: 204 });
  return withSecurityHeaders(res, req);
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit disabled — enable for production
    // const limited = checkRateLimit(req);
    // if (limited) return withSecurityHeaders(limited, req);

    // Validate content type
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 }),
        req
      );
    }

    const body = await req.text();
    if (body.length > 1024) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'Request too large' }, { status: 413 }),
        req
      );
    }

    const { address } = JSON.parse(body);

    if (!address || !ethers.isAddress(address.toLowerCase())) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'Invalid token address' }, { status: 400 }),
        req
      );
    }

    const normalizedAddress = ethers.getAddress(address.toLowerCase());

    // Check cache
    const cached = cache.get(normalizedAddress);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return withSecurityHeaders(
        NextResponse.json({ ...cached.data, cached: true }),
        req
      );
    }

    // Fetch all on-chain data
    const tokenData = await fetchAllTokenData(normalizedAddress);

    // Run AI analysis
    const report = await analyzeToken(tokenData);

    // Try to submit attestation on Base (non-blocking)
    const contractAddress = process.env.PINIOSCAN_CONTRACT_ADDRESS;
    if (contractAddress && process.env.DEPLOYER_PRIVATE_KEY) {
      try {
        const txHash = await submitAttestation(report, contractAddress);
        report.attestationTx = txHash;
        console.log('Attestation submitted:', txHash);
      } catch (err: any) {
        console.warn('Attestation failed (non-fatal):', err.message);
      }
    }

    // Cache the result
    cache.set(normalizedAddress, { data: report, timestamp: Date.now() });

    return withSecurityHeaders(NextResponse.json(report), req);
  } catch (error: any) {
    console.error('Scan error:', error);
    return withSecurityHeaders(
      NextResponse.json({ error: sanitizeError(error) }, { status: 500 }),
      req
    );
  }
}
