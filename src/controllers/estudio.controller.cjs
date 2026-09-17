const estudioService = require("../services/estudio.service.cjs");

async function validarCnpj(req, res) {
  const { cnpj, userId } = req.body;
  try {
    const result = await estudioService.validarCnpj({ cnpj, userId });
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    req.log.error({ err }, "Erro na API ReceitaWS");
    return res.status(500).json({ sucesso: false, erro: "Falha na conexão com o serviço de validação." });
  }
}

async function convidarTatuador(req, res) {
  try {
    const { tatuador_id } = req.body;
    const result = await estudioService.convidarTatuador({
      estudioUser: req.user,
      tatuadorId: tatuador_id,
    });
    return res.status(201).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    req.log.error({ err }, "Erro ao enviar convite de estudio");
    return res.status(500).json({ sucesso: false, erro: "Falha ao enviar convite." });
  }
}

async function aceitarConvite(req, res) {
  try {
    const { convite_id, otp } = req.body;
    if (!req.user.email) {
      return res.status(401).json({ sucesso: false, erro: "Não autorizado." });
    }
    const result = await estudioService.aceitarConvite({
      tatuadorUser: req.user,
      conviteId: convite_id,
      otp,
    });
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    req.log.error({ err }, "Erro ao aceitar convite de estudio");
    return res.status(500).json({ sucesso: false, erro: "Falha ao aceitar convite." });
  }
}

module.exports = { validarCnpj, convidarTatuador, aceitarConvite };
