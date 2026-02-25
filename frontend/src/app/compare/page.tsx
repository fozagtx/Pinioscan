'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RISK_COLORS, RISK_BG, shortenAddress } from '../../lib/constants';
import { ScoreGauge } from '../../components/ScoreGauge';
import { TokenLogo } from '../../components/TokenLogo';
import { TokenPicker } from '../../components/TokenPicker';
import { HolderChart } from '../../components/HolderChart';
import { LiquidityPanel } from '../../components/LiquidityPanel';
import type { PinioscanReport, ScanStatus } from '../../lib/types';

function ComparisonBar({ label, scoreA, scoreB, colorA, colorB }: {
  label: string; scoreA: number; scoreB: number; colorA: string; colorB: string;
}) {
  const winner = scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'tie';
  return (
    <div className="glass rounded-xl p-3 sm:p-4">
      <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2">{label}</div>
      <div className="flex items-center gap-3">
        <span className={`text-sm sm:text-lg font-black w-8 text-right ${winner === 'A' ? '' : 'opacity-50'}`} style={{ color: colorA }}>{scoreA}</span>
        <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-zinc-800 gap-px">
          <div className="h-full rounded-l-full transition-all duration-700" style={{ width: `${scoreA}%`, backgroundColor: colorA }} />
          <div className="h-full rounded-r-full transition-all duration-700 ml-auto" style={{ width: `${scoreB}%`, backgroundColor: colorB }} />
        </div>
        <span className={`text-sm sm:text-lg font-black w-8 ${winner === 'B' ? '' : 'opacity-50'}`} style={{ color: colorB }}>{scoreB}</span>
      </div>
    </div>
  );
}

