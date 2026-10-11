import { Skeleton } from '@/components/ui/skeleton';

/**
 * Ghost layout of `ChatWorkspace` (inbox/hub state).
 *
 * Pixel-faithful to the hydrated inbox: the glass header (back button + global
 * `SearchBar`), the category tabs and the conversation grid reserve the exact
 * same geometry (heights, paddings, gaps) as the real component. That is what
 * guarantees Zero Layout Shift — when the data resolves, nothing moves.
 *
 * The inbox has NO Flash Notes rail (that surface lives in the artist hub). A
 * previous revision reserved space for it here, which made the hydrated inbox
 * snap upward once the route resolved; it is intentionally omitted.
 */
export default function ChatLoading() {
  return (
    <div className="relative flex h-full max-h-full min-h-0 min-w-0 w-full flex-col overflow-hidden bg-background text-neutral-900 dark:text-white">
      <div className="shrink-0">
        <header className="sticky top-0 z-50 shrink-0 border-b border-white/[0.06] bg-black/60 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
          <div className="flex min-h-11 items-center gap-2 px-3 pb-3">
            <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
            <Skeleton className="h-12 min-w-0 flex-1 rounded-xl" />
          </div>
        </header>

        <div className="relative px-3 pb-3 pt-3">
          <div className="relative grid w-full grid-cols-2 rounded-2xl border border-black/[0.06] bg-neutral-100 p-1 dark:border-white/[0.08] dark:bg-black/40">
            <Skeleton className="h-11 rounded-xl" />
            <Skeleton className="h-11 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="relative grid min-h-0 min-w-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-4 lg:p-3">
        <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden lg:rounded-2xl lg:border lg:border-black/[0.04] lg:bg-white lg:shadow-sm dark:lg:border-white/[0.05] dark:lg:bg-white/[0.03]">
          <div className="flex items-center gap-2 border-b border-black/[0.04] px-4 py-3 dark:border-white/[0.05]">
            <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
            <Skeleton className="h-5 w-32 rounded-full" />
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden p-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={`conversation-skel-${index}`} className="mb-1 h-16 w-full rounded-xl" />
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
