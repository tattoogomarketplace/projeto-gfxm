import { ProfileSkeleton } from '@/components/ui/route-skeletons';

/**
 * Route-level fallback of `/dashboard/perfil`.
 *
 * Reserves the full profile geometry (cover header, metrics, highlights rail,
 * media tab bar, grid and footer action) with the premium Dark Luxury shimmer.
 */
export default function PerfilSegmentLoading() {
  return <ProfileSkeleton />;
}
