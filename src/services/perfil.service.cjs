const { prisma } = require("./prisma.service.cjs");

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function aceitarTermos(userId) {
  await prisma.perfil.update({
    where: { id: userId },
    data: { has_seen_welcome_notice: true },
  });
  return { sucesso: true };
}

async function obterPerfil(userId) {
  const perfil = await prisma.perfil.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      nome: true,
      role: true,
      kyc_status: true,
      has_seen_welcome_notice: true,
      bank_account: true,
      deleted_at: true,
      agenda_bloqueada: true,
    },
  });
  if (!perfil || perfil.deleted_at) {
    throw httpError(403, "Conta desativada ou inexistente.");
  }
  return perfil;
}

async function desativarConta(userId) {
  const perfil = await prisma.perfil.findUnique({
    where: { id: userId },
    select: { id: true, deleted_at: true },
  });
  if (!perfil) {
    throw httpError(404, "Perfil não encontrado.");
  }
  if (perfil.deleted_at) {
    return { sucesso: true, ja_desativada: true };
  }

  await prisma.perfil.update({
    where: { id: userId },
    data: {
      deleted_at: new Date(),
      agenda_bloqueada: true,
    },
  });

  return { sucesso: true };
}

module.exports = { aceitarTermos, obterPerfil, desativarConta };
