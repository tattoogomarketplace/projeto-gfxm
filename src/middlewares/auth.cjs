const { getUserFromToken, extractBearerToken } = require("../services/supabase-auth.service.cjs");
const { prisma } = require("../services/prisma.service.cjs");

async function requireAuth(req, res, next) {
  try {
    const token = extractBearerToken(req);
    const user = await getUserFromToken(token);
    if (!user) {
      return res.status(401).json({ sucesso: false, erro: "Não autorizado." });
    }

    const perfil = await prisma.perfil.findUnique({
      where: { id: user.id },
      select: { deleted_at: true, role: true },
    });
    if (perfil?.deleted_at) {
      return res.status(403).json({ sucesso: false, erro: "Conta desativada." });
    }

    req.user = user;
    req.perfil = perfil;
    req.accessToken = token;
    return next();
  } catch {
    return res.status(401).json({ sucesso: false, erro: "Não autorizado." });
  }
}

module.exports = { requireAuth };
