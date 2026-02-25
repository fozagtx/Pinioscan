import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { PINIOSCAN_ABI } from '@/lib/chain';

const CONTRACT_ADDRESS = process.env.PINIOSCAN_CONTRACT_ADDRESS || '';
const BASE_RPC = 'https://mainnet.base.org';

function getProvider() {
  return new ethers.JsonRpcProvider(BASE_RPC, 8453, { staticNetwork: true });
}

export async function GET() {
  try {
    if (!CONTRACT_ADDRESS) return NextResponse.json({ totalScans: null });
    const provider = getProvider();
    const addr = ethers.getAddress(CONTRACT_ADDRESS.trim());
    const contract = new ethers.Contract(addr, PINIOSCAN_ABI, provider);
    const total = await contract.totalScans();
    return NextResponse.json({ totalScans: total.toString() });
  } catch (err: any) {
    console.warn('Failed to fetch totalScans:', err.message);
    return NextResponse.json({ totalScans: null });
  }
}
