const searchService = require("../services/search.service.cjs");

async function search(req, res) {
  try {
    const q = req.query.q ?? "";
    if (!searchService.isValidUsernameSearchQuery(q)) {
      return res.status(400).json({ sucesso: false, erro: "Consulta inválida." });
    }
    const usuarios = await searchService.searchUsuarios({ actorId: req.user.id, q });
    return res.status(200).json({ sucesso: true, usuarios });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    return res.status(500).json({ sucesso: false, erro: "Falha ao buscar usuários." });
  }
}

module.exports = { search };
