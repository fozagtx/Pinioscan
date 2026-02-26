'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { RISK_BG, RISK_COLORS, shortenAddress } from '../../lib/constants';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PINIOSCAN_CONTRACT_ADDRESS || '0x427F80AE3ebF7C275B138Bc9C9A39C76572AA161';
const BASE_EXPLORER = 'https://basescan.org';

const RISK_BAR_BG: Record<string, string> = {
  SAFE: 'bg-green-500',
  CAUTION: 'bg-yellow-500',
  DANGER: 'bg-orange-500',
  CRITICAL: 'bg-red-500',
};

interface TokenScore {
  address: string;
  score: number;
  riskLevel: string;
  timestamp: number;
  name?: string;
  symbol?: string;
}

function timeAgo(ts: number): string {
  const s = Math.floor(Date.now() / 1000 - ts);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function ScoreBar({ score, riskLevel }: { score: number; riskLevel: string }) {
  const barColor = RISK_BAR_BG[riskLevel] || 'bg-yellow-500';
  return (
    <div className="flex items-center gap-2 w-full">
      <span className="text-sm font-bold tabular-nums w-7 text-right" style={{ color: RISK_COLORS[riskLevel] || '#eab308' }}>
        {score}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

type RiskFilter = 'ALL' | 'SAFE' | 'CAUTION' | 'DANGER' | 'CRITICAL';
type SortBy = 'newest' | 'oldest' | 'highest' | 'lowest';

export default function HistoryPage() {
  const [tokens, setTokens] = useState<TokenScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<RiskFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [search, setSearch] = useState('');

  useEffect(() => {
    document.title = 'Pinioscan — Scan History & On-Chain Proofs';
    fetch('/api/history')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setTokens(d.tokens || []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = [...tokens];
    if (filter !== 'ALL') result = result.filter(t => t.riskLevel === filter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t => t.address.toLowerCase().includes(q) || (t.name && t.name.toLowerCase().includes(q)) || (t.symbol && t.symbol.toLowerCase().includes(q)));
    }
    switch (sortBy) {
      case 'newest': result.sort((a, b) => b.timestamp - a.timestamp); break;
      case 'oldest': result.sort((a, b) => a.timestamp - b.timestamp); break;
      case 'highest': result.sort((a, b) => b.score - a.score); break;
      case 'lowest': result.sort((a, b) => a.score - b.score); break;
    }
    return result;
  }, [tokens, filter, sortBy, search]);

  const stats = useMemo(() => {
    if (tokens.length === 0) return null;
    const avg = Math.round(tokens.reduce((s, t) => s + t.score, 0) / tokens.length);
    const safe = tokens.filter(t => t.riskLevel === 'SAFE').length;
    const caution = tokens.filter(t => t.riskLevel === 'CAUTION').length;
    const risky = tokens.filter(t => t.riskLevel === 'DANGER' || t.riskLevel === 'CRITICAL').length;
    return { total: tokens.length, avg, safe, caution, risky };
  }, [tokens]);

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-3 sm:px-6 py-8 sm:py-12">
      {/* Hero */}
      <div className="mb-6 sm:mb-10 hero-glow relative z-10 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-xs font-medium mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          On-Chain Attested
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent mb-2">
          Scan History
        </h1>
        <p className="text-zinc-500 text-sm sm:text-base">
          Every scan is permanently recorded on Base as an immutable attestation.
        </p>
        <div className="mt-3 flex items-center gap-3 flex-wrap justify-center sm:justify-start">
          <a
            href={`${BASE_EXPLORER}/address/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded-lg glass text-emerald-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-1"
          >
            View Contract ↗
          </a>
          {stats && (
            <span className="text-xs text-zinc-500">
              <span className="text-emerald-500 font-semibold">{stats.total}</span> scans on-chain
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 sm:mb-8 stagger-children">
          <div className="glass rounded-xl p-3 sm:p-4 text-center">
            <div className="text-lg sm:text-xl mb-1">📊</div>
            <div className="text-xl sm:text-2xl font-black text-zinc-100">{stats.total}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Total Scans</div>
          </div>
          <div className="glass rounded-xl p-3 sm:p-4 text-center">
            <div className="text-lg sm:text-xl mb-1">📈</div>
            <div className="text-xl sm:text-2xl font-black" style={{ color: stats.avg >= 70 ? '#34d399' : stats.avg >= 40 ? '#fbbf24' : '#f87171' }}>{stats.avg}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Avg Score</div>
          </div>
          <div className="glass rounded-xl p-3 sm:p-4 text-center">
            <div className="text-lg sm:text-xl mb-1">✅</div>
            <div className="flex items-center justify-center gap-1">
              <span className="text-xl sm:text-2xl font-black text-green-400">{stats.safe}</span>
              <span className="text-zinc-600 text-xs">/</span>
              <span className="text-xl sm:text-2xl font-black text-yellow-400">{stats.caution}</span>
            </div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Safe / Caution</div>
          </div>
          <div className="glass rounded-xl p-3 sm:p-4 text-center">
            <div className="text-lg sm:text-xl mb-1">⚠️</div>
            <div className="text-xl sm:text-2xl font-black text-red-400">{stats.risky}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Risky Tokens</div>
          </div>
        </div>
      )}

      {/* Filters */}
      {!loading && tokens.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-5 sm:mb-6">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or address..."
            className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/10 transition-all"
          />
          <div className="flex gap-1.5 flex-wrap">
            {(['ALL', 'SAFE', 'CAUTION', 'DANGER', 'CRITICAL'] as const).map(level => (
              <button
                key={level}
                onClick={() => setFilter(level)}
                className={`text-xs px-3 py-2 rounded-lg font-medium transition-all cursor-pointer ${
                  filter === level
                    ? level === 'ALL' ? 'bg-zinc-700 text-zinc-200' : `${RISK_BG[level]} border`
                    : 'bg-zinc-800/40 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortBy)}
            className="bg-zinc-900/50 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-emerald-500/40 cursor-pointer"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest score</option>
            <option value="lowest">Lowest score</option>
          </select>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass rounded-xl h-[72px] shimmer" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="glass rounded-xl p-4 border-red-500/30 text-red-400 text-sm">
          ⚠ {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && tokens.length === 0 && (
        <div className="glass rounded-2xl p-10 sm:p-12 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-zinc-400 mb-6">No scans recorded yet</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
            >
              Scan Your First Token →
            </Link>
            <Link
              href="/portfolio"
              className="inline-flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 hover:border-emerald-500/30 text-zinc-300 hover:text-emerald-400 font-semibold px-6 py-2.5 rounded-xl transition-all"
            >
              Scan Wallet Portfolio →
            </Link>
          </div>
        </div>
      )}

      {/* No filter results */}
      {!loading && tokens.length > 0 && filtered.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-zinc-400">No tokens match your filters</p>
          <button onClick={() => { setFilter('ALL'); setSearch(''); }} className="text-emerald-500 text-sm mt-2 cursor-pointer hover:text-emerald-400">
            Clear filters
          </button>
        </div>
      )}

      {/* Results */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2 stagger-children">
          <div className="hidden sm:grid grid-cols-[1fr_140px_100px_80px] gap-4 px-5 py-2 text-[11px] text-zinc-600 uppercase tracking-wider font-semibold">
            <span>Token Address</span>
            <span>Score</span>
            <span className="text-center">Risk</span>
            <span className="text-right">When</span>
          </div>

          {filtered.map((t, i) => (
            <Link
              key={`${t.address}-${t.timestamp}-${i}`}
              href={`/scan/${t.address}`}
              className="glass glass-hover rounded-xl px-3 sm:px-5 py-3 sm:py-4 transition-all block sm:grid sm:grid-cols-[1fr_140px_100px_80px] sm:gap-4 sm:items-center group"
            >
              <span className="text-sm group-hover:text-emerald-400 transition-colors break-all sm:break-normal flex items-center gap-2">
                {t.name ? (
                  <span className="flex items-center gap-1.5">
                    <span className="text-zinc-200 font-semibold">{t.name}</span>
                    {t.symbol && <span className="text-zinc-500 text-xs">({t.symbol})</span>}
                    <span className="font-mono text-zinc-600 text-xs hidden sm:inline">{shortenAddress(t.address)}</span>
                  </span>
                ) : (
                  <span className="font-mono text-zinc-300">{shortenAddress(t.address)}</span>
                )}
                <span className="inline-flex items-center text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400/70 font-medium shrink-0">✓ Attested</span>
              </span>
              <div className="mt-2 sm:mt-0">
                <ScoreBar score={t.score} riskLevel={t.riskLevel} />
              </div>
              <div className="mt-2 sm:mt-0 sm:text-center">
                <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium inline-block ${RISK_BG[t.riskLevel] || RISK_BG.CAUTION}`}>
                  {t.riskLevel}
                </span>
              </div>
              <span className="hidden sm:block text-right text-xs text-zinc-500">{timeAgo(t.timestamp)}</span>
            </Link>
          ))}
        </div>
      )}

      {/* CTA */}
      {!loading && tokens.length > 0 && (
        <div className="mt-8 sm:mt-10 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
          >
            Scan New Token →
          </Link>
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 bg-zinc-900/60 border border-zinc-800 hover:border-emerald-500/30 text-zinc-300 hover:text-emerald-400 font-semibold px-6 py-2.5 rounded-xl transition-all ml-3"
          >
            Scan Wallet Portfolio →
          </Link>
        </div>
      )}
    </div>
  );
}
