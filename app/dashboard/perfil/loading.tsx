'use client';

import { ClientIdentitySkeleton, ProfileSkeleton } from '@/components/ui/route-skeletons';
import { useAuthStore } from '@/hooks/use-auth-store';

/**
 * Route-level fallback of `/dashboard/perfil`.
 *
 * Smart hydration: reads the cached role from the auth store so the segment
 * fallback matches the surface that will replace it. Standard users
 * (`cliente`) get the `ClientIdentitySkeleton` (Avatar + identity sections),
 * while artists/studios keep the `PublicProfile` geometry. The first render
 * (no role cached yet) stays on `ProfileSkeleton`, then every in-session
 * navigation resolves to the exact geometry — zero layout shift.
 */
export function PerfilSegmentSkeleton() {
  const role = useAuthStore((s) => s.role);
  return role === 'cliente' ? <ClientIdentitySkeleton /> : <ProfileSkeleton />;
}

export default function PerfilSegmentLoading() {
  return <PerfilSegmentSkeleton />;
}
