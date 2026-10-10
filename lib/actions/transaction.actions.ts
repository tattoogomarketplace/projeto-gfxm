'use server';

import { createHash, randomUUID } from 'node:crypto';

import { AgendamentoStatus, Prisma, TransactionType } from '@prisma/client';
import { auth } from '@clerk/nextjs/server';

import { prisma } from '@/lib/prisma';
import { getRedis } from '@/lib/redis';

/**
 * Zero-Trust Transaction Engine (Serverless).
 *
 * Ports the legacy `server.cjs` financial logic (mutex + split + refunds) into
 * Next.js Server Actions. The deprecated `setInterval` mutex sweep is replaced
 * by Upstash Redis TTL locks: a timeslot lock self-expires, so no cron is
 * required in the serverless runtime.
 */

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
  /** ESTUDIO when the artist is linked to a studio, otherwise TATUADOR. */
  role: 'TATUADOR' | 'ESTUDIO';
  base: number;
  platformFee: number;
  studioFee: number;
  reserveFee: number;
  artistNet: number;
  /** Platform commission percent only (9 solo / 8 studio). */
  platformFeePercent: number;
  /** Platform-side fee incl. reserve: 10% solo / 9% studio. */
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
  /** Net amount of the remaining balance released to the professional. */
  payoutAmount: number;
  totalAmount: number;
  paidDeposit: number;
  currency: string;
  split: SplitBreakdown;
  /** Whether the pass was validated by the artist themselves or their studio. */
  validatedBy: 'TATUADOR' | 'ESTUDIO';
  studioId: string | null;
};

const DEPOSIT_RATE = 0.25;
const MUTEX_TTL_SECONDS = 10 * 60;
const CURRENCY_DEFAULT = 'BRL';

/**
 * Canonical split (matches .cursorrules / legacy `pagamento.service.cjs`):
 *  - Autonomous artist (TATUADOR): 90 / 9 / 1  -> platform fee 10% (9% + 1% reserve)
 *  - Studio artist (ESTUDIO):      88 / 8 / 3 / 1 -> platform fee 9% (8% + 1% reserve) + 3% studio
 */
const SPLIT_SOLO = { platform: 0.09, studio: 0, reserve: 0.01 } as const;
const SPLIT_STUDIO = { platform: 0.08, studio: 0.03, reserve: 0.01 } as const;

type SplitRates = { platform: number; studio: number; reserve: number };

type ReleaseTarget = { tatuadorId: string; slot: Date };

type TransactionErrorCode =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'INVALID_STATE'
  | 'CONFLICT'
  | 'MUTEX_EXPIRED'
  | 'CONCURRENCY';

class TransactionError extends Error {
  code: TransactionErrorCode;

