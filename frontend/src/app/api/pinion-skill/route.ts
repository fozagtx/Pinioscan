import { NextRequest, NextResponse } from 'next/server';
import { fetchAllTokenData } from '@/lib/fetcher';
import { analyzeToken } from '@/lib/analyzer';
import { ethers } from 'ethers';

/**
 * Pinioscan as a Pinion skill — a pay-per-scan x402 endpoint.
 * $0.10 USDC per scan, callable by any developer or AI agent using the Pinion SDK.
 *
 * x402 payment enforcement is applied at the edge/proxy layer using the
 * Pinion facilitator. This handler runs after the payment has been verified.
 *
 * Usage (Pinion SDK):
 *   const pinion = new PinionClient({ privateKey, network: "base" })
 *   const result = await pinion.request("POST", "https://pinioscan.xyz/api/pinion-skill", { address })
 *
 * Or via HTTP (with X-PAYMENT header):
 *   POST /api/pinion-skill
 *   Body: { "address": "0x..." }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 });
    }

    const body = await req.text();
    if (body.length > 1024) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    }

    const { address } = JSON.parse(body);

    if (!address || !ethers.isAddress(address)) {
      return NextResponse.json({ error: 'Invalid Base token address' }, { status: 400 });
    }

    const normalizedAddress = ethers.getAddress(address);
    const tokenData = await fetchAllTokenData(normalizedAddress);
    const report = await analyzeToken(tokenData);

    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Pinion skill error:', error);
    return NextResponse.json(
      { error: error?.message?.slice(0, 200) || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Pinion skill manifest — the Pinion facilitator reads this to know the price.
 * GET /api/pinion-skill → returns x402 payment requirement (402 status).
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      x402Version: 1,
      accepts: [
        {
          scheme: 'exact',
          network: 'base-mainnet',
          maxAmountRequired: '100000', // 0.10 USDC (6 decimals)
          resource: 'https://pinioscan.xyz/api/pinion-skill',
          description: 'Pinioscan token safety analysis — 0.10 USDC per scan',
          mimeType: 'application/json',
          payTo: process.env.DEPLOYER_PRIVATE_KEY ? undefined : '0x0000000000000000000000000000000000000000',
          maxTimeoutSeconds: 300,
          asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
          extra: { name: 'USD Coin', version: '2' },
        },
      ],
      error: 'X-PAYMENT header required',
    },
    { status: 402 }
  );
}
