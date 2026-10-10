'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { CalendarClock, Check, ChevronDown, CreditCard, PenLine } from 'lucide-react';
import { GlassContainer } from '@/components/ui/glass-container';
import { Skeleton } from '@/components/ui/skeleton';
import { TattooGoPassCard } from '@/components/features/tattoogo-pass-card';
import { ClientActiveSessionCard } from '@/components/features/client-active-session-card';
import { ClientActionCTA } from '@/components/features/client-action-cta';
import { MOCK_ACTIVE_SESSIONS } from '@/lib/mocks/client-active-sessions';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useI18n } from '@/hooks/use-i18n';
import { cn } from '@/lib/utils';
import {
  buildSessionTimeline,
  formatBRL,
  formatWhen,
  SESSION_TIMELINE_STEPS,
} from '@/lib/utils/agenda-status';
import type { Agendamento } from '@/lib/types/database';
import type {
  ClientSessionTimeline,
  SessionTimelineStep,
  SessionTimelineStepId,
} from '@/lib/types/session-timeline';

/**
 * ClientTimelineTracker — rastreador visual da jornada do cliente.
 *
 * Transforma cada `Agendamento` num stepper progressivo de três etapas
 * (01 Ação Necessária → 02 Aguardando Sinal 25% → 03 Confirmado/Concluído),
 * com nós de micro-ícone, barra de progresso contínua e detalhe expansível
 * sem layout shift. Presentacional: nenhuma regra financeira ou mutação vive
 * aqui — apenas a projeção tipada vinda de `buildSessionTimeline`.
 */

type StepAccent = {
  readonly text: string;
  readonly node: string;
  readonly ring: string;
  readonly glow: string;
  readonly bar: string;
};

const STEP_ACCENT: Record<SessionTimelineStepId, StepAccent> = {
  action_required: {
    text: 'text-orange-500 dark:text-orange-400',
    node: 'border-orange-500/40 bg-orange-500/15 text-orange-600 dark:text-orange-300',
    ring: 'ring-orange-500/15',
    glow: 'shadow-[0_0_18px_rgba(249,115,22,0.22)]',
    bar: 'from-orange-500 to-amber-500',
  },
  awaiting_deposit: {
    text: 'text-amber-500 dark:text-amber-400',
    node: 'border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-300',
    ring: 'ring-amber-500/15',
    glow: 'shadow-[0_0_18px_rgba(245,158,11,0.22)]',
    bar: 'from-amber-500 to-orange-500',
  },
  confirmed: {
    text: 'text-emerald-500 dark:text-emerald-400',
    node: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
    ring: 'ring-emerald-500/15',
    glow: 'shadow-[0_0_18px_rgba(16,185,129,0.22)]',
    bar: 'from-emerald-500 to-teal-500',
  },
};

const UPCOMING_NODE =
  'border-neutral-200 bg-neutral-100 text-neutral-400 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-zinc-500';

const STEP_STATE_KEY = {
  completed: 'agenda.stepStateDone',
  active: 'agenda.stepStateActive',
  upcoming: 'agenda.stepStatePending',
} as const;

export function TimelineTrackerSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <Skeleton className="h-6 w-40 rounded-lg" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}

function TimelineHeader() {
  const { t } = useI18n();
  return (
    <div className="flex shrink-0 items-start gap-3">
      <span className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-500 shadow-[0_0_18px_rgba(249,115,22,0.22)] dark:text-orange-400">
        <CalendarClock className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
          {t('agenda.timeline')}
        </h2>
        <p className="mt-0.5 text-sm text-neutral-600 dark:text-zinc-400">
          {t('agenda.timelineSubtitle')}
        </p>
      </div>
    </div>
  );
}

