const crypto = require("crypto");
const { prisma } = require("./prisma.service.cjs");
const { acquireLock, cacheDel } = require("./cache.service.cjs");

async function processarWebhookGateway(evento) {
  const eventoId = evento.id || evento.data?.id;
  let idempotencyKey = null;

  if (eventoId) {
    idempotencyKey = `webhook:processed:${eventoId}`;
    const acquired = await acquireLock(idempotencyKey, 86400);
    if (!acquired) {
      return { sucesso: true, recebido: true, duplicado: true };
    }
  }

  try {
    if (evento.action === "payment.created" && evento.data?.status === "approved") {
      const agendamentoId = evento.data.external_reference;
      const valorBrutoSinal = Number(evento.data.transaction_amount || 0);

      const agendamentoData = await prisma.agendamento.findFirst({
        where: { id: agendamentoId, deleted_at: null },
        select: { tatuador_id: true, cliente_id: true },
      });

      let percentualComissao = 0.09;
      let valorBonusEstudio = 0.0;
      let valorFundoReserva = valorBrutoSinal * 0.01;

      if (agendamentoData) {
        const vinculoEstudio = await prisma.estudioTatuador.findFirst({
          where: {
            tatuador_id: agendamentoData.tatuador_id,
            status_vinculo: "ativo",
            deleted_at: null,
          },
          select: { estudio_id: true },
        });

        const perfilTatuador = await prisma.perfil.findFirst({
          where: { id: agendamentoData.tatuador_id, deleted_at: null },
          select: { studio_id: true },
        });

        if (vinculoEstudio || perfilTatuador?.studio_id) {
          percentualComissao = 0.08;
          valorBonusEstudio = valorBrutoSinal * 0.03;
          valorFundoReserva = valorBrutoSinal * 0.01;
        }
      }

      const valorComissaoPlataforma = valorBrutoSinal * percentualComissao;
      const valorLiquidoRepassado =
        valorBrutoSinal - (valorComissaoPlataforma + valorBonusEstudio + valorFundoReserva);

      await prisma.agendamento.update({
        where: { id: agendamentoId },
        data: { status: "confirmado", sinal_pago: true },
      });

      await prisma.transacaoPagamento.create({
        data: {
          agendamento_id: agendamentoId,
          cliente_id: agendamentoData?.cliente_id || null,
          tatuador_id: agendamentoData?.tatuador_id || null,
          gateway_id: String(evento.data.id || crypto.randomUUID()),
          metodo_pagamento: evento.data.payment_type_id === "credit_card" ? "credit" : "pix",
          valor_bruto: valorBrutoSinal,
          taxa_plataforma: valorComissaoPlataforma,
          valor_liquido_tatuador: valorLiquidoRepassado,
          valor_bonus_estudio: valorBonusEstudio,
          valor_fundo_reserva: valorFundoReserva,
          comissao_plataforma_percentual: percentualComissao * 100,
          idempotency_key: idempotencyKey || `tx_${agendamentoId}_${evento.data.id}`,
          status: "aprovado",
          webhook_payload: evento,
        },
      });
    }

    return { sucesso: true, recebido: true };
  } catch (err) {
    if (idempotencyKey) await cacheDel(idempotencyKey);
    throw err;
  }
}

async function registrarPagamentoPresencial({ agendamentoId, userId }) {
  const agendamento = await prisma.agendamento.findFirst({
    where: { id: agendamentoId, deleted_at: null },
    select: { id: true, tatuador_id: true, cliente_id: true, status: true },
  });

  if (!agendamento) {
    const error = new Error("Agendamento não encontrado.");
    error.status = 404;
    throw error;
  }

  if (agendamento.cliente_id !== userId) {
    const error = new Error("Acesso negado.");
    error.status = 403;
    throw error;
  }

  const perfil = await prisma.perfil.findFirst({
    where: { id: agendamento.tatuador_id, deleted_at: null },
    select: { agendamentos_pendentes_repasse: true, agenda_bloqueada: true },
  });

  if (perfil?.agenda_bloqueada || (perfil?.agendamentos_pendentes_repasse || 0) >= 2) {
    const error = new Error(
      "Agenda bloqueada: teto de 2 pendências de repasse atingido. Quite os débitos para reabrir a agenda."
    );
    error.status = 403;
    error.bloqueado = true;
    throw error;
  }

  const bloqueado = await prisma.$transaction(async (tx) => {
    const atual = await tx.perfil.update({
      where: { id: agendamento.tatuador_id },
      data: {
        agendamentos_pendentes_repasse: {
          increment: 1,
        },
      },
      select: { agendamentos_pendentes_repasse: true },
    });

    const pendencias = Math.min(atual.agendamentos_pendentes_repasse, 2);
    if (pendencias >= 2) {
      await tx.perfil.update({
        where: { id: agendamento.tatuador_id },
        data: { agenda_bloqueada: true, agendamentos_pendentes_repasse: 2 },
      });
    }

    await tx.agendamento.update({
      where: { id: agendamentoId },
      data: { pagamento_restante_presencial: true },
    });

    return pendencias >= 2;
  });

  return { sucesso: true, agenda_bloqueada: !!bloqueado };
}

module.exports = { processarWebhookGateway, registrarPagamentoPresencial };
