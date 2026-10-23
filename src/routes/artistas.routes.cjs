const { Router } = require("express");
const catalogoController = require("../controllers/catalogo.controller.cjs");
const { swarmLimiter } = require("../middlewares/rate-limit.cjs");

const router = Router();
router.use(swarmLimiter);

router.get("/:id", catalogoController.artistVitrine);

module.exports = router;
