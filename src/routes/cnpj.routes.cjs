const { Router } = require("express");
const estudioController = require("../controllers/estudio.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");
const { cnpjLimiter } = require("../middlewares/rate-limit.cjs");

const router = Router();

router.get("/:cnpj", cnpjLimiter, requireAuth, estudioController.consultarCnpj);

module.exports = router;
