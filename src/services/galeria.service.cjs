const { prisma } = require("./prisma.service.cjs");

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

const MAX_LIMIT = 60;
const DEFAULT_LIMIT = 48;

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function readFirst(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseHealed(raw) {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "true" || normalized === "1" || normalized === "healed" || normalized === "cicatrizada") {
    return true;
  }
  if (
    normalized === "false" ||
    normalized === "0" ||
    normalized === "fresh" ||
    normalized === "recem-feita" ||
    normalized === "recém-feita"
  ) {
    return false;
  }
  throw httpError(400, "Status de cicatrização inválido.");
}

function parseLimit(raw) {
  if (!raw) return DEFAULT_LIMIT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    throw httpError(400, "Limite inválido.");
  }
  return Math.min(n, MAX_LIMIT);
}

function artistName(nome) {
  const trimmed = typeof nome === "string" ? nome.trim() : "";
  return trimmed || "Artista";
}

function artistInitial(nome) {
  const letter = nome.charAt(0);
  return letter ? letter.toUpperCase() : "A";
}

function parseFilters(query) {
  const styleRaw = readFirst(query.style ?? query.estilo);
  const bodyPartRaw = readFirst(query.bodyPart ?? query.body_part);
  const healedRaw = readFirst(
    query.healed ?? query.isHealed ?? query.is_healed ?? query.status ?? query.healing
  );
  const limitRaw = readFirst(query.limit);

  if (styleRaw && !STYLES.has(styleRaw)) {
    throw httpError(400, "Estilo inválido.");
  }
  if (bodyPartRaw && !BODY_PARTS.has(bodyPartRaw)) {
    throw httpError(400, "Parte do corpo inválida.");
  }

  return {
    style: styleRaw || undefined,
    bodyPart: bodyPartRaw || undefined,
    isHealed: healedRaw ? parseHealed(healedRaw) : undefined,
    limit: parseLimit(limitRaw),
  };
}

async function listGaleria(filters) {
  const rows = await prisma.portfolio.findMany({
    where: {
      deleted_at: null,
      ...(filters.style ? { estilo: filters.style } : {}),
      ...(filters.bodyPart ? { body_part: filters.bodyPart } : {}),
      ...(typeof filters.isHealed === "boolean" ? { is_healed: filters.isHealed } : {}),
      tatuador: {
        deleted_at: null,
        role: "tatuador",
        kyc_status: "aprovado",
        statusConta: "ATIVO",
      },
    },
    select: {
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
      tatuador: {
        select: {
          id: true,
          nome: true,
          cidade: true,
          estado: true,
          studio: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      },
    },
    orderBy: { created_at: "desc" },
    take: filters.limit,
  });

  return rows.map((row) => {
    const name = artistName(row.tatuador.nome);
    const studioName = (row.tatuador.studio?.nome ?? "").trim();
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
      artist: {
        id: row.tatuador.id,
        name,
        avatarUrl: null,
        initial: artistInitial(name),
        cidade: row.tatuador.cidade,
        estado: row.tatuador.estado,
        studio: row.tatuador.studio
          ? { id: row.tatuador.studio.id, name: studioName || "Estúdio" }
          : null,
      },
    };
  });
}

module.exports = { parseFilters, listGaleria };
