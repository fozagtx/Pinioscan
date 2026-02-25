export const RISK_COLORS: Record<string, string> = {
  safe: '#22c55e', SAFE: '#22c55e',
  caution: '#eab308', CAUTION: '#eab308',
  danger: '#f97316', DANGER: '#f97316',
  critical: '#ef4444', CRITICAL: '#ef4444',
};

export const RISK_BG: Record<string, string> = {
  safe: 'bg-green-500/10 border-green-500/30 text-green-400 badge-safe',
  SAFE: 'bg-green-500/10 border-green-500/30 text-green-400 badge-safe',
  caution: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 badge-caution',
  CAUTION: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 badge-caution',
  danger: 'bg-orange-500/10 border-orange-500/30 text-orange-400 badge-danger',
  DANGER: 'bg-orange-500/10 border-orange-500/30 text-orange-400 badge-danger',
  critical: 'bg-red-500/10 border-red-500/30 text-red-400 badge-critical',
  CRITICAL: 'bg-red-500/10 border-red-500/30 text-red-400 badge-critical',
};

export const CATEGORY_ICONS: Record<string, string> = {
  contract: '📜', concentration: '🏦', liquidity: '💧', trading: '📊',
};

export const STATUS_MESSAGES: Record<string, string> = {
  idle: '',
  fetching: 'Fetching on-chain data...',
  analyzing: 'AI is analyzing token safety...',
  attesting: 'Recording on Base...',
  complete: 'Scan complete!',
  error: 'Scan failed',
};

export const SCAN_STEPS = [
  { key: 'fetching', label: 'Fetch Data', icon: '📡' },
  { key: 'analyzing', label: 'AI Analysis', icon: '🧠' },
  { key: 'attesting', label: 'Attest', icon: '⛓️' },
] as const;

export function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
