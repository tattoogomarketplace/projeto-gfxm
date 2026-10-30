const { Router } = require("express");
const pagamentoController = require("../controllers/pagamento.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");
const { requireWebhookSignature } = require("../middlewares/webhook-signature.cjs");

const router = Router();

// Webhook do gateway: público por natureza (o gateway não tem sessão Clerk),
// mas BLINDADO por assinatura HMAC. Requisições sem assinatura válida são
// rejeitadas com 401/403 ANTES de qualquer escrita no banco.
router.post("/webhook-gateway", requireWebhookSignature, pagamentoController.webhookGateway);
router.post("/presencial", requireAuth, pagamentoController.presencial);

module.exports = router;
