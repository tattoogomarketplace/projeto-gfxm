export default function GaleriaLoading() {
  return (
    <div
      aria-hidden
      className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-zinc-950"
    >
      <div className="sticky top-0 z-40 border-b border-zinc-900 bg-zinc-950/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
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
      <div className="flex w-full flex-col px-0 pb-24">
        <div className="mb-6 flex w-full flex-col border-b border-zinc-900 pb-4">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-zinc-800" />
              <div className="flex flex-col gap-1">
                <div className="h-3 w-28 rounded bg-zinc-800" />
                <div className="h-2.5 w-20 rounded bg-zinc-900" />
              </div>
            </div>
            <div className="h-4 w-14 rounded bg-zinc-800" />
          </div>
          <div className="aspect-[4/5] w-full bg-zinc-900" />
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <div className="flex items-center gap-4">
              <div className="h-6 w-6 rounded bg-zinc-800" />
              <div className="h-6 w-6 rounded bg-zinc-800" />
              <div className="h-6 w-6 rounded bg-zinc-800" />
            </div>
            <div className="h-6 w-6 rounded bg-zinc-800" />
          </div>
          <div className="flex flex-col gap-1 px-4">
            <div className="h-3 w-40 rounded bg-zinc-800" />
            <div className="h-3 w-full rounded bg-zinc-900" />
          </div>
        </div>
      </div>
    </div>
  );
}
