const { signUp, signInWithPassword } = require("../services/supabase-auth.service.cjs");
const { aceitarTermos } = require("../services/perfil.service.cjs");

async function register(req, res) {
  try {
    const { email, password, role, full_name, nome, accepted_terms } = req.body;
    const { data, error } = await signUp({
      email,
      password,
      role,
      full_name: full_name || nome,
      accepted_terms: Boolean(accepted_terms),
    });
    if (error) {
      console.error("[TattooGo] signup falhou", {
        status: error.status,
        code: error.code,
        message: error.message,
      });
      return res.status(error.status === 500 ? 500 : 400).json({ sucesso: false, erro: error.message });
    }
    return res.status(200).json({ sucesso: true, user: data.user });
  } catch (err) {
    console.error("[TattooGo] signup exception", err);
    return res.status(500).json({ sucesso: false, erro: "Erro interno no registro." });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const { data, error } = await signInWithPassword({ email, password });
    if (error) return res.status(401).json({ sucesso: false, erro: "Credenciais inválidas." });
    return res.status(200).json({ sucesso: true, session: data.session });
  } catch {
    return res.status(500).json({ sucesso: false, erro: "Erro interno no login." });
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

module.exports = { register, login, aceiteTermos };
