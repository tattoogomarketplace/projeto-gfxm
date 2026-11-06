const { Router } = require("express");
const artistVerifyAiController = require("../controllers/artist-verify-ai.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");
const { authLimiter } = require("../middlewares/rate-limit.cjs");

const router = Router();

router.post("/verify-ai", authLimiter, requireAuth, artistVerifyAiController.verify);

module.exports = router;
