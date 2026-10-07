'use client';

import { useViewportScaleGuard } from '@/hooks/use-viewport-scale-guard';

/**
 * Camada invisível montada no template do dashboard. Aplica o reset global de
 * escala de viewport em cada transição de rota (ver hook para detalhes).
 */
export function ViewportScaleGuard() {
  useViewportScaleGuard();
  return null;
}
