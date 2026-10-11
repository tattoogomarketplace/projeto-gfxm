/**
 * TATTOOGO MK — MOTOR FINANCEIRO (ESCROW & TOKEN READINESS)
 *
 * Contratos estritos de nível bancário que antecedem o fluxo real de sinal,
 * escrow e validação criptográfica (OTP). Nenhum valor monetário é decidido na
 * UI: a interface envia apenas a INTENÇÃO (`servicoId` + `metodoPagamento`) e o
 * backend (Route Handlers + Express) recalcula o split sobre o valor líquido.
 *
 * Regras canônicas:
 * - Calção (sinal) fixo de 25% do valor do serviço.
 * - Split SEMPRE sobre 100% do valor líquido ORIGINAL, ignorando o acréscimo do
 *   cartão: Autônomo `90/9/1` (tatuador/plataforma/reserva) ou Estúdio
 *   `88/8/3/1` (tatuador/plataforma/estúdio/reserva).
 * - Idempotência obrigatória por transação para blindar contra cobrança dupla.
 */

import type { Agendamento } from '@/lib/types/database';

/** Moeda e escala canônicas — todo montante é um número em BRL com 2 casas. */
export const FINANCIAL_CURRENCY = 'BRL' as const;
export const AMOUNT_SCALE = 2 as const;

/** Calção fixo da plataforma. Fonte única de verdade do sinal. */
export const DEPOSIT_RATIO = 0.25 as const;

export type FinancialCurrency = typeof FINANCIAL_CURRENCY;

/** Visões internas do workspace de Agenda e Pagamentos. */
export type AgendaView = 'agenda' | 'payments';

/** Método de pagamento suportado pelo gateway. */
export type PaymentMethod = 'pix' | 'credit';

/** Modelo de taxação: autônomo (`solo`) ou vinculado a um estúdio. */
export type StudioSplitModel = 'solo' | 'estudio';

/** Ciclo de vida de uma intenção de pagamento junto ao gateway. */
export type PaymentIntentStatus =
  | 'created'
  | 'requires_action'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'canceled';

/** Estado dos fundos retidos em escrow até a confirmação da sessão. */
export type EscrowLedgerState = 'held' | 'released' | 'refunded' | 'disputed';

/** Escopo de uma autorização criptográfica (OTP/assinatura). */
export type AuthorizationScope = 'sinal' | 'cancelamento';

/** Códigos de erro normalizados devolvidos pelo motor financeiro. */
export type PaymentErrorCode =
  | 'idempotency_conflict'
  | 'insufficient_funds'
  | 'authorization_required'
  | 'authorization_invalid'
  | 'gateway_unavailable'
  | 'invalid_intent';

/**
 * Política de calção. Imutável e compartilhada entre UI e backend para que a
 * pré-visualização do sinal jamais divirja da cobrança real.
 */
export interface DepositPolicy {
  readonly ratio: typeof DEPOSIT_RATIO;
  readonly currency: FinancialCurrency;
  readonly minimumAmount: number;
}

export const DEFAULT_DEPOSIT_POLICY: DepositPolicy = {
  ratio: DEPOSIT_RATIO,
  currency: FINANCIAL_CURRENCY,
  minimumAmount: 0,
};

/**
 * Payload enviado pela UI ao backend. NUNCA transporta o total calculado: a
 * verdade monetária é reconstruída server-side a partir do `servicoId`.
 */
export interface PaymentIntentRequest {
  /** Identificador do serviço/agendamento (`agendamentos.id`). */
  readonly servicoId: string;
  readonly metodoPagamento: PaymentMethod;
  /** Chave de idempotência única por tentativa lógica (anti cobrança dupla). */
  readonly idempotencyKey: string;
}

/** Divisão monetária calculada sobre o valor líquido original do serviço. */
export interface PaymentSplit {
  readonly model: StudioSplitModel;
  readonly baseAmount: number;
  readonly artistAmount: number;
  readonly platformFee: number;
  readonly studioFee: number;
  readonly reserveFee: number;
}

/**
 * Token opaco de autorização. Carrega apenas a prova criptográfica — nunca PII.
 * Volátil e com expiração curta (uso único por operação sensível).
 */
export interface AuthorizationToken {
  readonly token: string;
  readonly scope: AuthorizationScope;
  readonly issuedAt: string;
  readonly expiresAt: string;
}

/** Registro imutável de uma transação retida em escrow. */
export interface EscrowTransaction {
  readonly id: string;
  readonly agendamentoId: string;
  readonly gatewayId: string;
  readonly intent: PaymentIntentRequest;
  readonly grossAmount: number;
  /** Acréscimo repassado do cartão (0 no PIX). */
  readonly cardFee: number;
  /** Valor líquido original — base exclusiva do split. */
  readonly netAmount: number;
  readonly split: PaymentSplit;
  readonly escrowState: EscrowLedgerState;
  readonly status: PaymentIntentStatus;
  readonly authorization?: AuthorizationToken;
  readonly createdAt: string;
}

/** Resultado devolvido ao cliente após processar a intenção. */
export interface PaymentIntentResult {
  readonly transactionId: string;
  readonly status: PaymentIntentStatus;
  readonly escrowState: EscrowLedgerState;
  /** Total efetivamente cobrado do cliente (com acréscimo de cartão, se houver). */
  readonly clientTotal: number;
  /** Valor do calção retido (25%). */
  readonly deposit: number;
  readonly authorization?: AuthorizationToken;
}

/** Agregado de escrow exposto ao painel do tatuador/estúdio. */
export interface EscrowSummary {
  readonly gross: number;
  readonly cardFee: number;
  readonly net: number;
  readonly held: number;
  readonly released: number;
  readonly count: number;
}

/** Erro normalizado do motor financeiro. */
export interface PaymentError {
  readonly code: PaymentErrorCode;
  readonly message: string;
  readonly retryable: boolean;
}

/** Projeção tipada de um agendamento para o ledger de recebimentos. */
export interface ReceiptLedgerEntry {
  readonly agendamento: Agendamento;
  readonly split: PaymentSplit;
  readonly escrowState: EscrowLedgerState;
}

/** Projeção tipada do sinal aguardando liquidação. */
export interface DepositLedgerEntry {
  readonly agendamento: Agendamento;
  readonly deposit: number;
  readonly policy: DepositPolicy;
}
