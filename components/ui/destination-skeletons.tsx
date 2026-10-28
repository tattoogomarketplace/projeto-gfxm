import { Skeleton } from '@/components/ui/skeleton';

/**
 * Destination-route skeleton twins.
 *
 * Moved 1:1 from the route `loading.tsx` files so SessionHydrating (client)
 * and the route fallbacks can paint the same geometry without importing
 * server `loading.tsx` into a client module.
 */

export function AgendaWorkspaceSkeleton() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 z-0 min-h-0 w-full overflow-x-hidden overflow-y-auto overscroll-none bg-zinc-950 pb-[var(--dock-clearance)] [-webkit-overflow-scrolling:touch]"
    >
      <div className="mx-auto w-full max-w-2xl">
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
    </div>
  );
}

export function GaleriaFeedSkeleton() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 z-0 min-h-0 w-full overflow-x-hidden overflow-y-auto overscroll-none bg-[#0a0a0c] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-950/20 via-[#0a0a0c] to-[#050505] pb-[var(--dock-clearance)] [-webkit-overflow-scrolling:touch]"
    >
      <div className="relative z-0 isolate mx-auto flex w-full max-w-2xl flex-col">
      <div className="relative z-40 bg-[#121212] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))]">
        <div className="mb-4 flex w-full flex-row items-center rounded-2xl border border-white/5 bg-[#121212] p-3">
          <div className="h-7 w-7 rounded-md bg-orange-500/10" />
          <div className="h-4 w-40 rounded bg-zinc-800" />
        </div>
      </div>
      <div className="sticky top-[env(safe-area-inset-top)] z-20 flex gap-2 bg-transparent pb-2 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pointer-events-none">
        <div className="flex w-full items-center justify-center gap-2 overflow-x-auto no-scrollbar">
          <div className="h-11 min-w-[96px] shrink-0 rounded-full border border-white/15 bg-[#121212]/20 backdrop-blur-lg" />
          <div className="h-11 min-w-[96px] shrink-0 rounded-full border border-white/15 bg-[#121212]/20 backdrop-blur-lg" />
          <div className="h-11 min-w-[96px] shrink-0 rounded-full border border-white/15 bg-[#121212]/20 backdrop-blur-lg" />
        </div>
      </div>
      <div className="flex flex-col gap-8 w-full max-w-lg mx-auto">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex w-full flex-col">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/5" />
                <div className="flex flex-col gap-1">
                  <div className="h-3 w-28 rounded bg-white/5" />
                  <div className="h-2.5 w-20 rounded bg-white/5" />
                </div>
              </div>
              <div className="h-7 w-[5.5rem] rounded-full bg-white/5" />
            </div>
            <div className="relative w-full aspect-[9/16] overflow-hidden bg-white/5" />
            <div className="h-16 w-full bg-white/[0.03]" />
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

export function InspiracoesGridSkeleton() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 z-0 min-h-0 w-full overflow-x-hidden overflow-y-auto overscroll-none bg-[#121212] pb-[calc(env(safe-area-inset-bottom)+5rem)] [-webkit-overflow-scrolling:touch]"
    >
      <div className="mx-auto w-full max-w-2xl">
      <div className="pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/10 border-l-2 border-l-[#F97316] bg-[#121212]/70 p-3 backdrop-blur-md">
          <div className="h-9 w-9 rounded-xl bg-orange-500/15" />
          <div className="flex flex-col gap-1.5">
            <div className="h-4 w-40 rounded bg-zinc-800" />
            <div className="h-2.5 w-16 rounded bg-zinc-900" />
          </div>
        </div>
      </div>
      <div className="sticky top-[env(safe-area-inset-top)] z-20 bg-[#121212]/80 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-3 pt-1 backdrop-blur-md">
        <div className="flex gap-2 overflow-hidden">
          <div className="h-11 w-24 shrink-0 rounded-2xl border border-white/10 bg-white/5" />
          <div className="h-11 w-28 shrink-0 rounded-2xl border border-white/10 bg-white/5" />
          <div className="h-11 w-24 shrink-0 rounded-2xl border border-white/10 bg-white/5" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-[1px]">
        {Array.from({ length: 9 }, (_, index) => (
          <div key={index} className="relative w-full aspect-[9/16] overflow-hidden bg-white/5" />
        ))}
      </div>
      </div>
    </div>
  );
}

export function ReviewDetailSkeleton() {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col px-4 pb-24 pt-6" aria-hidden>
      <Skeleton className="mb-6 h-11 w-28 rounded-xl" />
      <Skeleton className="h-5 w-32 rounded-md" />
      <Skeleton className="mt-6 h-28 w-full rounded-2xl" />
      <div className="mt-7 flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-16 rounded-md" />
          <Skeleton className="h-4 w-32 rounded-md" />
        </div>
      </div>
      <Skeleton className="mt-7 aspect-square w-full rounded-3xl" />
    </div>
  );
}
