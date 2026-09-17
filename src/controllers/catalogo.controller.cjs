const catalogoService = require("../services/catalogo.service.cjs");

async function feed(req, res) {
  try {
    const data = await catalogoService.getFeed();
    return res.status(200).json({ sucesso: true, data });
  } catch {
    return res.status(500).json({ sucesso: false, erro: "Falha ao carregar o feed." });
  }
}

async function artistas(req, res) {
  try {
    const cidade = typeof req.query.cidade === "string" ? req.query.cidade : "";
    const estado = typeof req.query.estado === "string" ? req.query.estado : "";
    const data = await catalogoService.listArtistas(cidade, estado);
    return res.status(200).json({ sucesso: true, data });
  } catch {
    return res.status(500).json({ sucesso: false, erro: "Falha ao listar artistas." });
  }
}

async function cidades(req, res) {
  try {
    const data = await catalogoService.listCidades();
    return res.status(200).json({ sucesso: true, data });
  } catch {
    return res.status(500).json({ sucesso: false, erro: "Falha ao listar cidades." });
  }
}

module.exports = { feed, artistas, cidades };
