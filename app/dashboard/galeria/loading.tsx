export default function GaleriaLoading() {
  return (
    <div
      aria-hidden
      className="min-h-[100dvh] w-full overflow-y-auto bg-black bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a0a03] via-[#050505] to-black pb-[calc(env(safe-area-inset-bottom)+8rem)]"
    >
      <div className="sticky top-0 z-40 border-b border-white/[0.04] bg-black/40 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
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
        <article className="relative mb-12 flex w-full flex-col bg-transparent px-0">
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
        </article>
      </div>
    </div>
  );
}
