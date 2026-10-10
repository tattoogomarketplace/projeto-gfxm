'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { CalendarClock, ScanLine, ShieldCheck, UserRound, Wallet } from 'lucide-react';
import { GlassContainer } from '@/components/ui/glass-container';
import { SessionValidationSheet } from '@/components/features/session-validation-sheet';
import { toast } from '@/lib/toast';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';
import { depositAmount, formatBRL, formatWhen, isSessionToday } from '@/lib/utils/agenda-status';
import type { StudioActiveSession } from '@/lib/types/studio-agenda';

/**
 * StudioActiveSessionCard — estado ativo da agenda do estúdio.
 *
 * Preenche o "Empty State" do roster com a sessão em curso: cliente, data/hora,
 * valor total e o sinal de 25% retido em escrow (esmeralda) — a mesma ponte de
 * dados do lado do cliente, agora projetada para o tatuador. Expoe o CTA de
 * validação do TattooGo Pass, que só aparece (e pulsa) quando a sessão é de
 * hoje, reaproveitando `useHapticFeedback` + `SessionValidationSheet`.
 *
 * Presentacional: todos os valores derivam de `depositAmount` (motor financeiro
 * do backend). A UI nunca decide preço. Dimensões fluidas (`w-full`, paddings
 * relativos) → zero CLS do iPhone SE ao Pro Max.
 */
export interface StudioActiveSessionCardProps {
  readonly session: StudioActiveSession;
  readonly className?: string;
}

export function StudioActiveSessionCard({
  session,
  className,
}: StudioActiveSessionCardProps): ReactNode {
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();
  const [open, setOpen] = useState(false);

  const panelId = `studio-active-token-${session.agendamento.id}`;
  const isToday = isSessionToday(session.agendamento.data_hora);
  const total = session.agendamento.valor_total;
  const deposit = depositAmount(total);

  const handleVerify = useCallback(
    async (code: string) => {
      if (code.trim().length !== 6) return false;
      triggerHaptic('medium');
      return true;
    },
    [triggerHaptic]
  );

  const toggleToken = useCallback(() => {
    triggerHaptic('light');
    setOpen((prev) => !prev);
  }, [triggerHaptic]);

  return (
    <GlassContainer className={cn('relative min-w-0 w-full overflow-hidden p-4 sm:p-5', className)}>
      <span
        aria-hidden
        className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-emerald-500 to-teal-500"
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
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} />
            {t('agenda.depositHeld')} (25%)
          </span>
        </div>

        <dl className="mt-4 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <dt className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-zinc-400">
              <UserRound className="h-4 w-4 shrink-0 text-neutral-400 dark:text-zinc-500" strokeWidth={1.9} />
              <span className="truncate">{t('chat.clientFallback')}</span>
            </dt>
            <dd className="shrink-0 text-sm font-semibold text-gray-900 dark:text-white">
              {session.clientName}
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
              {formatBRL(total)}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.08] px-4 py-3">
          <span className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4 shrink-0" strokeWidth={2} />
            <span className="truncate">{t('clientAgenda.depositLabel')}</span>
          </span>
          <span className="shrink-0 text-base font-bold tabular-nums text-gray-900 dark:text-white">
            {formatBRL(deposit)}
          </span>
        </div>

        <button
          type="button"
          onClick={toggleToken}
          aria-expanded={open}
          aria-controls={panelId}
          className={cn(
            'apple-press mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 text-sm font-semibold text-orange-600 hover:brightness-110 dark:text-orange-300',
            isToday && 'today-pulse'
          )}
        >
          <ScanLine className="h-4 w-4" strokeWidth={2} />
          {t('agenda.validateSession')}
        </button>

        <SessionValidationSheet
          open={open}
          panelId={panelId}
          onVerify={handleVerify}
          onValidated={() => {
            triggerHaptic('success');
            toast.success(t('agenda.sessionValidated'));
            setOpen(false);
          }}
        />
      </div>
    </GlassContainer>
  );
}
