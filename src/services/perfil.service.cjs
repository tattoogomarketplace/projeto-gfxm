const { prisma } = require("./prisma.service.cjs");

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

async function verificarDuplicidade({ email, cpf }) {
  const emailNorm = String(email || "").trim().toLowerCase();
  const cpfNorm = onlyDigits(cpf);

  if (!emailNorm && !cpfNorm) {
    throw httpError(400, "Informe e-mail ou CPF para verificar duplicidade.");
  }

  const orFilters = [];
  if (emailNorm) orFilters.push({ email: emailNorm, deleted_at: null });
  if (cpfNorm.length === 11) orFilters.push({ cpf: cpfNorm, deleted_at: null });

  let existing = null;
  if (orFilters.length) {
    try {
      existing = await prisma.perfil.findFirst({
        where: { OR: orFilters },
        select: { email: true, cpf: true },
      });
    } catch (err) {
      const message = String((err && err.message) || "");
      if (message.includes("Unknown argument `cpf`") || message.includes("Unknown arg `cpf`")) {
        existing = emailNorm
          ? await prisma.perfil.findFirst({
              where: { email: emailNorm, deleted_at: null },
              select: { email: true },
            })
          : null;
      } else {
        throw err;
      }
    }
  }

  if (!existing) {
    return { disponivel: true };
  }

  if (emailNorm && existing.email === emailNorm) {
    throw httpError(409, "Este e-mail já está cadastrado.");
  }
  if (cpfNorm && existing.cpf === cpfNorm) {
    throw httpError(409, "Este CPF já está cadastrado.");
  }

  throw httpError(409, "E-mail ou CPF já cadastrado.");
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

module.exports = { verificarDuplicidade, aceitarTermos, obterPerfil, desativarConta };
