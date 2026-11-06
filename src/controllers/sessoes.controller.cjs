const sessoesService = require("../services/sessoes.service.cjs");

async function listar(req, res) {
  try {
    const payload = await sessoesService.getUserSessions(req.user.id);
    return res.status(200).json({ sucesso: true, userId: payload.userId, sessions: payload.sessions });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    return res.status(500).json({ sucesso: false, erro: "Falha ao carregar agenda." });
  }
}

module.exports = { listar };
