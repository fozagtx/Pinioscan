import type { PinioscanReport, RiskCategory, TokenInfo, HolderInfo, LiquidityInfo, ContractPatterns, LPLockInfo } from './types';

interface AnalysisInput {
  tokenInfo: TokenInfo;
  holders: HolderInfo[];
  liquidity: LiquidityInfo[];
  transfers: any[];
  contractPatterns: ContractPatterns;
  lpLock: LPLockInfo;
  isBaseCanonical?: boolean;
  priceData?: { priceUsd: number; priceChange24h: number; marketCapUsd: number } | null;
  deployerTxInfo?: any | null;
}

export async function analyzeToken(input: AnalysisInput): Promise<PinioscanReport> {
  const { tokenInfo, holders, liquidity, transfers, contractPatterns, lpLock, isBaseCanonical, priceData, deployerTxInfo } = input;

  const totalLiquidityUSD = liquidity.reduce((sum, l) => sum + l.liquidityUSD, 0);
  const top10HolderPct = holders.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0);
  const burnedPct = holders
    .filter(h => h.label?.includes('Burn') || h.label?.includes('Dead'))
    .reduce((sum, h) => sum + h.percentage, 0);

  const prompt = buildAnalysisPrompt(tokenInfo, holders, liquidity, transfers, {
    totalLiquidityUSD,
    top10HolderPct,
    burnedPct,
  }, contractPatterns, lpLock, isBaseCanonical, priceData, deployerTxInfo);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content ?? '';

  return parseAnalysisResponse(text, tokenInfo, holders, liquidity);
}

