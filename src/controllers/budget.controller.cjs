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

module.exports = { estimate, cheaper };
