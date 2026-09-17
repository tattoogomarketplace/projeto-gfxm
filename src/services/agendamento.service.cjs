const { prisma } = require("./prisma.service.cjs");
const { sendOtp, verifyOtp } = require("./supabase-auth.service.cjs");

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

module.exports = { solicitarCancelamento, executarCancelamento };
