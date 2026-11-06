const { Router } = require("express");
const budgetController = require("../controllers/budget.controller.cjs");
const { swarmLimiter } = require("../middlewares/rate-limit.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");

const router = Router();
router.use(swarmLimiter);

router.get("/estimate", budgetController.estimate);
router.get("/cheaper", budgetController.cheaper);
router.post("/quote", requireAuth, budgetController.createQuote);

module.exports = router;