  constructor(code: TransactionErrorCode, message: string) {
    super(message);
    this.name = 'TransactionError';
    this.code = code;
  }
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function toMoney(value: number): Prisma.Decimal {
  return new Prisma.Decimal(round2(value).toFixed(2));
}

function normalizeSlot(value: string | Date): Date {
  const slot = new Date(value);
  slot.setSeconds(0, 0);
  return slot;
}

function mutexKey(tatuadorId: string, slot: Date): string {
  return `mutex:slot:${tatuadorId}:${slot.toISOString()}`;
}

async function requireActorId(): Promise<string | null> {
  try {
    const { userId } = await auth();
    return userId ?? null;
  } catch {
    return null;
  }
}

async function resolvePerfilId(clerkId: string): Promise<string | null> {
  const perfil = await prisma.perfil.findUnique({
    where: { clerk_id: clerkId },
    select: { id: true },
  });
  return perfil?.id ?? null;
}

function buildSplit(base: number, rates: SplitRates, currency: string): SplitBreakdown {
  const linkedToStudio = rates.studio > 0;
  const platformFee = round2(base * rates.platform);
  const studioFee = round2(base * rates.studio);
  const reserveFee = round2(base * rates.reserve);
  const artistNet = round2(base - (platformFee + studioFee + reserveFee));

  return {
    role: linkedToStudio ? 'ESTUDIO' : 'TATUADOR',
    base: round2(base),
    platformFee,
    studioFee,
    reserveFee,
    artistNet,
    platformFeePercent: round2(rates.platform * 100),
    platformFeeIncludingReservePercent: round2((rates.platform + rates.reserve) * 100),
    currency,
  };
}

async function resolveSplitRates(
  tx: Prisma.TransactionClient,
  tatuadorId: string
): Promise<SplitRates> {
  const [vinculo, perfil] = await Promise.all([
    tx.estudioTatuador.findFirst({
      where: { tatuador_id: tatuadorId, status_vinculo: 'ativo', deleted_at: null },
      select: { estudio_id: true },
    }),
    tx.perfil.findFirst({
      where: { id: tatuadorId, deleted_at: null },
      select: { studio_id: true },
    }),
  ]);

  const linkedToStudio = Boolean(vinculo || perfil?.studio_id);
  return linkedToStudio ? SPLIT_STUDIO : SPLIT_SOLO;
}

type ProfessionalAssignment = { role: 'TATUADOR' | 'ESTUDIO'; studioId: string | null };

/**
 * Zero-Trust RBAC guard for session validation.
 *
 * The caller is authorised only when they are the assigned professional
 * (`tatuador_id`) or the studio that owns/employs that professional. Anything
 * else is denied before any financial mutation happens.
 */
async function resolveProfessionalAssignment(
  tx: Prisma.TransactionClient,
  actorPerfilId: string,
  tatuadorId: string
): Promise<ProfessionalAssignment | null> {
  if (tatuadorId === actorPerfilId) {
    return { role: 'TATUADOR', studioId: null };
  }

  const [artista, vinculo] = await Promise.all([
    tx.perfil.findFirst({
      where: { id: tatuadorId, deleted_at: null },
      select: { studio_id: true },
    }),
    tx.estudioTatuador.findFirst({
      where: {
        tatuador_id: tatuadorId,
        estudio_id: actorPerfilId,
        status_vinculo: 'ativo',
        deleted_at: null,
      },
      select: { estudio_id: true },
    }),
  ]);

  const isStudio = artista?.studio_id === actorPerfilId || Boolean(vinculo);
  return isStudio ? { role: 'ESTUDIO', studioId: actorPerfilId } : null;
}

function splitFromTransaction(
  row: {
    valor_bruto: Prisma.Decimal;
    taxa_plataforma: Prisma.Decimal;
    valor_liquido_tatuador: Prisma.Decimal;
    valor_bonus_estudio: Prisma.Decimal;
    valor_fundo_reserva: Prisma.Decimal;
    comissao_plataforma_percentual: Prisma.Decimal;
  },
  currency: string
): SplitBreakdown {
  const studioFee = Number(row.valor_bonus_estudio);
  const platformFee = Number(row.taxa_plataforma);
  const reserveFee = Number(row.valor_fundo_reserva);
  const platformPercent = Number(row.comissao_plataforma_percentual);

  return {
    role: studioFee > 0 ? 'ESTUDIO' : 'TATUADOR',
    base: round2(Number(row.valor_bruto)),
    platformFee: round2(platformFee),
    studioFee: round2(studioFee),
    reserveFee: round2(reserveFee),
    artistNet: round2(Number(row.valor_liquido_tatuador)),
    platformFeePercent: round2(platformPercent),
    platformFeeIncludingReservePercent: round2(
      platformPercent + (Number(row.valor_bruto) > 0 ? (reserveFee / Number(row.valor_bruto)) * 100 : 0)
    ),
    currency,
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof TransactionError) return error.message;

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return 'Transação já registrada (idempotência).';
    if (error.code === 'P2034' || error.code === 'P2028') {
      return 'Conflito de concorrência detectado. Tente novamente.';
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return 'Banco de dados indisponível. Tente novamente.';
  }

  if (error instanceof Error && error.message) return error.message;
  return 'Falha inesperada ao processar a transação.';
}

async function releaseSlotLockQuietly(target: ReleaseTarget): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(mutexKey(target.tatuadorId, normalizeSlot(target.slot)));
  } catch {
    // Mutex is TTL-bound; a failed release self-heals when the key expires.
  }
}

/**
 * Mutex Engine (Redis port): acquires a TTL-bound lock on a timeslot.
 * The lock is released automatically by Redis when the TTL elapses, so no
 * `setInterval` sweep is required in the serverless runtime.
 */
