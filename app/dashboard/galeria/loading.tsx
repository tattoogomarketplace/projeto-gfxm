export default function GaleriaLoading() {
  return (
    <div
      aria-hidden
      className="min-h-[100dvh] w-full max-w-none px-0 mx-0 bg-[#0a0a0c] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-950/20 via-[#0a0a0c] to-[#050505] pb-[calc(env(safe-area-inset-bottom)+8rem)] overflow-y-auto"
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
      <div className="flex w-full max-w-none flex-col px-0 mx-0">
        <article className="flex flex-col w-full max-w-none relative mb-8 px-0 mx-0">
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
          <div className="w-full max-w-none aspect-[4/5] relative bg-[#050505] rounded-none border-l-0 border-r-0 border-b border-white/10 px-0 mx-0 mb-0" />
          <div className="w-full max-w-none mt-0 px-0 mx-0 border-y border-white/10 bg-zinc-950/40 backdrop-blur-md border-l-0 border-r-0 rounded-none">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-8">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 bg-white/[0.02]" />
                <div className="flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 bg-white/[0.02]" />
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 bg-white/[0.02]" />
            </div>
          </div>
          <div className="px-4 pt-4 pb-8 flex flex-col gap-1.5">
            <div className="h-3 w-40 rounded bg-zinc-800" />
            <div className="h-3 w-full rounded bg-zinc-900" />
          </div>
          <div className="w-full h-16 flex items-center justify-center gap-1.5 opacity-80 mb-6 mt-2">
            <div className="w-[1px] h-3 bg-zinc-700"></div>
            <div className="w-[2px] h-5 bg-orange-600 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>
            <div className="w-[1px] h-3 bg-zinc-700"></div>
            <div className="flex-1 max-w-[120px] h-[1px] bg-gradient-to-r from-orange-500/50 via-zinc-800 to-transparent mx-3"></div>
          </div>
        </article>
      </div>
    </div>
  );
}
