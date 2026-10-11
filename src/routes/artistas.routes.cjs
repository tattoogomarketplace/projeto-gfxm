const { Router } = require("express");
const catalogoController = require("../controllers/catalogo.controller.cjs");

const router = Router();

router.get("/:id", catalogoController.artistVitrine);

module.exports = router;
