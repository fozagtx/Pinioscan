import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { PINIOSCAN_ABI, BASE_RPC, BASE_CHAIN_ID } from '../../../lib/chain';

const CONTRACT_ADDRESS = (process.env.PINIOSCAN_CONTRACT_ADDRESS || '').trim();

export async function GET() {
  try {
    if (!CONTRACT_ADDRESS) {
      return NextResponse.json({ totalScans: 0, contractAddress: '', tokens: [] });
    }
    const provider = new ethers.JsonRpcProvider(BASE_RPC, BASE_CHAIN_ID, { staticNetwork: true });
    const addr = ethers.getAddress(CONTRACT_ADDRESS);
    const contract = new ethers.Contract(addr, PINIOSCAN_ABI, provider);

    const [totalScans, recentTokens] = await Promise.all([
      contract.totalScans().catch(() => 0n),
      contract.getRecentTokens(20).catch(() => []),
    ]);

    const tokenData = await Promise.all(
      (recentTokens as string[]).map(async (tokenAddress: string) => {
        try {
          const attestations = await contract.getAttestations(tokenAddress);
          const latest = attestations[attestations.length - 1];
          return {
            token: tokenAddress,
            score: Number(latest.score),
            riskLevel: latest.riskLevel,
            timestamp: Number(latest.timestamp),
            totalAttestations: attestations.length,
          };
        } catch {
          return null;
        }
      })
    );

    return NextResponse.json({
      totalScans: Number(totalScans),
      contractAddress: CONTRACT_ADDRESS,
      tokens: tokenData.filter(Boolean),
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message || 'Failed to fetch attestations' }, { status: 500 });
  }
}
