const { Router } = require("express");
const budgetController = require("../controllers/budget.controller.cjs");

const router = Router();

router.get("/estimate", budgetController.estimate);
router.get("/cheaper", budgetController.cheaper);

module.exports = router;
