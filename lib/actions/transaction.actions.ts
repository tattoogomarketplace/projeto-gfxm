'use server';

import { fetchExpressApi, resolveExpressAuthHeaders } from '@/lib/server/express-bff';

export type AgendamentoStatus =
  | 'rascunho'
  | 'aguardando_sinal'
  | 'confirmado'
  | 'cancelado'
  | 'concluido';

export type TransactionType = 'DEPOSIT' | 'FINAL_PAYMENT' | 'PLATFORM_FEE' | 'REFUND';

export type TransactionActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type TimeslotLock = {
  key: string;
  token: string;
  tatuadorId: string;
  slot: string;
  ttlSeconds: number;
  expiresAt: string;
};

export type SlotLockState = {
  locked: boolean;
  ttlSeconds: number | null;
};

export type SplitBreakdown = {
  role: 'TATUADOR' | 'ESTUDIO';
  base: number;
  platformFee: number;
  studioFee: number;
  reserveFee: number;
  artistNet: number;
  platformFeePercent: number;
  platformFeeIncludingReservePercent: number;
  currency: string;
};

export type DepositResult = {
  sessionId: string;
  transactionId: string;
  gatewayId: string;
  alreadyProcessed: boolean;
  status: AgendamentoStatus;
  depositAmount: number;
  totalAmount: number;
  currency: string;
  split: SplitBreakdown;
};

export type RefundResult = {
  sessionId: string;
  cancelled: boolean;
  refunded: boolean;
  alreadyProcessed: boolean;
  refundTransactionId: string | null;
  refundAmount: number;
  currency: string;
};

