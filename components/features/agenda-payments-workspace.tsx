'use client';

import { useMemo, useState } from 'react';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { AgendaTimeline } from '@/components/features/agenda-timeline';
import { PaymentsPanel } from '@/components/features/payments-hub';
import { StudioAgendaView } from '@/components/features/studio-agenda-view';
import { useAgendamentos } from '@/hooks/use-agendamentos';
import { useI18n } from '@/hooks/use-i18n';
import type { AgendaView } from '@/lib/types/escrow';
import type { AppRole } from '@/lib/utils/auth-redirect';

/**
 * Container rígido de Agenda e Pagamentos.
 *
 * Harmoniza a aba inferior "Agenda" com as abas internas por papel:
 * - Cliente: Agendamentos | Pagamentos
 * - Tatuador / Estúdio: Agenda do Estúdio | Recebimentos
 *
 * Altura e largura pré-alocadas (`h-full min-h-0 flex-1 flex flex-col`)
 * eliminam o layout shift na hidratação; a troca de aba é local e não
 * remonta o casco.
 */
export function AgendaPaymentsWorkspace({
  role,
  initialView = 'agenda',
}: {
  role: AppRole;
  initialView?: AgendaView;
}) {
  const { t } = useI18n();
  const { data: agendamentos, isLoading } = useAgendamentos();
  const [view, setView] = useState<AgendaView>(initialView);
  const isClient = role === 'cliente';

  const options = useMemo(
    () =>
      isClient
        ? [
            { value: 'agenda' as const, label: t('agenda.tabClient') },
            { value: 'payments' as const, label: t('payments.tabClient') },
          ]
        : [
            { value: 'agenda' as const, label: t('agenda.tabStudio') },
            { value: 'payments' as const, label: t('payments.tabStudio') },
          ],
    [isClient, t]
  );

  const ariaLabel = isClient ? t('agenda.tabClient') : t('agenda.tabStudio');

  return (
    <div className="relative flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-x-hidden bg-transparent text-gray-900 transform-gpu transition-opacity duration-200 dark:text-white">
      <div className="w-full shrink-0">
        <SegmentedControl
          options={options}
          value={view}
          onChange={setView}
          ariaLabel={ariaLabel}
        />
      </div>
      <div className="relative mt-4 flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-y-auto overscroll-none pb-2 [-webkit-overflow-scrolling:touch]">
        {view === 'agenda' ? (
          isClient ? (
            <AgendaTimeline agendamentos={agendamentos} isLoading={isLoading} />
          ) : (
            <StudioAgendaView
              role={role}
              agendamentos={agendamentos}
              isLoading={isLoading}
            />
          )
        ) : (
          <PaymentsPanel role={role} />
        )}
      </div>
    </div>
  );
}
