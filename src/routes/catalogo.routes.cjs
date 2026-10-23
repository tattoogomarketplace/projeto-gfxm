const { Router } = require("express");
const catalogoController = require("../controllers/catalogo.controller.cjs");
const { swarmLimiter } = require("../middlewares/rate-limit.cjs");

const router = Router();
router.use(swarmLimiter);

router.get("/feed", catalogoController.feed);
router.get("/artistas", catalogoController.artistas);
router.get("/artistas/:id", catalogoController.artistVitrine);
router.get("/cidades", catalogoController.cidades);

module.exports = router;
