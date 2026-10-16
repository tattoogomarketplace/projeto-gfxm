import { StudioDashboardSkeleton } from '@/components/ui/route-skeletons';

/**
 * Route-level fallback of `/dashboard/estudio`.
 *
 * Mirrors the studio overview (heading, metric cards, roster list) so the
 * hydrated dashboard lands with zero layout shift.
 */
export default function EstudioDashboardLoading() {
  return <StudioDashboardSkeleton />;
}
