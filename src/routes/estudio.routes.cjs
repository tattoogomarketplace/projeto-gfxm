const { Router } = require("express");
const estudioController = require("../controllers/estudio.controller.cjs");

const router = Router();

router.post("/validar-cnpj", estudioController.validarCnpj);

module.exports = router;
