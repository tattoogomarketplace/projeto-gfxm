export default function GaleriaLoading() {
  return (
    <div
      aria-hidden
      className="relative h-[100dvh] w-full overflow-y-auto"
    >
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#030303]">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />
        <div
          className="absolute -top-[20%] -left-[10%] h-[70vw] w-[70vw] animate-pulse rounded-full bg-orange-600/5 blur-[120px]"
          style={{ animationDuration: '8s' }}
        />
        <div
          className="absolute top-[40%] -right-[20%] h-[60vw] w-[60vw] animate-pulse rounded-full bg-orange-500/5 blur-[100px]"
          style={{ animationDuration: '12s', animationDelay: '2s' }}
        />
        <div
          className="absolute -bottom-[20%] left-[20%] h-[80vw] w-[80vw] animate-pulse rounded-full bg-orange-900/10 blur-[150px]"
          style={{ animationDuration: '10s', animationDelay: '4s' }}
        />
      </div>
      <div className="relative z-10 min-h-[100dvh] w-full pb-[calc(env(safe-area-inset-bottom)+8rem)]">
        <div className="relative flex w-full items-center gap-3 px-4 pt-6 pb-2">
          <div className="h-10 w-10 rounded-lg bg-orange-500/10" />
          <div className="h-6 w-56 rounded-lg bg-zinc-800" />
        </div>
        <div className="sticky top-0 z-50 flex w-full items-center gap-2 overflow-x-auto border-b border-white/[0.04] bg-transparent px-4 pt-3 pb-3 no-scrollbar shadow-md backdrop-blur-3xl">
          <div className="h-14 min-w-[110px] rounded-xl border border-zinc-800 bg-zinc-900" />
          <div className="h-14 min-w-[110px] rounded-xl border border-zinc-800 bg-zinc-900" />
          <div className="h-14 min-w-[110px] rounded-xl border border-zinc-800 bg-zinc-900" />
        </div>
        <div className="flex w-full flex-col px-0">
          <article className="relative mb-16 flex w-full flex-col bg-transparent">
            <div className="mb-3 flex w-full items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-zinc-800 object-cover ring-1 ring-white/10" />
                <div className="flex flex-col gap-1">
                  <div className="h-3 w-28 rounded bg-zinc-800" />
                  <div className="h-2.5 w-20 rounded bg-zinc-900" />
                </div>
              </div>
              <div className="h-8 w-[5.5rem] rounded-full border border-orange-500/30 bg-orange-500/10" />
            </div>
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-none border-y border-white/5 bg-zinc-950 shadow-2xl sm:rounded-3xl" />
            <div className="mt-3 mx-0 flex w-full items-center justify-between border-y border-white/10 bg-zinc-900/90 px-6 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.9)] backdrop-blur-2xl supports-[backdrop-filter]:bg-zinc-900/50">
              <div className="flex items-center gap-8">
                <div className="h-6 w-6 rounded bg-zinc-700" />
                <div className="h-6 w-6 rounded bg-zinc-700" />
              </div>
              <div className="h-6 w-6 rounded bg-zinc-700" />
            </div>
            <div className="flex flex-col gap-1.5 px-4 pt-4">
              <div className="h-3 w-40 rounded bg-zinc-800" />
              <div className="h-3 w-full rounded bg-zinc-900" />
            </div>
            <div className="flex w-full select-none items-center justify-between px-6 py-10 opacity-90">
              <div className="flex items-end gap-[3px]">
                <div className="h-2 w-[1px] bg-zinc-600" />
                <div className="h-3 w-[1px] bg-zinc-500" />
                <div className="h-4 w-[1px] bg-orange-500/80 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                <div className="h-2 w-[1px] bg-zinc-600" />
              </div>
              <div className="relative mx-6 flex flex-1 items-center justify-center">
                <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
                <div className="pointer-events-none absolute h-8 w-3/4 rounded-full bg-orange-500/10 blur-xl" />
              </div>
              <div className="flex items-center gap-[4px]">
                <div className="h-1.5 w-1.5 rounded-full bg-orange-500/80 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                <div className="h-1 w-1 rounded-full bg-zinc-500" />
                <div className="h-[2px] w-[2px] rounded-full bg-zinc-600" />
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
