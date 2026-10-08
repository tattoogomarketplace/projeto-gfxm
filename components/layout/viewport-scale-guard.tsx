'use client';

import { memo } from 'react';
import { useViewportScaleGuard } from '@/hooks/use-viewport-scale-guard';

/**
 * Camada invisível montada no template do dashboard. Aplica o reset global de
 * escala de viewport em cada transição de rota (ver hook para detalhes).
 */
function ViewportScaleGuardBase() {
  useViewportScaleGuard();
  return null;
}

export const ViewportScaleGuard = memo(ViewportScaleGuardBase);
