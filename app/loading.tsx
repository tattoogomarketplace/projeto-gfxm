import { Skeleton } from '@/components/ui/skeleton';

/**
 * Root route-level loading boundary.
 *
 * Never a splash replay or a text loader: a neutral, safe-area-aware shell
 * skeleton that reserves the chrome + content geometry while the root segment
 * streams in. The one-time brand Splash is owned exclusively by `SplashGate`.
 */
export default function Loading() {
  return (
    <div
      aria-hidden
      aria-busy="true"
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background pt-[env(safe-area-inset-top)]"
    >
      <div className="flex min-h-11 items-center justify-between gap-3 px-4 py-3">
        <Skeleton className="h-5 w-36 rounded-full" />
        <Skeleton className="h-11 w-11 min-h-11 min-w-11 rounded-full" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 pb-36">
        <Skeleton className="h-32 w-full rounded-3xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    </div>
  );
}
