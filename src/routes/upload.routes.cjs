const { Router } = require("express");
const uploadController = require("../controllers/upload.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");
const { requireTurnstile } = require("../middlewares/turnstile.cjs");
const { swarmLimiter } = require("../middlewares/rate-limit.cjs");

const router = Router();

router.post("/presign", swarmLimiter, requireAuth, requireTurnstile, uploadController.presign);

module.exports = router;
