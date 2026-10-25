const { prisma } = require("./prisma.service.cjs");

const FLASH_NOTE_MAX_LENGTH = 80;
const FLASH_NOTE_TTL_MS = 24 * 60 * 60 * 1000;
const ACTIVE_NOTES_LIMIT = 80;

const BACKGROUND_IDS = ["graphite", "ember", "copper", "emerald"];
const FONT_CLASSES = ["font-sans", "font-serif", "font-mono"];
const ALIGN_CLASSES = ["text-left", "text-center", "text-right"];
const DEFAULT_BACKGROUND_ID = "graphite";
const DEFAULT_FONT_CLASS = "font-sans";
const DEFAULT_ALIGN_CLASS = "text-center";

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function pick(value, allowed, fallback) {
  return typeof value === "string" && allowed.includes(value) ? value : fallback;
}

function sanitizeStyle({ backgroundId, fontClass, alignClass } = {}) {
  return {
    backgroundId: pick(backgroundId, BACKGROUND_IDS, DEFAULT_BACKGROUND_ID),
    fontClass: pick(fontClass, FONT_CLASSES, DEFAULT_FONT_CLASS),
    alignClass: pick(alignClass, ALIGN_CLASSES, DEFAULT_ALIGN_CLASS),
  };
}

function normalizeContent(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) {
    throw httpError(400, "O conteúdo da Flash Note não pode estar vazio.");
  }
  if (trimmed.length > FLASH_NOTE_MAX_LENGTH) {
    throw httpError(400, `Flash Note deve ter no máximo ${FLASH_NOTE_MAX_LENGTH} caracteres.`);
  }
  return trimmed;
}

const FLASH_NOTE_AUTHOR_SELECT = {
  id: true,
  nome: true,
  username: true,
  role: true,
  cidade: true,
  estado: true,
  portfolios: {
    where: { deleted_at: null },
    orderBy: { created_at: "desc" },
    take: 1,
    select: { url_imagem: true },
  },
};

function authorName(nome, role) {
  const trimmed = (nome ?? "").trim();
  return trimmed || (role === "tatuador" ? "Artista" : "Cliente");
}

function authorAvatarUrl(portfolios) {
  const url = typeof portfolios?.[0]?.url_imagem === "string" ? portfolios[0].url_imagem.trim() : "";
  return url || null;
}

function toFlashNoteDto(row) {
  const name = row.user ? authorName(row.user.nome, row.user.role) : "";
  const author = row.user
    ? {
        id: row.user.id,
        name,
        username: row.user.username?.trim() || null,
        role: row.user.role,
        initial: name.charAt(0).toUpperCase() || "A",
        cidade: row.user.cidade,
        estado: row.user.estado,
        avatarUrl: authorAvatarUrl(row.user.portfolios),
      }
    : null;

  return {
    id: row.id,
    userId: row.userId,
    content: row.content,
    backgroundId: row.backgroundId,
    fontClass: row.fontClass,
    alignClass: row.alignClass,
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
        select: FLASH_NOTE_AUTHOR_SELECT,
      },
    },
  });

  return rows.map(toFlashNoteDto);
}

async function createFlashNote({ actorId, actorRole, content, expiresAt, backgroundId, fontClass, alignClass }) {
  if (actorRole !== "tatuador") {
    throw httpError(403, "Apenas tatuadores podem publicar Flash Notes.");
  }

  const trimmed = normalizeContent(content);

  const now = new Date();
  let expires = new Date(now.getTime() + FLASH_NOTE_TTL_MS);
  if (typeof expiresAt === "string" && expiresAt.trim()) {
    const parsed = new Date(expiresAt);
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= now.getTime()) {
      throw httpError(400, "expiresAt inválido.");
    }
    expires = parsed;
  }

  const style = sanitizeStyle({ backgroundId, fontClass, alignClass });

  await prisma.flashNote.updateMany({
    where: { userId: actorId, ativa: true },
    data: { ativa: false },
  });

  const created = await prisma.flashNote.create({
    data: {
      userId: actorId,
      content: trimmed,
      backgroundId: style.backgroundId,
      fontClass: style.fontClass,
      alignClass: style.alignClass,
      expiresAt: expires,
      ativa: true,
    },
    include: {
      user: {
        select: FLASH_NOTE_AUTHOR_SELECT,
      },
    },
  });

  return toFlashNoteDto(created);
}

async function updateFlashNote({ actorId, noteId, content, backgroundId, fontClass, alignClass }) {
  const existing = await prisma.flashNote.findFirst({
    where: { id: noteId, userId: actorId },
    select: { id: true, userId: true, content: true, backgroundId: true, fontClass: true, alignClass: true },
  });

  if (!existing) {
    throw httpError(404, "Flash Note não encontrada.");
  }

  const nextContent = content === undefined ? existing.content : normalizeContent(content);
  const style = sanitizeStyle({
    backgroundId: backgroundId ?? existing.backgroundId,
    fontClass: fontClass ?? existing.fontClass,
    alignClass: alignClass ?? existing.alignClass,
  });

  const mutated = await prisma.flashNote.updateMany({
    where: { id: existing.id, userId: actorId },
    data: {
      content: nextContent,
      backgroundId: style.backgroundId,
      fontClass: style.fontClass,
      alignClass: style.alignClass,
      expiresAt: new Date(Date.now() + FLASH_NOTE_TTL_MS),
    },
  });
  if (mutated.count === 0) {
    throw httpError(404, "Flash Note não encontrada.");
  }

  const updated = await prisma.flashNote.findFirst({
    where: { id: existing.id, userId: actorId },
    include: {
      user: {
        select: FLASH_NOTE_AUTHOR_SELECT,
      },
    },
  });
  if (!updated) {
    throw httpError(404, "Flash Note não encontrada.");
  }

  return toFlashNoteDto(updated);
}

module.exports = {
  listActiveFlashNotes,
  createFlashNote,
  updateFlashNote,
  expireStaleFlashNotes,
};
