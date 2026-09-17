const { Router } = require("express");
const catalogoRoutes = require("./catalogo.routes.cjs");
const authRoutes = require("./auth.routes.cjs");
const chatRoutes = require("./chat.routes.cjs");
const portfolioRoutes = require("./portfolio.routes.cjs");
const pagamentoRoutes = require("./pagamento.routes.cjs");
const agendamentoRoutes = require("./agendamento.routes.cjs");
const estudioRoutes = require("./estudio.routes.cjs");

const router = Router();

router.use("/catalogo", catalogoRoutes);
router.use("/auth", authRoutes);
router.use("/chat", chatRoutes);
router.use("/portfolio", portfolioRoutes);
router.use("/pagamentos", pagamentoRoutes);
router.use("/agendamentos", agendamentoRoutes);
router.use("/estudio", estudioRoutes);

module.exports = router;
