/**
 * TATTOOGO MK — SESSION TIMELINE TRACKER (CLIENT JOURNEY)
 *
 * Contratos estritos do rastreador de jornada do cliente. Modelam a linha do
 * tempo em três etapas canônicas e o estado de pagamento (sinal de 25%) sem
 * jamais decidir valores na UI. A camada visual consome estes tipos e o motor
 * de dados (gateway/escrow) apenas os preenche no futuro.
 *
 * Regra de negócio: a UI envia INTENÇÃO; o backend recalcula o sinal e o split.
 */

import type { MessageKey } from '@/lib/i18n/types';
import type { Agendamento } from '@/lib/types/database';

/** Ciclo de vida canônico de um agendamento (`agendamentos.status`). */
export type SessionLifecycleStatus = Agendamento['status'];

/** Identificador estável de cada etapa da jornada do cliente. */
export type SessionTimelineStepId = 'action_required' | 'awaiting_deposit' | 'confirmed';

/** Estado visual de uma etapa dentro do rastreador. */
export type SessionTimelineStepState = 'completed' | 'active' | 'upcoming';

/** Definição imutável e reutilizável de uma etapa da jornada. */
export interface SessionTimelineStepDefinition {
  readonly id: SessionTimelineStepId;
  /** Ordem canônica exibida como "01", "02", "03". */
  readonly order: 1 | 2 | 3;
  /** Status de agendamento que ativa esta etapa. */
  readonly status: SessionLifecycleStatus;
  readonly titleKey: MessageKey;
  readonly hintKey: MessageKey;
}

/** Etapa resolvida com o estado calculado para um agendamento concreto. */
export interface SessionTimelineStep extends SessionTimelineStepDefinition {
  readonly state: SessionTimelineStepState;
}

/**
 * Estado de pagamento do sinal. Todos os valores derivam do backend; a UI usa
 * apenas para pré-visualização transparente (calção fixo de 25%).
 */
export interface SessionPaymentState {
  readonly total: number;
  readonly depositRatio: number;
  readonly depositAmount: number;
  readonly remaining: number;
  readonly depositPaid: boolean;
}

/** Projeção completa de uma sessão para o rastreador visual. */
export interface ClientSessionTimeline {
  readonly agendamentoId: string;
  readonly status: SessionLifecycleStatus;
  readonly steps: readonly SessionTimelineStep[];
  readonly currentStepId: SessionTimelineStepId;
  /** Progresso contínuo de 0 a 100 (sem saltos entre estados). */
  readonly progress: number;
  readonly payment: SessionPaymentState;
}
