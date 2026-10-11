const galeriaService = require("../services/galeria.service.cjs");

async function list(req, res) {
  try {
    const filters = galeriaService.parseFilters(req.query || {});
    const items = await galeriaService.listGaleria(filters);
    return res.status(200).json({ sucesso: true, items });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    req.log?.error({ err }, "Falha ao carregar galeria");
    return res.status(500).json({ sucesso: false, erro: "Falha ao carregar a galeria de inspirações." });
  }
}

module.exports = { list };
