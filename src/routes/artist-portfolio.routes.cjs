const { Router } = require("express");
const artistPortfolioController = require("../controllers/artist-portfolio.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");

const router = Router();

router.get("/", requireAuth, artistPortfolioController.getMine);
router.post("/", requireAuth, artistPortfolioController.publishMine);
router.patch("/:id", requireAuth, artistPortfolioController.updateMine);
router.delete("/:id", requireAuth, artistPortfolioController.archiveMine);

module.exports = router;
