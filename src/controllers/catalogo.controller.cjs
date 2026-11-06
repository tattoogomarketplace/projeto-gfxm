const catalogoService = require("../services/catalogo.service.cjs");
const geoService = require("../services/geo.service.cjs");

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Pragma: "no-cache",
};

const PUBLIC_CACHE = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

function sendJson(res, status, body, options) {
  const cache = Boolean(options && options.cache) && status === 200;
  return res.status(status).set(cache ? PUBLIC_CACHE : NO_STORE).json(body);
}

function firstQuery(value) {
  if (Array.isArray(value)) return value[0];
  return value;
}

async function feed(req, res) {
  try {
    const media = firstQuery(req.query.media);
    const items = await catalogoService.getFeed(media);
    return sendJson(res, 200, { sucesso: true, items }, { cache: true });
  } catch (err) {
    if (err.status) {
      return sendJson(res, err.status, { sucesso: false, erro: err.message, items: [] });
    }
    return sendJson(res, 500, { sucesso: false, erro: "Falha ao carregar o feed.", items: [] });
  }
}

async function artistas(req, res) {
  try {
    const cidade = typeof req.query.cidade === "string" ? req.query.cidade : "";
    const estado = typeof req.query.estado === "string" ? req.query.estado : "";
    const data = await catalogoService.listArtistas(cidade, estado);
    return sendJson(res, 200, { sucesso: true, data }, { cache: true });
  } catch {
    return sendJson(res, 500, { sucesso: false, erro: "Falha ao listar artistas." });
  }
}

async function cidades(req, res) {
  try {
    const data = await catalogoService.listCidades();
    return sendJson(res, 200, { sucesso: true, data }, { cache: true });
  } catch {
    return sendJson(res, 500, { sucesso: false, erro: "Falha ao listar cidades." });
  }
}

async function artistVitrine(req, res) {
  try {
    const payload = await catalogoService.getArtistVitrine(req.params.id);
    return sendJson(res, 200, { sucesso: true, ...payload }, { cache: true });
  } catch (err) {
    if (err.status) {
      return sendJson(res, err.status, { sucesso: false, erro: err.message });
    }
    return sendJson(res, 500, { sucesso: false, erro: "Falha ao carregar a vitrine do artista." });
  }
}

async function nearby(req, res) {
  try {
    const payload = await geoService.getNearbyArtists(
      firstQuery(req.query.lat ?? req.query.latitude),
      firstQuery(req.query.lng ?? req.query.longitude),
      firstQuery(req.query.radius ?? req.query.radiusKm)
    );
    return sendJson(res, 200, { sucesso: true, ...payload });
  } catch (err) {
    if (err.status) {
      return sendJson(res, err.status, { sucesso: false, erro: err.message });
    }
    return sendJson(res, 500, { sucesso: false, erro: "Falha ao localizar artistas próximos." });
  }
}

module.exports = { feed, artistas, cidades, artistVitrine, nearby };
