const crypto = require("crypto");
const { Prisma } = require("@prisma/client");
const { prisma } = require("./prisma.service.cjs");
const { acquireLock, cacheDel } = require("./cache.service.cjs");

/**
 * Processamento financeiro com blindagem contra condições de corrida.
 *
 * O webhook do gateway (MercadoPago/Stripe) e o registro de pagamento
 * presencial executam leitura-validação-escrita e por isso NÃO podem rodar
 * fora de transação: duas entregas simultâneas do mesmo evento (retry do
 * gateway) ou dois pagamentos presencias concorrentes poderiam confirmar a
 * mesma sessão/estourar o teto de pendências.
 *
 * Estratégia de defesa em profundidade:
 *   1. Lock distribuído no Redis (idempotência rápida, TTL-bound).
 *   2. Transação Serializable no Postgres.
 *   3. `pg_advisory_xact_lock` + `SELECT ... FOR UPDATE` (bloqueio pessimista
 *      de linha) sobre o agendamento e o perfil do tatuador.
 *   4. Constraint único de `idempotency_key` / `gateway_id` como rede final.
 */

const MAX_TRANSACTION_RETRIES = 3;
const IDEMPOTENCY_TTL_SECONDS = 86400;
const PLATFORM_SHARE_DEFAULT = 0.09;
const PLATFORM_SHARE_STUDIO = 0.08;
const STUDIO_SHARE = 0.03;
const RESERVE_SHARE = 0.01;

const SERIALIZABLE = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 5000,
  timeout: 15000,
};

function httpError(status, message, extra) {
  const error = new Error(message);
  error.status = status;
  Object.assign(error, extra || {});
  return error;
}

function isRetryableTransactionError(err) {
  return Boolean(err) && (err.code === "P2034" || err.code === "P2028");
}

function isUniqueConstraintError(err) {
  return Boolean(err) && err.code === "P2002";
}

function round2(value) {
  return Number(value.toFixed(2));
}

async function atualizarAgendamentoConfirmado(tx, agendamentoId, agendamentoData, evento, valorBrutoSinal, idempotencyKey, gatewayEventId) {
  let percentualComissao = PLATFORM_SHARE_DEFAULT;
  let valorBonusEstudio = 0.0;
  let valorFundoReserva = valorBrutoSinal * RESERVE_SHARE;

  const vinculoEstudio = await tx.estudioTatuador.findFirst({
    where: {
      tatuador_id: agendamentoData.tatuador_id,
      status_vinculo: "ativo",
      deleted_at: null,
    },
    select: { estudio_id: true },
  });

  const perfilTatuador = await tx.perfil.findFirst({
    where: { id: agendamentoData.tatuador_id, deleted_at: null },
    select: { studio_id: true },
  });

  if (vinculoEstudio || perfilTatuador?.studio_id) {
    percentualComissao = PLATFORM_SHARE_STUDIO;
    valorBonusEstudio = valorBrutoSinal * STUDIO_SHARE;
    valorFundoReserva = valorBrutoSinal * RESERVE_SHARE;
  }

  const valorComissaoPlataforma = round2(valorBrutoSinal * percentualComissao);
  const valorLiquidoRepassado = round2(
    valorBrutoSinal - (valorComissaoPlataforma + valorBonusEstudio + valorFundoReserva)
  );

  const confirmed = await tx.agendamento.updateMany({
    where: {
      id: agendamentoId,
      status: "aguardando_sinal",
      sinal_pago: false,
    },
    data: { status: "confirmado", sinal_pago: true, mutex_expira_em: null },
  });

  if (confirmed.count === 0) {
    return { estado: "conflito" };
  }

  await tx.transacaoPagamento.create({
    data: {
      agendamento_id: agendamentoId,
      cliente_id: agendamentoData.cliente_id || null,
      tatuador_id: agendamentoData.tatuador_id || null,
      gateway_id: gatewayEventId || crypto.randomUUID(),
      metodo_pagamento: evento.data.payment_type_id === "credit_card" ? "credit" : "pix",
      valor_bruto: valorBrutoSinal,
      taxa_plataforma: valorComissaoPlataforma,
      valor_liquido_tatuador: valorLiquidoRepassado,
      valor_bonus_estudio: valorBonusEstudio,
      valor_fundo_reserva: valorFundoReserva,
      comissao_plataforma_percentual: round2(percentualComissao * 100),
      idempotency_key: idempotencyKey,
      status: "aprovado",
      webhook_payload: evento,
    },
  });

  return { estado: "confirmado" };
}

