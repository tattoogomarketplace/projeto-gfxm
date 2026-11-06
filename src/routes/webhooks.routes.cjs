const { Router } = require("express");
const webhooksController = require("../controllers/webhooks.controller.cjs");
const { requireSvixHeaders } = require("../middlewares/svix-webhook.cjs");

const router = Router();

router.post("/clerk", requireSvixHeaders, webhooksController.clerk);

module.exports = router;
