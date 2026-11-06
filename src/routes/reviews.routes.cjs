const { Router } = require("express");
const reviewsController = require("../controllers/reviews.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");
const { swarmLimiter } = require("../middlewares/rate-limit.cjs");

const router = Router();
router.use(swarmLimiter);

router.get("/featured", reviewsController.featured);
router.get("/artist/:id", reviewsController.byArtist);
router.post("/:id/reply", requireAuth, reviewsController.reply);
router.get("/:id", reviewsController.byId);

module.exports = router;
