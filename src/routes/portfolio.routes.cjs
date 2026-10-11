const { Router } = require("express");
const portfolioController = require("../controllers/portfolio.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");

const router = Router();

router.post("/upload-validado", requireAuth, portfolioController.uploadValidado);
router.post("/like/:id", requireAuth, portfolioController.like);

module.exports = router;
