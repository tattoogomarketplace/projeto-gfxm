import { ArtistHubSkeleton } from '@/components/ui/route-skeletons';

/**
 * Route-level fallback of `/dashboard/tatuador`.
 *
 * Mirrors the Studio Hub (flash notes, quick access bento, activity feed) so the
 * hydrated professional home lands with zero layout shift.
 */
export default function TatuadorDashboardLoading() {
  return <ArtistHubSkeleton />;
}
