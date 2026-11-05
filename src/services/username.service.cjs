const { prisma } = require("./prisma.service.cjs");

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 20;
const USERNAME_PATTERN = /^[a-z0-9_]+$/;
const USERNAME_CHANGE_LOCK_MS = 30 * 24 * 60 * 60 * 1000;
const RESERVED_USERNAMES = new Set([
  "admin",
  "administrador",
  "tatuogo",
  "tattoogo",
  "tattoogomk",
  "tattoogomarketplace",
  "suporte",
  "support",
  "help",
  "ajuda",
  "oficial",
  "official",
  "equipe",
  "team",
  "root",
  "moderador",
  "mod",
  "api",
  "www",
  "app",
  "dashboard",
  "login",
  "register",
  "cadastro",
  "perfil",
  "profile",
  "conta",
  "account",
  "chat",
  "galeria",
  "gallery",
  "artista",
  "estudio",
  "studio",
]);

const LOCALES = [
  "pt-BR",
  "pt-PT",
  "en",
  "es",
  "fr",
  "de",
  "it",
  "ja",
  "zh",
  "ko",
  "ar",
  "ru",
  "hi",
  "nl",
  "tr",
  "pl",
];

function httpError(status, message, extra) {
  const error = new Error(message);
  error.status = status;
  if (extra) Object.assign(error, extra);
  return error;
}

function normalizeUsername(value) {
  return String(value ?? "")
    .replace(/\s+/g, "")
    .replace(/^@+/, "")
    .toLowerCase();
}

function validateUsername(value) {
  const username = normalizeUsername(value);
  if (!username) return { valid: false, reason: "empty" };
  if (username.length < USERNAME_MIN_LENGTH) return { valid: false, reason: "too_short" };
  if (username.length > USERNAME_MAX_LENGTH) return { valid: false, reason: "too_long" };
  if (!USERNAME_PATTERN.test(username)) return { valid: false, reason: "invalid_chars" };
  if (RESERVED_USERNAMES.has(username)) return { valid: false, reason: "reserved" };
  return { valid: true, username };
}

function isUsernameForbiddenForRole(role) {
  return normalizeUsername(role) === "estudio";
}

function getUsernameUnlockDate(lastChange) {
  if (!lastChange) return null;
  return new Date(new Date(lastChange).getTime() + USERNAME_CHANGE_LOCK_MS);
}

function isUsernameChangeLocked(lastChange, now = new Date()) {
  const unlock = getUsernameUnlockDate(lastChange);
  if (!unlock) return false;
  return now.getTime() < unlock.getTime();
}

function normalizeLocale(value) {
  if (typeof value !== "string") return "pt-BR";
  const trimmed = value.trim();
  if (LOCALES.includes(trimmed)) return trimmed;
  return "pt-BR";
}

async function checkAvailability({ actorId, username }) {
  const perfil = await prisma.perfil.findFirst({
    where: { id: actorId, deleted_at: null },
    select: { id: true, role: true, username: true },
  });
  if (!perfil) throw httpError(404, "Perfil não encontrado.");

  if (isUsernameForbiddenForRole(perfil.role)) {
    return { sucesso: true, allowed: false, available: false, valid: false, reason: "forbidden" };
  }

  const validation = validateUsername(username);
  if (!validation.valid) {
    return {
      sucesso: true,
      allowed: true,
      valid: false,
      available: false,
      reason: validation.reason,
    };
  }

  const isOwn = perfil.username
    ? normalizeUsername(perfil.username) === validation.username
    : false;
  const existing = isOwn
    ? null
    : await prisma.perfil.findFirst({
        where: {
          username: { equals: validation.username, mode: "insensitive" },
          id: { not: perfil.id },
        },
        select: { id: true },
      });

  return {
    sucesso: true,
    allowed: true,
    valid: true,
    available: !existing,
    username: validation.username,
  };
}

