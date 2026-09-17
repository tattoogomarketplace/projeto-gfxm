const { Router } = require("express");
const estudioController = require("../controllers/estudio.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");
const { authLimiter } = require("../middlewares/rate-limit.cjs");

const router = Router();

router.post("/validar-cnpj", estudioController.validarCnpj);
router.post("/convidar", requireAuth, estudioController.convidarTatuador);
router.post("/aceitar-convite", authLimiter, requireAuth, estudioController.aceitarConvite);

module.exports = router;
