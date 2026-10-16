import { GalleryGridSkeleton } from '@/components/ui/route-skeletons';

/**
 * Route-level fallback of `/dashboard/galeria`.
 *
 * Mirrors the inspirations gallery (entry card, filter bar, masonry grid) so the
 * hydrated gallery lands with zero layout shift.
 */
export default function GaleriaLoading() {
  return <GalleryGridSkeleton />;
}
