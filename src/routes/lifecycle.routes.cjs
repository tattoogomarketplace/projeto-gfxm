const { Router } = require("express");
const lifecycleController = require("../controllers/lifecycle.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");
const { authLimiter } = require("../middlewares/rate-limit.cjs");

const router = Router();

router.post("/deactivate", authLimiter, requireAuth, lifecycleController.deactivate);
router.post("/schedule-deletion", authLimiter, requireAuth, lifecycleController.scheduleDeletion);
router.post("/reactivate", authLimiter, requireAuth, lifecycleController.reactivate);
router.post("/migrate-role", authLimiter, requireAuth, lifecycleController.migrateRole);
router.post("/desativar", authLimiter, requireAuth, lifecycleController.desativarComClerk);

module.exports = router;
