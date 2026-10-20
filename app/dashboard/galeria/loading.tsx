export default function GaleriaLoading() {
  return (
    <div
      aria-hidden
      className="relative h-[100dvh] w-full overflow-y-auto bg-black bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1f0d05] via-[#0a0a0a] to-black pb-[calc(env(safe-area-inset-bottom)+8rem)]"
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
        <div className="relative mb-8 flex w-full flex-col">
          <div className="flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-zinc-800 object-cover ring-1 ring-white/10" />
              <div className="flex flex-col gap-1">
                <div className="h-3 w-28 rounded bg-zinc-800" />
                <div className="h-2.5 w-20 rounded bg-zinc-900" />
              </div>
            </div>
            <div className="h-7 w-20 rounded-full border border-orange-500/20 bg-orange-500/10" />
          </div>
          <div className="relative z-0 aspect-[4/5] w-full bg-zinc-900" />
          <div className="relative z-30 mx-4 -mt-6 flex items-center justify-between rounded-2xl border-t border-l border-white/[0.08] border-b border-r border-black/50 bg-[#18181b]/40 px-6 py-3.5 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)] backdrop-blur-2xl supports-[backdrop-filter]:bg-[#18181b]/20">
            <div className="flex items-center gap-5">
              <div className="h-6 w-6 rounded bg-zinc-700" />
              <div className="h-6 w-6 rounded bg-zinc-700" />
              <div className="h-6 w-6 rounded bg-zinc-700" />
            </div>
            <div className="h-6 w-6 rounded bg-zinc-700" />
          </div>
          <div className="flex flex-col gap-1.5 px-4 pt-6 pb-10">
            <div className="h-3 w-40 rounded bg-zinc-800" />
            <div className="h-3 w-full rounded bg-zinc-900" />
          </div>
        </div>
      </div>
    </div>
  );
}
