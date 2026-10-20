export default function GaleriaLoading() {
  return (
    <div
      aria-hidden
      className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-zinc-950 pb-[calc(env(safe-area-inset-bottom)+7rem)]"
    >
      <div className="sticky top-0 z-40 border-b border-zinc-900 bg-zinc-950/90 px-6 pb-2 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="h-8 w-56 rounded-lg bg-zinc-800" />
        <div className="mt-2 h-4 w-72 max-w-full rounded-md bg-zinc-900" />
        <div className="mt-4 flex gap-3 overflow-hidden pb-2">
          <div className="h-14 min-w-[110px] rounded-xl border border-zinc-800 bg-zinc-900" />
          <div className="h-14 min-w-[110px] rounded-xl border border-zinc-800 bg-zinc-900" />
          <div className="h-14 min-w-[110px] rounded-xl border border-zinc-800 bg-zinc-900" />
        </div>
      </div>
      <div className="flex flex-col gap-6 p-4">
        <div className="aspect-[4/5] w-full rounded-3xl border border-zinc-800 bg-zinc-900" />
        <div className="aspect-[4/5] w-full rounded-3xl border border-zinc-800 bg-zinc-900" />
      </div>
    </div>
  );
}