function buildAnalysisPrompt(
  token: TokenInfo,
  holders: HolderInfo[],
  liquidity: LiquidityInfo[],
  transfers: any[],
  stats: { totalLiquidityUSD: number; top10HolderPct: number; burnedPct: number },
  patterns: ContractPatterns,
  lpLock: LPLockInfo,
  isBaseCanonical?: boolean,
  priceData?: { priceUsd: number; priceChange24h: number; marketCapUsd: number } | null,
  deployerTxInfo?: any | null
): string {
  const holderSummary = holders.slice(0, 15).map((h, i) =>
    `  ${i + 1}. ${h.address.slice(0, 10)}...${h.address.slice(-6)} — ${h.percentage.toFixed(2)}%${h.label ? ` (${h.label})` : ''}`
  ).join('\n');

  const liqSummary = liquidity.map(l =>
    `  ${l.dex}: $${l.liquidityUSD.toFixed(0)} USD (Locked: ${l.isLocked ? 'Yes' : 'Unknown'})`
  ).join('\n') || '  No liquidity found on Uniswap V3 or Aerodrome';

  const largeTxs = transfers
    .filter(tx => {
      const value = Number(tx.value) / Math.pow(10, Number(tx.tokenDecimal || 18));
      const supply = Number(token.totalSupply) / Math.pow(10, token.decimals);
      return supply > 0 && (value / supply) > 0.01;
    })
    .slice(0, 10)
    .map(tx => {
      const value = Number(tx.value) / Math.pow(10, Number(tx.tokenDecimal || 18));
      return `  ${tx.from.slice(0, 10)}→${tx.to.slice(0, 10)} | ${value.toFixed(2)} tokens | Block ${tx.blockNumber}`;
    })
    .join('\n') || '  No large transfers detected';

  const sourceSection = token.isVerified && token.sourceCode
    ? `\nCONTRACT SOURCE CODE (first 8000 chars):\n\`\`\`solidity\n${token.sourceCode.slice(0, 8000)}\n\`\`\``
    : '\nCONTRACT SOURCE: ⚠️ NOT VERIFIED on BaseScan — this is a red flag.';

  const patternFlags = [];
  if (patterns.hasProxy) patternFlags.push('🚨 Proxy/Upgradeable contract (logic can be changed)');
  if (patterns.hasMintFunction) patternFlags.push('⚠️ Has mint function (can create new tokens)');
  if (patterns.hasBlacklist) patternFlags.push('⚠️ Has blacklist functionality (can block addresses)');
  if (patterns.hasPausable) patternFlags.push('⚠️ Pausable (can freeze all transfers)');
  if (patterns.hasFeeModification) patternFlags.push('⚠️ Fees can be modified by owner');
  if (patterns.hasMaxTxLimit) patternFlags.push('Has max transaction limit');
  if (patterns.hasAntiBot) patternFlags.push('Has anti-bot mechanisms');
  if (patterns.hasHiddenOwner) patternFlags.push('🚨 Hidden owner pattern detected');
  patterns.suspiciousPatterns.forEach(p => patternFlags.push(`🚨 ${p}`));

  const patternsSection = patternFlags.length > 0
    ? `\nCONTRACT PATTERNS DETECTED:\n${patternFlags.map(f => `  - ${f}`).join('\n')}`
    : '\nCONTRACT PATTERNS: No concerning patterns found in source code';

  const lpLockSection = lpLock.lockedPercent > 0
    ? `\nLP LOCK STATUS: ${lpLock.lockedPercent.toFixed(1)}% locked${lpLock.lockPlatform ? ` via ${lpLock.lockPlatform}` : ''}${lpLock.isLocked ? ' ✅' : ' (partial)'}`
    : `\nLP LOCK STATUS: ⚠️ No LP tokens found in known lock contracts or burn addresses`;

  const ageSection = token.contractAge ? `\nCONTRACT AGE: ${token.contractAge}` : '';

  const priceSection = priceData
    ? `\nMARKET DATA (Pinion):
  Price: $${priceData.priceUsd.toFixed(6)} USD
  24h Change: ${priceData.priceChange24h >= 0 ? '+' : ''}${priceData.priceChange24h.toFixed(2)}%
  Market Cap: $${priceData.marketCapUsd.toFixed(0)} USD${priceData.marketCapUsd < 10000 ? ' ⚠️ EXTREMELY LOW — extremely high risk' : priceData.marketCapUsd < 100000 ? ' ⚠️ Very low market cap' : ''}`
    : '\nMARKET DATA: Not available';

  const deployerSection = deployerTxInfo
    ? `\nDEPLOYER FIRST TX (Pinion decoded):
  Function: ${deployerTxInfo.functionName || 'unknown'}
  ${deployerTxInfo.args ? `Args: ${JSON.stringify(deployerTxInfo.args).slice(0, 200)}` : ''}
  Value: ${deployerTxInfo.value || '0 ETH'}`
    : '';

  const canonicalSection = isBaseCanonical
    ? `\n⚠️ IMPORTANT: This is an OFFICIAL Base canonical token (USDC, WETH, cbETH, EURC, or USDbC). It is a legitimate token. Do NOT flag it as a scam. Proxy/upgradeable patterns are normal for canonical infrastructure. Score based on actual fundamentals.`
    : '';

  return `You are Pinioscan, an AI token safety auditor for Base (ERC-20 on Base) tokens. New tokens launch on Base every hour — most are scams. Analyze this token and provide a safety assessment.${canonicalSection}

TOKEN: ${token.name} (${token.symbol})
ADDRESS: ${token.address}
TOTAL SUPPLY: ${token.totalSupply}
OWNER: ${token.owner || 'Unknown / Renounced'}
CREATOR: ${token.creator || 'Unknown'}
VERIFIED: ${token.isVerified ? 'Yes' : 'No'}${ageSection}
${priceSection}${deployerSection}
${sourceSection}
${patternsSection}

TOP HOLDERS:
${holderSummary}
  Top 10 hold: ${stats.top10HolderPct.toFixed(1)}% | Burned: ${stats.burnedPct.toFixed(1)}%

LIQUIDITY (Uniswap V3 / Aerodrome on Base):
${liqSummary}
  Total: $${stats.totalLiquidityUSD.toFixed(0)} USD${lpLockSection}

RECENT LARGE TRANSFERS (>1% supply):
${largeTxs}

SCORING RULES (follow strictly):
1. If unverified contract → contract score ≤ 30
2. If proxy/upgradeable contract → contract score ≤ 40 (unless well-known project)
3. If owner can mint → contract score ≤ 50
4. If top non-burn holder > 50% → concentration score ≤ 20
5. If top non-burn holder > 20% → concentration score ≤ 50
6. If no liquidity → liquidity score ≤ 10
7. If liquidity < $5,000 → liquidity score ≤ 30
8. If liquidity < $10,000 → liquidity score ≤ 40
9. If LP not locked/burned → liquidity score ≤ 60
10. If contract age < 7 days → additional -10 to overall score
11. If market cap < $10,000 → additional -15 to overall score (extremely high rug risk)

TAX TOKEN RULES (Base tokens can have transfer taxes):
- Buy+sell tax 0-5% combined → trading score 80-100
- Buy+sell tax 5-10% combined → trading score 60-80 (moderate)
- Buy+sell tax 10-20% combined → trading score 40-60 (high — rare on Base, yellow flag)
- Buy+sell tax > 20% combined → trading score ≤ 30 (very high, red flag on Base)

BLUE-CHIP DIFFERENTIATION (avoid flat 100s):
- WETH/ETH: 95-98 (native wrapped asset)
- Canonical stablecoins (USDC, USDbC): 90-95 (deduct for centralization risk)
- cbETH, EURC: 85-92 (liquid staking / regulated stablecoin risk)
- Top Base DeFi protocols: 78-88 (deduct for smart contract complexity)
- Use the FULL range 0-100. Differentiate based on: liquidity depth, holder distribution, contract complexity, LP lock status, age, market cap.

NUANCE RULES:
- Proxy/upgradeable contracts used by major protocols (Coinbase, Uniswap, Aave) are NORMAL — don't penalize unless there are other red flags.
- For tokens with low DEX liquidity but verified contracts and good holder distribution, score liquidity low but don't let it drag the overall score below 40.
- The overall score should be a WEIGHTED AVERAGE: contract 30%, concentration 25%, liquidity 25%, trading 20%.
- Scores of 5 or below are ONLY for tokens with multiple critical failures (e.g. unverified + no liquidity + extreme concentration + suspicious deployer behavior).
- Most legitimate Base tokens should score between 35-85. Reserve 90+ for canonical/blue-chip tokens only.

Risk level mapping: SAFE (70-100), CAUTION (50-69), DANGER (25-49), CRITICAL (0-24)

Respond in EXACTLY this JSON format (no markdown, no code blocks, just raw JSON):
{
  "overallScore": <0-100>,
  "riskLevel": "<SAFE|CAUTION|DANGER|CRITICAL>",
  "summary": "<2-3 sentence plain English summary>",
  "recommendation": "<1 sentence actionable recommendation>",
  "contract": {
    "score": <0-100>,
    "level": "<safe|caution|danger|critical>",
    "findings": ["<specific finding referencing actual data>", ...]
  },
  "concentration": {
    "score": <0-100>,
    "level": "<safe|caution|danger|critical>",
    "findings": ["<specific finding referencing actual data>", ...]
  },
  "liquidity": {
    "score": <0-100>,
    "level": "<safe|caution|danger|critical>",
    "findings": ["<specific finding referencing actual data>", ...]
  },
  "trading": {
    "score": <0-100>,
    "level": "<safe|caution|danger|critical>",
    "findings": ["<specific finding referencing actual data>", ...]
  },
  "flags": ["🔴 <red flag>", "🟢 <green flag>", ...]
}

IMPORTANT: Be specific — cite actual numbers, addresses, percentages. No generic statements.`;
}