async function changeUsername(perfilId, rawUsername) {
  const validation = validateUsername(rawUsername);
  if (!validation.valid) {
    return { status: "invalid", reason: validation.reason };
  }
  const nextUsername = validation.username;

  try {
    return await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw`
        SELECT id, role::text AS role, username, last_username_change, deleted_at
        FROM public.perfis
        WHERE id = ${perfilId}::uuid
        FOR UPDATE
      `;
      const perfil = rows[0];
      if (!perfil || perfil.deleted_at) return { status: "not_found" };
      if (isUsernameForbiddenForRole(perfil.role)) return { status: "forbidden" };

      if (perfil.username && normalizeUsername(perfil.username) === nextUsername) {
        return {
          status: "unchanged",
          username: perfil.username,
          lastUsernameChange: perfil.last_username_change,
        };
      }

      if (isUsernameChangeLocked(perfil.last_username_change)) {
        return {
          status: "locked",
          nextChangeAt: getUsernameUnlockDate(perfil.last_username_change),
        };
      }

      const conflict = await tx.perfil.findFirst({
        where: {
          username: { equals: nextUsername, mode: "insensitive" },
          id: { not: perfil.id },
        },
        select: { id: true },
      });
      if (conflict) return { status: "taken" };

      const now = new Date();
      const mutated = await tx.perfil.updateMany({
        where: { id: perfil.id, deleted_at: null },
        data: { username: nextUsername, last_username_change: now },
      });
      if (mutated.count === 0) return { status: "not_found" };

      const updated = await tx.perfil.findFirst({
        where: { id: perfil.id, deleted_at: null },
        select: { username: true, last_username_change: true },
      });

      return {
        status: "ok",
        username: updated?.username ?? nextUsername,
        lastUsernameChange: updated?.last_username_change ?? now,
      };
    });
  } catch (error) {
    if (error && error.code === "P2002") return { status: "taken" };
    throw error;
  }
}

async function claimUsername({ actorId, username }) {
  const result = await changeUsername(actorId, username);
  switch (result.status) {
    case "ok":
    case "unchanged":
      return {
        sucesso: true,
        username: result.username,
        last_username_change: result.lastUsernameChange,
        lastUsernameChange: result.lastUsernameChange,
        unchanged: result.status === "unchanged",
      };
    case "not_found":
      throw httpError(404, "Perfil não encontrado.", { reason: "not_found" });
    case "forbidden":
      throw httpError(403, "Estudios não podem definir um @username.", { reason: "forbidden" });
    case "invalid":
      throw httpError(400, "Username inválido.", { reason: result.reason });
    case "taken":
      throw httpError(409, "Este @username já está em uso.", { reason: "taken" });
    case "locked":
      throw httpError(
        423,
        `A troca de @username está bloqueada por 30 dias. Você poderá alterá-lo novamente em ${result.nextChangeAt.toISOString()}.`,
        { reason: "locked", nextChangeAt: result.nextChangeAt.toISOString() }
      );
    default:
      throw httpError(500, "Falha ao salvar o @username.");
  }
}

async function getLanguage(actorId) {
  const perfil = await prisma.perfil.findFirst({
    where: { id: actorId, deleted_at: null },
    select: { language: true },
  });
  if (!perfil) throw httpError(404, "Perfil não encontrado.");
  return { sucesso: true, language: normalizeLocale(perfil.language) };
}

async function setLanguage(actorId, languageRaw) {
  const language = LOCALES.includes(languageRaw) ? languageRaw : null;
  if (!language) {
    throw httpError(400, "Idioma inválido.", { allowed: LOCALES });
  }
  const result = await prisma.perfil.updateMany({
    where: { id: actorId, deleted_at: null },
    data: { language },
  });
  if (result.count === 0) throw httpError(404, "Perfil não encontrado.");
  return { sucesso: true, language };
}

module.exports = {
  checkAvailability,
  claimUsername,
  changeUsername,
  getLanguage,
  setLanguage,
  validateUsername,
  normalizeUsername,
  LOCALES,
};
