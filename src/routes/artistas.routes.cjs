const { Router } = require("express");
const catalogoController = require("../controllers/catalogo.controller.cjs");
const { swarmLimiter } = require("../middlewares/rate-limit.cjs");
const { getUserFromRequest } = require("../services/clerk-auth.service.cjs");
const { prisma } = require("../services/prisma.service.cjs");

const router = Router();
router.use(swarmLimiter);

async function requireNearbyAuth(req, res, next) {
  try {
    const { token, user } = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ sucesso: false, erro: "Não autenticado." });
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
    return res.status(401).json({ sucesso: false, erro: "Não autenticado." });
  }
}

router.get("/nearby", requireNearbyAuth, catalogoController.nearby);
router.get("/:id", catalogoController.artistVitrine);

module.exports = router;
