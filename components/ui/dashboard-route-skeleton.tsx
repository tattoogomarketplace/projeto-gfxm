import { memo } from 'react';
import { DashboardHomeSkeleton } from '@/components/features/dashboard-home-skeleton';

/**
 * Route-level Suspense fallback for `/dashboard/*`.
 *
 * Delegates to the role-aware `DashboardHomeSkeleton` so every transition into a
 * painel paints the exact geometry of its destination (Flash Notes, Quick
 * Access, activity feed, Discover carousels) — never a spinner or a text loader.
 */
function DashboardRouteSkeletonBase() {
  return <DashboardHomeSkeleton />;
}

export const DashboardRouteSkeleton = memo(DashboardRouteSkeletonBase);
