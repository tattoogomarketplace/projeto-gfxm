import { PublicProfileSkeleton } from '@/components/ui/route-skeletons';

/**
 * Route-level fallback of `/dashboard/artista/[id]`.
 *
 * Reserves the artist vitrine geometry (header, highlights rail, portfolio grid)
 * with the premium Dark Luxury shimmer.
 */
export default function ArtistVitrineLoading() {
  return <PublicProfileSkeleton />;
}
