const { aceitarTermos, verificarDuplicidade } = require("../services/perfil.service.cjs");

async function register(_req, res) {
  return res.status(501).json({
    sucesso: false,
    erro: "Fase 1: autenticacao Supabase desativada. Clerk entra na Fase 2.",
  });
}

async function login(_req, res) {
  return res.status(501).json({
    sucesso: false,
    erro: "Fase 1: autenticacao Supabase desativada. Clerk entra na Fase 2.",
  });
}

async function checkDuplicidade(req, res) {
  try {
    const { email, cpf } = req.body || {};
    const result = await verificarDuplicidade({ email, cpf });
    return res.status(200).json({ sucesso: true, ...result });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    return res.status(500).json({ sucesso: false, erro: "Falha ao verificar duplicidade." });
  }
}

async function aceiteTermos(req, res) {
  try {
    await aceitarTermos(req.user.id);
    return res.status(200).json({ sucesso: true });
  } catch {
    return res.status(500).json({ sucesso: false, erro: "Falha ao salvar aceite." });
  }
}

module.exports = { register, login, checkDuplicidade, aceiteTermos };
