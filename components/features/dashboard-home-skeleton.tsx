import { memo } from 'react';
import { HomeDiscoverSkeleton } from '@/components/ui/route-skeletons';

/**
 * Global dashboard boot fallback (Home / Início content skeleton).
 *
 * Consumed by the `/dashboard` dispatcher, the `/dashboard` route boundary and
 * the authentication handoff (`<ClerkLoading>` via `BootShellSkeleton`). Paints
 * the premium Dark Luxury Discover-feed skeleton — the exact geometry of the
 * default Home ("Início") the client lands on — instead of a blank canvas, so
 * the handoff from the splash is a continuous skeleton -> content transition
 * with zero Cumulative Layout Shift: no skeleton is stretched or shifted.
 */
function DashboardHomeSkeletonBase() {
  return <HomeDiscoverSkeleton />;
}

export const DashboardHomeSkeleton = memo(DashboardHomeSkeletonBase);
