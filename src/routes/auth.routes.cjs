const { Router } = require("express");
const authController = require("../controllers/auth.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");
const { authLimiter } = require("../middlewares/rate-limit.cjs");

const router = Router();

router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.post("/aceite-termos", requireAuth, authController.aceiteTermos);

module.exports = router;