function StepNode({ step, index }: { step: SessionTimelineStep; index: number }) {
  const { t } = useI18n();
  const definition = SESSION_TIMELINE_STEPS[index];
  const Icon = definition?.icon ?? PenLine;
  const accent = STEP_ACCENT[step.id];
  const isCompleted = step.state === 'completed';
  const isActive = step.state === 'active';

  return (
    <li
      aria-label={`${t(step.titleKey)} · ${t(STEP_STATE_KEY[step.state])}`}
      className="relative z-10 flex min-w-0 flex-col items-center gap-2 text-center"
    >
      <span
        className={cn(
          'flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full border transition-all duration-300 ease-out',
          isCompleted ? accent.node : isActive ? cn(accent.node, accent.ring, accent.glow, 'scale-105 ring-4') : UPCOMING_NODE
        )}
      >
        {isCompleted ? (
          <Check className="h-5 w-5" strokeWidth={2.4} />
        ) : (
          <Icon className="h-5 w-5" strokeWidth={1.9} />
        )}
      </span>
      <div className="min-w-0 px-0.5">
        <p
          className={cn(
            'text-[10px] font-bold tracking-[0.18em] tabular-nums',
            isActive ? accent.text : 'text-neutral-400 dark:text-zinc-500'
          )}
        >
          {String(step.order).padStart(2, '0')}
        </p>
        <p
          className={cn(
            'mt-0.5 text-[11px] font-semibold leading-tight',
            isActive ? 'text-gray-900 dark:text-white' : 'text-neutral-500 dark:text-zinc-400'
          )}
        >
          {t(step.titleKey)}
        </p>
      </div>
    </li>
  );
}

function ProgressHeader({ progress }: { progress: number }) {
  const { t } = useI18n();

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-400 dark:text-zinc-500">
        {t('agenda.trackerProgress')}
      </span>
      <span className="text-[11px] font-bold tabular-nums text-neutral-500 dark:text-zinc-400">
        {Math.round(progress)}%
      </span>
    </div>
  );
}

