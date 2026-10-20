'use client';

import { ClientActionCTA } from '@/components/features/client-action-cta';
import { useI18n } from '@/hooks/use-i18n';
import type { MessageKey } from '@/lib/i18n/types';
import type { SessionStatus, UserSession } from '@/lib/types/user-session';
import { formatBRL, formatWhen } from '@/lib/utils/agenda-status';
import { cn } from '@/lib/utils';

const STEPS: readonly {
  id: Exclude<SessionStatus, 'COMPLETED'>;
  order: '01' | '02' | '03';
  titleKey: MessageKey;
}[] = [
  { id: 'ACTION_NEEDED', order: '01', titleKey: 'agenda.statusActionRequired' },
  { id: 'AWAITING_PAYMENT', order: '02', titleKey: 'agenda.statusAwaitingPayment' },
  { id: 'CONFIRMED', order: '03', titleKey: 'agenda.statusConfirmed' },
];

const STEP_INDEX: Record<SessionStatus, number> = {
  ACTION_NEEDED: 0,
  AWAITING_PAYMENT: 1,
  CONFIRMED: 2,
  COMPLETED: 2,
};

const BADGE: Record<SessionStatus, { key: MessageKey; className: string }> = {
  ACTION_NEEDED: {
    key: 'agenda.statusActionRequired',
    className: 'border-orange-500/60 bg-orange-500/10 text-orange-400',
  },
  AWAITING_PAYMENT: {
    key: 'agenda.statusAwaitingPayment',
    className: 'border-amber-500/50 bg-amber-500/10 text-amber-400',
  },
  CONFIRMED: {
    key: 'agenda.statusConfirmed',
    className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
  },
  COMPLETED: {
    key: 'agenda.statusCompleted',
    className: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  },
};

type StepState = 'completed' | 'active' | 'upcoming';

function stepState(status: SessionStatus, index: number): StepState {
  const current = STEP_INDEX[status];
  if (status === 'COMPLETED' || index < current) return 'completed';
  if (index === current) return 'active';
  return 'upcoming';
}

export function TimelineCard({ session }: { session: UserSession }) {
  const { t } = useI18n();
  const badge = BADGE[session.sessionStatus];
  const current = STEP_INDEX[session.sessionStatus];

  return (
    <article className="relative mb-5 flex flex-col gap-4 rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
      <header className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 text-[15px] font-semibold tracking-tight text-zinc-100">
          {t('agenda.session')}
        </h2>
        <span
          className={cn(
            'inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide',
            badge.className
          )}
        >
          {t(badge.key)}
        </span>
      </header>

      <dl className="grid grid-cols-1 gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-[12px] font-medium text-zinc-500">{t('clientAgenda.artist')}</dt>
          <dd className="truncate text-sm font-semibold text-zinc-100">{session.artist.name}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-[12px] font-medium text-zinc-500">{t('clientAgenda.schedule')}</dt>
          <dd className="text-sm font-semibold tabular-nums text-zinc-100">{formatWhen(session.date)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-[12px] font-medium text-zinc-500">{t('clientAgenda.total')}</dt>
          <dd className="text-sm font-bold tabular-nums text-zinc-100">{formatBRL(session.totalValue)}</dd>
        </div>
      </dl>

      <div className="flex items-center justify-between rounded-xl bg-zinc-950 p-3">
        <span className="text-[12px] font-medium text-zinc-400">{t('clientAgenda.depositLabel')}</span>
        <span className="text-sm font-bold tabular-nums text-zinc-100">
          {formatBRL(session.depositValue)}
        </span>
      </div>

      <ol className="relative mt-2 grid grid-cols-3 items-start gap-1">
        <span
          aria-hidden
          className="absolute left-[16.666%] right-[16.666%] top-[0.7rem] h-px overflow-hidden bg-zinc-700"
        >
          <span
            className="block h-full bg-orange-500"
            style={{ width: `${current === 0 ? 0 : current >= 2 ? 100 : 50}%` }}
          />
        </span>
        {STEPS.map((step, index) => {
          const state = stepState(session.sessionStatus, index);
          const reached = state !== 'upcoming';
          return (
            <li key={step.id} className="relative z-10 flex min-w-0 flex-col items-center gap-2 text-center">
              <span
                className={cn(
                  'flex h-6 w-6 min-h-6 min-w-6 items-center justify-center rounded-full border text-[10px] font-bold tabular-nums',
                  reached
                    ? 'border-orange-500 bg-orange-500 text-white'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-500'
                )}
              >
                {step.order}
              </span>
              <span
                className={cn(
                  'px-0.5 text-[11px] font-semibold leading-tight',
                  reached ? 'text-orange-400' : 'text-zinc-500'
                )}
              >
                {t(step.titleKey)}
              </span>
            </li>
          );
        })}
      </ol>

      {session.sessionStatus === 'ACTION_NEEDED' ? (
        <ClientActionCTA
          kind="sign"
          href="/dashboard/pagamentos"
          className="border border-orange-500/50 bg-transparent text-orange-400 hover:bg-orange-500/10 dark:text-orange-300"
        />
      ) : null}
      {session.sessionStatus === 'AWAITING_PAYMENT' ? (
        <ClientActionCTA kind="pay" href="/dashboard/pagamentos" />
      ) : null}
    </article>
  );
}
