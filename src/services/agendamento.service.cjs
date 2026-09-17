const { Prisma } = require("@prisma/client");
const { prisma } = require("./prisma.service.cjs");
const { sendOtp, verifyOtp } = require("./supabase-auth.service.cjs");
const { sanitizarExtras, detectarTermoSaude } = require("./compliance-juridico.service.cjs");
const { logCompliance } = require("./chat.service.cjs");

const MUTEX_MINUTOS = 10;
const CALCAO_PERCENTUAL = 0.25;

function httpError(status, message, extra) {
  const error = new Error(message);
  error.status = status;
  Object.assign(error, extra || {});
  return error;
}

async function liberarMutexExpirados(tx, tatuadorId, dataHora) {
  const agora = new Date();
  await tx.agendamento.updateMany({
    where: {
      tatuador_id: tatuadorId,
      data_hora: dataHora,
      status: "aguardando_sinal",
      sinal_pago: false,
      mutex_expira_em: { lte: agora },
      deleted_at: null,
    },
    data: {
      status: "cancelado",
      deleted_at: agora,
    },
  });
}

async function criarAgendamento({ user, tatuadorId, dataHora, valorTotal, extras }) {
  if (!tatuadorId || !dataHora || !valorTotal) {
    throw httpError(400, "tatuador_id, data_hora e valor_total sao obrigatorios.");
  }

  const slot = new Date(dataHora);
  if (Number.isNaN(slot.getTime()) || slot.getTime() <= Date.now()) {
    throw httpError(400, "Horario de agendamento invalido.");
  }

  const valor = Number(valorTotal);
  if (!(valor > 0)) {
    throw httpError(400, "Valor do servico deve ser positivo.");
  }

  if (detectarTermoSaude(String(valorTotal)) || detectarTermoSaude(String(dataHora))) {
    throw httpError(403, "Termo juridicamente restrito detectado na requisicao.");
  }

  const { extrasLegais, bloqueios } = sanitizarExtras(extras);
  if (bloqueios.length) {
    await logCompliance({
      userId: user.id,
      termoDetectado: bloqueios.map((item) => item.original).join(" | "),
      acaoTomada: "renomeacao_legal_taxa_conforto_sessao_sem_dor",
    });
  }

  const valorServico = valor;
  const valorSinal = Number((valorServico * CALCAO_PERCENTUAL).toFixed(2));
  const mutexExpiraEm = new Date(Date.now() + MUTEX_MINUTOS * 60 * 1000);

  try {
    const agendamento = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(
          hashtext(${tatuadorId}::text),
          hashtext(${slot.toISOString()}::text)
        )
      `;

      await liberarMutexExpirados(tx, tatuadorId, slot);

      const tatuador = await tx.perfil.findFirst({
        where: {
          id: tatuadorId,
          deleted_at: null,
          role: "tatuador",
          kyc_status: "aprovado",
          agenda_bloqueada: false,
        },
        select: { id: true },
      });

      if (!tatuador) {
        throw httpError(403, "Tatuador indisponivel para agendamento.");
      }

      const conflito = await tx.agendamento.findFirst({
        where: {
          tatuador_id: tatuadorId,
          data_hora: slot,
          deleted_at: null,
          status: { in: ["aguardando_sinal", "confirmado"] },
        },
        select: { id: true, status: true, mutex_expira_em: true },
      });

      if (conflito) {
        throw httpError(409, "Horario em mutex. Outro cliente esta concluindo o calcão deste slot.");
      }

      const criado = await tx.agendamento.create({
        data: {
          cliente_id: user.id,
          tatuador_id: tatuadorId,
          data_hora: slot,
          status: "aguardando_sinal",
          valor_total: new Prisma.Decimal(valorServico.toFixed(2)),
          valor_sinal: new Prisma.Decimal(valorSinal.toFixed(2)),
          sinal_pago: false,
          mutex_expira_em: mutexExpiraEm,
          extras: {
            create: extrasLegais.map((extra) => ({
              descricao: extra.descricao,
              valor: new Prisma.Decimal(Number(extra.valor || 0).toFixed(2)),
            })),
          },
        },
        include: { extras: true },
      });

      return criado;
    });

    return {
      sucesso: true,
      agendamento,
      calcao: {
        percentual: 25,
        valor: valorSinal,
        mutex_expira_em: mutexExpiraEm,
        extras_legais: extrasLegais,
        extras_renomeados: bloqueios,
      },
    };
  } catch (err) {
    if (err.status) throw err;
    if (err.code === "P2002") {
      throw httpError(409, "Horario ja reservado para este tatuador.");
    }
    throw err;
  }
}

async function expirarMutexVencidos() {
  const agora = new Date();
  return prisma.agendamento.updateMany({
    where: {
      status: "aguardando_sinal",
      sinal_pago: false,
      mutex_expira_em: { lte: agora },
      deleted_at: null,
    },
    data: {
      status: "cancelado",
      deleted_at: agora,
    },
  });
}

async function solicitarCancelamento({ agendamentoId, user }) {
  const agendamento = await prisma.agendamento.findFirst({
    where: { id: agendamentoId, deleted_at: null },
    select: { data_hora: true, cliente_id: true },
  });

  if (!agendamento) {
    const error = new Error("Agendamento não encontrado.");
    error.status = 404;
    throw error;
  }

  if (agendamento.cliente_id !== user.id) {
    const error = new Error("Agendamento não pertence a este usuário.");
    error.status = 403;
    throw error;
  }

  const dataAgendamento = new Date(agendamento.data_hora);
  const agora = new Date();
  const diferencaMs = dataAgendamento.getTime() - agora.getTime();
  const diferencaDias = diferencaMs / (1000 * 60 * 60 * 24);

  if (diferencaDias < 3) {
    const error = new Error(
      "Cancelamento via app indisponível (menos de 3 dias). Contate o suporte via chat."
    );
    error.status = 403;
    error.bloqueado = true;
    throw error;
  }

  const { error: otpError } = await sendOtp(user.email);
  if (otpError) {
    const error = new Error("Falha ao enviar o código de confirmação.");
    error.status = 500;
    throw error;
  }

  return { sucesso: true, pode_cancelar: true };
}

async function executarCancelamento({ agendamentoId, otp, user }) {
  const { error: otpError } = await verifyOtp({ email: user.email, token: otp });
  if (otpError) {
    const error = new Error("Código OTP inválido ou expirado.");
    error.status = 401;
    throw error;
  }

  const result = await prisma.agendamento.updateMany({
    where: {
      id: agendamentoId,
      cliente_id: user.id,
      deleted_at: null,
    },
    data: { status: "cancelado" },
  });

  if (result.count === 0) {
    const error = new Error("Agendamento não encontrado.");
    error.status = 404;
    throw error;
  }

  return { sucesso: true, mensagem: "Cancelado com sucesso." };
}

module.exports = {
  criarAgendamento,
  expirarMutexVencidos,
  solicitarCancelamento,
  executarCancelamento,
  MUTEX_MINUTOS,
  CALCAO_PERCENTUAL,
};
