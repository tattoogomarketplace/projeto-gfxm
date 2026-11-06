const { Router } = require("express");
const perfilController = require("../controllers/perfil.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");

const router = Router();

router.get("/me", requireAuth, perfilController.me);
router.post("/desativar", requireAuth, perfilController.desativarComClerk);
router.post("/ensure", requireAuth, perfilController.ensure);
router.post("/onboarding", requireAuth, perfilController.onboarding);

module.exports = router;
