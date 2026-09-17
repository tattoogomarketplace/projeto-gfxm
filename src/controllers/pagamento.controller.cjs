const pagamentoService = require("../services/pagamento.service.cjs");

async function webhookGateway(req, res) {
  try {
    const result = await pagamentoService.processarWebhookGateway(req.body);
    return res.status(200).json(result);
  } catch (err) {
    req.log.error({ err }, "Erro no Webhook Financeiro");
    return res.status(500).json({ sucesso: false, erro: "Erro no processamento do webhook." });
  }
}

async function presencial(req, res) {
  try {
    const { agendamento_id } = req.body;
    const result = await pagamentoService.registrarPagamentoPresencial({
      agendamentoId: agendamento_id,
      userId: req.user.id,
    });
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        sucesso: false,
        bloqueado: err.bloqueado || undefined,
        erro: err.message,
      });
    }
    return res.status(500).json({ sucesso: false, erro: "Falha ao registrar pagamento presencial." });
  }
}

module.exports = { webhookGateway, presencial };
