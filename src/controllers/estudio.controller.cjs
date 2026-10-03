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

async function buscarEstudios(req, res) {
  try {
    if (req.user.role !== "tatuador") {
      return res.status(403).json({ sucesso: false, erro: "Apenas tatuadores podem buscar estúdios." });
    }
    const studios = await estudioService.buscarEstudiosVerificados(req.query.q);
    return res.status(200).json({ sucesso: true, studios });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    req.log.error({ err }, "Erro ao buscar estudios");
    return res.status(500).json({ sucesso: false, erro: "Falha ao buscar estúdios." });
  }
}

async function listarAfiliacao(req, res) {
  try {
    const result = await estudioService.listarAfiliacao({ user: req.user });
    return res.status(200).json({ sucesso: true, ...result });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    req.log.error({ err }, "Erro ao listar afiliacao");
    return res.status(500).json({ sucesso: false, erro: "Falha ao carregar afiliação." });
  }
}

async function solicitarAfiliacao(req, res) {
  try {
    if (req.user.role !== "tatuador") {
      return res.status(403).json({
        sucesso: false,
        erro: "Apenas tatuadores independentes podem solicitar afiliação.",
      });
    }
    const result = await estudioService.solicitarAfiliacao({
      tatuadorUser: req.user,
      estudioId: req.body.estudio_id,
    });
    return res.status(result.reused ? 200 : 201).json({ sucesso: true, ...result });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    req.log.error({ err }, "Erro ao solicitar afiliacao");
    return res.status(500).json({ sucesso: false, erro: "Falha ao solicitar afiliação." });
  }
}

async function decidirAfiliacao(req, res) {
  try {
    const result = await estudioService.decidirAfiliacao({
      user: req.user,
      conviteId: req.body.convite_id,
      action: req.body.action,
    });
    return res.status(200).json({ sucesso: true, ...result });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    req.log.error({ err }, "Erro ao decidir afiliacao");
    return res.status(500).json({ sucesso: false, erro: "Falha ao atualizar o pedido." });
  }
}

module.exports = {
  validarCnpj,
  convidarTatuador,
  aceitarConvite,
  buscarEstudios,
  listarAfiliacao,
  solicitarAfiliacao,
  decidirAfiliacao,
};
