const galeriaService = require("../services/galeria.service.cjs");

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Pragma: "no-cache",
};

const PUBLIC_CACHE = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

async function list(req, res) {
  try {
    const filters = galeriaService.parseFilters(req.query || {});
    const items = await galeriaService.listGaleria(filters);
    return res.status(200).set(PUBLIC_CACHE).json({ sucesso: true, items });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).set(NO_STORE).json({ sucesso: false, erro: err.message });
    }
    req.log?.error({ err }, "Falha ao carregar galeria");
    return res.status(500).set(NO_STORE).json({ sucesso: false, erro: "Falha ao carregar a galeria de inspirações." });
  }
}

module.exports = { list };
