'use client';

import type { LiquidityInfo } from '../lib/types';

function formatUSD(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function shortenAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function LiquidityPanel({ pools, className = '' }: {
  pools: LiquidityInfo[]; className?: string;
}) {
  if (!pools || pools.length === 0) return null;

  const total = pools.reduce((s, p) => s + p.liquidityUSD, 0);
  const maxLiq = Math.max(...pools.map(p => p.liquidityUSD), 1);

  return (
    <div className={`glass rounded-2xl p-4 sm:p-6 ${className}`}>
      <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
        <h3 className="font-bold text-zinc-200 flex items-center gap-2 text-sm sm:text-base">
          <span>💧</span> Liquidity Pools
        </h3>
        <span className="text-sm font-bold text-emerald-400 shrink-0">{formatUSD(total)}</span>
      </div>
      <div className="space-y-3">
        {pools.map((pool) => (
          <div key={pool.pair} className="bg-zinc-800/30 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span className="text-xs px-1.5 sm:px-2 py-0.5 rounded bg-zinc-700/50 text-zinc-400 font-medium shrink-0">{pool.dex}</span>
                <span className="text-xs text-zinc-500 font-mono truncate">{shortenAddr(pool.pair)}</span>
              </div>
              <span className="text-sm font-bold text-zinc-200 shrink-0">{formatUSD(pool.liquidityUSD)}</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-700 transition-all duration-700"
                style={{ width: `${(pool.liquidityUSD / maxLiq) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5">
                {pool.isLocked ? (
                  <span className="text-[10px] text-green-400 flex items-center gap-1">🔒 Locked</span>
                ) : (
                  <span className="text-[10px] text-yellow-500 flex items-center gap-1">⚠️ Unlocked</span>
                )}
              </div>
              <span className="text-[10px] text-zinc-600">
                {((pool.liquidityUSD / total) * 100).toFixed(1)}% of total
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
