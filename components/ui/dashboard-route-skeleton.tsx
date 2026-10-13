import { memo } from 'react';
import { BootContinuation } from '@/components/layout/boot-continuation';

/**
 * Route-level fallback de `/dashboard/*` (Fase 25.2).
 *
 * Unificado ao canvas único de boot: qualquer transição de segmento sob o
 * painel pinta a MESMA tela escura do splash — nunca um skeleton de geometria.
 */
function DashboardRouteSkeletonBase() {
  return <BootContinuation />;
}

export const DashboardRouteSkeleton = memo(DashboardRouteSkeletonBase);
