const { Router } = require("express");
const estudioController = require("../controllers/estudio.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");

const router = Router();

router.get("/search", requireAuth, estudioController.buscarEstudios);
router.get("/affiliation", requireAuth, estudioController.listarAfiliacao);
router.post("/affiliation", requireAuth, estudioController.solicitarAfiliacao);
router.patch("/affiliation", requireAuth, estudioController.decidirAfiliacao);
router.post("/register", requireAuth, estudioController.registrarEstudio);
router.post("/validate-cnpj", requireAuth, estudioController.validarCnpj);

module.exports = router;