export type SessionPayoutResult = {
  sessionId: string;
  transactionId: string;
  gatewayId: string;
  alreadyProcessed: boolean;
  status: AgendamentoStatus;
  payoutAmount: number;
  totalAmount: number;
  paidDeposit: number;
  currency: string;
  split: SplitBreakdown;
  validatedBy: 'TATUADOR' | 'ESTUDIO';
  studioId: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readError(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback;
  if (typeof payload.error === 'string' && payload.error) return payload.error;
  if (typeof payload.erro === 'string' && payload.erro) return payload.erro;
  return fallback;
}

function serializeDate(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

async function callTransactionApi(pathname: string, init?: RequestInit) {
  const authHeaders = await resolveExpressAuthHeaders();
  return fetchExpressApi(pathname, {
    ...init,
    headers: {
      ...authHeaders,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
}

function toActionResult<T>(
  status: number,
  payload: unknown,
  fallback: string
): TransactionActionResult<T> {
  if (status === 401) return { success: false, error: 'Não autenticado.' };
  if (isRecord(payload) && payload.success === true && 'data' in payload) {
    return { success: true, data: payload.data as T };
  }
  return { success: false, error: readError(payload, fallback) };
}

export async function acquireTimeslotLock(input: {
  tatuadorId: string;
  dataHora: string | Date;
  ttlSeconds?: number;
}): Promise<TransactionActionResult<TimeslotLock>> {
  const tatuadorId = String(input?.tatuadorId ?? '').trim();
  if (!tatuadorId) return { success: false, error: 'tatuadorId é obrigatório.' };

  const slot = serializeDate(input?.dataHora);
  if (Number.isNaN(new Date(slot).getTime())) return { success: false, error: 'dataHora inválida.' };

  try {
    const { status, payload } = await callTransactionApi('/api/transactions/mutex/acquire', {
      method: 'POST',
      body: JSON.stringify({
        tatuadorId,
        dataHora: slot,
        ttlSeconds: input?.ttlSeconds,
      }),
    });
    return toActionResult<TimeslotLock>(status, payload, 'Falha ao adquirir o mutex do slot.');
  } catch {
    return { success: false, error: 'Falha ao adquirir o mutex do slot.' };
  }
}

export async function releaseTimeslotLock(input: {
  tatuadorId: string;
  dataHora: string | Date;
  token?: string;
}): Promise<TransactionActionResult<{ released: boolean }>> {
  const tatuadorId = String(input?.tatuadorId ?? '').trim();
  if (!tatuadorId) return { success: false, error: 'tatuadorId é obrigatório.' };

  const slot = serializeDate(input?.dataHora);
  if (Number.isNaN(new Date(slot).getTime())) return { success: false, error: 'dataHora inválida.' };

  try {
    const { status, payload } = await callTransactionApi('/api/transactions/mutex/release', {
      method: 'POST',
      body: JSON.stringify({
        tatuadorId,
        dataHora: slot,
        token: input?.token,
      }),
    });
    return toActionResult<{ released: boolean }>(
      status,
      payload,
      'Falha ao liberar o mutex do slot.'
    );
  } catch {
    return { success: false, error: 'Falha ao liberar o mutex do slot.' };
  }
}

export async function checkTimeslotLock(input: {
  tatuadorId: string;
  dataHora: string | Date;
}): Promise<TransactionActionResult<SlotLockState>> {
  const tatuadorId = String(input?.tatuadorId ?? '').trim();
  if (!tatuadorId) return { success: false, error: 'tatuadorId é obrigatório.' };

  const slot = serializeDate(input?.dataHora);
  if (Number.isNaN(new Date(slot).getTime())) return { success: false, error: 'dataHora inválida.' };

  try {
    const params = new URLSearchParams({ tatuadorId, dataHora: slot });
    const { status, payload } = await callTransactionApi(
      `/api/transactions/mutex?${params.toString()}`
    );
    return toActionResult<SlotLockState>(status, payload, 'Falha ao consultar o mutex do slot.');
  } catch {
    return { success: false, error: 'Falha ao consultar o mutex do slot.' };
  }
}

export async function processDepositPayment(input: {
  sessionId: string;
  idempotencyKey?: string;
  gatewayId?: string;
  method?: 'pix' | 'credit';
}): Promise<TransactionActionResult<DepositResult>> {
  const sessionId = String(input?.sessionId ?? '').trim();
  if (!sessionId) return { success: false, error: 'sessionId é obrigatório.' };

  try {
    const { status, payload } = await callTransactionApi('/api/transactions/deposit', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        idempotencyKey: input?.idempotencyKey,
        gatewayId: input?.gatewayId,
        method: input?.method,
      }),
    });
    return toActionResult<DepositResult>(
      status,
      payload,
      'Falha inesperada ao processar a transação.'
    );
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error && error.message
        ? error.message
        : 'Falha inesperada ao processar a transação.',
    };
  }
}

export async function cancelAndRefundSession(input: {
  sessionId: string;
  reason?: string;
}): Promise<TransactionActionResult<RefundResult>> {
  const sessionId = String(input?.sessionId ?? '').trim();
  if (!sessionId) return { success: false, error: 'sessionId é obrigatório.' };

  try {
    const { status, payload } = await callTransactionApi('/api/transactions/refund', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        reason: input?.reason,
      }),
    });
    return toActionResult<RefundResult>(
      status,
      payload,
      'Falha inesperada ao processar a transação.'
    );
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error && error.message
        ? error.message
        : 'Falha inesperada ao processar a transação.',
    };
  }
}

export async function validateStudioSessionPass(
  sessionId: string,
  passCode: string,
  idempotencyKey: string
): Promise<TransactionActionResult<SessionPayoutResult>> {
  const normalizedSessionId = String(sessionId ?? '').trim();
  if (!normalizedSessionId) return { success: false, error: 'sessionId é obrigatório.' };

  const normalizedPass = String(passCode ?? '').replace(/\s+/g, '');
  if (!/^\d{4,6}$/.test(normalizedPass)) {
    return { success: false, error: 'Token do TattooGo Pass inválido.' };
  }

  try {
    const { status, payload } = await callTransactionApi('/api/transactions/payout', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: normalizedSessionId,
        passCode: normalizedPass,
        idempotencyKey,
      }),
    });
    return toActionResult<SessionPayoutResult>(
      status,
      payload,
      'Falha inesperada ao processar a transação.'
    );
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error && error.message
        ? error.message
        : 'Falha inesperada ao processar a transação.',
    };
  }
}
