export default function GaleriaLoading() {
  return (
    <div
      aria-hidden
      className="min-h-[100dvh] w-full bg-[#0a0a0c] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-950/20 via-[#0a0a0c] to-[#050505] pb-[calc(env(safe-area-inset-bottom)+8rem)] overflow-y-auto"
    >
      <div className="relative px-4 pt-6 pb-2 w-full flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-orange-500/10" />
        <div className="h-6 w-56 rounded-lg bg-zinc-800" />
      </div>
      <div className="sticky top-0 z-50 w-full px-4 pt-3 pb-3 bg-[#0a0a0c]/80 supports-[backdrop-filter]:bg-[#0a0a0c]/60 backdrop-blur-3xl border-b border-white/[0.04] shadow-md flex items-center gap-2 overflow-x-auto no-scrollbar">
        <div className="h-14 min-w-[110px] rounded-xl border border-zinc-800 bg-zinc-900" />
        <div className="h-14 min-w-[110px] rounded-xl border border-zinc-800 bg-zinc-900" />
        <div className="h-14 min-w-[110px] rounded-xl border border-zinc-800 bg-zinc-900" />
      </div>
      <div className="flex w-full flex-col px-0">
        <article className="flex flex-col w-full mb-0 relative">
          <div className="w-full relative aspect-[4/5] bg-black">
            <div className="absolute inset-0 bg-zinc-950" />
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none z-10"></div>
            <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent pointer-events-none z-10"></div>
            <div className="absolute top-4 inset-x-4 z-20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-zinc-800 object-cover ring-2 ring-white/20" />
                <div className="flex flex-col gap-1">
                  <div className="h-3 w-28 rounded bg-zinc-800" />
                  <div className="h-2.5 w-20 rounded bg-zinc-900" />
                </div>
              </div>
              <div className="h-8 w-[5.5rem] rounded-full border border-orange-500/30 bg-orange-500/10" />
            </div>
            <div className="absolute bottom-6 inset-x-4 z-20 flex items-center justify-between px-6 py-3.5 bg-black/40 supports-[backdrop-filter]:bg-black/20 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-8">
                <div className="h-6 w-6 rounded bg-zinc-700" />
                <div className="h-6 w-6 rounded bg-zinc-700" />
              </div>
              <div className="h-6 w-6 rounded bg-zinc-700" />
            </div>
          </div>
          <div className="px-4 pt-5 pb-8 flex flex-col gap-1.5 bg-[#050505]">
            <div className="h-3 w-40 rounded bg-zinc-800" />
            <div className="h-3 w-full rounded bg-zinc-900" />
          </div>
          <div className="w-full h-12 flex items-center justify-center gap-2 mt-8 mb-16 opacity-70 select-none">
            <div className="flex items-end gap-[3px]">
              <div className="w-[1px] h-2 bg-zinc-600"></div>
              <div className="w-[1px] h-3 bg-zinc-500"></div>
              <div className="w-[1px] h-4 bg-orange-500/80 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>
              <div className="w-[1px] h-2 bg-zinc-600"></div>
            </div>
            <div className="flex-1 mx-6 relative flex items-center justify-center">
              <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-orange-500/40 to-transparent"></div>
              <div className="absolute w-3/4 h-8 bg-orange-500/10 blur-xl rounded-full pointer-events-none"></div>
            </div>
            <div className="flex items-center gap-[4px]">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500/80 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>
              <div className="w-1 h-1 rounded-full bg-zinc-500"></div>
              <div className="w-[2px] h-[2px] rounded-full bg-zinc-600"></div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
