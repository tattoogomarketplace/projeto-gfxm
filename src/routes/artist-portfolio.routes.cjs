const { Router } = require("express");
const artistPortfolioController = require("../controllers/artist-portfolio.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");

const router = Router();

router.get("/", requireAuth, artistPortfolioController.getMine);
router.post("/", requireAuth, artistPortfolioController.publishMine);

module.exports = router;
