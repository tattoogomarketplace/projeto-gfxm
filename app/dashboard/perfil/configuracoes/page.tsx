'use client';

import { PerfilSegmentSkeleton } from '../loading';

/**
 * Settings content is rendered by the Perfil `layout.tsx` (SettingsHub). This
 * page fills the hidden `{children}` slot with the exact route skeleton so the
 * segment never resolves to an empty canvas during a client-side hydration
 * swap — eliminating the black flash on `/dashboard/perfil/configuracoes`.
 */
export default function ConfiguracoesPage() {
  return <PerfilSegmentSkeleton />;
}
