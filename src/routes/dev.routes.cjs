const { Router } = require("express");
const seedController = require("../controllers/seed.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");
const { swarmLimiter } = require("../middlewares/rate-limit.cjs");

const router = Router();

router.get("/seed", swarmLimiter, requireAuth, seedController.seed);

module.exports = router;
