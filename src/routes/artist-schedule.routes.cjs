const { Router } = require("express");
const artistScheduleController = require("../controllers/artist-schedule.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");
const { authLimiter } = require("../middlewares/rate-limit.cjs");

const router = Router();

router.get("/", requireAuth, artistScheduleController.getMine);
router.post("/", authLimiter, requireAuth, artistScheduleController.upsertMine);
router.put("/", authLimiter, requireAuth, artistScheduleController.upsertMine);
router.get("/weekly", requireAuth, artistScheduleController.weeklyGet);
router.put("/weekly", authLimiter, requireAuth, artistScheduleController.weekly);
router.post("/weekly", authLimiter, requireAuth, artistScheduleController.weekly);
router.get("/availability", requireAuth, artistScheduleController.availability);

module.exports = router;