'use client';

import type { ScanStatus } from '../lib/types';

const STEP_COLORS: Record<string, string> = {
  fetching: '#10b981',
  analyzing: '#6366f1',
  attesting: '#f59e0b',
};

export function ScanAnimation({ status }: { status: ScanStatus }) {
  const color = STEP_COLORS[status] || '#10b981';

  return (
    <div className="scan-animation-container" style={{ '--scan-color': color } as React.CSSProperties}>
      {/* Outer rotating ring */}
      <div className="scan-ring scan-ring-outer" />
      {/* Middle pulsing ring */}
      <div className="scan-ring scan-ring-middle" />
      {/* Inner glow */}
      <div className="scan-ring scan-ring-inner" />
      {/* Center icon */}
      <div className="scan-center-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          {status === 'fetching' && (
            <path className="scan-icon-draw" d="M12 8v4m0 4h.01" />
          )}
          {status === 'analyzing' && (
            <path className="scan-icon-draw" d="M9 12l2 2 4-4" />
          )}
          {status === 'attesting' && (
            <path className="scan-icon-draw" d="M9 12l2 2 4-4" />
          )}
        </svg>
      </div>
      {/* Floating particles */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="scan-particle"
          style={{
            '--particle-delay': `${i * 0.4}s`,
            '--particle-angle': `${i * 45}deg`,
          } as React.CSSProperties}
        />
      ))}
      {/* Data streams */}
      {[...Array(6)].map((_, i) => (
        <div
          key={`stream-${i}`}
          className="scan-data-stream"
          style={{
            '--stream-delay': `${i * 0.6}s`,
            '--stream-angle': `${i * 60}deg`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
