const agendamentoService = require("../services/agendamento.service.cjs");

async function cancelarSolicitacao(req, res) {
  try {
    const { agendamento_id } = req.body;
    if (!req.user.email) {
      return res.status(401).json({ sucesso: false, erro: "Não autorizado." });
    }
    const result = await agendamentoService.solicitarCancelamento({
      agendamentoId: agendamento_id,
      user: req.user,
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
    return res.status(500).json({ sucesso: false, erro: "Erro interno." });
  }
}

async function cancelarExecutar(req, res) {
  try {
    const { agendamento_id, otp } = req.body;
    if (!otp || typeof otp !== "string") {
      return res.status(400).json({ sucesso: false, erro: "Código OTP obrigatório." });
    }
    if (!req.user.email) {
      return res.status(401).json({ sucesso: false, erro: "Não autorizado." });
    }
    const result = await agendamentoService.executarCancelamento({
      agendamentoId: agendamento_id,
      otp,
      user: req.user,
    });
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    return res.status(500).json({ sucesso: false, erro: "Falha ao efetivar cancelamento." });
  }
}

module.exports = { cancelarSolicitacao, cancelarExecutar };
