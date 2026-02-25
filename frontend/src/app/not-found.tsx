import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-20">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-emerald-500/20 mx-auto mb-6">
          ✓
        </div>
        <h1 className="text-5xl font-black text-zinc-100 mb-2">404</h1>
        <p className="text-lg text-zinc-500 mb-2">This token doesn&apos;t exist... yet 👀</p>
        <p className="text-sm text-zinc-600 mb-8">Or maybe it rugged. Either way, nothing to see here.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white font-bold px-6 py-3 rounded-2xl transition-all shadow-lg shadow-emerald-500/20"
        >
          🔍 Scan a Token
        </Link>
      </div>
    </div>
  );
}
