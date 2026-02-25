'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ethers } from 'ethers';
import { ScoreGauge } from '@/components/ScoreGauge';
import { RISK_BG } from '@/lib/constants';

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
}

interface ScanResult {
  address: string;
  name: string;
  symbol: string;
  score: number | null;
  riskLevel: string | null;
  scanning: boolean;
  error?: string;
}

export default function PortfolioPage() {
  const [wallet, setWallet] = useState('');
  const [results, setResults] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const scanToken = useCallback(async (token: TokenInfo, index: number) => {
    try {
      const res = await fetch(`/api/scan-stream?address=${token.address}`);
      if (!res.body) throw new Error('No stream');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let score: number | null = null;
      let riskLevel: string | null = null;
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const match = part.match(/^data: (.+)$/m);
          if (!match) continue;
          try {
            const evt = JSON.parse(match[1]);
            if (evt.status === 'complete' && evt.data) {
              score = evt.data.overallScore;
              riskLevel = evt.data.riskLevel;
            }
          } catch {}
        }
      }

      setResults(prev => prev.map((r, i) =>
        i === index ? { ...r, score, riskLevel, scanning: false } : r
      ));
    } catch {
      setResults(prev => prev.map((r, i) =>
        i === index ? { ...r, scanning: false, error: 'Scan failed' } : r
      ));
    }
  }, []);

  const handleScan = async () => {
    if (!ethers.isAddress(wallet)) {
      setError('Invalid wallet address');
      return;
    }
    setError('');
    setLoading(true);
    setResults([]);

    try {
      const res = await fetch(`/api/portfolio?address=${wallet}`);
      const data = await res.json();

      if (!data.tokens || data.tokens.length === 0) {
        setError('No ERC-20 tokens found for this wallet');
        setLoading(false);
        return;
      }

      const initial: ScanResult[] = data.tokens.map((t: TokenInfo) => ({
        address: t.address,
        name: t.name,
        symbol: t.symbol,
        score: null,
        riskLevel: null,
        scanning: true,
      }));
      setResults(initial);
      setLoading(false);

      // Scan tokens in parallel batches of 3
      const CONCURRENCY = 3;
      for (let i = 0; i < initial.length; i += CONCURRENCY) {
        const batch = initial.slice(i, i + CONCURRENCY);
        await Promise.all(
          batch.map((_, j) => scanToken(data.tokens[i + j], i + j))
        );
      }
    } catch {
      setError('Failed to fetch portfolio');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-2">
          🔬 Portfolio Scanner
        </h1>
        <p className="text-sm text-zinc-500">
          Paste a Base wallet address to scan all tokens
        </p>
      </div>

      {/* Empty state */}
      {results.length === 0 && !loading && !error && (
        <div className="max-w-xl mx-auto mb-8 glass rounded-2xl p-6 sm:p-8 text-center">
          <div className="text-5xl mb-4">👛</div>
          <h2 className="text-lg font-bold text-zinc-200 mb-2">How it works</h2>
          <p className="text-sm text-zinc-500 mb-4 leading-relaxed">
            Enter any Base wallet address and we&apos;ll discover all ERC-20 tokens held, then run a Pinioscan safety scan on each one. You&apos;ll get a full risk overview of the entire portfolio.
          </p>
          <button
            onClick={() => setWallet('0xF977814e90dA44bFA03b6295A0616a897441aceC')}
            className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors cursor-pointer font-mono bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-3 py-2"
          >
            Try example: 0xF977...aceC
          </button>
        </div>
      )}

      {/* Input */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={wallet}
            onChange={e => setWallet(e.target.value.trim())}
            onKeyDown={e => e.key === 'Enter' && handleScan()}
            placeholder="0x... Base wallet address"
            className="flex-1 bg-zinc-900/60 border border-zinc-800/50 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 font-mono"
          />
          <button
            onClick={handleScan}
            disabled={loading}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
          >
            {loading ? 'Loading...' : 'Scan'}
          </button>
        </div>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto mb-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-zinc-900/40 border border-zinc-800/30 rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-zinc-800 rounded w-24 mb-2" />
              <div className="h-3 bg-zinc-800 rounded w-16 mb-4" />
              <div className="flex justify-center py-4">
                <div className="w-20 h-20 rounded-full bg-zinc-800" />
              </div>
              <div className="h-2 bg-zinc-800 rounded w-full mt-3" />
            </div>
          ))}
        </div>
      )}

      {/* Warning */}
      {results.length > 0 && (
        <div className="max-w-2xl mx-auto mb-6 bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-4 py-3 text-xs text-yellow-400/80 text-center">
          {results.some(r => r.scanning)
            ? `⏱️ Scanned ${results.filter(r => !r.scanning).length} of ${results.length} tokens...`
            : `✅ Scanned ${results.length} tokens`}
        </div>
      )}

      {/* Wallet label */}
      {results.length > 0 && (
        <p className="text-xs text-zinc-600 font-mono text-center mb-6 truncate">
          Wallet: {wallet}
        </p>
      )}

      {/* Results grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((r, i) => (
          <Link
            key={r.address}
            href={`/scan/${r.address}`}
            className="block bg-zinc-900/40 border border-zinc-800/30 rounded-2xl p-5 hover:border-emerald-500/30 transition-all hover:bg-zinc-900/60 group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-zinc-200 truncate group-hover:text-emerald-400 transition-colors">
                  {r.name || 'Unknown'}
                </h3>
                <p className="text-xs text-zinc-500 font-mono">{r.symbol}</p>
              </div>
              {r.riskLevel && (
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${RISK_BG[r.riskLevel] || 'text-zinc-400 border-zinc-700'}`}>
                  {r.riskLevel}
                </span>
              )}
            </div>

            {r.scanning ? (
              <div className="flex items-center justify-center py-4">
                <div className="flex gap-1">
                  {[0, 1, 2].map(j => (
                    <div
                      key={j}
                      className="w-2 h-2 rounded-full bg-emerald-500/60 animate-pulse"
                      style={{ animationDelay: `${j * 200}ms` }}
                    />
                  ))}
                </div>
                <span className="text-xs text-zinc-500 ml-2">Scanning...</span>
              </div>
            ) : r.error ? (
              <p className="text-xs text-red-400 py-4 text-center">{r.error}</p>
            ) : r.score !== null ? (
              <div className="flex justify-center">
                <ScoreGauge score={r.score} riskLevel={r.riskLevel || 'caution'} size={90} id={`port-${i}`} />
              </div>
            ) : (
              <div className="flex items-center justify-center py-4 gap-2">
                <span className="text-xs text-zinc-600">Tap to scan →</span>
              </div>
            )}

            <p className="text-[10px] text-zinc-700 font-mono mt-3 truncate">{r.address}</p>
          </Link>
        ))}
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-zinc-900/40 border border-zinc-800/30 rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-zinc-800/50 rounded w-2/3 mb-2" />
              <div className="h-3 bg-zinc-800/30 rounded w-1/3 mb-4" />
              <div className="h-20 bg-zinc-800/20 rounded-xl" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
