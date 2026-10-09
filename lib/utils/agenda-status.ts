import type { ComponentType } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  PenLine,
  Wallet,
  XCircle,
} from 'lucide-react';
import type { MessageKey } from '@/lib/i18n/types';
import type { Agendamento } from '@/lib/types/database';
import type {
  ClientSessionTimeline,
  SessionLifecycleStatus,
  SessionPaymentState,
  SessionTimelineStep,
  SessionTimelineStepDefinition,
  SessionTimelineStepState,
} from '@/lib/types/session-timeline';

export type AgendaStatus = Agendamento['status'];

export type StatusTone = {
  labelKey: MessageKey;
  dot: string;
  pill: string;
  accent: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  actionKey?: MessageKey;
  actionIcon?: ComponentType<{ className?: string; strokeWidth?: number }>;
};

export const STATUS_TONES: Record<AgendaStatus, StatusTone> = {
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

export const PAYMENT_JOURNEY_STATUSES: AgendaStatus[] = [
  'rascunho',
  'aguardando_sinal',
  'confirmado',
];

export function resolveTone(status: AgendaStatus | undefined): StatusTone {
  if (status && status in STATUS_TONES) {
    return STATUS_TONES[status];
  }
  return STATUS_TONES.aguardando_sinal;
}

export function formatBRL(value?: number): string {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
  } catch {
    return `R$ ${amount.toFixed(2)}`;
  }
}

