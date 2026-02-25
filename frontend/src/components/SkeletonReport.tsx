export function SkeletonReport({ tokenName, tokenSymbol }: { tokenName?: string; tokenSymbol?: string }) {
  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-8 flex flex-col md:flex-row items-center gap-8">
        <div className="w-[160px] h-[160px] rounded-full shimmer" />
        <div className="flex-1 space-y-4 w-full">
          {tokenName ? (
            <h2 className="text-2xl font-bold text-zinc-100 animate-token-reveal">
              {tokenName} <span className="text-zinc-500">({tokenSymbol})</span>
            </h2>
          ) : (
            <div className="h-8 shimmer rounded-lg w-48" />
          )}
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
  );
}
