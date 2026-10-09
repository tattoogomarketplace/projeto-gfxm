'use client';

import { CalendarClock } from 'lucide-react';
import { GlassContainer } from '@/components/ui/glass-container';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/hooks/use-i18n';
import { getRoleExperience } from '@/lib/content/role-experience';
import { formatBRL, formatWhen, resolveTone } from '@/lib/utils/agenda-status';
import { cn } from '@/lib/utils';
import type { AppRole } from '@/lib/utils/auth-redirect';
import type { Agendamento } from '@/lib/types/database';

function StudioAgendaSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  );
}

/**
 * Agenda do Estúdio — leitura operacional para tatuadores e estúdios.
 *
 * Compartilha a mesma geometria rígida da timeline do cliente (`flex-1`,
 * `min-h-0`) para que a troca de papel e a resolução de dados nunca movam o
 * layout. Consome os `Agendamento` já carregados pelo workspace pai.
 */
export function StudioAgendaView({
  role,
  agendamentos,
  isLoading,
}: {
  role: AppRole;
  agendamentos?: Agendamento[];
  isLoading?: boolean;
}) {
  const { t } = useI18n();
  const experience = getRoleExperience(role).dashboard;
  const items = agendamentos ?? [];

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-4">
      <div className="flex shrink-0 items-start gap-3">
        <span className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-500 shadow-[0_0_18px_rgba(249,115,22,0.22)] dark:text-orange-400">
          <CalendarClock className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
            {t(experience.heading)}
          </h2>
          <p className="mt-0.5 text-sm text-neutral-600 dark:text-zinc-400">
            {t(experience.subtitle)}
          </p>
        </div>
      </div>

      {isLoading ? (
        <StudioAgendaSkeleton />
      ) : items.length === 0 ? (
        <GlassContainer className="border-dashed p-6 text-center">
          <CalendarClock
            className="mx-auto h-6 w-6 text-orange-500 dark:text-orange-400"
            strokeWidth={1.75}
          />
          <p className="mt-3 text-sm font-medium text-neutral-600 dark:text-zinc-300">
            {t('agenda.empty')}
          </p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-zinc-500">{t('agenda.emptyHint')}</p>
        </GlassContainer>
      ) : (
        <ul className="min-w-0 w-full flex-1 space-y-3">
          {items.map((agendamento, index) => {
            const tone = resolveTone(agendamento.status);
            const Icon = tone.icon;
            return (
              <li key={agendamento.id ?? `agendamento-${index}`}>
                <GlassContainer className="relative w-full overflow-hidden p-4">
                  <span
                    aria-hidden
                    className={cn('absolute left-0 top-0 h-full w-1 bg-gradient-to-b', tone.accent)}
                  />
                  <div className="pl-2">
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
                          tone.pill
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                        {t(tone.labelKey)}
                      </span>
                      <span className="shrink-0 text-xs font-medium text-neutral-500 dark:text-zinc-400">
                        {formatWhen(agendamento.data_hora)}
                      </span>
                    </div>
                    <p className="mt-3 truncate text-sm font-semibold tracking-tight text-gray-900 dark:text-white">
                      {t('dashboard.clientId', {
                        id: (agendamento.cliente_id ?? '').slice(0, 8) || '—',
                      })}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-zinc-400">
                      {formatBRL(agendamento.valor_total)}
                    </p>
                  </div>
                </GlassContainer>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
