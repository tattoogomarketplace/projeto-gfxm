const { Router } = require("express");
const galeriaController = require("../controllers/galeria.controller.cjs");
const { swarmLimiter } = require("../middlewares/rate-limit.cjs");

const router = Router();
router.use(swarmLimiter);

router.get("/", galeriaController.list);

module.exports = router;
