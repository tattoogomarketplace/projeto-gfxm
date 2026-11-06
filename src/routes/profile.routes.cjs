const { Router } = require("express");
const profileController = require("../controllers/profile.controller.cjs");
const { swarmLimiter } = require("../middlewares/rate-limit.cjs");

const router = Router();
router.use(swarmLimiter);

router.get("/:username", profileController.publicByUsername);

module.exports = router;
