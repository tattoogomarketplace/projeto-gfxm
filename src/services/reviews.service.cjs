const { prisma } = require("./prisma.service.cjs");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_REPLY_LENGTH = 1000;

const REVIEW_SELECT = {
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
};

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function displayName(nome, fallback) {
  const trimmed = (nome ?? "").trim();
  return trimmed || fallback;
}

function initialFrom(name) {
  const letter = name.charAt(0);
  return letter ? letter.toUpperCase() : "A";
}

function clampRating(value) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(5, Math.max(1, Math.round(value)));
}

function toReviewDto(row) {
  const authorName = displayName(row.author?.nome, "");
  const targetName = displayName(row.target?.nome, "");
  const targetRole = row.target?.role === "estudio" ? "estudio" : "tatuador";
  return {
    id: row.id,
    authorId: row.author_id,
    targetId: row.target_id,
    portfolioId: row.portfolio_id,
    rating: clampRating(row.rating),
    content: (row.content ?? "").trim(),
    artistReply: row.artist_reply?.trim() || null,
    repliedAt: row.replied_at ? row.replied_at.toISOString() : null,
    isVerified: Boolean(row.is_verified),
    createdAt: row.created_at.toISOString(),
    author: {
      id: row.author?.id || row.author_id,
      name: authorName,
      avatarUrl: null,
      initial: initialFrom(authorName),
    },
    target: {
      id: row.target?.id || row.target_id,
      name: targetName,
      role: targetRole,
      avatarUrl: null,
      initial: initialFrom(targetName),
    },
    portfolio: row.portfolio?.id
      ? {
          id: row.portfolio.id,
          imageUrl: row.portfolio.url_imagem || "",
          style: row.portfolio.estilo || "",
        }
      : null,
  };
}

async function replyToReview({ actorId, actorRole, reviewId, replyRaw }) {
  if (actorRole !== "tatuador" && actorRole !== "estudio") {
    throw httpError(403, "Apenas o artista ou o estúdio avaliado pode responder.");
  }

  const id = String(reviewId || "").trim();
  if (!UUID_RE.test(id)) throw httpError(400, "Avaliação inválida.");

  const reply = String(replyRaw || "").trim();
  if (!reply) throw httpError(400, "A resposta não pode ficar vazia.");
  if (reply.length > MAX_REPLY_LENGTH) {
    throw httpError(400, "A resposta excede o limite permitido.");
  }

  const mutated = await prisma.review.updateMany({
    where: { id, target_id: actorId, deleted_at: null },
    data: { artist_reply: reply, replied_at: new Date() },
  });
  if (mutated.count === 0) {
    const exists = await prisma.review.findFirst({
      where: { id, deleted_at: null },
      select: { id: true },
    });
    if (!exists) throw httpError(404, "Avaliação não encontrada.");
    throw httpError(403, "Você só pode responder avaliações do seu perfil.");
  }

  const updated = await prisma.review.findFirst({
    where: { id, target_id: actorId, deleted_at: null },
    select: REVIEW_SELECT,
  });
  if (!updated) throw httpError(404, "Avaliação não encontrada.");
  return toReviewDto(updated);
}

const FEATURED_LIMIT = 8;
const ARTIST_REVIEWS_LIMIT = 40;
const { PLACEHOLDER_REVIEWS, REVIEW_FEATURED_ARTISTS } = require("../data/catalog-mocks.cjs");

function summarize(targetId, reviews) {
  const count = reviews.length;
  const verifiedCount = reviews.filter((item) => item.isVerified).length;
  const averageRating =
    count === 0
      ? 0
      : Math.round((reviews.reduce((sum, item) => sum + item.rating, 0) / count) * 10) / 10;
  return { targetId, count, averageRating, verifiedCount };
}

function mockReviewsForTarget(targetId) {
  return PLACEHOLDER_REVIEWS.filter((item) => item.targetId === targetId);
}

function mockTarget(targetId) {
  const featured = Object.values(REVIEW_FEATURED_ARTISTS).find((artist) => artist.id === targetId);
  if (featured) return featured;
  const fromReview = PLACEHOLDER_REVIEWS.find((item) => item.targetId === targetId)?.target;
  if (fromReview) return fromReview;
  return { id: targetId, name: "", role: "tatuador", avatarUrl: null, initial: "A" };
}

async function getArtistReviews(artistIdRaw) {
  const artistId = String(artistIdRaw || "").trim();
  if (!artistId) throw httpError(400, "Artista inválido.");
  if (!UUID_RE.test(artistId)) {
    const reviews = mockReviewsForTarget(artistId);
    return { target: mockTarget(artistId), summary: summarize(artistId, reviews), reviews };
  }
  try {
    const [targetRow, rows] = await Promise.all([
      prisma.perfil.findFirst({
        where: {
          id: artistId,
          deleted_at: null,
          statusConta: "ATIVO",
          role: { in: ["tatuador", "estudio"] },
        },
        select: { id: true, nome: true, role: true },
      }),
      prisma.review.findMany({
        where: { target_id: artistId, deleted_at: null },
        select: REVIEW_SELECT,
        orderBy: { created_at: "desc" },
        take: ARTIST_REVIEWS_LIMIT,
      }),
    ]);
    if (!targetRow) throw httpError(404, "Artista não encontrado.");
    const reviews = rows.map(toReviewDto);
    const targetName = displayName(targetRow.nome, "");
    return {
      target: {
        id: targetRow.id,
        name: targetName,
        role: targetRow.role === "estudio" ? "estudio" : "tatuador",
        avatarUrl: null,
        initial: initialFrom(targetName),
      },
      summary: summarize(artistId, reviews),
      reviews,
    };
  } catch (err) {
    if (err.status) throw err;
    const reviews = mockReviewsForTarget(artistId);
    return { target: mockTarget(artistId), summary: summarize(artistId, reviews), reviews };
  }
}

async function getReviewById(reviewIdRaw) {
  const reviewId = String(reviewIdRaw || "").trim();
  if (!reviewId) throw httpError(400, "Avaliação inválida.");
  if (!UUID_RE.test(reviewId)) {
    const mock = PLACEHOLDER_REVIEWS.find((item) => item.id === reviewId);
    if (!mock) throw httpError(404, "Avaliação não encontrada.");
    return mock;
  }
  try {
    const row = await prisma.review.findFirst({
      where: { id: reviewId, deleted_at: null },
      select: REVIEW_SELECT,
    });
    if (!row) throw httpError(404, "Avaliação não encontrada.");
    return toReviewDto(row);
  } catch (err) {
    if (err.status) throw err;
    const mock = PLACEHOLDER_REVIEWS.find((item) => item.id === reviewId);
    if (mock) return mock;
    throw httpError(404, "Avaliação não encontrada.");
  }
}

async function getFeaturedReviews() {
  try {
    const rows = await prisma.review.findMany({
      where: {
        deleted_at: null,
        target: {
          deleted_at: null,
          statusConta: "ATIVO",
          role: { in: ["tatuador", "estudio"] },
        },
      },
      select: REVIEW_SELECT,
      orderBy: [{ is_verified: "desc" }, { rating: "desc" }, { created_at: "desc" }],
      take: FEATURED_LIMIT,
    });
    if (rows.length === 0) {
      return { reviews: PLACEHOLDER_REVIEWS.slice(0, FEATURED_LIMIT) };
    }
    return { reviews: rows.map(toReviewDto) };
  } catch {
    return { reviews: PLACEHOLDER_REVIEWS.slice(0, FEATURED_LIMIT) };
  }
}

module.exports = { replyToReview, getArtistReviews, getReviewById, getFeaturedReviews };
