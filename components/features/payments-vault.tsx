'use client';

import { CheckCircle2, ClipboardList, Lock, Wallet } from 'lucide-react';
import { ClientActionCTA } from '@/components/features/client-action-cta';
import { useI18n } from '@/hooks/use-i18n';
import { BRAND_NAME } from '@/lib/i18n/brands';
import type { MessageKey } from '@/lib/i18n/types';
import type { UserSession } from '@/lib/types/user-session';
import { formatBRL, formatWhen } from '@/lib/utils/agenda-status';

const JOURNEY: readonly {
  order: '01' | '02' | '03';
  titleKey: MessageKey;
  icon: typeof ClipboardList;
  iconClass: string;
}[] = [
  {
    order: '01',
    titleKey: 'agenda.statusActionRequired',
    icon: ClipboardList,
    iconClass: 'text-zinc-400',
  },
  {
    order: '02',
    titleKey: 'agenda.statusAwaitingPayment',
    icon: Wallet,
    iconClass: 'text-zinc-400',
  },
  {
    order: '03',
    titleKey: 'agenda.statusConfirmed',
    icon: CheckCircle2,
    iconClass: 'text-emerald-500',
  },
];

function PaymentCard({ session }: { session: UserSession }) {
  const { t } = useI18n();

  return (
    <article className="mb-5 flex w-full flex-col gap-4 rounded-3xl border border-zinc-800 bg-zinc-900 p-5">
      <header className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-[15px] font-semibold tracking-tight text-zinc-100">
          {t('agenda.session')}
        </h3>
        <span className="inline-flex shrink-0 items-center rounded-full border border-amber-500/50 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
          {t('agenda.statusAwaitingPayment')}
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
      </dl>

      <div className="flex items-center justify-between rounded-xl bg-zinc-950 p-3">
        <span className="text-[12px] font-medium text-zinc-400">{t('clientAgenda.depositLabel')}</span>
        <span className="text-sm font-bold tabular-nums text-zinc-100">
          {formatBRL(session.depositValue)}
        </span>
      </div>

      <ClientActionCTA kind="pay" href="/dashboard/pagamentos" label={t('payments.payNow')} />
    </article>
  );
}

export function PaymentsVault({ sessions }: { sessions: UserSession[] }) {
  const { t } = useI18n();
  const pending = sessions.filter((session) => session.sessionStatus === 'AWAITING_PAYMENT');

  return (
    <div className="flex w-full flex-1 flex-col">
      <header className="w-full">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{BRAND_NAME}</p>
        <h2 className="mt-1 text-2xl font-bold text-zinc-100">{t('payments.title')}</h2>
        <p className="mt-2 leading-relaxed text-zinc-400">{t('payments.subtitle')}</p>
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-900/50 bg-green-950/30 p-3">
          <Lock className="h-4 w-4 min-h-4 min-w-4 shrink-0 text-green-500/90" strokeWidth={2} />
          <p className="text-sm text-green-500/90">{t('payments.secureNote', { brand: BRAND_NAME })}</p>
        </div>
      </header>

      <section className="mt-6 w-full">
        <p className="mb-3 text-xs font-bold uppercase text-zinc-500">{t('payments.journey')}</p>
        <ol className="grid grid-cols-3 gap-2">
          {JOURNEY.map((step) => {
            const Icon = step.icon;
            return (
              <li
                key={step.order}
                className="flex flex-col items-center rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-center"
              >
                <Icon className={`h-5 w-5 min-h-5 min-w-5 ${step.iconClass}`} strokeWidth={1.75} />
                <p className="mt-2 text-[10px] font-bold tabular-nums tracking-wide text-zinc-500">
                  {step.order}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold leading-tight text-zinc-300">
                  {t(step.titleKey)}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      {pending.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center border-t border-zinc-800/50 py-10">
          <p className="font-semibold text-zinc-100">{t('payments.vaultEmpty')}</p>
          <p className="mt-1 text-sm text-zinc-500">{t('payments.vaultEmptyHint')}</p>
        </div>
      ) : (
        <div className="mt-6 w-full">
          {pending.map((session) => (
            <PaymentCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}
