import { PublicProfileSkeleton } from '@/components/ui/route-skeletons';

/**
 * Route-level fallback of `/profile/[username]`.
 *
 * Reserves the public profile geometry (back control, cover header, highlights
 * rail, media tabs and grid) with the premium Dark Luxury shimmer.
 */
export default function PublicProfileLoading() {
  return <PublicProfileSkeleton />;
}
