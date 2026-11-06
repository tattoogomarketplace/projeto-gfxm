const { Router } = require("express");
const kycController = require("../controllers/kyc.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");
const { requireTurnstile } = require("../middlewares/turnstile.cjs");
const { authLimiter } = require("../middlewares/rate-limit.cjs");

const router = Router();

router.post("/verify", authLimiter, requireAuth, requireTurnstile, kycController.verify);
router.post(
  "/validate-document",
  authLimiter,
  requireAuth,
  requireTurnstile,
  kycController.validateDocument
);

module.exports = router;
