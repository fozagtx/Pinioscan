import { ethers } from 'ethers';
import type { TokenInfo, HolderInfo, LiquidityInfo, ContractPatterns, LPLockInfo } from './types';
import {
  getBaseProvider,
  ERC20_ABI,
  UNISWAP_V3_FACTORY,
  UNISWAP_V3_FACTORY_ABI,
  LP_ABI,
  WETH,
  USDC,
  DEAD_ADDRESSES,
  KNOWN_ADDRESSES,
  BASE_CANONICAL_TOKENS,
  BASESCAN_API,
} from './chain';

const BASESCAN_KEY = process.env.BASESCAN_API_KEY || '';

// ── PINION CLIENT ──────────────────────────────────────────────────────────

// Lazy-initialised Pinion client (server-side only)
let _pinion: any = null;
async function getPinion() {
  if (!_pinion) {
    const { PinionClient } = await import('pinion-os');
    _pinion = new PinionClient({
      privateKey: process.env.PINION_PRIVATE_KEY!,
      network: 'base',
    });
  }
  return _pinion;
}

// ── PINION TOOLS ($0.01 each) ──────────────────────────────────────────────

export async function fetchTokenPrice(symbol: string): Promise<{
  priceUsd: number;
  priceChange24h: number;
  marketCapUsd: number;
} | null> {
  try {
    const pinion = await getPinion();
    const res = await pinion.skills.price(symbol);
    return res?.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchWalletBalance(address: string): Promise<{
  ethBalance: string;
  usdcBalance: string;
  totalUsdValue: number;
} | null> {
  try {
    const pinion = await getPinion();
    const res = await pinion.skills.balance(address);
    return res?.data ?? null;
  } catch {
    return null;
  }
}

export async function fetchDeployerTxInfo(txHash: string): Promise<any | null> {
  try {
    const pinion = await getPinion();
    const res = await pinion.skills.tx(txHash);
    return res?.data ?? null;
  } catch {
    return null;
  }
}

// ── TOKEN INFO (free — direct RPC) ────────────────────────────────────────

export async function fetchTokenInfo(address: string): Promise<TokenInfo> {
  const provider = getBaseProvider();

  const code = await provider.getCode(address);
  if (code === '0x') {
    throw new Error(`Address ${address.slice(0, 10)}... is not a contract (EOA or empty)`);
  }

  const token = new ethers.Contract(address, ERC20_ABI, provider);

  const [name, symbol, decimals, totalSupply] = await Promise.all([
    token.name().catch(() => 'Unknown'),
    token.symbol().catch(() => '???'),
    token.decimals().catch(() => 18),
    token.totalSupply().catch(() => '0'),
  ]);

  let owner: string | undefined;
  try {
    owner = await token.owner();
  } catch {
    owner = undefined;
  }

  const { isVerified, sourceCode, compiler } = await fetchContractSource(address);

  let creator: string | undefined;
  try {
    const creationUrl = `${BASESCAN_API}module=contract&action=getcontractcreation&contractaddresses=${address}&apikey=${BASESCAN_KEY}`;
    const creationData = await fetch(creationUrl).then(r => r.json());
    if (creationData.status === '1' && creationData.result?.[0]) {
      creator = creationData.result[0].contractCreator;
    }
  } catch (e) {
    console.error('Creation info fetch error:', e);
  }

  return {
    address,
    name,
    symbol,
    decimals: Number(decimals),
    totalSupply: totalSupply.toString(),
    isVerified,
    sourceCode,
    compiler,
    owner,
    creator,
  };
}

// ── CONTRACT SOURCE (free — BaseScan API) ─────────────────────────────────

export async function fetchContractSource(address: string): Promise<{
  isVerified: boolean;
  sourceCode?: string;
  compiler?: string;
}> {
  try {
    const url = `${BASESCAN_API}module=contract&action=getsourcecode&address=${address}&apikey=${BASESCAN_KEY}`;
    const data = await fetch(url).then(r => r.json());

    if (data.status === '1' && data.result?.[0]) {
      const result = data.result[0];
      const isVerified = result.SourceCode && result.SourceCode !== '';
      return {
        isVerified,
        sourceCode: isVerified ? result.SourceCode : undefined,
        compiler: result.CompilerVersion || undefined,
      };
    }
  } catch (e) {
    console.error('BaseScan source fetch error:', e);
  }
  return { isVerified: false };
}

// ── TOP HOLDERS (free — BaseScan API) ─────────────────────────────────────

export async function fetchTopHolders(
  tokenAddress: string,
  totalSupply: bigint,
  decimals: number,
  count: number = 20
): Promise<HolderInfo[]> {
  try {
    const url = `${BASESCAN_API}module=token&action=tokenholderlist&contractaddress=${tokenAddress}&page=1&offset=${count}&apikey=${BASESCAN_KEY}`;
    const data = await fetch(url).then(r => r.json());

    if (data.status === '1' && Array.isArray(data.result)) {
      return data.result.map((h: any) => {
        const balance = BigInt(h.TokenHolderQuantity || '0');
        const percentage = totalSupply > 0n
          ? Number((balance * 10000n) / totalSupply) / 100
          : 0;
        const addr = h.TokenHolderAddress.toLowerCase();
        return {
          address: h.TokenHolderAddress,
          balance: ethers.formatUnits(balance, decimals),
          percentage,
          label: KNOWN_ADDRESSES[addr] || (DEAD_ADDRESSES.includes(addr) ? '🔥 Burn' : undefined),
        };
      });
    }
  } catch (e) {
    console.error('Holder fetch error:', e);
  }
  return [];
}

// ── LIQUIDITY POOLS (free — Uniswap V3 factory) ───────────────────────────

export async function fetchLiquidityPools(tokenAddress: string): Promise<LiquidityInfo[]> {
  const provider = getBaseProvider();
  const factory = new ethers.Contract(UNISWAP_V3_FACTORY, UNISWAP_V3_FACTORY_ABI, provider);
  const results: LiquidityInfo[] = [];

  // Check 0.05%, 0.3%, 1% fee tiers against WETH and USDC
  const pairs = [
    { quoteToken: WETH, quoteSymbol: 'WETH', fee: 500 },
    { quoteToken: WETH, quoteSymbol: 'WETH', fee: 3000 },
    { quoteToken: USDC, quoteSymbol: 'USDC', fee: 500 },
    { quoteToken: USDC, quoteSymbol: 'USDC', fee: 3000 },
  ];

  for (const { quoteToken, quoteSymbol, fee } of pairs) {
    try {
      const poolAddress = await factory.getPool(tokenAddress, quoteToken, fee);
      if (poolAddress === ethers.ZeroAddress) continue;

      // Use Pinion balance to get USD value of pool (falls back to 0 if Pinion unavailable)
      const poolBalance = await fetchWalletBalance(poolAddress);
      const liquidityUSD = poolBalance?.totalUsdValue ?? 0;

      results.push({
        pair: poolAddress,
        dex: `Uniswap V3 (${fee / 10000}% fee)`,
        token0: tokenAddress.toLowerCase() < quoteToken.toLowerCase() ? tokenAddress : quoteToken,
        token1: tokenAddress.toLowerCase() < quoteToken.toLowerCase() ? quoteToken : tokenAddress,
        reserve0: '0',
        reserve1: '0',
        liquidityUSD,
        isLocked: false,
      });
    } catch {
      // Pool doesn't exist
    }
  }

  return results;
}

// ── RECENT TRANSFERS (free — BaseScan API) ────────────────────────────────

export async function fetchRecentTransfers(tokenAddress: string): Promise<any[]> {
  try {
    const url = `${BASESCAN_API}module=account&action=tokentx&contractaddress=${tokenAddress}&page=1&offset=50&sort=desc&apikey=${BASESCAN_KEY}`;
    const data = await fetch(url).then(r => r.json());
    if (data.status === '1' && Array.isArray(data.result)) {
      return data.result;
    }
  } catch (e) {
    console.error('Transfer fetch error:', e);
  }
  return [];
}

// ── CONTRACT PATTERN ANALYSIS (free — static) ─────────────────────────────

export function analyzeContractPatterns(sourceCode?: string): ContractPatterns {
  const result: ContractPatterns = {
    hasProxy: false,
    hasMintFunction: false,
    hasBlacklist: false,
    hasPausable: false,
    hasFeeModification: false,
    hasMaxTxLimit: false,
    hasAntiBot: false,
    hasHiddenOwner: false,
    suspiciousPatterns: [],
  };

  if (!sourceCode) return result;

  const code = sourceCode.toLowerCase();

  result.hasProxy = /delegatecall|upgradeable|transparent.*proxy|beacon.*proxy/.test(code);
  result.hasMintFunction = /function\s+mint\s*\(/.test(code) && !/\/\/.*mint/.test(code);
  result.hasBlacklist = /blacklist|blocklist|isblacklisted|_isexcluded|isbotaddress|isbot/.test(code);
  result.hasPausable = /whennotpaused|pausable|function\s+pause\s*\(/.test(code);
  result.hasFeeModification = /setfee|settax|updatefee|_taxfee|_liquidityfee|setsellfee|setbuyfee/.test(code);
  result.hasMaxTxLimit = /maxtxamount|_maxtxamount|maxtransaction|maxwalletsize/.test(code);
  result.hasAntiBot = /antibot|antibotactive|tradingactive|tradingopen|cantradestart/.test(code);
  result.hasHiddenOwner = /transferownership.*internal|_previousowner/.test(code);

  if (/selfdestruct|suicide/.test(code)) result.suspiciousPatterns.push('Contains selfdestruct');
  if (/assembly\s*\{[\s\S]*?sstore/.test(code)) result.suspiciousPatterns.push('Uses raw assembly storage writes');
  if (/block\.number\s*[<>]/.test(code) && /require/.test(code)) result.suspiciousPatterns.push('Block-number-based restrictions (possible sniper protection or time bomb)');
  if (/approve.*type\(uint256\)\.max/.test(code) || /approve.*115792/.test(code)) result.suspiciousPatterns.push('Unlimited approval patterns detected');

  return result;
}

// ── LP LOCK DETECTION ─────────────────────────────────────────────────────

const KNOWN_LOCKERS: Record<string, string> = {
  '0x231278edd38b00b07fbd52120cef685b9baebcc1': 'Team Finance',
  '0x71b5759d73262fbb223956913ecf4ecc51057641': 'Unicrypt',
  '0xdba68f07d1b7ca219f78ae8582c213d975c25caf': 'PinkLock',
};

export async function checkLPLocks(pairAddress: string): Promise<LPLockInfo> {
  if (!pairAddress || pairAddress === ethers.ZeroAddress) {
    return { isLocked: false, lockedPercent: 0 };
  }
  const provider = getBaseProvider();
  const pair = new ethers.Contract(pairAddress, LP_ABI, provider);

  try {
    const totalLP = await pair.totalSupply();
    if (totalLP === 0n) return { isLocked: false, lockedPercent: 0 };

    let totalLocked = 0n;
    const platforms: string[] = [];

    const addressesToCheck = [...Object.keys(KNOWN_LOCKERS), ...DEAD_ADDRESSES];
    const balances = await Promise.all(
      addressesToCheck.map(addr => pair.balanceOf(addr).catch(() => 0n))
    );

    const lockerCount = Object.keys(KNOWN_LOCKERS).length;
    for (let i = 0; i < balances.length; i++) {
      if (balances[i] > 0n) {
        totalLocked += balances[i];
        if (i < lockerCount) {
          platforms.push(Object.values(KNOWN_LOCKERS)[i]);
        } else if (!platforms.includes('Burned')) {
          platforms.push('Burned');
        }
      }
    }
    const platform = platforms.length > 0 ? platforms.join(', ') : undefined;

    const lockedPercent = Number((totalLocked * 10000n) / totalLP) / 100;
    return {
      isLocked: lockedPercent > 50,
      lockedPercent,
      lockPlatform: platform,
    };
  } catch {
    return { isLocked: false, lockedPercent: 0 };
  }
}

// ── CONTRACT AGE (free — BaseScan API) ────────────────────────────────────

export async function fetchContractAge(address: string): Promise<string | undefined> {
  try {
    const url = `${BASESCAN_API}module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=1&sort=asc&apikey=${BASESCAN_KEY}`;
    const data = await fetch(url).then(r => r.json());
    if (data.status === '1' && data.result?.[0]) {
      const timestamp = Number(data.result[0].timeStamp) * 1000;
      const ageMs = Date.now() - timestamp;
      const days = Math.floor(ageMs / (1000 * 60 * 60 * 24));
      if (days > 365) return `${Math.floor(days / 365)} years, ${days % 365} days`;
      if (days > 30) return `${Math.floor(days / 30)} months, ${days % 30} days`;
      return `${days} days`;
    }
  } catch {}
  return undefined;
}

// ── AGGREGATE ALL DATA FOR ANALYSIS ───────────────────────────────────────

export async function fetchAllTokenData(address: string) {
  const tokenInfo = await fetchTokenInfo(address);
  const totalSupply = BigInt(tokenInfo.totalSupply);

  const contractPatterns = analyzeContractPatterns(tokenInfo.sourceCode);
  const isBaseCanonical = !!BASE_CANONICAL_TOKENS[address.toLowerCase()];

  const [holders, liquidity, transfers, contractAge] = await Promise.all([
    fetchTopHolders(address, totalSupply, tokenInfo.decimals),
    fetchLiquidityPools(address),
    fetchRecentTransfers(address),
    fetchContractAge(address),
  ]);

  tokenInfo.contractAge = contractAge;

  // Check LP locks for the primary pool
  let lpLock: LPLockInfo = { isLocked: false, lockedPercent: 0 };
  if (liquidity.length > 0) {
    lpLock = await checkLPLocks(liquidity[0].pair);
    if (lpLock.isLocked) {
      liquidity[0].isLocked = true;
      liquidity[0].lockExpiry = lpLock.lockExpiry;
    }
  }

  // Pinion: token price + market cap ($0.01)
  const priceData = await fetchTokenPrice(tokenInfo.symbol).catch(() => null);

  // Pinion: deployer's first tx — what did they do right after deploy? ($0.01)
  let deployerTxInfo: any = null;
  if (tokenInfo.creator) {
    const txUrl = `${BASESCAN_API}module=account&action=txlist&address=${tokenInfo.creator}&startblock=0&endblock=99999999&page=1&offset=1&sort=asc&apikey=${BASESCAN_KEY}`;
    const txData = await fetch(txUrl).then(r => r.json()).catch(() => null);
    const firstTxHash = txData?.result?.[0]?.hash;
    if (firstTxHash) {
      deployerTxInfo = await fetchDeployerTxInfo(firstTxHash).catch(() => null);
    }
  }

  return {
    tokenInfo,
    holders,
    liquidity,
    transfers,
    contractPatterns,
    lpLock,
    isBaseCanonical,
    priceData,
    deployerTxInfo,
  };
}