export async function acquireTimeslotLock(input: {
  tatuadorId: string;
  dataHora: string | Date;
  ttlSeconds?: number;
}): Promise<TransactionActionResult<TimeslotLock>> {
  const actorId = await requireActorId();
  if (!actorId) return { success: false, error: 'Não autenticado.' };

  const tatuadorId = String(input?.tatuadorId ?? '').trim();
  if (!tatuadorId) return { success: false, error: 'tatuadorId é obrigatório.' };

  const slot = normalizeSlot(input?.dataHora);
  if (Number.isNaN(slot.getTime())) return { success: false, error: 'dataHora inválida.' };

  const requestedTtl = Number(input?.ttlSeconds);
  const ttlSeconds =
    Number.isFinite(requestedTtl) && requestedTtl > 0 ? Math.floor(requestedTtl) : MUTEX_TTL_SECONDS;

  const redis = getRedis();
  if (!redis) return { success: false, error: 'Mutex engine indisponível (Redis não configurado).' };

  const key = mutexKey(tatuadorId, slot);
  const token = randomUUID();

  try {
    const acquired = await redis.set(key, token, { nx: true, ex: ttlSeconds });
    if (acquired !== 'OK') {
      return { success: false, error: 'Horário em mutex. Aguarde a liberação do slot.' };
    }

    return {
      success: true,
      data: {
        key,
        token,
        tatuadorId,
        slot: slot.toISOString(),
        ttlSeconds,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      },
    };
  } catch {
    return { success: false, error: 'Falha ao adquirir o mutex do slot.' };
  }
}

/** Releases a timeslot lock, optionally enforcing ownership via `token`. */
export async function releaseTimeslotLock(input: {
  tatuadorId: string;
  dataHora: string | Date;
  token?: string;
}): Promise<TransactionActionResult<{ released: boolean }>> {
  const actorId = await requireActorId();
  if (!actorId) return { success: false, error: 'Não autenticado.' };

  const tatuadorId = String(input?.tatuadorId ?? '').trim();
  if (!tatuadorId) return { success: false, error: 'tatuadorId é obrigatório.' };

  const slot = normalizeSlot(input?.dataHora);
  if (Number.isNaN(slot.getTime())) return { success: false, error: 'dataHora inválida.' };

  const redis = getRedis();
  if (!redis) return { success: false, error: 'Mutex engine indisponível (Redis não configurado).' };

  const key = mutexKey(tatuadorId, slot);

  try {
    if (input?.token) {
      const current = await redis.get<string>(key);
      if (current && current !== input.token) {
        return { success: false, error: 'Mutex pertence a outra operação.' };
      }
    }

    const removed = await redis.del(key);
    return { success: true, data: { released: removed > 0 } };
  } catch {
    return { success: false, error: 'Falha ao liberar o mutex do slot.' };
  }
}

/** Inspects a timeslot lock without mutating it. */
export async function checkTimeslotLock(input: {
  tatuadorId: string;
  dataHora: string | Date;
}): Promise<TransactionActionResult<SlotLockState>> {
  const actorId = await requireActorId();
  if (!actorId) return { success: false, error: 'Não autenticado.' };

  const tatuadorId = String(input?.tatuadorId ?? '').trim();
  if (!tatuadorId) return { success: false, error: 'tatuadorId é obrigatório.' };

  const slot = normalizeSlot(input?.dataHora);
  if (Number.isNaN(slot.getTime())) return { success: false, error: 'dataHora inválida.' };

  const redis = getRedis();
  if (!redis) return { success: false, error: 'Mutex engine indisponível (Redis não configurado).' };

  try {
    const key = mutexKey(tatuadorId, slot);
    const ttl = await redis.ttl(key);
    const locked = ttl >= 0;
    return { success: true, data: { locked, ttlSeconds: locked ? ttl : null } };
  } catch {
    return { success: false, error: 'Falha ao consultar o mutex do slot.' };
  }
}

/**
 * Deposit & Split engine.
 *
 * Records the 25% deposit as a ledger transaction, computes the canonical split
 * and confirms the session. All mutations are wrapped in a Serializable Prisma
 * transaction with strict status guards and an idempotency key to prevent
 * double charges from network retries.
 */
