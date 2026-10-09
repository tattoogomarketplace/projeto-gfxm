import { Skeleton } from '@/components/ui/skeleton';

/**
 * Ghost layout of `AgendaPaymentsWorkspace`.
 *
 * Pixel-faithful to the hydrated route: the two-segment tab control and the
 * three card slots reserve the exact same geometry (heights, gaps, paddings)
 * as the real component so the data resolution never produces layout shift.
 */
export function AgendaPaymentsSkeleton() {
  return (
    <div
      className="relative flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-x-hidden bg-background transform-gpu"
      aria-hidden
      aria-busy="true"
    >
      <div className="grid w-full shrink-0 grid-cols-2 rounded-2xl border border-black/[0.04] bg-neutral-100 p-1 dark:border-white/[0.05] dark:bg-white/10">
        <Skeleton className="h-11 rounded-xl" />
        <Skeleton className="h-11 rounded-xl" />
      </div>
      <div className="mt-4 min-h-0 w-full flex-1 space-y-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    </div>
  );
}
