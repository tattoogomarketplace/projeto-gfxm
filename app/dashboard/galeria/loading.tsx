export default function GaleriaLoading() {
  return (
    <div
      aria-hidden
      className="relative min-h-0 w-full max-w-none flex-1 overflow-x-hidden overflow-y-auto overscroll-none bg-[#0a0a0c] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-950/20 via-[#0a0a0c] to-[#050505] pb-4 [-webkit-overflow-scrolling:touch]"
    >
      <div className="px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/5 border-l-2 border-l-[#F97316] bg-[#121212]/60 p-3 backdrop-blur-sm">
          <div className="h-7 w-7 rounded-md bg-orange-500/10" />
          <div className="h-4 w-40 rounded bg-zinc-800" />
        </div>
      </div>
      <div className="sticky top-0 z-50 flex gap-2 bg-transparent px-4 pb-2 pt-[max(env(safe-area-inset-top),0.5rem)] pointer-events-none">
        <div className="flex w-full items-center justify-center gap-2 overflow-x-auto no-scrollbar">
          <div className="h-11 min-w-[96px] shrink-0 rounded-full border border-white/15 bg-[#121212]/20 backdrop-blur-lg" />
          <div className="h-11 min-w-[96px] shrink-0 rounded-full border border-white/15 bg-[#121212]/20 backdrop-blur-lg" />
          <div className="h-11 min-w-[96px] shrink-0 rounded-full border border-white/15 bg-[#121212]/20 backdrop-blur-lg" />
        </div>
      </div>
      <div className="flex w-full max-w-none flex-col px-0 mx-0">
        <article className="flex flex-col w-full max-w-none relative mb-2 px-0 mx-0">
          <div className="flex items-center justify-between px-4 py-3 w-full bg-transparent">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-zinc-800 object-cover ring-1 ring-white/10" />
              <div className="flex flex-col gap-1">
                <div className="h-3 w-28 rounded bg-zinc-800" />
                <div className="h-2.5 w-20 rounded bg-zinc-900" />
              </div>
            </div>
            <div className="h-7 w-[5.5rem] rounded-full border border-orange-500/30 bg-orange-500/5 shadow-[0_0_10px_rgba(249,115,22,0.05)]" />
          </div>
          <div className="w-full max-w-none aspect-[4/5] relative bg-[#050505] rounded-[12px] border border-white/10 overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none z-10"></div>
          </div>
          <div
            className="relative mx-3 mb-4 mt-2 p-4 rounded-2xl flex flex-col gap-4 overflow-hidden border border-white/10 shadow-2xl"
            style={{
              backgroundColor: 'rgba(18, 18, 20, 0.4)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          >
          <div className="w-full max-w-none rounded-[12px] border border-white/10 bg-zinc-950/60 backdrop-blur-md overflow-hidden my-1">
            <div className="flex w-full items-center justify-between gap-1 px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="h-10 w-10 rounded-xl border border-white/10 bg-white/[0.02]" />
                <div className="h-3 w-7 rounded bg-zinc-800" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-10 w-10 rounded-xl border border-white/10 bg-white/[0.02]" />
                <div className="h-3 w-6 rounded bg-zinc-800" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-10 w-10 rounded-xl border border-white/10 bg-white/[0.02]" />
                <div className="h-3 w-5 rounded bg-zinc-800" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-10 w-10 rounded-xl border border-white/10 bg-white/[0.02]" />
                <div className="h-3 w-6 rounded bg-zinc-800" />
              </div>
            </div>
          </div>
          <div className="w-full max-w-none bg-[#0a0a0c] border border-white/[0.04] rounded-[24px] p-4 mt-2 mb-4 shadow-lg">
            <div className="h-3.5 w-32 rounded bg-zinc-800" />
            <div className="mt-1.5 h-3 w-full rounded bg-zinc-900" />
            <div className="mt-2 h-3 w-24 rounded bg-zinc-800" />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar scroll-smooth">
            <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 border border-white/5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FF6600] shadow-[0_0_8px_rgba(255,102,0,0.8)]" />
              <div className="h-2.5 w-10 rounded bg-zinc-700" />
              <div className="h-3 w-6 rounded bg-zinc-600" />
            </div>
            <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 border border-white/5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FF6600] shadow-[0_0_8px_rgba(255,102,0,0.8)]" />
              <div className="h-2.5 w-10 rounded bg-zinc-700" />
              <div className="h-3 w-8 rounded bg-zinc-600" />
            </div>
            <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 border border-white/5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FF6600] shadow-[0_0_8px_rgba(255,102,0,0.8)]" />
              <div className="h-2.5 w-8 rounded bg-zinc-700" />
              <div className="h-3 w-16 rounded bg-zinc-600" />
            </div>
          </div>
          </div>
        </article>
      </div>
    </div>
  );
}
