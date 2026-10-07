const { prisma } = require("./prisma.service.cjs");

const FLASH_NOTE_MAX_LENGTH = 80;
const FLASH_NOTE_TTL_MS = 24 * 60 * 60 * 1000;
const ACTIVE_NOTES_LIMIT = 80;

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function authorName(nome, role) {
  const trimmed = (nome ?? "").trim();
  return trimmed || (role === "tatuador" ? "Artista" : "Cliente");
}

function toFlashNoteDto(row) {
  const author = row.user
    ? {
        id: row.user.id,
        name: authorName(row.user.nome, row.user.role),
        role: row.user.role,
        initial: authorName(row.user.nome, row.user.role).charAt(0).toUpperCase() || "A",
        cidade: row.user.cidade,
        estado: row.user.estado,
      }
    : null;

  return {
    id: row.id,
    userId: row.userId,
    content: row.content,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    ativa: row.ativa,
    author,
  };
}

async function expireStaleFlashNotes(now = new Date()) {
  await prisma.flashNote.updateMany({
    where: {
      ativa: true,
      expiresAt: { lte: now },
    },
    data: { ativa: false },
  });
}

async function listActiveFlashNotes(userId) {
  const now = new Date();
  await expireStaleFlashNotes(now);

  const rows = await prisma.flashNote.findMany({
    where: {
      ativa: true,
      expiresAt: { gt: now },
      ...(userId ? { userId } : {}),
      user: {
        deleted_at: null,
        statusConta: "ATIVO",
      },
    },
    orderBy: { createdAt: "desc" },
    take: ACTIVE_NOTES_LIMIT,
    include: {
      user: {
        select: { id: true, nome: true, role: true, cidade: true, estado: true },
      },
    },
  });

  return rows.map(toFlashNoteDto);
}

async function createFlashNote({ actorId, actorRole, content, expiresAt }) {
  if (actorRole !== "tatuador") {
    throw httpError(403, "Apenas tatuadores podem publicar Flash Notes.");
  }

  const trimmed = typeof content === "string" ? content.trim() : "";
  if (!trimmed) {
    throw httpError(400, "O conteúdo da Flash Note não pode estar vazio.");
  }
  if (trimmed.length > FLASH_NOTE_MAX_LENGTH) {
    throw httpError(400, `Flash Note deve ter no máximo ${FLASH_NOTE_MAX_LENGTH} caracteres.`);
  }

  const now = new Date();
  let expires = new Date(now.getTime() + FLASH_NOTE_TTL_MS);
  if (typeof expiresAt === "string" && expiresAt.trim()) {
    const parsed = new Date(expiresAt);
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= now.getTime()) {
      throw httpError(400, "expiresAt inválido.");
    }
    expires = parsed;
  }

  await prisma.flashNote.updateMany({
    where: { userId: actorId, ativa: true },
    data: { ativa: false },
  });

  const created = await prisma.flashNote.create({
    data: {
      userId: actorId,
      content: trimmed,
      expiresAt: expires,
      ativa: true,
    },
    include: {
      user: {
        select: { id: true, nome: true, role: true, cidade: true, estado: true },
      },
    },
  });

  return toFlashNoteDto(created);
}

module.exports = {
  listActiveFlashNotes,
  createFlashNote,
  expireStaleFlashNotes,
};
