import { Skeleton } from '@/components/ui/skeleton';

/**
 * Ghost layout of `ChatWorkspace`.
 *
 * This skeleton is intentionally pixel-faithful to the hydrated route: the
 * glass inbox header, the Flash Notes rail, the category tabs and the
 * conversation grid all reserve the exact same geometry (heights, gaps,
 * paddings) as the real component. That is what guarantees Zero Layout Shift —
 * when the data resolves, nothing moves.
 */
export default function ChatLoading() {
  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] min-h-0 min-w-0 w-full flex-col overflow-hidden bg-background">
      <div className="shrink-0">
        <div className="border-b border-black/[0.04] pt-[max(0.75rem,env(safe-area-inset-top))] dark:border-white/[0.06]">
          <div className="flex min-h-11 items-center gap-2 px-3 pb-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <Skeleton className="h-5 w-40 rounded-full" />
          </div>
        </div>

        <div className="px-1 pb-1 pt-3">
          <section className="relative shrink-0">
            <div className="mb-2 flex items-center gap-2 px-1">
              <Skeleton className="h-3.5 w-3.5 rounded-full" />
              <Skeleton className="h-3.5 w-28 rounded-full" />
            </div>
            <div className="flex min-h-[5.25rem] gap-3 overflow-hidden pb-1 pt-0.5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`flash-skel-${index}`}
                  className="flex w-[clamp(4.25rem,20vw,4.75rem)] shrink-0 flex-col items-center gap-1.5"
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

        <div className="px-3 pb-3 pt-2">
          <div className="grid w-full grid-cols-2 rounded-2xl border border-black/[0.06] bg-neutral-100 p-1 dark:border-white/[0.08] dark:bg-black/40">
            <Skeleton className="h-11 rounded-xl" />
            <Skeleton className="h-11 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="relative grid min-h-0 min-w-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-4 lg:p-3">
        <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden lg:rounded-2xl lg:border lg:border-black/[0.04] lg:bg-white dark:lg:border-white/[0.05] dark:lg:bg-white/[0.03]">
          <div
            className="flex items-center gap-2 border-b border-black/[0.04] px-4 py-3 dark:border-white/[0.05]"
            aria-hidden
          >
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-5 w-32 rounded-full" />
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-hidden p-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={`conversation-skel-${index}`} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </aside>

        <section className="hidden min-h-0 min-w-0 lg:flex">
          <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center px-6 py-10 text-center lg:rounded-2xl lg:border lg:border-black/[0.04] lg:bg-white dark:lg:border-white/[0.05] dark:lg:bg-white/[0.03]">
            <Skeleton className="h-4 w-44 max-w-full rounded-full" />
            <Skeleton className="mt-3 h-3 w-60 max-w-full rounded-full" />
          </div>
        </section>
      </div>
    </div>
  );
}
