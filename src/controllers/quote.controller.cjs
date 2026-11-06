const quoteService = require("../services/quote.service.cjs");

function fail(res, err, fallback) {
  if (err && err.status) {
    return res.status(err.status).json({ sucesso: false, erro: err.message });
  }
  return res.status(500).json({ sucesso: false, erro: fallback });
}

async function create(req, res) {
  try {
    const result = await quoteService.createQuoteRequest({
      actorId: req.user.id,
      artistId: req.body?.artistId,
      bodyPart: req.body?.bodyPart,
      estimatedSize: req.body?.estimatedSize,
    });
    return res.status(200).json({ sucesso: true, ...result });
  } catch (err) {
    return fail(res, err, "Falha ao criar orçamento.");
  }
}

async function pending(req, res) {
  try {
    const quotes = await quoteService.getPendingArtistQuotes({
      actorId: req.user.id,
      actorRole: req.user.role || req.perfil?.role,
    });
    return res.status(200).json({ sucesso: true, quotes });
  } catch (err) {
    return fail(res, err, "Não foi possível carregar os orçamentos.");
  }
}

async function approve(req, res) {
  try {
    const result = await quoteService.approveArtistQuote({
      actorId: req.user.id,
      actorRole: req.user.role || req.perfil?.role,
      quoteId: req.params.id,
      totalValue: req.body?.totalValue,
    });
    return res.status(200).json({ sucesso: true, ...result });
  } catch (err) {
    return fail(res, err, "Não foi possível aprovar o orçamento.");
  }
}

module.exports = { create, pending, approve };
