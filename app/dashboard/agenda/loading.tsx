export default function AgendaLoading() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 z-0 min-h-0 w-full overflow-x-hidden overflow-y-auto overscroll-none bg-zinc-950 pb-[var(--dock-clearance)] [-webkit-overflow-scrolling:touch]"
    >
      <div className="sticky top-0 z-40 bg-zinc-950/85 pb-2 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="px-4 pt-3">
          <div className="min-h-13 w-full rounded-2xl border border-zinc-800 bg-zinc-900/80 p-1">
            <div className="grid grid-cols-2 gap-1">
              <div className="h-11 rounded-xl bg-orange-500/80" />
              <div className="h-11 rounded-xl bg-transparent" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-5 px-4 pt-5">
        <div className="h-72 rounded-3xl border border-zinc-800 bg-zinc-900" />
        <div className="h-72 rounded-3xl border border-zinc-800 bg-zinc-900" />
      </div>
    </div>
  );
}
