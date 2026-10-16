'use client';

import { PerfilSegmentSkeleton } from './loading';

/**
 * Perfil content is rendered by `layout.tsx` (ProfileView + SettingsHub). This
 * page intentionally fills the hidden `{children}` slot with the exact route
 * skeleton so the segment never resolves to an empty canvas during a
 * client-side hydration swap — eliminating the black flash between the
 * `loading.tsx` boundary and the hydrated surface.
 */
export default function PerfilPage() {
  return <PerfilSegmentSkeleton />;
}
