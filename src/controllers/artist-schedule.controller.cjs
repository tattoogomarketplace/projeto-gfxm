const {
  assertTatuadorRole,
  getSchedule,
  upsertSchedule,
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

module.exports = { getMine, upsertMine };