export default function ComparePage() {
  useEffect(() => { document.title = 'Pinioscan — Compare Tokens'; }, []);

  const [addr1, setAddr1] = useState('');
  const [addr2, setAddr2] = useState('');
  const [report1, setReport1] = useState<PinioscanReport | null>(null);
  const [report2, setReport2] = useState<PinioscanReport | null>(null);
  const [status1, setStatus1] = useState<ScanStatus>('idle');
  const [status2, setStatus2] = useState<ScanStatus>('idle');

  const runScan = async (address: string, side: 1 | 2) => {
    if (!address || address.length < 42) return;
    const setStatus = side === 1 ? setStatus1 : setStatus2;
    const setReport = side === 1 ? setReport1 : setReport2;
    setStatus('fetching'); setReport(null);

    try {
      const res = await fetch(`/api/scan-stream?address=${address}`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No reader');
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
            const data = JSON.parse(match[1]);
            if (data.status === 'complete') { setReport(data.data); setStatus('complete'); }
            else if (data.status === 'error') throw new Error(data.error);
            else setStatus(data.status);
          } catch (e: unknown) {
            const err = e as Error;
            if (err.message && err.message !== 'Unexpected end of JSON input') throw e;
          }
        }
      }
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  const handleCompare = () => { runScan(addr1, 1); runScan(addr2, 2); };
  const isScanning = (s: ScanStatus) => s === 'fetching' || s === 'analyzing' || s === 'attesting';
  const bothDone = report1 && report2;

  return (
    <div className="flex-1 max-w-6xl mx-auto w-full px-3 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-10 text-center hero-glow relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-xs font-medium mb-4 sm:mb-6">
          <span>⚔️</span> Side-by-Side Analysis
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-3 tracking-tight">
          <span className="bg-gradient-to-b from-zinc-100 to-zinc-400 bg-clip-text text-transparent">Compare </span>
          <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">Tokens</span>
        </h1>
        <p className="text-zinc-500 max-w-md mx-auto text-sm sm:text-base">Analyze two Base tokens side-by-side to find the safer play.</p>
      </div>

      {/* Input area */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {[
          { label: 'Token A', addr: addr1, setAddr: setAddr1, status: status1 },
          { label: 'Token B', addr: addr2, setAddr: setAddr2, status: status2 },
        ].map(({ label, addr, setAddr, status: s }) => (
          <div key={label} className="glass rounded-2xl p-4 sm:p-5">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 block">{label}</label>
            <TokenPicker value={addr} onChange={setAddr} placeholder="Search token or paste 0x..." />
            {isScanning(s) && (
              <div className="mt-2 text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                {s === 'fetching' ? 'Fetching data...' : s === 'analyzing' ? 'AI analyzing...' : 'Attesting...'}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Suggested comparisons */}
      {!addr1 && !addr2 && !report1 && !report2 && (
        <div className="max-w-2xl mx-auto mb-8 sm:mb-10">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold text-center mb-3">Try a comparison</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { a: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', b: '0x532f27101965dd16442E59d40670FaF5eBB142E4', labelA: 'USDC', labelB: 'BRETT', tag: 'Stable vs Meme' },
              { a: '0x4200000000000000000000000000000000000006', b: '0x940181a94A35A4569E4529A3CDfB74e38FD98631', labelA: 'WETH', labelB: 'AERO', tag: 'Blue chip vs Native' },
              { a: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', b: '0x0578d8A44db98B23BF096A382e016e29a5Ce0ffe', labelA: 'USDC', labelB: 'HIGHER', tag: 'Stable vs Meme' },
            ].map(({ a, b, labelA, labelB, tag }) => (
              <button
                key={tag}
                onClick={() => { setAddr1(a); setAddr2(b); }}
                className="glass rounded-xl p-4 text-left hover:border-emerald-500/30 hover:bg-emerald-500/[0.03] transition-all cursor-pointer group"
              >
                <div className="text-sm font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                  {labelA} <span className="text-zinc-600">vs</span> {labelB}
                </div>
                <div className="text-[10px] text-zinc-600 mt-1">{tag}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-center mb-8 sm:mb-12">
        <button
          onClick={handleCompare}
          disabled={!addr1 || !addr2 || isScanning(status1) || isScanning(status2)}
          className="bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 disabled:from-zinc-700 disabled:to-zinc-800 disabled:text-zinc-500 text-white font-bold px-8 sm:px-10 py-3.5 sm:py-4 rounded-2xl transition-all text-base sm:text-lg cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 disabled:shadow-none"
        >
          {status1 === 'idle' && status2 === 'idle' ? '⚔️ Compare' : '🔄 Re-scan'}
        </button>
      </div>

      {/* Head-to-head comparison */}
      {bothDone && (
        <div className="mb-8 sm:mb-10 space-y-3 animate-fade-in-up">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-emerald-500" /> Head to Head
          </h2>
          <div className="glass rounded-2xl p-4 sm:p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <TokenLogo address={report1.token.address} size={28} />
                <span className="font-bold text-zinc-200 text-sm truncate">{report1.token.symbol}</span>
              </div>
              <span className="text-xs text-zinc-600 font-bold uppercase">vs</span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-zinc-200 text-sm truncate">{report2.token.symbol}</span>
                <TokenLogo address={report2.token.address} size={28} />
              </div>
            </div>
            <ComparisonBar label="Overall Score" scoreA={report1.overallScore} scoreB={report2.overallScore} colorA={RISK_COLORS[report1.riskLevel]} colorB={RISK_COLORS[report2.riskLevel]} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(['contract', 'concentration', 'liquidity', 'trading'] as const).map(key => (
              <ComparisonBar
                key={key}
                label={report1.categories[key].name}
                scoreA={report1.categories[key].score}
                scoreB={report2.categories[key].score}
                colorA={RISK_COLORS[report1.riskLevel]}
                colorB={RISK_COLORS[report2.riskLevel]}
              />
            ))}
          </div>
          {/* Winner */}
          <div className="glass rounded-2xl p-4 sm:p-6 text-center border-emerald-500/10 bg-emerald-500/[0.02]">
            {report1.overallScore === report2.overallScore ? (
              <p className="text-zinc-400 font-medium">🤝 Both tokens scored equally — do your own research!</p>
            ) : (
              <>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-2">Safer Pick</p>
                <div className="flex items-center justify-center gap-3">
                  <TokenLogo address={(report1.overallScore > report2.overallScore ? report1 : report2).token.address} size={40} />
                  <div>
                    <p className="text-xl font-black text-emerald-400">
                      {(report1.overallScore > report2.overallScore ? report1 : report2).token.name}
                    </p>
                    <p className="text-sm text-zinc-500">
                      Score: {Math.max(report1.overallScore, report2.overallScore)}/100
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Token columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        <TokenColumn report={report1} side={1} />
        <TokenColumn report={report2} side={2} />
      </div>
    </div>
  );
}

function TokenColumn({ report, side }: { report: PinioscanReport | null; side: number }) {
  if (!report) return (
    <div className="glass rounded-2xl sm:rounded-3xl p-8 sm:p-12 flex flex-col items-center justify-center text-zinc-700 min-h-[300px] sm:min-h-[400px]">
      <div className="text-4xl sm:text-5xl mb-4 opacity-30">🪙</div>
      <p className="text-sm text-zinc-600 text-center">Paste an address above and hit Compare</p>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in-up">
      <div className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-8 relative overflow-hidden group">
        <div
          className="absolute top-0 right-0 w-32 h-32 blur-3xl -mr-16 -mt-16 group-hover:opacity-75 transition-all opacity-50"
          style={{ backgroundColor: `${RISK_COLORS[report.riskLevel]}20` }}
        />

        <div className="flex flex-col items-center gap-4 sm:gap-6 mb-6 sm:mb-8 relative">
          <ScoreGauge score={report.overallScore} riskLevel={report.riskLevel} size={120} animate id={`compare-${side}`} />
          <div className="text-center">
            <TokenLogo address={report.token.address} size={48} className="mb-3 mx-auto" />
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight break-words">{report.token.name}</h2>
            <div className="flex items-center gap-2 justify-center mt-1">
              <span className="text-zinc-500 font-mono text-sm">{report.token.symbol}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${RISK_BG[report.riskLevel]}`}>
                {report.riskLevel}
              </span>
            </div>
          </div>
        </div>

        <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed mb-5 sm:mb-6 italic text-center">
          &ldquo;{report.summary}&rdquo;
        </p>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {[
            { label: 'Contract', score: report.categories.contract.score },
            { label: 'Liquidity', score: report.categories.liquidity.score },
            { label: 'Holders', score: report.categories.concentration.score },
            { label: 'Trading', score: report.categories.trading.score },
          ].map(item => (
            <div key={item.label} className="bg-zinc-900/40 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-zinc-800/50">
              <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">{item.label}</div>
              <div className="text-sm font-black text-zinc-200">{item.score}/100</div>
            </div>
          ))}
        </div>
      </div>

      {report.topHolders?.length > 0 && <HolderChart holders={report.topHolders} />}
      {report.liquidity?.length > 0 && <LiquidityPanel pools={report.liquidity} />}
    </div>
  );
}