export function formatWhen(value?: string): string {
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

export function depositAmount(valorTotal?: number): number {
  const amount = typeof valorTotal === 'number' && Number.isFinite(valorTotal) ? valorTotal : 0;
  return Number((amount * 0.25).toFixed(2));
}

/* -------------------------------------------------------------------------- */
/* Studio roster (daily / upcoming) + deposit escrow state                     */
/* -------------------------------------------------------------------------- */

/**
 * Estado financeiro do sinal no roster do estúdio.
 * - `paid`     sinal liquidado (sessão concluída)
 * - `held`     sinal retido em escrow (sessão confirmada)
 * - `awaiting` aguardando pagamento do sinal de 25%
 * - `canceled` sessão cancelada
 */
export type DepositVisualState = 'paid' | 'held' | 'awaiting' | 'canceled';

export const DEPOSIT_LABEL_KEY: Record<DepositVisualState, MessageKey> = {
  paid: 'agenda.depositPaid',
  held: 'agenda.depositHeld',
  awaiting: 'agenda.statusAwaitingPayment',
  canceled: 'agenda.statusCanceled',
};

/** Deriva o estado do sinal estritamente do status/sinal persistido. */
export function resolveDepositState(agendamento?: Agendamento): DepositVisualState {
  const status = agendamento?.status;
  if (status === 'cancelado') return 'canceled';
  if (status === 'concluido') return 'paid';
  if (status === 'confirmado' || agendamento?.sinal_pago === true) return 'held';
  return 'awaiting';
}

/** Um agendamento pode ser validado no dia corrente. */
export function isSessionToday(value?: string): boolean {
  const date = parseDate(value);
  if (!date) return false;
  return isSameLocalDay(date, new Date());
}

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export interface StudioRoster {
  readonly today: Agendamento[];
  readonly upcoming: Agendamento[];
}

function byChronologicalOrder(a: Agendamento, b: Agendamento): number {
  const left = parseDate(a.data_hora)?.getTime() ?? Number.POSITIVE_INFINITY;
  const right = parseDate(b.data_hora)?.getTime() ?? Number.POSITIVE_INFINITY;
  return left - right;
}

/**
 * Particiona o roster do estúdio em `Hoje` e `Próximos`, ordenado
 * cronologicamente. Sessões passadas ficam de fora do roster operacional (a
 * trilha financeira vive em Recebimentos). Registros sem data válida são
 * preservados em `upcoming` para nunca sumirem da UI.
 */
export function groupStudioRoster(agendamentos?: Agendamento[]): StudioRoster {
  const items = agendamentos ?? [];
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const today: Agendamento[] = [];
  const upcoming: Agendamento[] = [];

  for (const item of items) {
    if (item.status === 'cancelado') continue;
    const date = parseDate(item.data_hora);
    if (!date) {
      upcoming.push(item);
      continue;
    }
    if (isSameLocalDay(date, now)) {
      today.push(item);
    } else if (date.getTime() >= startOfToday.getTime()) {
      upcoming.push(item);
    }
  }

  today.sort(byChronologicalOrder);
  upcoming.sort(byChronologicalOrder);
  return { today, upcoming };
}

/* -------------------------------------------------------------------------- */
/* Session timeline tracker (client journey)                                   */
/* -------------------------------------------------------------------------- */

type StepIcon = ComponentType<{ className?: string; strokeWidth?: number }>;

/** Metadados de exibição de cada etapa (modelo + micro-ícone da marca). */
export type SessionTimelineStepMeta = SessionTimelineStepDefinition & {
  readonly icon: StepIcon;
};

/** Ordem canônica exibida como 01 → 02 → 03 na jornada do cliente. */
export const SESSION_TIMELINE_STEPS: readonly SessionTimelineStepMeta[] = [
  {
    id: 'action_required',
    order: 1,
    status: 'rascunho',
    titleKey: 'agenda.statusActionRequired',
    hintKey: 'agenda.stepActionHint',
    icon: PenLine,
  },
  {
    id: 'awaiting_deposit',
    order: 2,
    status: 'aguardando_sinal',
    titleKey: 'agenda.statusAwaitingPayment',
    hintKey: 'agenda.stepPaymentHint',
    icon: Wallet,
  },
  {
    id: 'confirmed',
    order: 3,
    status: 'confirmado',
    titleKey: 'agenda.statusConfirmed',
    hintKey: 'agenda.stepConfirmHint',
    icon: CheckCircle2,
  },
];

/** Índice da etapa ativa por status (cancelado não avança a jornada). */
const STATUS_STEP_INDEX: Record<SessionLifecycleStatus, number> = {
  rascunho: 0,
  aguardando_sinal: 1,
  confirmado: 2,
  concluido: 2,
  cancelado: -1,
};

/** Preenchimento contínuo da barra de progresso (0–100). */
const STATUS_PROGRESS: Record<SessionLifecycleStatus, number> = {
  rascunho: 33,
  aguardando_sinal: 66,
  confirmado: 100,
  concluido: 100,
  cancelado: 0,
};

export function stepIndexOf(status: AgendaStatus | undefined): number {
  if (status && status in STATUS_STEP_INDEX) return STATUS_STEP_INDEX[status];
  return 0;
}

export function resolveStepState(
  status: AgendaStatus | undefined,
  index: number
): SessionTimelineStepState {
  if (status === 'cancelado') return 'upcoming';
  if (status === 'concluido') return 'completed';
  const current = stepIndexOf(status);
  if (index < current) return 'completed';
  if (index === current) return 'active';
  return 'upcoming';
}

function resolvePaymentState(valorTotal?: number, sinalPago?: boolean): SessionPaymentState {
  const total = typeof valorTotal === 'number' && Number.isFinite(valorTotal) ? valorTotal : 0;
  const deposit = Number((total * 0.25).toFixed(2));
  return {
    total,
    depositRatio: 0.25,
    depositAmount: deposit,
    remaining: Number((total - deposit).toFixed(2)),
    depositPaid: Boolean(sinalPago),
  };
}

/**
 * Projeta um `Agendamento` no modelo estrito do rastreador de jornada.
 * Presentacional: não decide valores nem altera status — apenas deriva da
 * verdade do backend para alimentar os nós, badges e a barra de progresso.
 */
export function buildSessionTimeline(agendamento: Agendamento): ClientSessionTimeline {
  const status = agendamento.status;
  const steps: SessionTimelineStep[] = SESSION_TIMELINE_STEPS.map((step, index) => ({
    id: step.id,
    order: step.order,
    status: step.status,
    titleKey: step.titleKey,
    hintKey: step.hintKey,
    state: resolveStepState(status, index),
  }));

  const clampedIndex = Math.min(Math.max(stepIndexOf(status), 0), SESSION_TIMELINE_STEPS.length - 1);
  const currentStepId = SESSION_TIMELINE_STEPS[clampedIndex]?.id ?? 'action_required';

  return {
    agendamentoId: agendamento.id,
    status,
    steps,
    currentStepId,
    progress: STATUS_PROGRESS[status] ?? 0,
    payment: resolvePaymentState(agendamento.valor_total, agendamento.sinal_pago),
  };
}
