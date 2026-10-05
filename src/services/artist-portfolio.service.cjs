const { prisma } = require("./prisma.service.cjs");
const { cacheDel } = require("./cache.service.cjs");

const STYLES = new Set([
  "Fine Line",
  "Realismo",
  "Old School",
  "Blackwork",
  "Minimalista",
  "Oriental",
  "Geometrico",
  "Aquarela",
  "Lettering",
  "Neo Traditional",
]);

const BODY_PARTS = new Set([
  "Braco",
  "Antebraco",
  "Ombro",
  "Peito",
  "Costas",
  "Costela",
  "Perna",
  "Coxa",
  "Panturrilha",
  "Pulso",
  "Mao",
  "Pescoco",
]);

const SESSION_DURATIONS = new Set([
  "Ate 1h",
  "1-2h",
  "2-4h",
  "4-6h",
  "Dia inteiro",
  "Multiplas sessoes",
]);

const ITEM_SELECT = {
  id: true,
  tatuador_id: true,
  url_imagem: true,
  estilo: true,
  body_part: true,
  session_duration: true,
  is_healed: true,
  descricao: true,
  likes_count: true,
  created_at: true,
};

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
    throw httpError(403, "Apenas tatuadores podem publicar ou consultar o portfólio.");
  }
  return user.id;
}

function readString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return null;
}

function isHttpsImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function toPortfolioItemDto(row) {
  return {
    id: row.id,
    tatuadorId: row.tatuador_id,
    imageUrl: row.url_imagem,
    style: row.estilo,
    bodyPart: row.body_part,
    sessionDuration: row.session_duration,
    isHealed: row.is_healed,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    likesCount: row.likes_count,
    descricao: row.descricao,
  };
}

function parsePublishPayload(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw httpError(400, "Payload inválido.");
  }

  const imageUrl = readString(raw.imageUrl ?? raw.url_imagem ?? raw.image_url);
  const style = readString(raw.style ?? raw.estilo);
  const bodyPart = readString(raw.bodyPart ?? raw.body_part);
  const sessionDuration = readString(raw.sessionDuration ?? raw.session_duration);
  const isHealed = readBoolean(raw.isHealed ?? raw.is_healed);

  const missing = [];
  if (!imageUrl) missing.push("imageUrl");
  if (!style) missing.push("style");
  if (!bodyPart) missing.push("bodyPart");
  if (!sessionDuration) missing.push("sessionDuration");
  if (isHealed === null) missing.push("isHealed");

  if (missing.length > 0) {
    throw httpError(400, `Campos obrigatórios ausentes: ${missing.join(", ")}.`);
  }
  if (!isHttpsImageUrl(imageUrl)) {
    throw httpError(400, "imageUrl deve ser uma URL HTTPS válida.");
  }
  if (!STYLES.has(style)) {
    throw httpError(400, "Estilo inválido.");
  }
  if (!BODY_PARTS.has(bodyPart)) {
    throw httpError(400, "Parte do corpo inválida.");
  }
  if (!SESSION_DURATIONS.has(sessionDuration)) {
    throw httpError(400, "Duração da sessão inválida.");
  }

  return { imageUrl, style, bodyPart, sessionDuration, isHealed };
}

async function listMine(tatuadorId) {
  const rows = await prisma.portfolio.findMany({
    where: { tatuador_id: tatuadorId, deleted_at: null },
    select: ITEM_SELECT,
    orderBy: { created_at: "desc" },
  });
  return rows.map(toPortfolioItemDto);
}

async function publishMine(tatuadorId, raw) {
  const payload = parsePublishPayload(raw);
  const descricao = readString(raw?.descricao ?? raw?.description);

  const created = await prisma.portfolio.create({
    data: {
      tatuador_id: tatuadorId,
      url_imagem: payload.imageUrl,
      estilo: payload.style,
      body_part: payload.bodyPart,
      session_duration: payload.sessionDuration,
      is_healed: payload.isHealed,
      descricao: descricao || null,
      likes_count: 0,
    },
    select: ITEM_SELECT,
  });

  await cacheDel("feed:portfolios:v2");
  return toPortfolioItemDto(created);
}

module.exports = {
  assertTatuadorRole,
  listMine,
  publishMine,
};