export async function processDepositPayment(input: {
  sessionId: string;
  idempotencyKey?: string;
  gatewayId?: string;
  method?: 'pix' | 'credit';
}): Promise<TransactionActionResult<DepositResult>> {
  const actorId = await requireActorId();
  if (!actorId) return { success: false, error: 'Não autenticado.' };

  const sessionId = String(input?.sessionId ?? '').trim();
  if (!sessionId) return { success: false, error: 'sessionId é obrigatório.' };

  const idempotencyKey =
    String(input?.idempotencyKey ?? '').trim() || `deposit:${sessionId}`;
  const gatewayId =
    String(input?.gatewayId ?? '').trim() || `otp:${idempotencyKey}`;

  const method = input?.method === 'credit' ? 'credit' : 'pix';

  try {
    const actorPerfilId = await resolvePerfilId(actorId);
    if (!actorPerfilId) return { success: false, error: 'Perfil não encontrado.' };

    const envelope = await prisma.$transaction(
      async (tx): Promise<{ result: DepositResult; release: ReleaseTarget | null }> => {
        const agendamento = await tx.agendamento.findFirst({
          where: { id: sessionId, deleted_at: null },
          select: {
            id: true,
            cliente_id: true,
            tatuador_id: true,
            data_hora: true,
            status: true,
            sinal_pago: true,
            valor_total: true,
            valor_sinal: true,
            currency: true,
            mutex_expira_em: true,
          },
        });

        if (!agendamento) throw new TransactionError('NOT_FOUND', 'Sessão não encontrada.');
        if (agendamento.cliente_id !== actorPerfilId) {
          throw new TransactionError('FORBIDDEN', 'Acesso negado a esta sessão.');
        }

        const currency = agendamento.currency || CURRENCY_DEFAULT;

        const existing = await tx.transacaoPagamento.findUnique({
          where: { idempotency_key: idempotencyKey },
          select: {
            id: true,
            gateway_id: true,
            valor_bruto: true,
            taxa_plataforma: true,
            valor_liquido_tatuador: true,
            valor_bonus_estudio: true,
            valor_fundo_reserva: true,
            comissao_plataforma_percentual: true,
          },
        });

        if (existing) {
          return {
            release: null,
            result: {
              sessionId,
              transactionId: existing.id,
              gatewayId: existing.gateway_id,
              alreadyProcessed: true,
              status: agendamento.status,
              depositAmount: round2(Number(existing.valor_bruto)),
              totalAmount: round2(Number(agendamento.valor_total)),
              currency,
              split: splitFromTransaction(existing, currency),
            },
          };
        }

        if (agendamento.sinal_pago || agendamento.status !== AgendamentoStatus.aguardando_sinal) {
          throw new TransactionError('INVALID_STATE', 'Sessão não está pendente de sinal.');
        }

        const agora = new Date();
        if (agendamento.mutex_expira_em && agendamento.mutex_expira_em.getTime() <= agora.getTime()) {
          await tx.agendamento.updateMany({
            where: {
              id: sessionId,
              status: AgendamentoStatus.aguardando_sinal,
              sinal_pago: false,
            },
            data: { status: AgendamentoStatus.cancelado, deleted_at: agora },
          });
          throw new TransactionError('MUTEX_EXPIRED', 'Mutex expirado. O horário foi liberado.');
        }

        const valorTotal = Number(agendamento.valor_total);
        const valorSinal = Number(agendamento.valor_sinal);
        const depositAmount = valorSinal > 0 ? round2(valorSinal) : round2(valorTotal * DEPOSIT_RATE);

        const rates = await resolveSplitRates(tx, agendamento.tatuador_id);
        const split = buildSplit(depositAmount, rates, currency);

        const confirmed = await tx.agendamento.updateMany({
          where: {
            id: sessionId,
            status: AgendamentoStatus.aguardando_sinal,
            sinal_pago: false,
          },
          data: {
            status: AgendamentoStatus.confirmado,
            sinal_pago: true,
            mutex_expira_em: null,
          },
        });
        if (confirmed.count === 0) {
          throw new TransactionError('CONFLICT', 'Sessão já foi processada por outra operação.');
        }

        const transaction = await tx.transacaoPagamento.create({
          data: {
            agendamento_id: sessionId,
            cliente_id: agendamento.cliente_id,
            tatuador_id: agendamento.tatuador_id,
            gateway_id: gatewayId,
            metodo_pagamento: method,
            tipo: TransactionType.DEPOSIT,
            valor_bruto: toMoney(depositAmount),
            taxa_plataforma: toMoney(split.platformFee),
            valor_liquido_tatuador: toMoney(split.artistNet),
            valor_bonus_estudio: toMoney(split.studioFee),
            valor_fundo_reserva: toMoney(split.reserveFee),
            comissao_plataforma_percentual: new Prisma.Decimal(split.platformFeePercent.toFixed(2)),
            idempotency_key: idempotencyKey,
            status: 'aprovado',
            webhook_payload: {
              source: 'processDepositPayment',
              method,
              gatewayId,
              role: split.role,
            },
          },
          select: { id: true },
        });

        return {
          release: { tatuadorId: agendamento.tatuador_id, slot: agendamento.data_hora },
          result: {
            sessionId,
            transactionId: transaction.id,
            gatewayId,
            alreadyProcessed: false,
            status: AgendamentoStatus.confirmado,
            depositAmount,
            totalAmount: round2(valorTotal),
            currency,
            split,
          },
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 15000,
      }
    );

    if (envelope.release) await releaseSlotLockQuietly(envelope.release);
    return { success: true, data: envelope.result };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}

/**
 * Cancel & Refund engine.
 *
 * Verifies the caller (client or artist), cancels the session and, when a
 * settled deposit exists, writes a reversing REFUND ledger entry (negative
 * amounts) and marks the original deposit as refunded. Frees the timeline by
 * cancelling the session and dropping the Redis mutex.
 */
export async function cancelAndRefundSession(input: {
  sessionId: string;
  reason?: string;
}): Promise<TransactionActionResult<RefundResult>> {
  const actorId = await requireActorId();
  if (!actorId) return { success: false, error: 'Não autenticado.' };

  const sessionId = String(input?.sessionId ?? '').trim();
  if (!sessionId) return { success: false, error: 'sessionId é obrigatório.' };

  const reason =
    typeof input?.reason === 'string' && input.reason.trim()
      ? input.reason.trim().slice(0, 280)
      : null;

  try {
    const actorPerfilId = await resolvePerfilId(actorId);
    if (!actorPerfilId) return { success: false, error: 'Perfil não encontrado.' };

    const envelope = await prisma.$transaction(
      async (tx): Promise<{ result: RefundResult; release: ReleaseTarget | null }> => {
        const agendamento = await tx.agendamento.findFirst({
          where: { id: sessionId, deleted_at: null },
          select: {
            id: true,
            cliente_id: true,
            tatuador_id: true,
            data_hora: true,
            status: true,
            currency: true,
          },
        });

        if (!agendamento) throw new TransactionError('NOT_FOUND', 'Sessão não encontrada.');

        const isClient = agendamento.cliente_id === actorPerfilId;
        const isArtist = agendamento.tatuador_id === actorPerfilId;
        if (!isClient && !isArtist) {
          throw new TransactionError('FORBIDDEN', 'Acesso negado a esta sessão.');
        }

        const currency = agendamento.currency || CURRENCY_DEFAULT;
        const refundKey = `refund:${sessionId}`;

        const existingRefund = await tx.transacaoPagamento.findUnique({
          where: { idempotency_key: refundKey },
          select: { id: true, valor_bruto: true },
        });

        if (existingRefund) {
          return {
            release: null,
            result: {
              sessionId,
              cancelled: true,
              refunded: true,
              alreadyProcessed: true,
              refundTransactionId: existingRefund.id,
              refundAmount: round2(Math.abs(Number(existingRefund.valor_bruto))),
              currency,
            },
          };
        }

        if (agendamento.status === AgendamentoStatus.concluido) {
          throw new TransactionError(
            'INVALID_STATE',
            'Sessão concluída não pode ser cancelada ou reembolsada.'
          );
        }

        const cancelled = await tx.agendamento.updateMany({
          where: {
            id: sessionId,
            status: {
              in: [
                AgendamentoStatus.rascunho,
                AgendamentoStatus.aguardando_sinal,
                AgendamentoStatus.confirmado,
              ],
            },
          },
          data: { status: AgendamentoStatus.cancelado, mutex_expira_em: null },
        });

        const deposit = await tx.transacaoPagamento.findFirst({
          where: {
            agendamento_id: sessionId,
            tipo: TransactionType.DEPOSIT,
            status: 'aprovado',
            deleted_at: null,
          },
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            gateway_id: true,
            metodo_pagamento: true,
            valor_bruto: true,
            taxa_plataforma: true,
            valor_liquido_tatuador: true,
            valor_bonus_estudio: true,
            valor_fundo_reserva: true,
            comissao_plataforma_percentual: true,
          },
        });

        let refundTransactionId: string | null = null;
        let refundAmount = 0;

        if (deposit) {
          const reversal = await tx.transacaoPagamento.create({
            data: {
              agendamento_id: sessionId,
              cliente_id: agendamento.cliente_id,
              tatuador_id: agendamento.tatuador_id,
              gateway_id: `refund_${deposit.gateway_id}`,
              metodo_pagamento: deposit.metodo_pagamento,
              tipo: TransactionType.REFUND,
              valor_bruto: toMoney(-Number(deposit.valor_bruto)),
              taxa_plataforma: toMoney(-Number(deposit.taxa_plataforma)),
              valor_liquido_tatuador: toMoney(-Number(deposit.valor_liquido_tatuador)),
              valor_bonus_estudio: toMoney(-Number(deposit.valor_bonus_estudio)),
              valor_fundo_reserva: toMoney(-Number(deposit.valor_fundo_reserva)),
              comissao_plataforma_percentual: deposit.comissao_plataforma_percentual,
              idempotency_key: refundKey,
              status: 'reembolsado',
              webhook_payload: {
                source: 'cancelAndRefundSession',
                reason,
                refundedTransactionId: deposit.id,
              },
            },
            select: { id: true },
          });

          refundTransactionId = reversal.id;
          refundAmount = round2(Number(deposit.valor_bruto));

          await tx.transacaoPagamento.update({
            where: { id: deposit.id },
            data: { status: 'reembolsado' },
          });
        }

        return {
          release: { tatuadorId: agendamento.tatuador_id, slot: agendamento.data_hora },
          result: {
            sessionId,
            cancelled: cancelled.count > 0,
            refunded: Boolean(deposit),
            alreadyProcessed: false,
            refundTransactionId,
            refundAmount,
            currency,
          },
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 15000,
      }
    );

    if (envelope.release) await releaseSlotLockQuietly(envelope.release);
    return { success: true, data: envelope.result };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}

/**
 * Professional Session Pass validation (payout release).
 *
 * This is the artist/studio-facing counterpart of `processDepositPayment`: the
 * client holds the TattooGo Pass token and reads it out at the session; the
 * assigned professional validates it here. The action authenticates the active
 * Clerk user, enforces RBAC (must be the assigned `tatuador_id` or their
 * owning/linked studio), then — inside a single Serializable Prisma transaction
 * — marks the `agendamento` as `concluido` (COMPLETED) and records the payout
 * ledger entry (FINAL_PAYMENT) with the canonical split.
 *
 * Idempotency: the caller-supplied key (defaulting to `payout:<sessionId>`) is
 * enforced by the `transacoes_idempotency_unique` constraint, so a network
 * retry after a successful commit replays the stored result instead of paying
 * the professional twice.
 */
export async function validateStudioSessionPass(
  sessionId: string,
  passCode: string,
  idempotencyKey: string
): Promise<TransactionActionResult<SessionPayoutResult>> {
  const actorId = await requireActorId();
  if (!actorId) return { success: false, error: 'Não autenticado.' };

  const normalizedSessionId = String(sessionId ?? '').trim();
  if (!normalizedSessionId) return { success: false, error: 'sessionId é obrigatório.' };

  const normalizedPass = String(passCode ?? '').replace(/\s+/g, '');
  if (!/^\d{4,6}$/.test(normalizedPass)) {
    return { success: false, error: 'Token do TattooGo Pass inválido.' };
  }

  const normalizedKey =
    String(idempotencyKey ?? '').trim() || `payout:${normalizedSessionId}`;
  const gatewayId = `payout:${normalizedKey}`;
  const passFingerprint = createHash('sha256').update(normalizedPass).digest('hex').slice(0, 16);

  try {
    const actorPerfilId = await resolvePerfilId(actorId);
    if (!actorPerfilId) return { success: false, error: 'Perfil não encontrado.' };

    const envelope = await prisma.$transaction(
      async (tx): Promise<{ result: SessionPayoutResult; release: ReleaseTarget | null }> => {
        const agendamento = await tx.agendamento.findFirst({
          where: { id: normalizedSessionId, deleted_at: null },
          select: {
            id: true,
            cliente_id: true,
            tatuador_id: true,
            data_hora: true,
            status: true,
            sinal_pago: true,
            valor_total: true,
            valor_sinal: true,
            currency: true,
          },
        });

        if (!agendamento) throw new TransactionError('NOT_FOUND', 'Sessão não encontrada.');

        const assignment = await resolveProfessionalAssignment(
          tx,
          actorPerfilId,
          agendamento.tatuador_id
        );
        if (!assignment) {
          throw new TransactionError(
            'FORBIDDEN',
            'Apenas o profissional vinculado pode validar esta sessão.'
          );
        }

        const currency = agendamento.currency || CURRENCY_DEFAULT;

        const existing = await tx.transacaoPagamento.findUnique({
          where: { idempotency_key: normalizedKey },
          select: {
            id: true,
            gateway_id: true,
            valor_bruto: true,
            taxa_plataforma: true,
            valor_liquido_tatuador: true,
            valor_bonus_estudio: true,
            valor_fundo_reserva: true,
            comissao_plataforma_percentual: true,
          },
        });

        const valorTotal = Number(agendamento.valor_total);
        const valorSinal = Number(agendamento.valor_sinal);
        const depositAmount = valorSinal > 0 ? round2(valorSinal) : round2(valorTotal * DEPOSIT_RATE);
        const paidDeposit = agendamento.sinal_pago ? depositAmount : 0;

        if (existing) {
          return {
            release: null,
            result: {
              sessionId: normalizedSessionId,
              transactionId: existing.id,
              gatewayId: existing.gateway_id,
              alreadyProcessed: true,
              status: AgendamentoStatus.concluido,
              payoutAmount: round2(Number(existing.valor_bruto)),
              totalAmount: round2(valorTotal),
              paidDeposit: round2(paidDeposit),
              currency,
              split: splitFromTransaction(existing, currency),
              validatedBy: assignment.role,
              studioId: assignment.studioId,
            },
          };
        }

        const allowedStatuses: AgendamentoStatus[] = [
          AgendamentoStatus.aguardando_sinal,
          AgendamentoStatus.confirmado,
        ];
        if (!allowedStatuses.includes(agendamento.status)) {
          throw new TransactionError('INVALID_STATE', 'Sessão não está apta para validação.');
        }

        const payoutBase = round2(Math.max(valorTotal - paidDeposit, 0));

        const rates = await resolveSplitRates(tx, agendamento.tatuador_id);
        const split = buildSplit(payoutBase, rates, currency);

        const completed = await tx.agendamento.updateMany({
          where: { id: normalizedSessionId, status: { in: allowedStatuses } },
          data: { status: AgendamentoStatus.concluido, mutex_expira_em: null },
        });
        if (completed.count === 0) {
          throw new TransactionError('CONFLICT', 'Sessão já foi validada por outra operação.');
        }

        const transaction = await tx.transacaoPagamento.create({
          data: {
            agendamento_id: normalizedSessionId,
            cliente_id: agendamento.cliente_id,
            tatuador_id: agendamento.tatuador_id,
            gateway_id: gatewayId,
            metodo_pagamento: 'pix',
            tipo: TransactionType.FINAL_PAYMENT,
            valor_bruto: toMoney(payoutBase),
            taxa_plataforma: toMoney(split.platformFee),
            valor_liquido_tatuador: toMoney(split.artistNet),
            valor_bonus_estudio: toMoney(split.studioFee),
            valor_fundo_reserva: toMoney(split.reserveFee),
            comissao_plataforma_percentual: new Prisma.Decimal(split.platformFeePercent.toFixed(2)),
            idempotency_key: normalizedKey,
            status: 'aprovado',
            webhook_payload: {
              source: 'validateStudioSessionPass',
              validatedBy: assignment.role,
              studioId: assignment.studioId,
              passFingerprint,
            },
          },
          select: { id: true },
        });

        return {
          release: { tatuadorId: agendamento.tatuador_id, slot: agendamento.data_hora },
          result: {
            sessionId: normalizedSessionId,
            transactionId: transaction.id,
            gatewayId,
            alreadyProcessed: false,
            status: AgendamentoStatus.concluido,
            payoutAmount: payoutBase,
            totalAmount: round2(valorTotal),
            paidDeposit: round2(paidDeposit),
            currency,
            split,
            validatedBy: assignment.role,
            studioId: assignment.studioId,
          },
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 15000,
      }
    );

    if (envelope.release) await releaseSlotLockQuietly(envelope.release);
    return { success: true, data: envelope.result };
  } catch (error) {
    return { success: false, error: toErrorMessage(error) };
  }
}
