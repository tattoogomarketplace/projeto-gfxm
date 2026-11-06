const { Router } = require("express");
const transactionController = require("../controllers/transaction.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");

const router = Router();

router.post("/mutex/acquire", requireAuth, transactionController.acquireLock);
router.post("/mutex/release", requireAuth, transactionController.releaseLock);
router.get("/mutex", requireAuth, transactionController.checkLock);
router.post("/deposit", requireAuth, transactionController.deposit);
router.post("/refund", requireAuth, transactionController.refund);
router.post("/payout", requireAuth, transactionController.payout);

module.exports = router;
