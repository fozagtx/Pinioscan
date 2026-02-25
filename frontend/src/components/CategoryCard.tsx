import type { RiskCategory } from '../lib/types';
import { RISK_COLORS, RISK_BG } from '../lib/constants';

export function CategoryCard({ category, icon, delay }: { category: RiskCategory; icon: string; delay?: number }) {
  const color = RISK_COLORS[category.level] || '#eab308';
  return (
    <div
      className="glass glass-hover rounded-2xl p-6 transition-all duration-300"
      style={{ animationDelay: delay ? `${delay}ms` : undefined }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-800/80 flex items-center justify-center text-lg">
            {icon}
          </div>
          <h3 className="font-semibold text-zinc-100">{category.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold" style={{ color }}>{category.score}</span>
          <span className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold uppercase tracking-wider ${RISK_BG[category.level]}`}>
            {category.level.toUpperCase()}
          </span>
        </div>
      </div>
      <div className="w-full h-1.5 bg-zinc-800 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${category.score}%`, backgroundColor: color }}
        />
      </div>
      <ul className="space-y-2">
        {category.findings.map((f, i) => (
          <li key={i} className="text-sm text-zinc-400 flex items-start gap-2.5 leading-relaxed">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
