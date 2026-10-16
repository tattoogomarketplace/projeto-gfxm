import { ArtistHubSkeleton } from '@/components/ui/route-skeletons';

/**
 * Route-level fallback of `/dashboard/*`.
 *
 * Paints the premium Dark Luxury content skeleton (flash notes rail, quick
 * access bento, activity feed) inside the already-resolved App Shell — the dock
 * and header stay visible, and the hydrated role dashboard lands with zero
 * layout shift.
 */
export default function DashboardLoading() {
  return <ArtistHubSkeleton />;
}
