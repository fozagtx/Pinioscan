import type { ScanStatus } from '../lib/types';
import { SCAN_STEPS } from '../lib/constants';

export function ScanProgressBar({ status }: { status: ScanStatus }) {
  const stepIndex = SCAN_STEPS.findIndex(s => s.key === status);
  return (
    <div className="flex items-center gap-1 sm:gap-2 max-w-sm sm:max-w-md mx-auto mt-6">
      {SCAN_STEPS.map((step, i) => {
        const isActive = step.key === status;
        const isDone = i < stepIndex || status === 'complete';
        return (
          <div key={step.key} className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
            {/* Step circle */}
            <div className={`
              step-circle relative w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm transition-all duration-500
              ${isDone ? 'step-done bg-emerald-500/20 text-emerald-400' :
                isActive ? 'step-active bg-emerald-500/10 text-emerald-400' :
                'bg-zinc-800/50 text-zinc-600'}
            `}>
              {isDone ? (
                <svg className="checkmark-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path className="checkmark-path" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className={isActive ? 'step-icon-pulse' : ''}>{step.icon}</span>
              )}
              {isActive && <div className="step-ripple" />}
            </div>
            {/* Label */}
            <span className={`text-xs font-semibold hidden sm:inline transition-all duration-500 ${
              isActive ? 'text-emerald-400 step-label-glow' : isDone ? 'text-zinc-400' : 'text-zinc-600'
            }`}>
              {step.label}
            </span>
            {/* Connecting line */}
            {i < SCAN_STEPS.length - 1 && (
              <div className="flex-1 h-px relative overflow-hidden">
                <div className={`absolute inset-0 transition-all duration-500 ${isDone ? 'bg-emerald-500/40' : 'bg-zinc-800'}`} />
                {isDone && <div className="step-line-fill" />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
