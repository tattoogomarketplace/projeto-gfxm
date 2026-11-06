const reviewsService = require("../services/reviews.service.cjs");

function fail(res, err, fallback) {
  if (err && err.status) {
    return res.status(err.status).json({ sucesso: false, erro: err.message });
  }
  return res.status(500).json({ sucesso: false, erro: fallback });
}

async function reply(req, res) {
  try {
    const item = await reviewsService.replyToReview({
      actorId: req.user.id,
      actorRole: req.user.role || req.perfil?.role,
      reviewId: req.params.id,
      replyRaw: req.body?.reply ?? req.body?.artistReply,
    });
    return res.status(200).json({ sucesso: true, item });
  } catch (err) {
    return fail(res, err, "Falha ao responder a avaliação.");
  }
}

async function featured(_req, res) {
  try {
    const payload = await reviewsService.getFeaturedReviews();
    return res.status(200).json({ sucesso: true, ...payload });
  } catch (err) {
    return fail(res, err, "Falha ao carregar as avaliações em destaque.");
  }
}

async function byArtist(req, res) {
  try {
    const payload = await reviewsService.getArtistReviews(req.params.id);
    return res.status(200).json({ sucesso: true, ...payload });
  } catch (err) {
    return fail(res, err, "Falha ao carregar as avaliações do artista.");
  }
}

async function byId(req, res) {
  try {
    const review = await reviewsService.getReviewById(req.params.id);
    return res.status(200).json({ sucesso: true, review });
  } catch (err) {
    return fail(res, err, "Falha ao carregar a avaliação.");
  }
}

module.exports = { reply, featured, byArtist, byId };
