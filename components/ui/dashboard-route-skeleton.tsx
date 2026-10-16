import { memo } from 'react';
import { ArtistHubSkeleton } from '@/components/ui/route-skeletons';

/**
 * Route-level fallback of `/dashboard/*` (content skeleton).
 *
 * Unified with `DashboardHomeSkeleton`: any segment transition under the panel
 * paints the premium Dark Luxury skeleton inside the App Shell, never a blank
 * canvas.
 */
function DashboardRouteSkeletonBase() {
  return <ArtistHubSkeleton />;
}

export const DashboardRouteSkeleton = memo(DashboardRouteSkeletonBase);
