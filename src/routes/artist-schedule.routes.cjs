const { Router } = require("express");
const artistScheduleController = require("../controllers/artist-schedule.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");

const router = Router();

router.get("/", requireAuth, artistScheduleController.getMine);
router.post("/", requireAuth, artistScheduleController.upsertMine);
router.put("/", requireAuth, artistScheduleController.upsertMine);
router.get("/weekly", requireAuth, artistScheduleController.weeklyGet);
router.put("/weekly", requireAuth, artistScheduleController.weekly);
router.post("/weekly", requireAuth, artistScheduleController.weekly);
router.get("/availability", requireAuth, artistScheduleController.availability);

module.exports = router;