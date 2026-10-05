import { Skeleton } from '@/components/ui/skeleton';

export function DashboardRouteSkeleton() {
  return (
    <div
      className="screen-fade-in min-h-dvh space-y-4 p-4 transition-opacity duration-300 ease-in-out sm:p-6"
      aria-hidden
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56 max-w-full" />
        </div>
      </div>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  );
}
