const { Router } = require("express");
const quoteController = require("../controllers/quote.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");

const router = Router();

router.post("/", requireAuth, quoteController.create);
router.get("/pending", requireAuth, quoteController.pending);
router.post("/:id/approve", requireAuth, quoteController.approve);

module.exports = router;
