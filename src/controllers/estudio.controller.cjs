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

module.exports = { validarCnpj };
