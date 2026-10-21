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
        <div className="flex w-full flex-col px-4">
          <article className="relative mx-auto mb-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-[32px] border border-white/[0.06] bg-[#121214] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.04] bg-[#121214] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-zinc-800 object-cover ring-1 ring-white/10" />
                <div className="flex flex-col gap-1">
                  <div className="h-3 w-28 rounded bg-zinc-800" />
                  <div className="h-2.5 w-20 rounded bg-zinc-900" />
                </div>
              </div>
              <div className="h-8 w-[5.5rem] rounded-full border border-orange-500/30 bg-transparent" />
            </div>
            <div className="relative aspect-[4/5] w-full bg-zinc-950" />
            <div className="flex flex-col gap-4 bg-[#121214] px-5 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl border border-white/10 bg-white/[0.02]" />
                  <div className="h-10 w-10 rounded-xl border border-white/10 bg-white/[0.02]" />
                </div>
                <div className="h-10 w-10 rounded-xl border border-white/10 bg-white/[0.02]" />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="h-3 w-40 rounded bg-zinc-800" />
                <div className="h-3 w-full rounded bg-zinc-900" />
              </div>
            </div>
          </article>
          <div className="mb-10 flex h-12 w-full items-center justify-center gap-2 opacity-60">
            <div className="h-3 w-[2px] rounded-full bg-orange-600" />
            <div className="h-5 w-[2px] rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
            <div className="h-3 w-[2px] rounded-full bg-orange-600" />
            <div className="mx-2 h-[1px] max-w-[150px] flex-1 bg-gradient-to-r from-orange-500/80 to-transparent" />
            <div className="flex gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.8)]" />
              <div className="h-1 w-1 rounded-full bg-zinc-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
