'use client';

import { useState, useCallback, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import type { PinioscanReport, ScanStatus, RiskCategory } from '../../../lib/types';
import { RISK_COLORS, RISK_BG, CATEGORY_ICONS, STATUS_MESSAGES } from '../../../lib/constants';
import { TokenLogo } from '../../../components/TokenLogo';
import { HolderChart } from '../../../components/HolderChart';
import { LiquidityPanel } from '../../../components/LiquidityPanel';
import { ScoreGauge } from '../../../components/ScoreGauge';
import { ScanProgressBar } from '../../../components/ScanProgressBar';
import { CategoryCard } from '../../../components/CategoryCard';
import { SkeletonReport } from '../../../components/SkeletonReport';
import { StickySearchBar } from '../../../components/StickySearchBar';

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function ScanPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const [report, setReport] = useState<PinioscanReport | null>(null);
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [scoreAnimating, setScoreAnimating] = useState(false);
  const [tokenPreview, setTokenPreview] = useState<{ name?: string; symbol?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanStarted = useRef(false);

  const isScanning = status === 'fetching' || status === 'analyzing' || status === 'attesting';

  const handleScan = useCallback(async () => {
    setError(''); setReport(null); setStatus('fetching'); setElapsed(0);

    const startTime = Date.now();
    timerRef.current = setInterval(() => setElapsed((Date.now() - startTime) / 1000), 100);
    let pendingReport: PinioscanReport | null = null;

    const finishScan = (rpt: PinioscanReport) => {
      const elapsed = Date.now() - startTime;
      const minDisplay = 500;
      if (elapsed < minDisplay) {
        setTimeout(() => {
          setReport(rpt);
          setStatus('complete');
          setScoreAnimating(true);
          setTimeout(() => setScoreAnimating(false), 1500);
        }, minDisplay - elapsed);
      } else {
        setReport(rpt);
        setStatus('complete');
        setScoreAnimating(true);
        setTimeout(() => setScoreAnimating(false), 1500);
      }
    };

    try {
      const res = await fetch(`/api/scan-stream?address=${encodeURIComponent(address)}`);
      if (!res.ok) {
        const body = await res.text();
        try { throw new Error(JSON.parse(body).error || `HTTP ${res.status}`); } catch { throw new Error(body || `HTTP ${res.status}`); }
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const match = line.match(/^data: (.+)$/m);
          if (!match) continue;
          try {
            const event = JSON.parse(match[1]);
            if (event.status === 'fetching') setStatus('fetching');
            else if (event.status === 'fetching_done') {
              setTokenPreview({ name: event.tokenName, symbol: event.tokenSymbol });
            } else if (event.status === 'analyzing') setStatus('analyzing');
            else if (event.status === 'attesting') setStatus('attesting');
            else if (event.status === 'complete') {
              pendingReport = event.data;
              finishScan(event.data);
            } else if (event.status === 'error') throw new Error(event.error);
          } catch (e: unknown) {
            const err = e as Error;
            if (err.message && err.message !== 'Unexpected end of JSON input') throw e;
          }
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Scan failed');
      setStatus('error');
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [address]);

  useEffect(() => {
    if (!scanStarted.current && address.match(/^0x[a-fA-F0-9]{40}$/)) {
      scanStarted.current = true;
      handleScan();
    }
  }, [address, handleScan]);

  // Dynamic page title
  useEffect(() => {
    if (report) {
      document.title = `${report.token.symbol} ${report.overallScore}/100 — ${report.riskLevel} | Pinioscan`;
    } else if (status === 'fetching' || status === 'analyzing') {
      document.title = `Scanning... | Pinioscan`;
    } else {
      document.title = `Pinioscan — AI Token Safety Scanner`;
    }
  }, [report, status]);

  return (
    <>
      {isScanning && (
        <div className="fixed top-0 left-0 right-0 z-50 overflow-hidden h-0.5">
          <div className="scan-progress w-full" />
        </div>
      )}

      <StickySearchBar />

      <div className="flex-1 max-w-5xl mx-auto w-full px-3 sm:px-6 py-8 sm:py-12">
        {/* Scanning state */}
        {isScanning && !report && (
          <div className="text-center py-8 sm:py-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Scanning token
            </div>

            <h1 className={`text-xl sm:text-2xl md:text-3xl font-black text-zinc-100 mb-2 break-words px-2 mt-6 ${tokenPreview?.name ? 'animate-token-reveal' : ''}`}>
              {tokenPreview?.name || 'Token Scan'}
              {tokenPreview?.symbol && <span className="text-zinc-500 font-normal ml-2">({tokenPreview.symbol})</span>}
            </h1>
            <p className="font-mono text-zinc-500 text-xs sm:text-sm mb-2 break-all px-4">{shortenAddress(address)}</p>

            <ScanProgressBar status={status} />

            <div className="mt-4 flex items-center justify-center gap-3">
              <span className="text-sm text-emerald-400/80">{STATUS_MESSAGES[status] || ''}</span>
              <span className="text-xs text-zinc-600 font-mono tabular-nums">{elapsed.toFixed(1)}s</span>
            </div>

            {/* Skeleton */}
            <div className="mt-10 sm:mt-12 space-y-6 max-w-3xl mx-auto">
              <div className="glass rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 sm:gap-8">
                <div className="w-[140px] h-[140px] sm:w-[160px] sm:h-[160px] rounded-full shimmer shrink-0" />
                <div className="flex-1 space-y-4 w-full">
                  <div className="h-8 shimmer rounded-lg w-48 mx-auto md:mx-0" />
                  <div className="h-4 shimmer rounded w-full" />
                  <div className="h-4 shimmer rounded w-3/4" />
                  <div className="h-16 shimmer rounded-xl w-full" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="glass rounded-2xl p-6 h-40 shimmer" />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="text-center py-12 sm:py-16">
            <div className="text-5xl mb-4">💔</div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-100 mb-4">Scan Failed</h1>
            <p className="text-red-400 mb-6 text-sm sm:text-base max-w-md mx-auto">{error}</p>
            <button
              onClick={() => { scanStarted.current = false; handleScan(); }}
              className="bg-gradient-to-b from-emerald-500 to-emerald-700 text-white font-bold px-8 py-3 rounded-2xl cursor-pointer hover:from-emerald-400 hover:to-emerald-600 transition-all"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Report */}
        {report && (
          <div className="space-y-4 sm:space-y-6 animate-fade-in-up">
            {/* Danger warning banner */}
            {(report.riskLevel === 'DANGER' || report.riskLevel === 'CRITICAL') && (
              <div className={`rounded-xl p-4 border flex items-center gap-3 ${
                report.riskLevel === 'CRITICAL'
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-orange-500/10 border-orange-500/30 text-orange-400'
              }`}>
                <span className="text-2xl shrink-0">{report.riskLevel === 'CRITICAL' ? '🚨' : '⚠️'}</span>
                <div>
                  <p className="font-bold text-sm">
                    {report.riskLevel === 'CRITICAL' ? 'High Risk — Do Not Interact' : 'Elevated Risk Detected'}
                  </p>
                  <p className="text-xs opacity-80 mt-0.5">
                    {report.riskLevel === 'CRITICAL'
                      ? 'This token shows critical red flags. Interacting with it could result in total loss of funds.'
                      : 'This token has significant risk factors. Proceed with extreme caution and do your own research.'}
                  </p>
                </div>
              </div>
            )}
            {/* Score card */}
            <div className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-8 md:p-10 flex flex-col md:flex-row items-center gap-5 sm:gap-10 overflow-hidden">
              <ScoreGauge score={report.overallScore} riskLevel={report.riskLevel} animate={scoreAnimating} size={140} />
              <div className="flex-1 min-w-0 text-center md:text-left w-full overflow-hidden">
                <div className="flex items-center gap-2 sm:gap-3 justify-center md:justify-start mb-3 flex-wrap min-w-0">
                  <TokenLogo address={report.token.address} size={36} />
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-zinc-100 tracking-tight break-words min-w-0 [overflow-wrap:anywhere]">
                    {report.token.name}
                    <span className="text-zinc-500 font-normal ml-1.5 sm:ml-2 text-base sm:text-lg md:text-xl">({report.token.symbol})</span>
                  </h1>
                  <span className={`text-xs px-3 py-1.5 rounded-full border font-bold uppercase tracking-wider shrink-0 animate-badge-pop ${RISK_BG[report.riskLevel]}`}>
                    {report.riskLevel}
                  </span>
                  {report.attestationTx && (
                    <a
                      href={`https://basescan.org/tx/${report.attestationTx}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs px-2.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold hover:bg-emerald-500/20 transition-all shrink-0 animate-badge-pop"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      Verified on Base
                      <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  )}
                </div>
                <p className="font-mono text-xs text-zinc-600 mb-3 break-all">{address}</p>
                <p className="text-zinc-400 mb-4 sm:mb-5 leading-relaxed text-sm sm:text-base">{report.summary}</p>
                <div className="glass rounded-xl p-3 sm:p-4">
                  <p className="text-xs sm:text-sm">
                    <span className="text-zinc-500 font-semibold">💡 Recommendation: </span>
                    <span className="text-zinc-300">{report.recommendation}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Flags — prominent position */}
            {report.flags.length > 0 && (
              <div className="glass rounded-2xl p-4 sm:p-5">
                <div className="flex flex-wrap gap-2">
                  {report.flags.map((flag, i) => {
                    const isGreen = flag.startsWith('🟢');
                    const isYellow = flag.startsWith('🟡');
                    const isRed = flag.startsWith('🔴') || flag.startsWith('🚩');
                    const borderColor = isGreen ? 'border-emerald-500/30 bg-emerald-500/5' : isYellow ? 'border-yellow-500/30 bg-yellow-500/5' : isRed ? 'border-red-500/30 bg-red-500/5' : 'border-zinc-700/50 bg-zinc-800/80';
                    return (
                      <span key={i} className={`text-xs sm:text-sm px-3 py-2 rounded-xl border text-zinc-300 ${borderColor}`}>
                        {flag}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Categories */}
            <div className="grid md:grid-cols-2 gap-3 sm:gap-4 stagger-children">
              {(Object.entries(report.categories) as [string, RiskCategory][]).map(([key, cat]) => (
                <CategoryCard key={key} category={cat} icon={CATEGORY_ICONS[key] || '📋'} />
              ))}
            </div>

            {/* Project Intel Card */}
            <div className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 border-emerald-500/10 bg-emerald-500/[0.02] animate-fade-in-up" style={{ animationDelay: '500ms' }}>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 sm:mb-4 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-emerald-500" /> Project Intel
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
                <div>
                  <div className="text-[10px] text-zinc-600 uppercase font-bold mb-1">Status</div>
                  <div className={`text-xs sm:text-sm font-bold flex items-center gap-1.5 ${report.token.isVerified ? 'text-emerald-400' : 'text-red-400'}`}>
                    {report.token.isVerified ? '✅ Verified' : '⚠️ Unverified'}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-zinc-600 uppercase font-bold mb-1">Owner</div>
                  <div className="text-xs sm:text-sm font-bold text-zinc-300 truncate font-mono">
                    {report.token.owner ? (
                      <a href={`https://basescan.org/address/${report.token.owner}`} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">
                        {report.token.owner.slice(0, 6)}...{report.token.owner.slice(-4)}
                      </a>
                    ) : 'Renounced'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-600 uppercase font-bold mb-1">Supply</div>
                  <div className="text-xs sm:text-sm font-bold text-zinc-300">
                    {Math.floor(Number(report.token.totalSupply) / Math.pow(10, report.token.decimals)).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-600 uppercase font-bold mb-1">Chain</div>
                  <div className="text-xs sm:text-sm font-bold text-zinc-300 flex items-center gap-1.5">
                    <img src="https://assets.coingecko.com/coins/images/27716/small/base.png" className="w-3.5 h-3.5" alt="Base" />
                    Base
                  </div>
                </div>
              </div>
            </div>

            {/* Data Panels */}
            {(report.topHolders?.length > 0 || report.liquidity?.length > 0) && (
              <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
                {report.topHolders?.length > 0 && <HolderChart holders={report.topHolders} />}
                {report.liquidity?.length > 0 && <LiquidityPanel pools={report.liquidity} />}
              </div>
            )}

            {/* Share Card */}
            <div className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-emerald-500/10 bg-gradient-to-br from-emerald-500/[0.03] to-transparent relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20" />
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 relative">
                <ScoreGauge score={report.overallScore} riskLevel={report.riskLevel} size={80} id="share-card" />
                <div className="flex-1 text-center sm:text-left min-w-0">
                  <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap mb-1">
                    <h3 className="text-lg sm:text-xl font-black text-zinc-100">{report.token.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${RISK_BG[report.riskLevel]}`}>
                      {report.riskLevel}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2">{report.summary}</p>
                  <p className="text-[10px] text-zinc-600 mt-2 font-medium tracking-wide">Scanned on Pinioscan · pinioscan.xyz</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col items-center gap-3 pt-2">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
                <button
                  onClick={() => {
                    const text = `🔍 Pinioscan: ${report.token.name} scored ${report.overallScore}/100 — ${report.riskLevel}\n\n${report.summary.slice(0, 180)}\n\nScan any Base token → pinioscan.xyz/scan/${address}`;
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="text-xs px-4 py-2.5 rounded-xl glass text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer flex items-center gap-2"
                >
                  𝕏 Share
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="text-xs px-4 py-2.5 rounded-xl glass text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer flex items-center gap-2"
                >
                  {copied ? '✅ Copied!' : '📋 Copy Link'}
                </button>
                <Link
                  href="/"
                  className="text-xs px-4 py-2.5 rounded-xl glass text-zinc-400 hover:text-emerald-400 transition-all flex items-center gap-2"
                >
                  🔍 New scan
                </Link>
              </div>
              {report.attestationTx && (
                <div className="text-xs text-zinc-600 flex items-center gap-1.5 flex-wrap justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Attested on Base:</span>
                  <a
                    href={`https://basescan.org/tx/${report.attestationTx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:text-emerald-400 font-mono transition-colors"
                  >
                    {report.attestationTx.slice(0, 10)}...{report.attestationTx.slice(-8)}
                  </a>
                </div>
              )}
              <p className="text-xs text-zinc-600 font-mono">Completed in {elapsed.toFixed(1)}s</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
