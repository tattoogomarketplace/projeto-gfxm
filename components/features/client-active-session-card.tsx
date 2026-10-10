'use client';

import type { ReactNode } from 'react';
import { CalendarClock, UserRound, Wallet } from 'lucide-react';
import { GlassContainer } from '@/components/ui/glass-container';
import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';
import { buildSessionTimeline, formatBRL, formatWhen, resolveTone } from '@/lib/utils/agenda-status';
import type { ClientActiveSession } from '@/lib/types/client-agenda';

/**
 * ClientActiveSessionCard — estado ativo da linha do tempo do cliente.
 *
 * Substitui o "Empty State" quando há um orçamento aceito / sessão em curso:
 * apresenta o artista, a data/hora, o valor total e o sinal de 25% em um cartão
 * de fundo escuro luxuoso com acento por status (Esmeralda/Âmbar/Cobre).
 *
 * Presentacional: todos os valores derivam de `buildSessionTimeline` (motor do
 * backend). A UI nunca decide preço — apenas projeta a verdade do domínio.
 * Dimensões fluidas (`w-full`, paddings relativos) → zero CLS em qualquer
 * viewport, do iPhone SE ao Pro Max.
 */
export interface ClientActiveSessionCardProps {
  readonly session: ClientActiveSession;
  readonly className?: string;
}

export function ClientActiveSessionCard({
  session,
  className,
}: ClientActiveSessionCardProps): ReactNode {
  const { t } = useI18n();
  const timeline = buildSessionTimeline(session.agendamento);
  const tone = resolveTone(session.agendamento.status);
  const StatusIcon = tone.icon;

  return (
    <GlassContainer className={cn('relative min-w-0 w-full overflow-hidden p-4 sm:p-5', className)}>
      <span
        aria-hidden
        className={cn('absolute left-0 top-0 h-full w-1 bg-gradient-to-b', tone.accent)}
      />

      <div className="pl-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-500 dark:text-orange-400">
              {t('clientAgenda.activeSession')}
            </p>
            <p className="mt-1 truncate text-base font-bold tracking-tight text-gray-900 dark:text-white">
              {t('agenda.session')}
            </p>
          </div>
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide',
              tone.pill
            )}
          >
            <StatusIcon className="h-3.5 w-3.5" strokeWidth={2} />
            {t(tone.labelKey)}
          </span>
        </div>

        <dl className="mt-4 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <dt className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-zinc-400">
              <UserRound className="h-4 w-4 shrink-0 text-neutral-400 dark:text-zinc-500" strokeWidth={1.9} />
              <span className="truncate">{t('clientAgenda.artist')}</span>
            </dt>
            <dd className="shrink-0 text-sm font-semibold text-gray-900 dark:text-white">
              {session.artistName}
            </dd>
          </div>

          <div className="flex items-center justify-between gap-3">
            <dt className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-zinc-400">
              <CalendarClock className="h-4 w-4 shrink-0 text-neutral-400 dark:text-zinc-500" strokeWidth={1.9} />
              <span className="truncate">{t('clientAgenda.schedule')}</span>
            </dt>
            <dd className="shrink-0 text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
              {formatWhen(session.agendamento.data_hora)}
            </dd>
          </div>

          <div className="flex items-center justify-between gap-3">
            <dt className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-zinc-400">
              <Wallet className="h-4 w-4 shrink-0 text-neutral-400 dark:text-zinc-500" strokeWidth={1.9} />
              <span className="truncate">{t('clientAgenda.total')}</span>
            </dt>
            <dd className="shrink-0 text-sm font-bold tabular-nums text-gray-900 dark:text-white">
              {formatBRL(timeline.payment.total)}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] px-4 py-3">
          <span className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
            <Wallet className="h-4 w-4 shrink-0" strokeWidth={2} />
            <span className="truncate">{t('clientAgenda.depositLabel')}</span>
          </span>
          <span className="shrink-0 text-base font-bold tabular-nums text-gray-900 dark:text-white">
            {formatBRL(timeline.payment.depositAmount)}
          </span>
        </div>
      </div>
    </GlassContainer>
  );
}
