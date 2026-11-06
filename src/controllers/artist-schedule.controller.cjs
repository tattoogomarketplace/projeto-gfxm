const {
  assertTatuadorRole,
  getSchedule,
  upsertSchedule,
  updateWeeklySchedule,
  getArtistAvailability,
} = require("../services/artist-schedule.service.cjs");

async function getMine(req, res) {
  try {
    const tatuadorId = assertTatuadorRole(req.user, req.perfil);
    const result = await getSchedule(tatuadorId);
    return res.status(200).json({ sucesso: true, ...result });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    req.log?.error({ err }, "Falha ao carregar expediente");
    return res.status(500).json({ sucesso: false, erro: "Falha ao carregar expediente." });
  }
}

async function upsertMine(req, res) {
  try {
    const tatuadorId = assertTatuadorRole(req.user, req.perfil);
    const raw = req.body?.schedule ?? req.body?.scheduleJson;
    const result = await upsertSchedule(tatuadorId, raw);
    return res.status(200).json({ sucesso: true, ...result });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    req.log?.error({ err }, "Falha ao salvar expediente");
    return res.status(500).json({ sucesso: false, erro: "Falha ao salvar expediente." });
  }
}

async function weekly(req, res) {
  try {
    const tatuadorId = assertTatuadorRole(req.user, req.perfil);
    const data = await updateWeeklySchedule(tatuadorId, req.body || {});
    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    req.log?.error({ err }, "Falha ao salvar expediente semanal");
    return res.status(500).json({ success: false, error: "Falha ao processar o expediente." });
  }
}

async function weeklyGet(req, res) {
  try {
    const tatuadorId = assertTatuadorRole(req.user, req.perfil);
    const result = await getSchedule(tatuadorId);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    return res.status(500).json({ success: false, error: "Falha ao carregar o expediente." });
  }
}

async function availability(req, res) {
  try {
    const artistId = req.query.artistId ?? req.body?.artistId;
    const date = req.query.date ?? req.body?.date;
    const data = await getArtistAvailability(artistId, date);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    return res.status(500).json({ success: false, error: "Falha ao consultar disponibilidade." });
  }
}

module.exports = { getMine, upsertMine, weekly, weeklyGet, availability };
