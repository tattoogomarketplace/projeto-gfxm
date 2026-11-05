const { prisma } = require("./prisma.service.cjs");
const { cacheGet, cacheSet } = require("./cache.service.cjs");
const { parseAddress } = require("./geo.service.cjs");
const {
  createDefaultWorkingHours,
  normalizeWorkingHours,
  listUpcomingSlots,
} = require("../utils/working-hours.cjs");
const {
  REVIEW_FEATURED_ARTISTS,
  FEATURED_ARTIST_GEO,
  PLACEHOLDER_INSPIRATIONS,
  PLACEHOLDER_REVIEWS,
} = require("../data/catalog-mocks.cjs");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const USERNAME_MAX_LENGTH = 20;
const USERNAME_PATTERN = /^[a-z0-9_]+$/;
const MEDIA_FILTERS = new Set(["photo", "all", "video"]);
const ARTIST_REVIEWS_LIMIT = 40;

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function isArtistId(value) {
  return UUID_RE.test(value);
}

function normalizeUsername(value) {
  return String(value ?? "")
    .replace(/\s+/g, "")
    .replace(/^@+/, "")
    .toLowerCase();
}

function artistDisplayName(nome) {
  const trimmed = typeof nome === "string" ? nome.trim() : "";
  return trimmed || "";
}

function artistInitial(nome) {
  const letter = (nome || "").charAt(0);
  return letter ? letter.toUpperCase() : "A";
}

function toIso(value) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value) return value;
  return null;
}

function mediaTypeWhere(filter) {
  if (filter === "photo") return { mediaType: "PHOTO" };
  if (filter === "video") return { mediaType: "VIDEO" };
  return undefined;
}

function mapPostToInspiration(post) {
  const artistName = artistDisplayName(post.authorName);
  return {
    id: post.id,
    imageUrl: post.imageUrl,
    style: post.style,
    artistName,
    artistId: null,
    artistUsername: null,
    likes: 0,
    viewsCount: post.viewsCount ?? 0,
    artistAvatarUrl: post.authorAvatar,
    artistInitial: artistInitial(artistName),
  };
}

function parseMediaFilter(raw) {
  const value = typeof raw === "string" && raw.trim() ? raw.trim() : "photo";
  if (!MEDIA_FILTERS.has(value)) {
    throw httpError(400, "Filtro de mídia inválido.");
  }
  return value;
}

async function getFeed(filterRaw) {
  const filter = parseMediaFilter(filterRaw);
  const mediaWhere = mediaTypeWhere(filter);
  const rows = await prisma.post.findMany({
    where: mediaWhere,
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      imageUrl: true,
      authorName: true,
      authorAvatar: true,
      style: true,
      viewsCount: true,
    },
  });
  return rows.map(mapPostToInspiration);
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

function uniqueStyles(rows) {
  const seen = new Set();
  const styles = [];
  for (const row of rows) {
    const style = typeof row.estilo === "string" ? row.estilo.trim() : "";
    if (!style || seen.has(style)) continue;
    seen.add(style);
    styles.push(style);
    if (styles.length >= 4) break;
  }
  return styles;
}

function summarizeSchedule(schedule) {
  const days = Array.isArray(schedule?.days) ? schedule.days : [];
  return days
    .filter((day) => day && day.active)
    .map((day) => ({ day: day.day, start: day.start, end: day.end }));
}

function mockPortfolioItems(artistId, name) {
  const items = [];
  const seen = new Set();
  const pushItem = (id, imageUrl, style) => {
    if (!imageUrl || seen.has(imageUrl)) return;
    seen.add(imageUrl);
    items.push({
      id,
      tatuadorId: artistId,
      imageUrl,
      style,
      bodyPart: "Braco",
      sessionDuration: "1-2h",
      isHealed: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      likesCount: 0,
      descricao: null,
    });
  };

  for (const review of PLACEHOLDER_REVIEWS) {
    if (review.targetId !== artistId || !review.portfolio) continue;
    pushItem(review.portfolio.id, review.portfolio.imageUrl, review.portfolio.style);
  }
  for (const inspiration of PLACEHOLDER_INSPIRATIONS) {
    if (inspiration.artistName !== name) continue;
    pushItem(inspiration.id, inspiration.imageUrl, inspiration.style);
  }
  for (const inspiration of PLACEHOLDER_INSPIRATIONS) {
    if (items.length >= 9) break;
    pushItem(`${artistId}-${inspiration.id}`, inspiration.imageUrl, inspiration.style);
  }
  return items;
}

