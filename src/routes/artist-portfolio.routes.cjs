const { Router } = require("express");
const artistPortfolioController = require("../controllers/artist-portfolio.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");
const { authLimiter } = require("../middlewares/rate-limit.cjs");

const router = Router();

router.get("/", requireAuth, artistPortfolioController.getMine);
router.post("/", authLimiter, requireAuth, artistPortfolioController.publishMine);
router.patch("/:id", authLimiter, requireAuth, artistPortfolioController.updateMine);
router.delete("/:id", authLimiter, requireAuth, artistPortfolioController.archiveMine);

module.exports = router;
