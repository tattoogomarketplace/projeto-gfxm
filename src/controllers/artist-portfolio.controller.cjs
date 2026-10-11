const artistPortfolioService = require("../services/artist-portfolio.service.cjs");

async function getMine(req, res) {
  try {
    const tatuadorId = artistPortfolioService.assertTatuadorRole(req.user, req.perfil);
    const items = await artistPortfolioService.listMine(tatuadorId);
    return res.status(200).json({ sucesso: true, items });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    req.log?.error({ err }, "Falha ao carregar portfólio");
    return res.status(500).json({ sucesso: false, erro: "Falha ao carregar o portfólio." });
  }
}

async function publishMine(req, res) {
  try {
    const tatuadorId = artistPortfolioService.assertTatuadorRole(req.user, req.perfil);
    const item = await artistPortfolioService.publishMine(tatuadorId, req.body);
    return res.status(201).json({ sucesso: true, item });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    req.log?.error({ err }, "Falha ao publicar portfólio");
    return res.status(500).json({ sucesso: false, erro: "Falha ao publicar o portfólio." });
  }
}

async function updateMine(req, res) {
  try {
    const tatuadorId = artistPortfolioService.assertTatuadorRole(req.user, req.perfil);
    const item = await artistPortfolioService.updateMine(tatuadorId, req.params.id, req.body);
    return res.status(200).json({ sucesso: true, item });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    req.log?.error({ err }, "Falha ao atualizar portfólio");
    return res.status(500).json({ sucesso: false, erro: "Falha ao atualizar o portfólio." });
  }
}

async function archiveMine(req, res) {
  try {
    const tatuadorId = artistPortfolioService.assertTatuadorRole(req.user, req.perfil);
    await artistPortfolioService.archiveMine(tatuadorId, req.params.id);
    return res.status(200).json({ sucesso: true });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    req.log?.error({ err }, "Falha ao arquivar portfólio");
    return res.status(500).json({ sucesso: false, erro: "Falha ao arquivar o portfólio." });
  }
}

module.exports = { getMine, publishMine, updateMine, archiveMine };
