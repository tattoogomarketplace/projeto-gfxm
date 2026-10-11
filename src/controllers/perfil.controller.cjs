const { obterPerfil, desativarConta } = require("../services/perfil.service.cjs");

async function me(req, res) {
  try {
    const perfil = await obterPerfil(req.user.id);
    return res.status(200).json({ sucesso: true, perfil });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    return res.status(500).json({ sucesso: false, erro: "Falha ao carregar perfil." });
  }
}

async function desativar(req, res) {
  try {
    const result = await desativarConta(req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    return res.status(500).json({ sucesso: false, erro: "Falha ao desativar conta." });
  }
}

module.exports = { me, desativar };
