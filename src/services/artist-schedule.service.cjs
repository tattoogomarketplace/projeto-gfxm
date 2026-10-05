const { prisma } = require("./prisma.service.cjs");

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function assertTatuadorRole(user, perfil) {
  if (!user?.id) {
    throw httpError(401, "Não autenticado.");
  }
  if (user.role !== "tatuador" && perfil?.role !== "tatuador") {
    throw httpError(403, "Apenas tatuadores podem acessar ou alterar o expediente.");
  }
  return user.id;
}

async function getSchedule(tatuadorId) {
  const row = await prisma.artistSchedule.findUnique({
    where: { tatuadorId },
    select: { scheduleJson: true, updatedAt: true },
  });
  return {
    schedule: row?.scheduleJson ?? null,
    persisted: Boolean(row),
    updatedAt: row?.updatedAt ?? null,
  };
}

async function upsertSchedule(tatuadorId, raw) {
  if (raw === undefined || raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw httpError(400, "Informe o expediente em schedule.");
  }
  const row = await prisma.artistSchedule.upsert({
    where: { tatuadorId },
    create: { tatuadorId, scheduleJson: raw },
    update: { scheduleJson: raw },
    select: { scheduleJson: true, updatedAt: true },
  });
  return {
    schedule: row.scheduleJson,
    persisted: true,
    updatedAt: row.updatedAt,
  };
}

module.exports = {
  assertTatuadorRole,
  getSchedule,
  upsertSchedule,
};
