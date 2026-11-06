const { Router } = require("express");
const usernameController = require("../controllers/username.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");
const { authLimiter } = require("../middlewares/rate-limit.cjs");

const router = Router();

router.get("/username", requireAuth, usernameController.check);
router.post("/username", authLimiter, requireAuth, usernameController.claim);
router.put("/username", authLimiter, requireAuth, usernameController.claim);
router.post("/username/action", authLimiter, requireAuth, usernameController.updateAction);

router.get("/language", requireAuth, usernameController.getLanguage);
router.post("/language", requireAuth, usernameController.setLanguage);
router.put("/language", requireAuth, usernameController.setLanguage);

module.exports = router;
