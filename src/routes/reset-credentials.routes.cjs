const { Router } = require("express");
const authController = require("../controllers/auth.controller.cjs");
const { authLimiter } = require("../middlewares/rate-limit.cjs");

const router = Router();

router.post("/", authLimiter, authController.verifyResetCredentials);

module.exports = router;
