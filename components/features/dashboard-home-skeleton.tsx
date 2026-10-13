'use client';

import { memo } from 'react';
import { BootContinuation } from '@/components/layout/boot-continuation';

/**
 * Autoridade única do fallback de boot do painel (Fase 25.2).
 *
 * Anteriormente desenhava o "ghost layout" role-aware (Flash Notes, bento de
 * acesso rápido, feed de atividade, carrosséis do Discover). Esse skeleton era
 * exatamente a origem do flash pós-splash: ao ser trocado pelo conteúdo real,
 * produzia um degrau visual distinto entre o splash e o app.
 *
 * Agora delega ao `BootContinuation` — o MESMO canvas do splash — de modo que
 * `app/dashboard/loading.tsx`, `DashboardRouteSkeleton`, `SessionHydrating` e o
 * despachante `/dashboard` (que consomem este componente) herdem, sem exceção,
 * a tela escura idêntica. Nenhum ícone, nenhum texto, nada que possa piscar.
 */
function DashboardHomeSkeletonBase() {
  return <BootContinuation />;
}

export const DashboardHomeSkeleton = memo(DashboardHomeSkeletonBase);
