const { createHash, randomUUID } = require("node:crypto");
const { Prisma } = require("@prisma/client");
const { prisma } = require("./prisma.service.cjs");
const { redis } = require("./cache.service.cjs");

const DEPOSIT_RATE = 0.25;
const MUTEX_TTL_SECONDS = 10 * 60;
const CURRENCY_DEFAULT = "BRL";
const SPLIT_SOLO = { platform: 0.09, studio: 0, reserve: 0.01 };
const SPLIT_STUDIO = { platform: 0.08, studio: 0.03, reserve: 0.01 };

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function round2(value) {
  return Number(value.toFixed(2));
}

function toMoney(value) {
  return new Prisma.Decimal(round2(value).toFixed(2));
}

function normalizeSlot(value) {
  const slot = new Date(value);
  slot.setSeconds(0, 0);
  return slot;
}

function mutexKey(tatuadorId, slot) {
  return `mutex:slot:${tatuadorId}:${slot.toISOString()}`;
}

function buildSplit(base, rates, currency) {
  const linkedToStudio = rates.studio > 0;
  const platformFee = round2(base * rates.platform);
  const studioFee = round2(base * rates.studio);
  const reserveFee = round2(base * rates.reserve);
  const artistNet = round2(base - (platformFee + studioFee + reserveFee));
  return {
    role: linkedToStudio ? "ESTUDIO" : "TATUADOR",
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

function splitFromTransaction(row, currency) {
  const studioFee = Number(row.valor_bonus_estudio);
  const platformFee = Number(row.taxa_plataforma);
  const reserveFee = Number(row.valor_fundo_reserva);
  const platformPercent = Number(row.comissao_plataforma_percentual);
  return {
    role: studioFee > 0 ? "ESTUDIO" : "TATUADOR",
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

async function resolveSplitRates(tx, tatuadorId) {
  const [vinculo, perfil] = await Promise.all([
    tx.estudioTatuador.findFirst({
      where: { tatuador_id: tatuadorId, status_vinculo: "ativo", deleted_at: null },
      select: { estudio_id: true },
    }),
    tx.perfil.findFirst({
      where: { id: tatuadorId, deleted_at: null },
      select: { studio_id: true },
    }),
  ]);
  return vinculo || perfil?.studio_id ? SPLIT_STUDIO : SPLIT_SOLO;
}

async function resolveProfessionalAssignment(tx, actorPerfilId, tatuadorId) {
  if (tatuadorId === actorPerfilId) return { role: "TATUADOR", studioId: null };
  const [artista, vinculo] = await Promise.all([
    tx.perfil.findFirst({
      where: { id: tatuadorId, deleted_at: null },
      select: { studio_id: true },
    }),
    tx.estudioTatuador.findFirst({
      where: {
        tatuador_id: tatuadorId,
        estudio_id: actorPerfilId,
        status_vinculo: "ativo",
        deleted_at: null,
      },
      select: { estudio_id: true },
    }),
  ]);
  const isStudio = artista?.studio_id === actorPerfilId || Boolean(vinculo);
  return isStudio ? { role: "ESTUDIO", studioId: actorPerfilId } : null;
}

async function releaseSlotLockQuietly(target) {
  if (!redis || !target) return;
  try {
    await redis.del(mutexKey(target.tatuadorId, normalizeSlot(target.slot)));
  } catch {
    return;
  }
}

function toErrorMessage(error) {
  if (error && error.status) return error.message;
  if (error && error.code === "P2002") return "Transação já registrada (idempotência).";
  if (error && (error.code === "P2034" || error.code === "P2028")) {
    return "Conflito de concorrência detectado. Tente novamente.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "Falha inesperada ao processar a transação.";
}

async function acquireTimeslotLock({ tatuadorId: tatuadorIdRaw, dataHora, ttlSeconds: ttlRaw }) {
  const tatuadorId = String(tatuadorIdRaw || "").trim();
  if (!tatuadorId) throw httpError(400, "tatuadorId é obrigatório.");
  const slot = normalizeSlot(dataHora);
  if (Number.isNaN(slot.getTime())) throw httpError(400, "dataHora inválida.");
  const requestedTtl = Number(ttlRaw);
  const ttlSeconds =
    Number.isFinite(requestedTtl) && requestedTtl > 0 ? Math.floor(requestedTtl) : MUTEX_TTL_SECONDS;
  if (!redis) throw httpError(503, "Mutex engine indisponível (Redis não configurado).");

  const key = mutexKey(tatuadorId, slot);
  const token = randomUUID();
  try {
    const acquired = await redis.set(key, token, { nx: true, ex: ttlSeconds });
    if (acquired !== "OK") throw httpError(409, "Horário em mutex. Aguarde a liberação do slot.");
    return {
      key,
      token,
      tatuadorId,
      slot: slot.toISOString(),
      ttlSeconds,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    };
  } catch (error) {
    if (error && error.status) throw error;
    throw httpError(500, "Falha ao adquirir o mutex do slot.");
  }
}

async function releaseTimeslotLock({ tatuadorId: tatuadorIdRaw, dataHora, token }) {
  const tatuadorId = String(tatuadorIdRaw || "").trim();
  if (!tatuadorId) throw httpError(400, "tatuadorId é obrigatório.");
  const slot = normalizeSlot(dataHora);
  if (Number.isNaN(slot.getTime())) throw httpError(400, "dataHora inválida.");
  if (!redis) throw httpError(503, "Mutex engine indisponível (Redis não configurado).");
  const key = mutexKey(tatuadorId, slot);
  try {
    if (token) {
      const current = await redis.get(key);
      if (current && current !== token) throw httpError(409, "Mutex pertence a outra operação.");
    }
    const removed = await redis.del(key);
    return { released: removed > 0 };
  } catch (error) {
    if (error && error.status) throw error;
    throw httpError(500, "Falha ao liberar o mutex do slot.");
  }
}

async function checkTimeslotLock({ tatuadorId: tatuadorIdRaw, dataHora }) {
  const tatuadorId = String(tatuadorIdRaw || "").trim();
  if (!tatuadorId) throw httpError(400, "tatuadorId é obrigatório.");
  const slot = normalizeSlot(dataHora);
  if (Number.isNaN(slot.getTime())) throw httpError(400, "dataHora inválida.");
  if (!redis) throw httpError(503, "Mutex engine indisponível (Redis não configurado).");
  try {
    const ttl = await redis.ttl(mutexKey(tatuadorId, slot));
    const locked = ttl >= 0;
    return { locked, ttlSeconds: locked ? ttl : null };
  } catch {
    throw httpError(500, "Falha ao consultar o mutex do slot.");
  }
}

async function processDepositPayment({ actorId, sessionId: sessionIdRaw, idempotencyKey, gatewayId, method }) {
  const sessionId = String(sessionIdRaw || "").trim();
  if (!sessionId) throw httpError(400, "sessionId é obrigatório.");
  const key = String(idempotencyKey || "").trim() || `deposit:${sessionId}`;
  const gw = String(gatewayId || "").trim() || `otp:${key}`;
  const payMethod = method === "credit" ? "credit" : "pix";

  try {
    const envelope = await prisma.$transaction(
      async (tx) => {
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
        if (!agendamento) throw httpError(404, "Sessão não encontrada.");
        if (agendamento.cliente_id !== actorId) throw httpError(403, "Acesso negado a esta sessão.");

        const currency = agendamento.currency || CURRENCY_DEFAULT;
        const existing = await tx.transacaoPagamento.findUnique({
          where: { idempotency_key: key },
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

        if (agendamento.sinal_pago || agendamento.status !== "aguardando_sinal") {
          throw httpError(409, "Sessão não está pendente de sinal.");
        }

        const agora = new Date();
        if (agendamento.mutex_expira_em && agendamento.mutex_expira_em.getTime() <= agora.getTime()) {
          await tx.agendamento.updateMany({
            where: {
              id: sessionId,
              cliente_id: actorId,
              status: "aguardando_sinal",
              sinal_pago: false,
              deleted_at: null,
            },
            data: { status: "cancelado", deleted_at: agora },
          });
          throw httpError(409, "Mutex expirado. O horário foi liberado.");
        }

        const valorTotal = Number(agendamento.valor_total);
        const valorSinal = Number(agendamento.valor_sinal);
        const depositValue = valorSinal > 0 ? round2(valorSinal) : round2(valorTotal * DEPOSIT_RATE);
        const rates = await resolveSplitRates(tx, agendamento.tatuador_id);
        const split = buildSplit(depositValue, rates, currency);

        const confirmed = await tx.agendamento.updateMany({
          where: {
            id: sessionId,
            cliente_id: actorId,
            status: "aguardando_sinal",
            sinal_pago: false,
            deleted_at: null,
          },
          data: { status: "confirmado", sinal_pago: true, mutex_expira_em: null },
        });
        if (confirmed.count === 0) throw httpError(409, "Sessão já foi processada por outra operação.");

        const transaction = await tx.transacaoPagamento.create({
          data: {
            agendamento_id: sessionId,
            cliente_id: agendamento.cliente_id,
            tatuador_id: agendamento.tatuador_id,
            gateway_id: gw,
            metodo_pagamento: payMethod,
            tipo: "DEPOSIT",
            valor_bruto: toMoney(depositValue),
            taxa_plataforma: toMoney(split.platformFee),
            valor_liquido_tatuador: toMoney(split.artistNet),
            valor_bonus_estudio: toMoney(split.studioFee),
            valor_fundo_reserva: toMoney(split.reserveFee),
            comissao_plataforma_percentual: new Prisma.Decimal(split.platformFeePercent.toFixed(2)),
            idempotency_key: key,
            status: "aprovado",
            webhook_payload: { source: "processDepositPayment", method: payMethod, gatewayId: gw, role: split.role },
          },
          select: { id: true },
        });

        return {
          release: { tatuadorId: agendamento.tatuador_id, slot: agendamento.data_hora },
          result: {
            sessionId,
            transactionId: transaction.id,
            gatewayId: gw,
            alreadyProcessed: false,
            status: "confirmado",
            depositAmount: depositValue,
            totalAmount: round2(valorTotal),
            currency,
            split,
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 }
    );
    if (envelope.release) await releaseSlotLockQuietly(envelope.release);
    return envelope.result;
  } catch (error) {
    if (error && error.status) throw error;
    throw httpError(500, toErrorMessage(error));
  }
}

async function cancelAndRefundSession({ actorId, sessionId: sessionIdRaw, reason: reasonRaw }) {
  const sessionId = String(sessionIdRaw || "").trim();
  if (!sessionId) throw httpError(400, "sessionId é obrigatório.");
  const reason =
    typeof reasonRaw === "string" && reasonRaw.trim() ? reasonRaw.trim().slice(0, 280) : null;

  try {
    const envelope = await prisma.$transaction(
      async (tx) => {
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
        if (!agendamento) throw httpError(404, "Sessão não encontrada.");
        const isClient = agendamento.cliente_id === actorId;
        const isArtist = agendamento.tatuador_id === actorId;
        if (!isClient && !isArtist) throw httpError(403, "Acesso negado a esta sessão.");

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

        if (agendamento.status === "concluido") {
          throw httpError(409, "Sessão concluída não pode ser cancelada ou reembolsada.");
        }

        const cancelled = await tx.agendamento.updateMany({
          where: {
            id: sessionId,
            deleted_at: null,
            OR: [{ cliente_id: actorId }, { tatuador_id: actorId }],
            status: { in: ["rascunho", "aguardando_sinal", "confirmado"] },
          },
          data: { status: "cancelado", mutex_expira_em: null },
        });

        const deposit = await tx.transacaoPagamento.findFirst({
          where: {
            agendamento_id: sessionId,
            tipo: "DEPOSIT",
            status: "aprovado",
            deleted_at: null,
          },
          orderBy: { created_at: "desc" },
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

        let refundTransactionId = null;
        let refundAmount = 0;
        if (deposit) {
          const reversal = await tx.transacaoPagamento.create({
            data: {
              agendamento_id: sessionId,
              cliente_id: agendamento.cliente_id,
              tatuador_id: agendamento.tatuador_id,
              gateway_id: `refund_${deposit.gateway_id}`,
              metodo_pagamento: deposit.metodo_pagamento,
              tipo: "REFUND",
              valor_bruto: toMoney(-Number(deposit.valor_bruto)),
              taxa_plataforma: toMoney(-Number(deposit.taxa_plataforma)),
              valor_liquido_tatuador: toMoney(-Number(deposit.valor_liquido_tatuador)),
              valor_bonus_estudio: toMoney(-Number(deposit.valor_bonus_estudio)),
              valor_fundo_reserva: toMoney(-Number(deposit.valor_fundo_reserva)),
              comissao_plataforma_percentual: deposit.comissao_plataforma_percentual,
              idempotency_key: refundKey,
              status: "reembolsado",
              webhook_payload: {
                source: "cancelAndRefundSession",
                reason,
                refundedTransactionId: deposit.id,
              },
            },
            select: { id: true },
          });
          refundTransactionId = reversal.id;
          refundAmount = round2(Number(deposit.valor_bruto));
          await tx.transacaoPagamento.updateMany({
            where: { id: deposit.id, agendamento_id: sessionId, tipo: "DEPOSIT" },
            data: { status: "reembolsado" },
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
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 }
    );
    if (envelope.release) await releaseSlotLockQuietly(envelope.release);
    return envelope.result;
  } catch (error) {
    if (error && error.status) throw error;
    throw httpError(500, toErrorMessage(error));
  }
}

async function validateStudioSessionPass({ actorId, sessionId, passCode, idempotencyKey }) {
  const normalizedSessionId = String(sessionId || "").trim();
  if (!normalizedSessionId) throw httpError(400, "sessionId é obrigatório.");
  const normalizedPass = String(passCode || "").replace(/\s+/g, "");
  if (!/^\d{4,6}$/.test(normalizedPass)) throw httpError(400, "Token do TattooGo Pass inválido.");
  const normalizedKey = String(idempotencyKey || "").trim() || `payout:${normalizedSessionId}`;
  const gatewayId = `payout:${normalizedKey}`;
  const passFingerprint = createHash("sha256").update(normalizedPass).digest("hex").slice(0, 16);

  try {
    const envelope = await prisma.$transaction(
      async (tx) => {
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
        if (!agendamento) throw httpError(404, "Sessão não encontrada.");

        const assignment = await resolveProfessionalAssignment(tx, actorId, agendamento.tatuador_id);
        if (!assignment) {
          throw httpError(403, "Apenas o profissional vinculado pode validar esta sessão.");
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
        const depositValue = valorSinal > 0 ? round2(valorSinal) : round2(valorTotal * DEPOSIT_RATE);
        const paidDeposit = agendamento.sinal_pago ? depositValue : 0;

        if (existing) {
          return {
            release: null,
            result: {
              sessionId: normalizedSessionId,
              transactionId: existing.id,
              gatewayId: existing.gateway_id,
              alreadyProcessed: true,
              status: "concluido",
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

        const allowedStatuses = ["aguardando_sinal", "confirmado"];
        if (!allowedStatuses.includes(agendamento.status)) {
          throw httpError(409, "Sessão não está apta para validação.");
        }

        const payoutBase = round2(Math.max(valorTotal - paidDeposit, 0));
        const rates = await resolveSplitRates(tx, agendamento.tatuador_id);
        const split = buildSplit(payoutBase, rates, currency);

        const completed = await tx.agendamento.updateMany({
          where: {
            id: normalizedSessionId,
            tatuador_id: agendamento.tatuador_id,
            deleted_at: null,
            status: { in: allowedStatuses },
          },
          data: { status: "concluido", mutex_expira_em: null },
        });
        if (completed.count === 0) throw httpError(409, "Sessão já foi validada por outra operação.");

        const transaction = await tx.transacaoPagamento.create({
          data: {
            agendamento_id: normalizedSessionId,
            cliente_id: agendamento.cliente_id,
            tatuador_id: agendamento.tatuador_id,
            gateway_id: gatewayId,
            metodo_pagamento: "pix",
            tipo: "FINAL_PAYMENT",
            valor_bruto: toMoney(payoutBase),
            taxa_plataforma: toMoney(split.platformFee),
            valor_liquido_tatuador: toMoney(split.artistNet),
            valor_bonus_estudio: toMoney(split.studioFee),
            valor_fundo_reserva: toMoney(split.reserveFee),
            comissao_plataforma_percentual: new Prisma.Decimal(split.platformFeePercent.toFixed(2)),
            idempotency_key: normalizedKey,
            status: "aprovado",
            webhook_payload: {
              source: "validateStudioSessionPass",
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
            status: "concluido",
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
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 }
    );
    if (envelope.release) await releaseSlotLockQuietly(envelope.release);
    return envelope.result;
  } catch (error) {
    if (error && error.status) throw error;
    throw httpError(500, toErrorMessage(error));
  }
}

module.exports = {
  acquireTimeslotLock,
  releaseTimeslotLock,
  checkTimeslotLock,
  processDepositPayment,
  cancelAndRefundSession,
  validateStudioSessionPass,
};
