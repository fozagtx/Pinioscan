export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  isVerified: boolean;
  sourceCode?: string;
  compiler?: string;
  owner?: string;
  creator?: string;
  creationTimestamp?: number;
  contractAge?: string; // human readable age
}

export interface LPLockInfo {
  isLocked: boolean;
  lockedPercent: number;
  lockExpiry?: number;
  lockPlatform?: string;
}

export interface ContractPatterns {
  hasProxy: boolean;
  hasMintFunction: boolean;
  hasBlacklist: boolean;
  hasPausable: boolean;
  hasFeeModification: boolean;
  hasMaxTxLimit: boolean;
  hasAntiBot: boolean;
  hasHiddenOwner: boolean;
  suspiciousPatterns: string[];
}

export interface HolderInfo {
  address: string;
  balance: string;
  percentage: number;
  label?: string; // "Deployer", "Uniswap V3", "Dead", etc.
}

export interface LiquidityInfo {
  pair: string;
  dex: string;
  token0: string;
  token1: string;
  reserve0: string;
  reserve1: string;
  liquidityUSD: number;
  isLocked: boolean;
  lockExpiry?: number;
}

export interface RiskCategory {
  name: string;
  score: number; // 0-100
  level: 'safe' | 'caution' | 'danger' | 'critical';
  findings: string[];
}

export interface PinioscanReport {
  token: TokenInfo;
  overallScore: number; // 0-100
  riskLevel: 'SAFE' | 'CAUTION' | 'DANGER' | 'CRITICAL';
  summary: string; // AI-generated plain english summary
  categories: {
    contract: RiskCategory;
    concentration: RiskCategory;
    liquidity: RiskCategory;
    trading: RiskCategory;
  };
  topHolders: HolderInfo[];
  liquidity: LiquidityInfo[];
  flags: string[]; // Quick red/green flags
  recommendation: string; // AI recommendation
  timestamp: number;
  attestationTx?: string; // Base tx hash
}

export type ScanStatus = 'idle' | 'fetching' | 'analyzing' | 'attesting' | 'complete' | 'error';
