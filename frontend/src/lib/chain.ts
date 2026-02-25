import { ethers } from 'ethers';

// Base Mainnet
export const BASE_RPC = 'https://mainnet.base.org';
export const BASE_CHAIN_ID = 8453;

// BaseScan API
export const BASESCAN_API = 'https://api.basescan.org/api?';

// Uniswap V3 on Base
export const UNISWAP_V3_FACTORY = '0x33128a8fC17869897dcE68Ed026d694621f6FDfD';
export const UNISWAP_V3_QUOTER  = '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a';

// Aerodrome on Base (largest DEX by TVL)
export const AERODROME_FACTORY = '0x420DD381b31aEf6683db6B902084cB0FFECe40Da';

// Canonical Base tokens
export const WETH = '0x4200000000000000000000000000000000000006';
export const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// Canonical Base tokens — skip false-positive flagging for these
export const BASE_CANONICAL_TOKENS: Record<string, string> = {
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'USDC',
  '0x4200000000000000000000000000000000000006': 'WETH',
  '0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22': 'cbETH',
  '0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42': 'EURC',
  '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca': 'USDbC',
};

// Dead addresses (for burn detection)
export const DEAD_ADDRESSES = [
  '0x000000000000000000000000000000000000dead',
  '0x0000000000000000000000000000000000000000',
  '0x0000000000000000000000000000000000000001',
];

// Known labels
export const KNOWN_ADDRESSES: Record<string, string> = {
  [UNISWAP_V3_FACTORY.toLowerCase()]: 'Uniswap V3 Factory',
  [AERODROME_FACTORY.toLowerCase()]: 'Aerodrome Factory',
  [WETH.toLowerCase()]: 'WETH',
  [USDC.toLowerCase()]: 'USDC',
  '0x000000000000000000000000000000000000dead': '🔥 Burn Address',
  '0x0000000000000000000000000000000000000000': '🔥 Zero Address',
};

// ERC20 ABI (minimal)
export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function owner() view returns (address)',
];

// Uniswap V3 Factory ABI (minimal)
export const UNISWAP_V3_FACTORY_ABI = [
  'function getPool(address tokenA, address tokenB, uint24 fee) view returns (address)',
];

// LP token ABI for lock checks
export const LP_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
];

// PinioScan Contract ABI
export const PINIOSCAN_ABI = [
  'function submitAttestation(address token, uint8 score, string riskLevel, string reportCID) external',
  'function getAttestations(address token) external view returns (tuple(address token, uint8 score, string riskLevel, string reportCID, uint256 timestamp, address scanner)[])',
  'function getLatestScore(address token) external view returns (uint8 score, string riskLevel, uint256 timestamp)',
  'function totalScans() external view returns (uint256)',
  'function getRecentTokens(uint256 count) external view returns (address[])',
];

export function getBaseProvider() {
  return new ethers.JsonRpcProvider(BASE_RPC, BASE_CHAIN_ID, { staticNetwork: true });
}
