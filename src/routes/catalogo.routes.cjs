const { Router } = require("express");
const catalogoController = require("../controllers/catalogo.controller.cjs");

const router = Router();

router.get("/feed", catalogoController.feed);
router.get("/artistas", catalogoController.artistas);
router.get("/cidades", catalogoController.cidades);

module.exports = router;
