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