function StepDetails({
  timeline,
  expanded,
  instanceId,
}: {
  timeline: ClientSessionTimeline;
  expanded: boolean;
  instanceId: string;
}) {
  const { t } = useI18n();
  const step = timeline.steps.find((item) => item.id === timeline.currentStepId) ?? timeline.steps[0];
  const isAction = step.id === 'action_required';
  const isPayment = step.id === 'awaiting_deposit';
  const percent = Math.round(timeline.payment.depositRatio * 100);

  return (
    <div
      id={instanceId}
      className={cn(
        'grid transition-[grid-template-rows] duration-300 ease-out',
        expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="mt-4 space-y-3 border-t border-black/[0.04] pt-4 dark:border-white/[0.05]">
          <p className="text-xs leading-relaxed text-neutral-600 dark:text-zinc-400">
            {t(step.hintKey)}
          </p>

          {!isAction ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-black/[0.04] bg-black/[0.02] px-4 py-3 dark:border-white/[0.05] dark:bg-white/[0.02]">
              <span className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold text-neutral-600 dark:text-zinc-300">
                <CreditCard className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" strokeWidth={2} />
                <span className="truncate">{t('agenda.depositDue', { percent })}</span>
              </span>
              <span className="shrink-0 text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                {formatBRL(timeline.payment.depositAmount)}
              </span>
            </div>
          ) : null}

          {isAction || isPayment ? (
            <ClientActionCTA kind={isAction ? 'sign' : 'pay'} href="/dashboard/pagamentos" />
          ) : (
            <div className="space-y-4">
              <p className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Check className="h-4 w-4" strokeWidth={2.4} />
                {t('agenda.statusConfirmed')}
              </p>
              {timeline.status === 'confirmado' ? (
                <TattooGoPassCard seed={timeline.agendamentoId} />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionTrackerCard({ agendamento }: { agendamento: Agendamento }) {
  const { t } = useI18n();
  const { triggerHaptic } = useHapticFeedback();
  const timeline = buildSessionTimeline(agendamento);
  const actionable = timeline.status === 'rascunho' || timeline.status === 'aguardando_sinal';
  const [expanded, setExpanded] = useState(actionable);
  const panelId = `session-timeline-${agendamento.id}`;
  const fill =
    timeline.progress <= 33 ? 0 : timeline.progress >= 100 ? 100 : ((timeline.progress - 33) / 67) * 100;

  const toggle = useCallback(() => {
    triggerHaptic('light');
    setExpanded((prev) => !prev);
  }, [triggerHaptic]);

  return (
    <GlassContainer className="relative min-w-0 w-full overflow-hidden p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold tracking-tight text-gray-900 dark:text-white">
          {t('agenda.session')}
        </p>
        <span className="shrink-0 text-xs font-medium text-neutral-500 dark:text-zinc-400">
          {formatWhen(agendamento.data_hora)}
        </span>
      </div>
      <p className="mt-0.5 text-xs tabular-nums text-neutral-500 dark:text-zinc-400">
        {formatBRL(timeline.payment.total)}
      </p>

      <div className="mt-4 space-y-3">
        <ProgressHeader progress={timeline.progress} />
        <div className="relative">
          <div
            aria-hidden
            className="absolute left-[16.666%] right-[16.666%] top-[1.375rem] h-0.5 -translate-y-1/2 overflow-hidden rounded-full bg-neutral-200 dark:bg-white/10"
          >
            <span
              className="block h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 transition-[width] duration-500 ease-out"
              style={{ width: `${fill}%` }}
            />
          </div>
          <ol className="relative grid grid-cols-3 items-start gap-1">
            {timeline.steps.map((step, index) => (
              <StepNode key={step.id} step={step} index={index} />
            ))}
          </ol>
        </div>
      </div>

      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="apple-press mt-3 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-black/[0.04] bg-black/[0.02] px-4 text-xs font-semibold text-neutral-600 hover:brightness-[0.98] dark:border-white/[0.05] dark:bg-white/[0.02] dark:text-zinc-300"
      >
        <ChevronDown
          className={cn('h-4 w-4 transition-transform duration-300 ease-out', expanded && 'rotate-180')}
          strokeWidth={2}
        />
        {expanded ? t('agenda.trackerCollapse') : t('agenda.trackerExpand')}
      </button>

      <StepDetails timeline={timeline} expanded={expanded} instanceId={panelId} />
    </GlassContainer>
  );
}

function TrackerEmptyState() {
  const { t } = useI18n();
  return (
    <div className="min-w-0 w-full flex-1 space-y-5">
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
        {SESSION_TIMELINE_STEPS.map((step) => {
          const Icon = step.icon;
          const accent = STEP_ACCENT[step.id];
          return (
            <GlassContainer
              key={step.id}
              className="relative min-w-0 w-full overflow-hidden p-4"
            >
              <span
                aria-hidden
                className={cn('absolute left-0 top-0 h-full w-1 bg-gradient-to-b', accent.bar)}
              />
              <div className="flex items-center gap-3 pl-2">
                <span
                  className={cn(
                    'flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-full border',
                    accent.node
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.9} />
                </span>
                <div className="min-w-0">
                  <p className={cn('text-[10px] font-bold tracking-[0.18em] tabular-nums', accent.text)}>
                    {String(step.order).padStart(2, '0')}
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {t(step.titleKey)}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500 dark:text-zinc-400">
                    {t(step.hintKey)}
                  </p>
                </div>
              </div>
            </GlassContainer>
          );
        })}
      </div>
    </div>
  );
}

export function ClientTimelineTracker({
  agendamentos,
  isLoading,
  showActiveSession = true,
}: {
  agendamentos?: Agendamento[];
  isLoading?: boolean;
  showActiveSession?: boolean;
}): ReactNode {
  const realItems = agendamentos ?? [];
  const usingMock = realItems.length === 0 && showActiveSession;
  const items = usingMock ? MOCK_ACTIVE_SESSIONS.map((session) => session.agendamento) : realItems;

  if (isLoading) return <TimelineTrackerSkeleton />;

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-4">
      <TimelineHeader />
      {usingMock ? <ClientActiveSessionCard session={MOCK_ACTIVE_SESSIONS[0]} /> : null}
      {items.length === 0 ? (
        <TrackerEmptyState />
      ) : (
        <ol className="min-w-0 w-full flex-1 space-y-4">
          {items.map((agendamento, index) => (
            <li key={agendamento?.id ?? `agendamento-${index}`} className="min-w-0 w-full">
              <SessionTrackerCard agendamento={agendamento} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
