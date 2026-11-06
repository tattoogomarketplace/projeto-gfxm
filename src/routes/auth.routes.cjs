const { Router } = require("express");
const authController = require("../controllers/auth.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");
const { authLimiter } = require("../middlewares/rate-limit.cjs");
const { requireTurnstile } = require("../middlewares/turnstile.cjs");

const router = Router();

router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.post("/check-duplicidade", authLimiter, requireTurnstile, authController.checkDuplicidade);
router.post("/aceite-termos", requireAuth, authController.aceiteTermos);
router.post("/turnstile-gate", authLimiter, authController.turnstileGate);
router.post("/verify-reset-credentials", authLimiter, authController.verifyResetCredentials);
router.post(
  "/recovery/validate-document",
  authLimiter,
  requireAuth,
  authController.recoveryValidateDocument
);

module.exports = router;
