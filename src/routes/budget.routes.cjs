const { Router } = require("express");
const budgetController = require("../controllers/budget.controller.cjs");
const { swarmLimiter } = require("../middlewares/rate-limit.cjs");

const router = Router();
router.use(swarmLimiter);

router.get("/estimate", budgetController.estimate);
router.get("/cheaper", budgetController.cheaper);

module.exports = router;
