import { NextRequest } from 'next/server';
import { ethers } from 'ethers';
import { getBaseProvider, ERC20_ABI, BASE_CANONICAL_TOKENS } from '@/lib/chain';
import { withSecurityHeaders } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Popular Base tokens to check balances for
const POPULAR_TOKENS = [
  { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', name: 'USD Coin', symbol: 'USDC' },
  { address: '0x4200000000000000000000000000000000000006', name: 'Wrapped Ether', symbol: 'WETH' },
  { address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22', name: 'Coinbase Wrapped ETH', symbol: 'cbETH' },
  { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', name: 'USD Base Coin', symbol: 'USDbC' },
  { address: '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42', name: 'Euro Coin', symbol: 'EURC' },
  { address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631', name: 'Aerodrome Finance', symbol: 'AERO' },
  { address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', name: 'Dai Stablecoin', symbol: 'DAI' },
  { address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', name: 'Tether USD', symbol: 'USDT' },
  { address: '0x0578d8A44db98B23BF096A382e016e29a5Ce0ffe', name: 'Higher', symbol: 'HIGHER' },
  { address: '0x532f27101965dd16442E59d40670FaF5eBB142E4', name: 'Brett', symbol: 'BRETT' },
];

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');

  if (!address || !ethers.isAddress(address.toLowerCase())) {
    const res = new Response(
      JSON.stringify({ error: 'Invalid wallet address' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
    return withSecurityHeaders(res, req);
  }

  try {
    const provider = getBaseProvider();
    const normalizedAddress = ethers.getAddress(address.toLowerCase());

    // Check ETH balance on Base
    const ethBalance = await provider.getBalance(normalizedAddress);

    // Check token balances in batches of 4 to avoid RPC rate limits
    const tokens: any[] = [];
    for (let i = 0; i < POPULAR_TOKENS.length; i += 4) {
      const batch = POPULAR_TOKENS.slice(i, i + 4);
      const batchResults = await Promise.all(
        batch.map(async (token) => {
          try {
            const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
            const balance = await contract.balanceOf(normalizedAddress);
            if (balance > 0n) {
              const decimals = await contract.decimals().catch(() => 18);
              return {
                address: token.address,
                name: token.name,
                symbol: token.symbol,
                balance: ethers.formatUnits(balance, decimals),
              };
            }
            return null;
          } catch {
            return null;
          }
        })
      );
      tokens.push(...batchResults.filter(Boolean));
    }

    // Add ETH if they have any
    if (ethBalance > 0n) {
      tokens.unshift({
        address: '0x4200000000000000000000000000000000000006', // WETH for scanning
        name: 'Ether',
        symbol: 'ETH',
        balance: ethers.formatEther(ethBalance),
      });
    }

    const res = new Response(
      JSON.stringify({ tokens }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    return withSecurityHeaders(res, req);
  } catch {
    const res = new Response(
      JSON.stringify({ error: 'Failed to fetch portfolio' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
    return withSecurityHeaders(res, req);
  }
}
