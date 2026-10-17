'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ProfileView } from '@/components/features/profile-view';
import { SettingsHub } from '@/components/settings/settings-hub';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { PerfilSegmentSkeleton } from './loading';
import { cn } from '@/lib/utils';

const PERFIL_SEGMENT = '/dashboard/perfil';
const SETTINGS_SEGMENT = '/dashboard/perfil/configuracoes';

export default function PerfilLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Classificação determinística e exaustiva da superfície a partir do
  // pathname:
  //  - Apenas um caminho EXPLÍCITO de configurações resolve para o hub.
  //  - Qualquer outro caminho já resolvido — em especial a rota base
  //    `/dashboard/perfil` — resolve para o perfil (default robusto).
  //  - Um pathname ainda não pertencente ao segmento (ex.: o intervalo de
  //    transição da primeira navegação de cliente, em que o router ainda não
  //    expôs o destino) cai no skeleton do segmento.
  //
  // Como `isSettings` é um booleano derivado, as duas superfícies são
  // mutuamente exclusivas: nunca existe um frame em que ambas ficam ocultas —
  // o `return` jamais cai para um canvas vazio (fundo Deep Graphite).
  const isSegmentResolved = pathname.startsWith(PERFIL_SEGMENT);
  const isSettings = pathname.startsWith(SETTINGS_SEGMENT);

  useEffect(() => {
    router.prefetch('/dashboard/perfil');
    router.prefetch('/dashboard/perfil/configuracoes');
  }, [router]);

  // Fase ambígua (router ainda não expôs um pathname do segmento): pintamos a
  // geometria exata da superfície final com o skeleton do segmento, em vez de
  // um nó vazio. Como o skeleton espelha o layout que o substitui, a troca no
  // frame seguinte é imperceptível (zero layout shift, zero frame preto).
  if (!isSegmentResolved) {
    return (
      <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
        <PerfilSegmentSkeleton />
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div
        className={cn(
          'flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden',
          isSettings
            ? 'pointer-events-none absolute inset-0 opacity-0'
            : 'relative opacity-100'
        )}
        aria-hidden={isSettings}
        inert={isSettings ? true : undefined}
      >
        <ErrorBoundary>
          <ProfileView />
        </ErrorBoundary>
      </div>

      <div
        className={cn(
          'flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden',
          isSettings
            ? 'relative opacity-100'
            : 'pointer-events-none absolute inset-0 opacity-0'
        )}
        aria-hidden={!isSettings}
        inert={!isSettings ? true : undefined}
      >
        <SettingsHub />
      </div>

      <div className="hidden" aria-hidden>
        {children}
      </div>
    </div>
  );
}
