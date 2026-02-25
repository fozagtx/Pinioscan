import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { PINIOSCAN_ABI } from '../../../lib/chain';
import { cacheGet } from '../../../lib/cache';

const CONTRACT = (process.env.PINIOSCAN_CONTRACT_ADDRESS || '').trim();
const BASE_RPC = 'https://mainnet.base.org';

function getProvider() {
  return new ethers.JsonRpcProvider(BASE_RPC, 8453, { staticNetwork: true });
}

export async function GET() {
  try {
    if (!CONTRACT) {
      return NextResponse.json({ tokens: [] });
    }
    const provider = getProvider();
    const addr = ethers.getAddress(CONTRACT);
    const contract = new ethers.Contract(addr, PINIOSCAN_ABI, provider);

    const tokens: any[] = await contract.getRecentTokens(50);

    const results = await Promise.all(
      tokens.filter(t => t && t !== ethers.ZeroAddress).map(async (token) => {
        try {
          const tokenAddr = ethers.getAddress(token.toString());
          const [score, riskLevel, timestamp] = await contract.getLatestScore(tokenAddr);
          let name = '';
          let symbol = '';
          try {
            const cached = await cacheGet<any>(`scan:${tokenAddr}`);
            if (cached?.token) {
              name = cached.token.name || '';
              symbol = cached.token.symbol || '';
            }
          } catch {}
          return {
            address: tokenAddr,
            score: Number(score),
            riskLevel: riskLevel,
            timestamp: Number(timestamp),
            name,
            symbol,
          };
        } catch (err: any) {
          console.warn('History item fetch failed:', err.message);
          return null;
        }
      })
    );

    const seen = new Map<string, any>();
    for (const r of results.filter(Boolean)) {
      const existing = seen.get(r!.address);
      if (!existing || r!.timestamp > existing.timestamp) {
        seen.set(r!.address, r);
      }
    }
    const deduplicated = Array.from(seen.values()).sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({ tokens: deduplicated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
