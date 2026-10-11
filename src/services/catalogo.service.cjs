const { prisma } = require("./prisma.service.cjs");
const { cacheGet, cacheSet } = require("./cache.service.cjs");

async function getFeed() {
  const key = "feed:portfolios:v2";
  const hit = await cacheGet(key);
  if (hit) return hit;

  const data = await prisma.portfolio.findMany({
    where: { deleted_at: null },
    select: {
      id: true,
      url_imagem: true,
      likes_count: true,
      estilo: true,
      body_part: true,
      session_duration: true,
      is_healed: true,
    },
    orderBy: { created_at: "desc" },
    take: 24,
  });

  await cacheSet(key, data, 30);
  return data;
}

async function listArtistas(cidade, estado) {
  const key = `artistas:${cidade || "all"}:${estado || "all"}`;
  const hit = await cacheGet(key);
  if (hit) return hit;

  const data = await prisma.perfil.findMany({
    where: {
      deleted_at: null,
      role: { in: ["tatuador", "estudio"] },
      agenda_bloqueada: false,
      ...(cidade ? { cidade } : {}),
      ...(estado ? { estado } : {}),
    },
    select: { id: true, email: true, cidade: true, estado: true },
    take: 100,
  });

  await cacheSet(key, data, 60);
  return data;
}

async function listCidades() {
  const key = "geo:cidades:v1";
  const hit = await cacheGet(key);
  if (hit) return hit;

  const data = await prisma.perfil.findMany({
    where: {
      deleted_at: null,
      role: { in: ["tatuador", "estudio"] },
      cidade: { not: null },
      estado: { not: null },
    },
    select: { cidade: true, estado: true },
    orderBy: { cidade: "asc" },
    take: 1000,
  });

  const unique = Array.from(
    new Map(data.map((item) => [`${item.cidade}-${item.estado}`, item])).values()
  );

  await cacheSet(key, unique, 300);
  return unique;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function artistDisplayName(nome) {
  const trimmed = typeof nome === "string" ? nome.trim() : "";
  return trimmed || "Artista";
}

async function getArtistVitrine(artistIdRaw) {
  const artistId = typeof artistIdRaw === "string" ? artistIdRaw.trim() : "";
  if (!UUID_RE.test(artistId)) {
    const error = new Error("Identificador de artista inválido.");
    error.status = 400;
    throw error;
  }

  const artist = await prisma.perfil.findFirst({
    where: {
      id: artistId,
      deleted_at: null,
      role: "tatuador",
      statusConta: "ATIVO",
    },
    select: {
      id: true,
      nome: true,
      cidade: true,
      estado: true,
      kyc_status: true,
      agenda_bloqueada: true,
      studio: { select: { id: true, nome: true } },
    },
  });

  if (!artist) {
    const error = new Error("Artista não encontrado.");
    error.status = 404;
    throw error;
  }

  const rows = await prisma.portfolio.findMany({
    where: { tatuador_id: artistId, deleted_at: null },
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
    },
    orderBy: { created_at: "desc" },
    take: 48,
  });

  const name = artistDisplayName(artist.nome);
  const studioName = (artist.studio?.nome ?? "").trim();
  const kycApproved = artist.kyc_status === "aprovado";

  return {
    artist: {
      id: artist.id,
      name,
      initial: name.charAt(0).toUpperCase() || "A",
      cidade: artist.cidade,
      estado: artist.estado,
      studio: artist.studio ? { id: artist.studio.id, name: studioName || "Estúdio" } : null,
      kycApproved,
      bookingEnabled: kycApproved && !artist.agenda_bloqueada,
    },
    items: rows.map((row) => ({
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
    })),
    scheduleSummary: [],
  };
}

module.exports = { getFeed, listArtistas, listCidades, getArtistVitrine };
