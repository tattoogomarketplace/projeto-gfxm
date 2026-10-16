import { memo } from 'react';
import { ArtistHubSkeleton } from '@/components/ui/route-skeletons';

/**
 * Global dashboard boot fallback (role-aware content skeleton).
 *
 * Consumed by the `/dashboard` dispatcher, the `/dashboard` route boundary and
 * the session-hydration state. Paints the premium Dark Luxury hub skeleton
 * instead of a blank canvas, so the handoff from the splash is a continuous
 * skeleton -> content transition with zero layout shift.
 */
function DashboardHomeSkeletonBase() {
  return <ArtistHubSkeleton />;
}

export const DashboardHomeSkeleton = memo(DashboardHomeSkeletonBase);
