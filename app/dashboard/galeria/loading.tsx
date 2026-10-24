export default function GaleriaLoading() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 z-0 min-h-0 w-full max-w-none overflow-x-hidden overflow-y-auto overscroll-none bg-[#0a0a0c] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-950/20 via-[#0a0a0c] to-[#050505] pb-[var(--dock-clearance)] [-webkit-overflow-scrolling:touch]"
    >
      <div className="px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/5 border-l-2 border-l-[#F97316] bg-[#121212]/60 p-3 backdrop-blur-sm">
          <div className="h-7 w-7 rounded-md bg-orange-500/10" />
          <div className="h-4 w-40 rounded bg-zinc-800" />
        </div>
      </div>
      <div className="sticky top-0 z-20 flex gap-2 bg-transparent px-4 pb-2 pt-[max(env(safe-area-inset-top),0.5rem)] pointer-events-none">
        <div className="flex w-full items-center justify-center gap-2 overflow-x-auto no-scrollbar">
          <div className="h-11 min-w-[96px] shrink-0 rounded-full border border-white/15 bg-[#121212]/20 backdrop-blur-lg" />
          <div className="h-11 min-w-[96px] shrink-0 rounded-full border border-white/15 bg-[#121212]/20 backdrop-blur-lg" />
          <div className="h-11 min-w-[96px] shrink-0 rounded-full border border-white/15 bg-[#121212]/20 backdrop-blur-lg" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-[1px]">
        {Array.from({ length: 9 }, (_, index) => (
          <div key={index} className="relative w-full aspect-[9/16] overflow-hidden bg-white/5" />
        ))}
      </div>
    </div>
  );
}
