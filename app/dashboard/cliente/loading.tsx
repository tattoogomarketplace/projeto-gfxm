import { HomeDiscoverSkeleton } from '@/components/ui/route-skeletons';

/**
 * Route-level fallback of `/dashboard/cliente` (portfolio tab).
 *
 * Mirrors the Discover feed geometry (hero card, featured artists rail, sticky
 * filters, masonry inspirations) so the hydrated feed lands with zero layout
 * shift.
 */
export default function ClienteDashboardLoading() {
  return <HomeDiscoverSkeleton />;
}