function parseAnalysisResponse(
  text: string,
  tokenInfo: TokenInfo,
  holders: HolderInfo[],
  liquidity: LiquidityInfo[]
): PinioscanReport {
  let parsed: any;
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return createFallbackReport(tokenInfo, holders, liquidity);
  }

  const mkCategory = (cat: any, name: string): RiskCategory => ({
    name,
    score: Math.min(100, Math.max(0, cat?.score ?? 50)),
    level: cat?.level ?? 'caution',
    findings: Array.isArray(cat?.findings) ? cat.findings : [],
  });

  return {
    token: tokenInfo,
    overallScore: Math.min(100, Math.max(0, parsed.overallScore ?? 50)),
    riskLevel: parsed.riskLevel ?? 'CAUTION',
    summary: parsed.summary ?? 'Analysis could not be completed.',
    categories: {
      contract: mkCategory(parsed.contract, 'Contract Safety'),
      concentration: mkCategory(parsed.concentration, 'Holder Concentration'),
      liquidity: mkCategory(parsed.liquidity, 'Liquidity Health'),
      trading: mkCategory(parsed.trading, 'Trading Patterns'),
    },
    topHolders: holders,
    liquidity,
    flags: Array.isArray(parsed.flags) ? parsed.flags : [],
    recommendation: parsed.recommendation ?? 'Do your own research.',
    timestamp: Date.now(),
  };
}

