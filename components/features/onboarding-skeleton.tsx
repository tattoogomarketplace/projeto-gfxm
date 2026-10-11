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
    <div className="gpu-layer relative flex h-[100dvh] max-h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-background">
      <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col items-center justify-center overflow-hidden px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="w-full" aria-hidden aria-busy="true">
          <div className="flex flex-col items-center space-y-2.5 text-center sm:space-y-3">
            <Skeleton className="h-20 w-20 min-h-20 min-w-20 rounded-full sm:h-24 sm:w-24" />
            <Skeleton className="h-3 w-36 rounded-full" />
            <Skeleton className="h-3 w-28 rounded-full" />
          </div>
          <div className="w-full space-y-3 py-3 text-center">
            <Skeleton className="mx-auto h-8 w-56 max-w-full rounded-full" />
            <Skeleton className="mx-auto h-5 w-64 max-w-full rounded-full" />
            <Skeleton className="mx-auto h-4 w-full rounded-full" />
            <Skeleton className="mx-auto h-4 w-4/5 rounded-full" />
          </div>
          <section className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6">
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </section>
        </div>
      </div>

      <div className="w-full px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <Skeleton className="mx-auto h-14 w-full max-w-md rounded-2xl" />
      </div>
    </div>
  );
}

export default OnboardingSkeleton;
