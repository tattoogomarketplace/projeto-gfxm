const budgetService = require("../services/budget.service.cjs");

async function estimate(req, res) {
  try {
    const data = await budgetService.estimate(req.query || {});
    return res.status(200).json({ sucesso: true, data });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    req.log?.error({ err }, "Falha ao calcular estimativa de orçamento");
    return res.status(500).json({ sucesso: false, erro: "Falha ao calcular a estimativa." });
  }
}

async function cheaper(req, res) {
  try {
    const artists = await budgetService.cheaper(req.query || {});
    return res.status(200).json({ sucesso: true, artists });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    req.log?.error({ err }, "Falha ao listar artistas mais acessíveis");
    return res.status(500).json({
      sucesso: false,
      erro: "Falha ao listar opções mais acessíveis.",
    });
  }
}

async function createQuote(req, res) {
  try {
    const quoteService = require("../services/quote.service.cjs");
    const result = await quoteService.createBudgetQuoteRequest({
      actorId: req.user.id,
      artistId: req.body?.artistId,
      artworkId: req.body?.artworkId,
      style: req.body?.style,
      estimateRange: req.body?.estimateRange,
      imageUrl: req.body?.imageUrl,
    });
    return res.status(200).json({ sucesso: true, ...result });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    req.log?.error({ err }, "Falha ao criar orçamento via estimativa");
    return res.status(500).json({ sucesso: false, erro: "Falha ao criar orçamento." });
  }
}

module.exports = { estimate, cheaper, createQuote };
