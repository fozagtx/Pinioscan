'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RISK_COLORS } from '../lib/constants';

export function ScoreGauge({ score, riskLevel, animate, size = 160, id }: {
  score: number; riskLevel: string; animate?: boolean; size?: number; id?: string;
}) {
  const color = RISK_COLORS[riskLevel] || '#eab308';
  const r = (size - 16) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const [displayScore, setDisplayScore] = useState(animate ? 0 : score);
  const [showComplete, setShowComplete] = useState(false);
  const animatedRef = useRef(false);

  useEffect(() => {
    if (!animate || animatedRef.current) {
      setDisplayScore(score);
      return;
    }
    animatedRef.current = true;
    setShowComplete(true);
    setTimeout(() => setShowComplete(false), 1200);

    const duration = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [animate, score]);

  return (
    <div
      className={`relative inline-flex items-center justify-center score-glow ${animate ? 'animate-score-pop' : ''}`}
      style={{ '--glow-color': `${color}40` } as React.CSSProperties}
    >
      {/* Scan complete flash */}
      {showComplete && <div className="score-complete-flash" style={{ '--flash-color': color } as React.CSSProperties} />}

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={`grad-score-${id || 'main'}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={`${color}99`} />
          </linearGradient>
          <filter id={`shadow-${id || 'main'}`}>
            <feDropShadow dx="0" dy="0" stdDeviation={size < 120 ? 1.5 : 3} floodColor={color} />
          </filter>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(39,39,42,0.3)" strokeWidth="12" />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={`url(#grad-score-${id || 'main'})`} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={animate ? circumference : offset}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          filter={`url(#shadow-${id || 'main'})`}
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-black tracking-tight tabular-nums leading-none" style={{ color, fontSize: size * 0.28 }}>{displayScore}</span>
        {size >= 120 && <span className="text-zinc-500 uppercase tracking-[0.2em]" style={{ fontSize: Math.max(8, size * 0.06), marginTop: size * 0.01 }}>out of 100</span>}
      </div>
    </div>
  );
}