function featuredMockVitrine(identifier) {
  const needle = identifier.trim().toLowerCase();
  const featured = Object.values(REVIEW_FEATURED_ARTISTS).find((artist) => {
    const username = String(artist.username ?? "").toLowerCase();
    return artist.id === identifier || (username !== "" && username === needle);
  });
  if (!featured) return null;

  const reviews = PLACEHOLDER_REVIEWS.filter((review) => review.targetId === featured.id);
  const items = mockPortfolioItems(featured.id, featured.name);
  const styles = [];
  const seen = new Set();
  for (const item of items) {
    const style = item.style?.trim();
    if (!style || seen.has(style)) continue;
    seen.add(style);
    styles.push(style);
    if (styles.length >= 4) break;
  }
  const count = reviews.length;
  const rating =
    count === 0
      ? 0
      : Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / count) * 10) / 10;
  const coverUrl = items[0]?.imageUrl ?? null;
  const featuredKey = Object.keys(REVIEW_FEATURED_ARTISTS).find(
    (key) => REVIEW_FEATURED_ARTISTS[key].id === featured.id
  );
  const geo = featuredKey ? FEATURED_ARTIST_GEO[featuredKey] : null;

  return {
    artist: {
      id: featured.id,
      name: featured.name,
      username: featured.username ?? null,
      initial: featured.initial,
      avatarUrl: featured.avatarUrl,
      coverUrl,
      cidade: geo?.address.city ?? null,
      estado: geo?.address.state ?? null,
      studio: null,
      kycApproved: true,
      bookingEnabled: false,
      rating,
      reviewCount: count,
      styles,
      latitude: geo?.latitude ?? null,
      longitude: geo?.longitude ?? null,
      address: geo?.address ?? null,
    },
    items,
    reviews,
    scheduleSummary: [],
    availableSlots: [],
  };
}

function clampRating(value) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(5, Math.max(1, Math.round(value)));
}

function toAuthor(row, fallbackId) {
  const name = artistDisplayName(row?.nome);
  return {
    id: row?.id || fallbackId,
    name,
    avatarUrl: null,
    initial: artistInitial(name),
  };
}

function toTarget(row, fallbackId) {
  const name = artistDisplayName(row?.nome);
  const role = row?.role === "estudio" ? "estudio" : "tatuador";
  return {
    id: row?.id || fallbackId,
    name,
    role,
    avatarUrl: null,
    initial: artistInitial(name),
  };
}

function toPortfolio(row) {
  if (!row?.id) return null;
  return {
    id: row.id,
    imageUrl: row.url_imagem || "",
    style: row.estilo || "",
  };
}

function toReviewDto(row) {
  return {
    id: row.id,
    authorId: row.author_id,
    targetId: row.target_id,
    portfolioId: row.portfolio_id,
    rating: clampRating(row.rating),
    content: (row.content ?? "").trim(),
    artistReply: row.artist_reply?.trim() || null,
    repliedAt: toIso(row.replied_at),
    isVerified: Boolean(row.is_verified),
    createdAt: toIso(row.created_at) || new Date(0).toISOString(),
    author: toAuthor(row.author, row.author_id),
    target: toTarget(row.target, row.target_id),
    portfolio: toPortfolio(row.portfolio),
  };
}

async function loadArtistReviews(artistId) {
  const rows = await prisma.review.findMany({
    where: { target_id: artistId, deleted_at: null },
    select: {
      id: true,
      author_id: true,
      target_id: true,
      portfolio_id: true,
      rating: true,
      content: true,
      artist_reply: true,
      replied_at: true,
      is_verified: true,
      created_at: true,
      author: { select: { id: true, nome: true, role: true } },
      target: { select: { id: true, nome: true, role: true } },
      portfolio: { select: { id: true, url_imagem: true, estilo: true } },
    },
    orderBy: { created_at: "desc" },
    take: ARTIST_REVIEWS_LIMIT,
  });
  return rows.map(toReviewDto);
}

