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

module.exports = { replyToReview };
