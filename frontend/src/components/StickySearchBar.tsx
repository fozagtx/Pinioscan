'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TokenPicker } from './TokenPicker';

export function StickySearchBar() {
  const [value, setValue] = useState('');
  const router = useRouter();

  const handleScan = () => {
    const addr = value.trim();
    if (addr.match(/^0x[a-fA-F0-9]{40}$/)) {
      router.push(`/scan/${addr}`);
      setValue('');
    }
  };

  return (
    <div className="sticky top-[53px] sm:top-[57px] z-30 backdrop-blur-xl bg-[#050507]/60 border-b border-zinc-800/20">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-2 flex items-center gap-2">
        <span className="text-emerald-500 text-sm shrink-0">🔍</span>
        <div className="flex-1 min-w-0">
          <TokenPicker
            value={value}
            onChange={setValue}
            placeholder="Scan another token..."
            compact
          />
        </div>
        <button
          onClick={handleScan}
          disabled={!value.match(/^0x[a-fA-F0-9]{40}$/)}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          Scan
        </button>
      </div>
    </div>
  );
}
