const { Router } = require("express");
const reviewsController = require("../controllers/reviews.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");

const router = Router();

router.post("/:id/reply", requireAuth, reviewsController.reply);

module.exports = router;