async function loadArtistSchedule(artistId) {
  const row = await prisma.artistSchedule.findUnique({
    where: { tatuadorId: artistId },
    select: { scheduleJson: true, updatedAt: true },
  });
  if (!row) {
    return createDefaultWorkingHours();
  }
  const schedule = normalizeWorkingHours(row.scheduleJson);
  schedule.updatedAt = row.updatedAt instanceof Date ? row.updatedAt.toISOString() : schedule.updatedAt;
  return schedule;
}

async function getArtistVitrine(artistIdRaw) {
  const identifier = typeof artistIdRaw === "string" ? artistIdRaw.trim() : "";
  const featured = featuredMockVitrine(identifier);
  if (featured) return featured;

  const byId = isArtistId(identifier);
  const username = byId ? null : normalizeUsername(identifier).slice(0, USERNAME_MAX_LENGTH);
  if (!byId && (!username || !USERNAME_PATTERN.test(username))) {
    throw httpError(400, "Identificador de artista inválido.");
  }

  const artist = await prisma.perfil.findFirst({
    where: {
      ...(byId ? { id: identifier } : { username }),
      deleted_at: null,
      role: "tatuador",
      statusConta: "ATIVO",
    },
    select: {
      id: true,
      nome: true,
      username: true,
      cidade: true,
      estado: true,
      latitude: true,
      longitude: true,
      address: true,
      kyc_status: true,
      agenda_bloqueada: true,
      studio: { select: { id: true, nome: true } },
    },
  });

  if (!artist) {
    throw httpError(404, "Artista não encontrado.");
  }

  const artistId = artist.id;
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
  const bookingEnabled = kycApproved && !artist.agenda_bloqueada;

  let scheduleSummary = [];
  let availableSlots = [];
  let rating = 0;
  let reviewCount = 0;
  let reviews = [];

  try {
    const [schedule, reviewRows] = await Promise.all([
      loadArtistSchedule(artistId),
      loadArtistReviews(artistId),
    ]);
    scheduleSummary = summarizeSchedule(schedule);
    if (bookingEnabled) {
      availableSlots = listUpcomingSlots(schedule, {
        days: 14,
        intervalMinutes: 60,
        limit: 12,
      });
    }
    reviews = reviewRows;
    reviewCount = reviews.length;
    rating =
      reviewCount === 0
        ? 0
        : Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount) * 10) / 10;
  } catch {
    scheduleSummary = [];
    availableSlots = [];
    reviews = PLACEHOLDER_REVIEWS.filter((review) => review.targetId === artistId);
    reviewCount = reviews.length;
    rating =
      reviewCount === 0
        ? 0
        : Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount) * 10) / 10;
  }

  return {
    artist: {
      id: artist.id,
      name,
      username: artist.username,
      initial: artistInitial(name),
      avatarUrl: rows[0]?.url_imagem ?? null,
      coverUrl: rows[1]?.url_imagem ?? rows[0]?.url_imagem ?? null,
      cidade: artist.cidade,
      estado: artist.estado,
      studio: artist.studio ? { id: artist.studio.id, name: studioName || "" } : null,
      kycApproved,
      bookingEnabled,
      rating,
      reviewCount,
      styles: uniqueStyles(rows),
      latitude: artist.latitude,
      longitude: artist.longitude,
      address: parseAddress(artist.address, artist.cidade, artist.estado),
    },
    items: rows.map((row) => ({
      id: row.id,
      tatuadorId: row.tatuador_id,
      imageUrl: row.url_imagem,
      style: row.estilo,
      bodyPart: row.body_part,
      sessionDuration: row.session_duration,
      isHealed: row.is_healed,
      createdAt: toIso(row.created_at),
      likesCount: row.likes_count,
      descricao: row.descricao,
    })),
    reviews,
    scheduleSummary,
    availableSlots,
  };
}

module.exports = {
  getFeed,
  parseMediaFilter,
  listArtistas,
  listCidades,
  getArtistVitrine,
};
