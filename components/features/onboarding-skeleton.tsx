import { Skeleton } from '@/components/ui/skeleton';

/**
 * Ghost layout of the onboarding / role-selection screen.
 *
 * Shared by the page boot branch and the route-level `loading.tsx` so the
 * handoff into `/dashboard/onboarding` reserves the exact geometry of the
 * hydrated screen (avatar medallion, narrative copy, role cards, CTA) with no
 * text loader or spinner in between.
 */
export function OnboardingSkeleton() {
  return (
    <div className="gpu-layer relative flex h-full min-h-[100dvh] w-full flex-col overflow-x-hidden overflow-y-auto overscroll-none bg-[#121212] [-webkit-overflow-scrolling:touch]">
      <div
        className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))]"
        aria-hidden
        aria-busy="true"
      >
        <div className="flex shrink-0 flex-col items-center space-y-2.5 pt-2 text-center sm:space-y-3">
          <Skeleton className="h-16 w-16 min-h-16 min-w-16 rounded-full sm:h-20 sm:w-20" />
          <Skeleton className="h-3 w-36 rounded-full" />
          <Skeleton className="h-3 w-28 rounded-full" />
        </div>
        <div className="w-full shrink-0 space-y-3 py-4 text-center">
          <Skeleton className="mx-auto h-8 w-56 max-w-full rounded-full" />
          <Skeleton className="mx-auto h-5 w-64 max-w-full rounded-full" />
          <Skeleton className="mx-auto h-4 w-full rounded-full" />
          <Skeleton className="mx-auto h-4 w-4/5 rounded-full" />
        </div>
        <section className="w-full shrink-0 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </section>
        <div className="min-h-4 flex-1" />
      </div>

      <div className="mx-auto w-full max-w-md shrink-0 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <Skeleton className="mx-auto h-14 min-h-14 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export default OnboardingSkeleton;
