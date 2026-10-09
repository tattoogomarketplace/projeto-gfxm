import { Skeleton } from '@/components/ui/skeleton';

/**
 * Ghost layout of `ChatWorkspace`.
 *
 * This skeleton is intentionally pixel-faithful to the hydrated route: the
 * Flash Notes rail, the category tabs and the two-column grid all reserve the
 * exact same geometry (heights, gaps, paddings) as the real component. That is
 * what guarantees Zero Layout Shift — when the data resolves, nothing moves.
 */
export default function ChatLoading() {
  return (
    <div className="relative flex h-full w-full min-h-0 flex-1 flex-col overflow-x-hidden bg-background pt-3 transform-gpu transition-opacity duration-200">
      <div className="shrink-0">
        <div className="relative mb-3 px-1 lg:mb-4">
          <section className="relative shrink-0">
            <div className="mb-2 flex items-center gap-2 px-1">
              <Skeleton className="h-3.5 w-3.5 rounded-full" />
              <Skeleton className="h-3.5 w-28 rounded-full" />
            </div>
            <div className="flex min-h-[5.25rem] gap-3 overflow-hidden pb-1 pt-0.5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`flash-skel-${index}`}
                  className="flex w-[4.75rem] shrink-0 flex-col items-center gap-1.5"
                >
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <Skeleton className="h-2.5 w-12 rounded-full" />
                </div>
              ))}
            </div>
            <div className="min-h-6 px-1 pt-2">
              <Skeleton className="h-2.5 w-40 rounded-full" />
            </div>
          </section>
        </div>

        <div className="relative mb-3 px-1 lg:mb-4">
          <div className="grid w-full grid-cols-2 rounded-2xl border border-black/[0.04] bg-neutral-100 p-1 dark:border-white/[0.05] dark:bg-white/10">
            <Skeleton className="h-11 rounded-xl" />
            <Skeleton className="h-11 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="relative grid min-h-[32rem] flex-1 gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03] dark:shadow-none">
          <div
            className="flex items-center gap-2 border-b border-black/[0.04] px-4 py-3 dark:border-white/[0.05]"
            aria-hidden
          >
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-5 w-32 rounded-full" />
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-hidden p-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={`conversation-skel-${index}`} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </aside>

        <section className="hidden min-h-0 lg:flex">
          <div className="flex min-h-[22rem] w-full flex-1 flex-col items-center justify-center rounded-2xl border border-black/[0.04] bg-white px-6 text-center shadow-sm dark:border-white/[0.05] dark:bg-white/[0.03] dark:shadow-none">
            <Skeleton className="h-4 w-44 rounded-full" />
            <Skeleton className="mt-3 h-3 w-60 max-w-full rounded-full" />
          </div>
        </section>
      </div>
    </div>
  );
}
