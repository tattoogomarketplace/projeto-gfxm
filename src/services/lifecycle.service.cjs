const { prisma } = require("./prisma.service.cjs");

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parseAppRole(value) {
  if (value === "tatuador" || value === "estudio" || value === "cliente") return value;
  return null;
}

function onlyCnpjDigits(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 14);
}

function isValidCnpj(value) {
  const cnpj = onlyCnpjDigits(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  function checkDigit(base) {
    let weight = base.length - 7;
    let sum = 0;
    for (let i = 0; i < base.length; i += 1) {
      sum += Number(base[i]) * weight;
      weight -= 1;
      if (weight < 2) weight = 9;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  }
  const first = checkDigit(cnpj.slice(0, 12));
  if (first !== Number(cnpj[12])) return false;
  const second = checkDigit(cnpj.slice(0, 13));
  return second === Number(cnpj[13]);
}

function normalizeCnpj(value) {
  const digits = onlyCnpjDigits(value);
  if (!digits) return null;
  return isValidCnpj(digits) ? digits : null;
}

function resolveKycStatusForRole(role) {
  return role === "cliente" ? "nao_aplicavel" : "pendente";
}

async function updateClerkMetadata(clerkId, publicMetadata) {
  if (!clerkId) return;
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return;
  try {
    const { createClerkClient } = require("@clerk/backend");
    const client = createClerkClient({ secretKey });
    await client.users.updateUserMetadata(clerkId, { publicMetadata });
  } catch {
    return;
  }
}

async function deleteClerkUser(clerkId) {
  if (!clerkId) return;
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return;
  try {
    const { createClerkClient } = require("@clerk/backend");
    const client = createClerkClient({ secretKey });
    await client.users.deleteUser(clerkId);
  } catch (error) {
    const status = error && (error.status || error.statusCode);
    if (status === 404) return;
    throw error;
  }
}

async function deactivateAccount({ actor }) {
  const mutated = await prisma.perfil.updateMany({
    where: { id: actor.id, clerk_id: actor.clerkId, deleted_at: null },
    data: {
      statusConta: "DESATIVADO",
      agenda_bloqueada: true,
    },
  });
  if (mutated.count === 0) throw httpError(404, "Perfil não encontrado.");
  return {
    ok: true,
    userId: actor.clerkId,
    statusConta: "DESATIVADO",
  };
}

async function scheduleAccountDeletion({ actor }) {
  const dataFim = new Date(Date.now() + NINETY_DAYS_MS);
  const now = new Date();
  const perfil = await prisma.perfil.findFirst({
    where: { id: actor.id, clerk_id: actor.clerkId },
    select: { id: true, deleted_at: true },
  });
  if (!perfil) throw httpError(404, "Perfil não encontrado.");

  await prisma.perfil.updateMany({
    where: { id: perfil.id, clerk_id: actor.clerkId },
    data: {
      statusConta: "AGUARDANDO_EXCLUSAO",
      dataFim,
      deleted_at: perfil.deleted_at ?? now,
      agenda_bloqueada: true,
    },
  });

  return {
    ok: true,
    userId: actor.clerkId,
    statusConta: "AGUARDANDO_EXCLUSAO",
    dataFim,
  };
}

async function reactivateAccount({ actor }) {
  const mutated = await prisma.perfil.updateMany({
    where: { id: actor.id, clerk_id: actor.clerkId },
    data: {
      statusConta: "ATIVO",
      dataFim: null,
      deleted_at: null,
      agenda_bloqueada: false,
    },
  });
  if (mutated.count === 0) throw httpError(404, "Perfil não encontrado.");

  const updated = await prisma.perfil.findFirst({
    where: { id: actor.id, clerk_id: actor.clerkId },
    select: { id: true, statusConta: true, dataFim: true, role: true },
  });
  if (!updated) throw httpError(404, "Perfil não encontrado.");

  return {
    ok: true,
    userId: updated.id,
    statusConta: updated.statusConta,
    dataFim: updated.dataFim,
    role: updated.role,
  };
}

async function migrateUserRole({ actor, newRole, extraData }) {
  const perfil = await prisma.perfil.findFirst({
    where: { id: actor.id, clerk_id: actor.clerkId, deleted_at: null },
    select: { id: true, role: true, cnpj: true },
  });
  if (!perfil) throw httpError(404, "Perfil não encontrado.");

  const role = parseAppRole(newRole);
  if (!role) throw httpError(400, "Papel inválido.");

  const cnpj = role === "estudio" ? normalizeCnpj(extraData?.cnpj) ?? perfil.cnpj : perfil.cnpj;
  if (role === "estudio" && extraData?.cnpj != null && extraData.cnpj !== "" && !normalizeCnpj(extraData.cnpj)) {
    throw httpError(400, "CNPJ inválido.");
  }

  const nome =
    typeof extraData?.nome === "string" && extraData.nome.trim() ? extraData.nome.trim() : undefined;
  const roleChanged = perfil.role !== role;

  const mutated = await prisma.perfil.updateMany({
    where: { id: perfil.id, clerk_id: actor.clerkId, deleted_at: null },
    data: {
      role,
      ...(role === "estudio" && cnpj ? { cnpj } : {}),
      ...(nome ? { nome } : {}),
      ...(roleChanged
        ? {
            kyc_status: resolveKycStatusForRole(role),
            has_seen_welcome_notice: false,
          }
        : {}),
    },
  });
  if (mutated.count === 0) throw httpError(404, "Perfil não encontrado.");

  const updated = await prisma.perfil.findFirst({
    where: { id: perfil.id, clerk_id: actor.clerkId, deleted_at: null },
    select: { id: true, clerk_id: true, role: true, statusConta: true, dataFim: true, cnpj: true },
  });
  if (!updated) throw httpError(404, "Perfil não encontrado.");

  const publicMetadata = { role: updated.role };
  if (updated.role === "estudio" && updated.cnpj) publicMetadata.cnpj = updated.cnpj;
  await updateClerkMetadata(updated.clerk_id, publicMetadata);

  return {
    ok: true,
    userId: updated.id,
    statusConta: updated.statusConta,
    dataFim: updated.dataFim,
    role: updated.role,
  };
}

async function desativarContaComClerk({ actor }) {
  await prisma.perfil.updateMany({
    where: { id: actor.id, clerk_id: actor.clerkId, deleted_at: null },
    data: { deleted_at: new Date(), agenda_bloqueada: true },
  });
  await deleteClerkUser(actor.clerkId);
  return { success: true, accepted: true };
}

module.exports = {
  deactivateAccount,
  scheduleAccountDeletion,
  reactivateAccount,
  migrateUserRole,
  desativarContaComClerk,
  deleteClerkUser,
};
