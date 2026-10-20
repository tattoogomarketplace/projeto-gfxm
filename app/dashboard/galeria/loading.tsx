export default function GaleriaLoading() {
  return (
    <div
      aria-hidden
      className="relative h-[100dvh] w-full overflow-y-auto bg-[#050505] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(249,115,22,0.05),rgba(255,255,255,0))] pb-[calc(env(safe-area-inset-bottom)+8rem)]"
    >
      <div className="sticky top-0 z-40 border-b border-white/[0.04] bg-[#050505]/70 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <div className="h-10 w-10 rounded-lg bg-orange-500/10" />
          <div className="h-6 w-56 rounded-lg bg-zinc-800" />
        </div>
        <div className="flex gap-3 overflow-hidden px-4 pb-2">
          <div className="h-14 min-w-[110px] rounded-xl border border-zinc-800 bg-zinc-900" />
          <div className="h-14 min-w-[110px] rounded-xl border border-zinc-800 bg-zinc-900" />
          <div className="h-14 min-w-[110px] rounded-xl border border-zinc-800 bg-zinc-900" />
        </div>
      </div>
      <div className="flex w-full flex-col px-0">
        <div className="relative mb-8 flex w-full flex-col">
          <div className="flex items-center justify-between bg-transparent px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full border border-zinc-800 bg-zinc-800 shadow-lg" />
              <div className="flex flex-col gap-1">
                <div className="h-3 w-28 rounded bg-zinc-800" />
                <div className="h-2.5 w-20 rounded bg-zinc-900" />
              </div>
            </div>
            <div className="h-7 w-16 rounded-full border border-white/5 bg-zinc-800/50" />
          </div>
          <div className="relative z-0 aspect-[4/5] w-full bg-zinc-900" />
          <div className="relative z-30 mx-4 -mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-zinc-800/80 px-5 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.8)] backdrop-blur-2xl">
            <div className="flex items-center gap-5">
              <div className="h-6 w-6 rounded bg-zinc-700" />
              <div className="h-6 w-6 rounded bg-zinc-700" />
              <div className="h-6 w-6 rounded bg-zinc-700" />
            </div>
            <div className="h-6 w-6 rounded bg-zinc-700" />
          </div>
          <div className="flex flex-col gap-1 px-4 pt-4">
            <div className="h-3 w-40 rounded bg-zinc-800" />
            <div className="h-3 w-full rounded bg-zinc-900" />
          </div>
        </div>
      </div>
    </div>
  );
}
