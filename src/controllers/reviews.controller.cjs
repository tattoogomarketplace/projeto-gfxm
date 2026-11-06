const reviewsService = require("../services/reviews.service.cjs");

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
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    return res.status(500).json({ sucesso: false, erro: "Falha ao responder a avaliação." });
  }
}

module.exports = { reply };
