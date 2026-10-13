'use client';

import { memo } from 'react';
import { BootContinuation } from '@/components/layout/boot-continuation';

/**
 * Estado de hidratação de sessão dos painéis (Fase 25.2).
 *
 * Renderizado como conteúdo de página quando `requireDashboardPerfil` ainda não
 * resolveu. Unificado ao canvas único de boot — sem skeleton, sem spinner, sem
 * texto: apenas a tela escura idêntica ao splash.
 */
function SessionHydratingBase() {
  return <BootContinuation />;
}

export const SessionHydrating = memo(SessionHydratingBase);