async function processarWebhookGatewayOnce(evento) {
  const eventoId = evento.id || evento.data?.id;
  const gatewayEventId = String(evento.data?.id || eventoId || "").trim();
  const idempotencyKey = eventoId ? `webhook:processed:${eventoId}` : null;

  if (idempotencyKey) {
    const acquired = await acquireLock(idempotencyKey, IDEMPOTENCY_TTL_SECONDS);
    if (!acquired) {
      return { sucesso: true, recebido: true, duplicado: true };
    }
  }

  try {
    if (evento.action !== "payment.created" || evento.data?.status !== "approved") {
      return { sucesso: true, recebido: true };
    }

    const agendamentoId = String(evento.data.external_reference || "").trim();
    if (!agendamentoId) {
      return { sucesso: true, recebido: true, ignorado: true };
    }

    const valorBrutoSinal = Number(evento.data.transaction_amount || 0);
    const databaseIdempotencyKey = idempotencyKey || `tx_${agendamentoId}_${gatewayEventId}`;

    const outcome = await prisma.$transaction(async (tx) => {
      // Serializa entregas concorrentes do mesmo evento/agendamento no próprio
      // banco (o lock do Redis é melhor-esforço e pode estar indisponível).
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtext(${agendamentoId}::text))
      `;

      // Bloqueio pessimista da linha do agendamento: nenhuma outra transação
      // pode ler-escrever o mesmo slot até o COMMIT.
      const agendamentoRows = await tx.$queryRaw`
        SELECT id, cliente_id, tatuador_id, status, mutex_expira_em
        FROM agendamentos
        WHERE id = ${agendamentoId}::uuid AND deleted_at IS NULL
        FOR UPDATE
      `;
      const agendamentoData = agendamentoRows?.[0];

      if (!agendamentoData || agendamentoData.status === "cancelado") {
        return { estado: "mutex_expirado" };
      }

      // Idempotência durável: se o lançamento já existe, não duplica o split.
      const existente = await tx.transacaoPagamento.findFirst({
        where: {
          OR: [
            { idempotency_key: databaseIdempotencyKey },
            ...(gatewayEventId ? [{ gateway_id: gatewayEventId }] : []),
          ],
        },
        select: { id: true },
      });
      if (existente) {
        return { estado: "duplicado" };
      }

      if (agendamentoData.status !== "aguardando_sinal") {
        return { estado: "invalido" };
      }

      const agora = new Date();
      if (
        agendamentoData.mutex_expira_em &&
        new Date(agendamentoData.mutex_expira_em).getTime() <= agora.getTime()
      ) {
        await tx.agendamento.updateMany({
          where: { id: agendamentoId, status: "aguardando_sinal", sinal_pago: false },
          data: { status: "cancelado", deleted_at: agora },
        });
        return { estado: "mutex_expirado" };
      }

      // Disponibilidade/saldo: bloqueia a linha do profissional antes de
      // recalcular o split e confirmar a sessão.
      const perfilRows = await tx.$queryRaw`
        SELECT id
        FROM perfis
        WHERE id = ${agendamentoData.tatuador_id}::uuid AND deleted_at IS NULL
        FOR UPDATE
      `;
      if (!perfilRows?.[0]) {
        return { estado: "invalido" };
      }

      return atualizarAgendamentoConfirmado(
        tx,
        agendamentoId,
        agendamentoData,
        evento,
        valorBrutoSinal,
        databaseIdempotencyKey,
        gatewayEventId
      );
    }, SERIALIZABLE);

    if (outcome.estado === "mutex_expirado") {
      return { sucesso: true, recebido: true, mutex_expirado: true };
    }
    if (outcome.estado === "duplicado") {
      return { sucesso: true, recebido: true, duplicado: true };
    }
    if (outcome.estado === "conflito" || outcome.estado === "invalido") {
      return { sucesso: true, recebido: true, ignorado: true };
    }

    return { sucesso: true, recebido: true };
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      // Rede de segurança final: outra transação venceu a corrida e já gravou
      // o lançamento idempotente. O evento está processado.
      return { sucesso: true, recebido: true, duplicado: true };
    }
    if (idempotencyKey) await cacheDel(idempotencyKey);
    throw err;
  }
}

async function processarWebhookGateway(evento) {
  let lastError;
  for (let attempt = 0; attempt < MAX_TRANSACTION_RETRIES; attempt += 1) {
    try {
      return await processarWebhookGatewayOnce(evento);
    } catch (err) {
      lastError = err;
      if (isRetryableTransactionError(err) && attempt < MAX_TRANSACTION_RETRIES - 1) continue;
      throw err;
    }
  }
  throw lastError;
}

async function registrarPagamentoPresencial({ agendamentoId, userId }) {
  return prisma.$transaction(async (tx) => {
    // Trava o agendamento: serializa a leitura de status com a escrita.
    const agendamentoRows = await tx.$queryRaw`
      SELECT id, tatuador_id, cliente_id, status
      FROM agendamentos
      WHERE id = ${agendamentoId}::uuid AND deleted_at IS NULL
      FOR UPDATE
    `;
    const agendamento = agendamentoRows?.[0];

    if (!agendamento) {
      throw httpError(404, "Agendamento não encontrado.");
    }

    if (agendamento.cliente_id !== userId) {
      throw httpError(403, "Acesso negado.");
    }

    // Bloqueio pessimista na linha do profissional: a validação do teto de 2
    // pendências e o incremento acontecem sob o mesmo lock, impedindo que duas
    // requisições concorrentes ultrapassem o limite.
    const perfilRows = await tx.$queryRaw`
      SELECT id, agendamentos_pendentes_repasse, agenda_bloqueada
      FROM perfis
      WHERE id = ${agendamento.tatuador_id}::uuid AND deleted_at IS NULL
      FOR UPDATE
    `;
    const perfil = perfilRows?.[0];

    if (perfil?.agenda_bloqueada || (perfil?.agendamentos_pendentes_repasse || 0) >= 2) {
      throw httpError(
        403,
        "Agenda bloqueada: teto de 2 pendências de repasse atingido. Quite os débitos para reabrir a agenda.",
        { bloqueado: true }
      );
    }

    const pendencias = Math.min((perfil?.agendamentos_pendentes_repasse || 0) + 1, 2);
    const bloquear = pendencias >= 2;

    await tx.perfil.updateMany({
      where: { id: agendamento.tatuador_id, deleted_at: null },
      data: {
        agendamentos_pendentes_repasse: pendencias,
        ...(bloquear ? { agenda_bloqueada: true } : {}),
      },
    });

    const marked = await tx.agendamento.updateMany({
      where: { id: agendamentoId, cliente_id: userId, deleted_at: null },
      data: { pagamento_restante_presencial: true },
    });
    if (marked.count === 0) {
      throw httpError(404, "Agendamento não encontrado.");
    }

    return { sucesso: true, agenda_bloqueada: bloquear };
  }, SERIALIZABLE);
}

module.exports = { processarWebhookGateway, registrarPagamentoPresencial };
