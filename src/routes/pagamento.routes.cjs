const { Router } = require("express");
const pagamentoController = require("../controllers/pagamento.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");

const router = Router();

router.post("/webhook-gateway", pagamentoController.webhookGateway);
router.post("/presencial", requireAuth, pagamentoController.presencial);

module.exports = router;
