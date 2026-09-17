const { Router } = require("express");
const agendamentoController = require("../controllers/agendamento.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");
const { authLimiter } = require("../middlewares/rate-limit.cjs");

const router = Router();

router.post("/", requireAuth, agendamentoController.criar);
router.post("/cancelar-solicitacao", authLimiter, requireAuth, agendamentoController.cancelarSolicitacao);
router.post("/cancelar-executar", authLimiter, requireAuth, agendamentoController.cancelarExecutar);

module.exports = router;
