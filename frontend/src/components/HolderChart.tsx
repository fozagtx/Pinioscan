'use client';

import type { HolderInfo } from '../lib/types';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6', '#f97316', '#ec4899', '#84cc16'];

export function HolderChart({ holders, className = '' }: {
  holders: HolderInfo[]; className?: string;
}) {
  if (!holders || holders.length === 0) return null;

  const top = holders.slice(0, 10);
  const maxPct = Math.max(...top.map(h => h.percentage), 1);

  return (
    <div className={`glass rounded-2xl p-4 sm:p-6 ${className}`}>
      <h3 className="font-bold text-zinc-200 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
        <span>🏦</span> Top Holders
      </h3>
      <div className="space-y-2 sm:space-y-2.5">
        {top.map((holder, i) => (
          <div key={holder.address} className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs text-zinc-500 w-4 sm:w-5 text-right font-mono shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1 gap-2">
                <span className="text-xs text-zinc-400 font-mono truncate min-w-0">
                  {holder.label || `${holder.address.slice(0, 6)}...${holder.address.slice(-4)}`}
                </span>
                <span className="text-xs font-semibold text-zinc-300 shrink-0">{holder.percentage.toFixed(2)}%</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${(holder.percentage / maxPct) * 100}%`,
                    backgroundColor: COLORS[i % COLORS.length],
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      {top.length > 0 && (
        <div className="mt-3 sm:mt-4 pt-3 border-t border-zinc-800/50 flex items-center justify-between">
          <span className="text-xs text-zinc-500">Top {top.length} total</span>
          <span className="text-sm font-semibold text-zinc-300">
            {top.reduce((s, h) => s + h.percentage, 0).toFixed(2)}%
          </span>
        </div>
      )}
    </div>
  );
}
