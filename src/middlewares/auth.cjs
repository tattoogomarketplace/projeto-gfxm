const { getUserFromToken, extractBearerToken } = require("../services/supabase-auth.service.cjs");

async function requireAuth(req, res, next) {
  try {
    const token = extractBearerToken(req);
    const user = await getUserFromToken(token);
    if (!user) {
      return res.status(401).json({ sucesso: false, erro: "Não autorizado." });
    }
    req.user = user;
    req.accessToken = token;
    return next();
  } catch {
    return res.status(401).json({ sucesso: false, erro: "Não autorizado." });
  }
}

module.exports = { requireAuth };
