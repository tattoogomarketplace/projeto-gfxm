import { memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

function DashboardRouteSkeletonBase() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-3 bg-background pt-5 transform-gpu backface-hidden"
      aria-hidden
      aria-busy="true"
    >
      <Skeleton className="h-12 w-full rounded-2xl" />
      <Skeleton className="h-12 w-full rounded-2xl" />
      <Skeleton className="h-12 w-full rounded-2xl" />
    </div>
  );
}

export const DashboardRouteSkeleton = memo(DashboardRouteSkeletonBase);
