'use client';

import { ClientIdentitySkeleton, ProfileSkeleton } from '@/components/ui/route-skeletons';
import { useAuthStore } from '@/hooks/use-auth-store';

/**
 * Route-level fallback of `/dashboard/perfil`.
 *
 * Instant chrome: the profile shell (background + header) mounts on frame zero
 * with a centered Instagram-tier spinner in the content pane. Cached role only
 * chooses which shell geometry to paint — never a blank or skeleton grid.
 */
export function PerfilSegmentSkeleton() {
  const role = useAuthStore((s) => s.role);
  return role === 'cliente' ? <ClientIdentitySkeleton /> : <ProfileSkeleton />;
}

export default function PerfilSegmentLoading() {
  return <PerfilSegmentSkeleton />;
}