function createFallbackReport(
  tokenInfo: TokenInfo,
  holders: HolderInfo[],
  liquidity: LiquidityInfo[]
): PinioscanReport {
  const totalLiquidityUSD = liquidity.reduce((sum, l) => sum + l.liquidityUSD, 0);
  const top10HolderPct = holders.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0);
  const holderCount = holders.length;

  const contractFindings: string[] = [];
  contractFindings.push(tokenInfo.isVerified ? 'Contract is verified on BaseScan' : 'Contract is NOT verified — major red flag');
  if (tokenInfo.owner) contractFindings.push(`Owner: ${tokenInfo.owner.slice(0, 10)}...`);
  else contractFindings.push('Owner: Renounced or unknown');
  if (tokenInfo.contractAge) contractFindings.push(`Contract age: ${tokenInfo.contractAge}`);

  const concentrationFindings: string[] = [];
  if (holderCount > 0) {
    concentrationFindings.push(`Top 10 holders control ${top10HolderPct.toFixed(1)}% of supply`);
    concentrationFindings.push(`${holderCount} holders analyzed`);
  } else {
    concentrationFindings.push('No holder data available');
  }

  const liquidityFindings: string[] = [];
  if (liquidity.length > 0) {
    liquidityFindings.push(`Found ${liquidity.length} liquidity pool(s) — total $${totalLiquidityUSD.toFixed(0)} USD`);
    liquidity.forEach(l => liquidityFindings.push(`${l.dex}: $${l.liquidityUSD.toFixed(0)} (locked: ${l.isLocked ? 'Yes' : 'Unknown'})`));
  } else {
    liquidityFindings.push('No liquidity found on Uniswap V3 or Aerodrome');
  }

  const concScore = holderCount > 0 ? (top10HolderPct > 50 ? 20 : top10HolderPct > 20 ? 40 : 60) : 30;
  const liqScore = liquidity.length > 0 ? (totalLiquidityUSD > 10000 ? 60 : 40) : 10;

  return {
    token: tokenInfo,
    overallScore: 30,
    riskLevel: 'DANGER',
    summary: `AI analysis failed but raw data was collected. ${tokenInfo.name} (${tokenInfo.symbol}) is ${tokenInfo.isVerified ? 'verified' : 'unverified'} with $${totalLiquidityUSD.toFixed(0)} liquidity and ${holderCount} holders tracked. Exercise caution.`,
    categories: {
      contract: { name: 'Contract Safety', score: tokenInfo.isVerified ? 50 : 10, level: tokenInfo.isVerified ? 'caution' : 'critical', findings: contractFindings },
      concentration: { name: 'Holder Concentration', score: concScore, level: concScore >= 50 ? 'caution' : 'danger', findings: concentrationFindings },
      liquidity: { name: 'Liquidity Health', score: liqScore, level: liqScore >= 40 ? 'caution' : 'critical', findings: liquidityFindings },
      trading: { name: 'Trading Patterns', score: 50, level: 'caution', findings: ['AI analysis failed — trading patterns not evaluated'] },
    },
    topHolders: holders,
    liquidity,
    flags: ['⚠️ AI analysis failed — scores are based on raw data only', ...(tokenInfo.isVerified ? ['🟢 Contract is verified on BaseScan'] : ['🔴 Contract is unverified']), ...(totalLiquidityUSD > 10000 ? ['🟢 Has significant liquidity'] : totalLiquidityUSD > 0 ? ['🟡 Low liquidity'] : ['🔴 No liquidity found'])],
    recommendation: 'AI analysis failed to complete. The raw data has been presented but do your own research before investing.',
    timestamp: Date.now(),
  };
}
