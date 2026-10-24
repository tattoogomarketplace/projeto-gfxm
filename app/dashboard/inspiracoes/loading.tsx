export default function InspiracoesLoading() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 z-0 min-h-0 w-full max-w-none overflow-x-hidden overflow-y-auto overscroll-none bg-[#121212] pb-[calc(env(safe-area-inset-bottom)+5rem)] [-webkit-overflow-scrolling:touch]"
    >
      <div className="px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/10 border-l-2 border-l-[#F97316] bg-[#121212]/70 p-3 backdrop-blur-md">
          <div className="h-9 w-9 rounded-xl bg-orange-500/15" />
          <div className="flex flex-col gap-1.5">
            <div className="h-4 w-40 rounded bg-zinc-800" />
            <div className="h-2.5 w-16 rounded bg-zinc-900" />
          </div>
        </div>
      </div>
      <div className="sticky top-0 z-20 bg-[#121212]/80 px-4 pb-3 pt-1 backdrop-blur-md">
        <div className="flex gap-2 overflow-hidden">
          <div className="h-11 w-24 shrink-0 rounded-2xl border border-white/10 bg-white/5" />
          <div className="h-11 w-28 shrink-0 rounded-2xl border border-white/10 bg-white/5" />
          <div className="h-11 w-24 shrink-0 rounded-2xl border border-white/10 bg-white/5" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1 md:grid-cols-3">
        {Array.from({ length: 9 }, (_, index) => (
          <div key={index} className="aspect-square bg-zinc-900" />
        ))}
      </div>
    </div>
  );
}
