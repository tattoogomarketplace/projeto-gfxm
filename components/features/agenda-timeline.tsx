'use client';

import type { ComponentType, ReactNode } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  PenLine,
  Wallet,
  XCircle,
} from 'lucide-react';
import { GlassContainer } from '@/components/ui/glass-container';
import { Skeleton } from '@/components/ui/skeleton';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';
import type { MessageKey } from '@/lib/i18n/types';
import type { Agendamento } from '@/lib/types/database';

/**
 * Vertical agenda timeline for the client dashboard.
 *
 * Presentational only: it renders the existing `Agendamento` records mapped to
 * three canonical lifecycle tones and leaves dedicated placeholder slots for the
 * upcoming bespoke payment + document-signature flow ("Ação Necessária").
 * No data fetching, no mutation — the dashboard owns the query.
 */

type AgendaStatus = Agendamento['status'];

type StatusTone = {
  labelKey: MessageKey;
  /** Vertical dot + pill colors. */
  dot: string;
  pill: string;
  accent: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  actionKey?: MessageKey;
  actionIcon?: ComponentType<{ className?: string; strokeWidth?: number }>;
};

const STATUS_TONES: Record<AgendaStatus, StatusTone> = {
  rascunho: {
    labelKey: 'agenda.statusActionRequired',
    dot: 'bg-orange-500 ring-orange-500/20',
    pill: 'border-orange-500/40 bg-orange-500/15 text-orange-600 dark:text-orange-300',
    accent: 'from-orange-500 to-amber-500',
    icon: AlertTriangle,
    actionKey: 'agenda.signDocument',
    actionIcon: PenLine,
  },
  aguardando_sinal: {
    labelKey: 'agenda.statusAwaitingPayment',
    dot: 'bg-amber-500 ring-amber-500/20',
    pill: 'border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-300',
    accent: 'from-amber-500 to-orange-500',
    icon: Wallet,
    actionKey: 'agenda.payDeposit',
    actionIcon: CreditCard,
  },
  confirmado: {
    labelKey: 'agenda.statusConfirmed',
    dot: 'bg-emerald-500 ring-emerald-500/20',
    pill: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
    accent: 'from-emerald-500 to-teal-500',
    icon: CheckCircle2,
  },
  concluido: {
    labelKey: 'agenda.statusCompleted',
    dot: 'bg-emerald-400 ring-emerald-400/20',
    pill: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300',
    accent: 'from-emerald-400 to-emerald-600',
    icon: CheckCircle2,
  },
  cancelado: {
    labelKey: 'agenda.statusCanceled',
    dot: 'bg-zinc-400 ring-zinc-400/20',
    pill: 'border-zinc-400/30 bg-zinc-400/10 text-zinc-500 dark:text-zinc-400',
    accent: 'from-zinc-400 to-zinc-500',
    icon: XCircle,
  },
};

function resolveTone(status: AgendaStatus | undefined): StatusTone {
  if (status && status in STATUS_TONES) {
    return STATUS_TONES[status];
  }
  return STATUS_TONES.aguardando_sinal;
}

function formatBRL(value?: number): string {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
  } catch {
    return `R$ ${amount.toFixed(2)}`;
  }
}

function formatWhen(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

function TimelineSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
    </div>
  );
}

function StatusPreviewCard({ status }: { status: AgendaStatus }) {
  const { t } = useI18n();
  const tone = resolveTone(status);
  const Icon = tone.icon;
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-dashed border-neutral-300 p-4 dark:border-white/[0.05]'
      )}
    >
      <span
        aria-hidden
        className={cn('absolute left-0 top-0 h-full w-1 bg-gradient-to-b', tone.accent)}
      />
      <div className="flex items-center gap-3 pl-2">
        <span
          className={cn(
            'flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-full border',
            tone.pill
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-800 dark:text-zinc-100">
            {t(tone.labelKey)}
          </p>
          {status === 'rascunho' ? (
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-zinc-400">
              {t('agenda.statusActionRequiredHint')}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AgendaEmptyState() {
  const { t } = useI18n();
  return (
    <div className="space-y-5">
      <GlassContainer className="border-dashed p-6 text-center">
        <span className="mx-auto flex h-12 w-12 min-h-12 min-w-12 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-500 dark:text-orange-400">
          <CalendarClock className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <p className="mt-3 text-sm font-medium text-neutral-600 dark:text-zinc-300">
          {t('agenda.empty')}
        </p>
        <p className="mt-1 text-xs text-neutral-500 dark:text-zinc-500">{t('agenda.emptyHint')}</p>
      </GlassContainer>

      <div className="space-y-3">
        <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400 dark:text-zinc-500">
          {t('agenda.stagesPreview')}
        </p>
        <StatusPreviewCard status="rascunho" />
        <StatusPreviewCard status="aguardando_sinal" />
        <StatusPreviewCard status="confirmado" />
      </div>
    </div>
  );
}

function AgendaTimelineItem({ agendamento }: { agendamento: Agendamento }) {
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();
  const tone = resolveTone(agendamento?.status);
  const Icon = tone.icon;
  const ActionIcon = tone.actionIcon;
  const key = agendamento?.id ?? `${agendamento?.data_hora ?? 'slot'}-${agendamento?.status ?? 'status'}`;

  return (
    <li key={key} className="relative pl-8">
      <span
        aria-hidden
        className={cn(
          'absolute left-[3px] top-6 h-3.5 w-3.5 rounded-full ring-4 ring-background',
          tone.dot
        )}
      />
      <GlassContainer className="group relative overflow-hidden p-4">
        <span
          aria-hidden
          className={cn('absolute left-0 top-0 h-full w-1 bg-gradient-to-b', tone.accent)}
        />
        <div className="relative pl-2">
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
              {formatWhen(agendamento?.data_hora)}
            </span>
          </div>

          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">
                {t('agenda.session')}
              </p>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-zinc-400">
                {formatBRL(agendamento?.valor_total)}
              </p>
            </div>
            {tone.actionKey && ActionIcon ? (
              <button
                type="button"
                onClick={() => triggerHaptic('light')}
                className={cn(
                  'apple-press inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold',
                  tone.pill,
                  'hover:brightness-110'
                )}
              >
                <ActionIcon className="h-3.5 w-3.5" strokeWidth={2} />
                {t(tone.actionKey)}
              </button>
            ) : null}
          </div>
        </div>
      </GlassContainer>
    </li>
  );
}

export function AgendaTimeline({
  agendamentos,
  isLoading,
}: {
  agendamentos?: Agendamento[];
  isLoading?: boolean;
}): ReactNode {
  const items = agendamentos ?? [];

  if (isLoading) return <TimelineSkeleton />;
  if (items.length === 0) return <AgendaEmptyState />;

  return (
    <ol className="relative space-y-4">
      <span
        aria-hidden
        className="absolute bottom-3 left-[9px] top-3 w-px bg-gradient-to-b from-orange-500/50 via-neutral-300 to-transparent dark:via-white/10"
      />
      {items.map((agendamento, index) => (
        <AgendaTimelineItem
          key={agendamento?.id ?? `agendamento-${index}`}
          agendamento={agendamento}
        />
      ))}
    </ol>
  );
}
