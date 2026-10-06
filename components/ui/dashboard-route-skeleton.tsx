import { Skeleton } from '@/components/ui/skeleton';

export function DashboardRouteSkeleton() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-3 pt-5 transform-gpu backface-hidden"
      aria-hidden
      aria-busy="true"
    >
      <Skeleton className="h-12 w-full rounded-2xl" />
      <Skeleton className="h-12 w-full rounded-2xl" />
      <Skeleton className="h-12 w-full rounded-2xl" />
    </div>
  );
}
