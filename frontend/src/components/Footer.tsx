import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-zinc-800/30 py-6 sm:py-8 px-3 sm:px-6 mt-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-xs text-zinc-600">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-500">Pinioscan</span>
              <span className="hidden sm:inline">•</span>
            </div>
            <span>AI-powered token safety for Base</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 text-xs text-zinc-600">
            <Link href="/" className="hover:text-emerald-400 transition-colors">Scan</Link>
            <Link href="/compare" className="hover:text-emerald-400 transition-colors">Compare</Link>
            <Link href="/history" className="hover:text-emerald-400 transition-colors">History</Link>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-zinc-800/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-600">
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub
            </a>
            <span className="text-zinc-800">•</span>
            <a href="https://basescan.org" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">Base Contract</a>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-emerald-500/70 text-[10px] font-medium">
            ✨ Powered by Pinion + Base
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-zinc-800/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-zinc-700">
          <span>🤖 Powered by AI (Gemini) + Base Attestation</span>
          <span>© {new Date().getFullYear()} Pinioscan · Not financial advice. Always DYOR.</span>
        </div>
      </div>
    </footer>
  );
}
