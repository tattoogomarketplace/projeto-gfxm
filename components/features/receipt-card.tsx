'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { BadgeCheck, CalendarClock, Receipt, Wallet } from 'lucide-react';
import { GlassContainer } from '@/components/ui/glass-container';
import { TattooMachineLoader } from '@/components/ui/tattoo-machine-loader';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { BRAND_PASS } from '@/lib/i18n/brands';
import { cn } from '@/lib/utils';
import { formatBRL, formatWhen } from '@/lib/utils/agenda-status';
import type { ClientHistorySession } from '@/lib/types/client-agenda';

/**
 * ReceiptCard — comprovante arquivado de uma sessão encerrada.
 *
 * Estética "Archived Premium": acento dessaturado (grafite/zinco) e contraste
 * reduzido em relação à sessão ativa, mas mantendo o vidro e o luxo. Cada item
 * expõe o artista, a data, o valor total e o selo intocável de validação
 * (`Sessão Concluída` / `TattooGo Pass Validado`, em esmeralda translúcida).
 *
 * O CTA fantasma "Ver Comprovante" é um placeholder visual: o estado de
 * preparação troca o conteúdo pelo loader compacto dentro da mesma caixa
 * (`min-h-11`) — a geometria externa nunca muda, zero CLS.
 */
export interface ReceiptCardProps {
  readonly session: ClientHistorySession;
  readonly className?: string;
}

const SIMULATED_LATENCY_MS = 1000;

export function ReceiptCard({ session, className }: ReceiptCardProps): ReactNode {
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();
  const { agendamento, artistName, receiptCode } = session;
  const [preparing, setPreparing] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    []
  );

  const prepareReceipt = useCallback(() => {
    if (preparing) return;
    triggerHaptic('light');
    setPreparing(true);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setPreparing(false);
    }, SIMULATED_LATENCY_MS);
  }, [preparing, triggerHaptic]);

  return (
    <GlassContainer
      className={cn(
        'relative min-w-0 w-full overflow-hidden p-4 sm:p-5 dark:bg-white/[0.02]',
        className
      )}
    >
      <span
        aria-hidden
        className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-zinc-300 to-zinc-400 dark:from-zinc-600 dark:to-zinc-700"
      />

      <div className="min-w-0 pl-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400 dark:text-zinc-500">
              {t('clientAgenda.artist')}
            </p>
            <p className="mt-1 truncate text-base font-bold tracking-tight text-neutral-700 dark:text-zinc-200">
              {artistName}
            </p>
          </div>
          <span className="shrink-0 text-right text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400 dark:text-zinc-500">
            {t('clientHistory.receiptCode')}
            <span className="mt-0.5 block font-mono text-[11px] tracking-normal text-neutral-500 dark:text-zinc-400">
              {receiptCode}
            </span>
          </span>
        </div>

        <span className="mt-3 inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600/90 dark:border-emerald-400/15 dark:bg-emerald-400/[0.06] dark:text-emerald-300/90">
          <BadgeCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span>{t('clientHistory.badgeCompleted')}</span>
          <span className="opacity-40">/</span>
          <span>{t('clientHistory.passValidated', { brand: BRAND_PASS })}</span>
        </span>

        <dl className="mt-4 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <dt className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-zinc-400">
              <CalendarClock
                className="h-4 w-4 shrink-0 text-neutral-400 dark:text-zinc-500"
                strokeWidth={1.9}
              />
              <span className="truncate">{t('clientAgenda.schedule')}</span>
            </dt>
            <dd className="shrink-0 text-sm font-semibold tabular-nums text-neutral-700 dark:text-zinc-200">
              {formatWhen(agendamento.data_hora)}
            </dd>
          </div>

          <div className="flex items-center justify-between gap-3">
            <dt className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-zinc-400">
              <Wallet
                className="h-4 w-4 shrink-0 text-neutral-400 dark:text-zinc-500"
                strokeWidth={1.9}
              />
              <span className="truncate">{t('clientAgenda.total')}</span>
            </dt>
            <dd className="shrink-0 text-sm font-bold tabular-nums text-neutral-700 dark:text-zinc-100">
              {formatBRL(agendamento.valor_total)}
            </dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={prepareReceipt}
          disabled={preparing}
          aria-busy={preparing}
          className="apple-press mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-black/[0.06] bg-transparent px-4 text-sm font-semibold text-neutral-600 transition-[background-color,border-color,color] duration-100 ease-out hover:border-orange-500/30 hover:text-orange-500 disabled:cursor-wait dark:border-white/[0.08] dark:text-zinc-300 dark:hover:border-orange-500/30 dark:hover:text-orange-400"
        >
          {preparing ? (
            <TattooMachineLoader compact label={t('clientHistory.preparing')} />
          ) : (
            <>
              <Receipt className="h-4 w-4 shrink-0" strokeWidth={2} />
              {t('clientHistory.viewReceipt')}
            </>
          )}
        </button>
      </div>
    </GlassContainer>
  );
}
