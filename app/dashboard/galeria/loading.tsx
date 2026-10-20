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
        <div className="aspect-[4/5] w-full rounded-none border-b border-zinc-900 bg-zinc-900" />
        <div className="aspect-[4/5] w-full rounded-none border-b border-zinc-900 bg-zinc-900" />
      </div>
    </div>
  );
}
