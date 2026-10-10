const flashNotesService = require("../services/flash-notes.service.cjs");

async function listar(req, res) {
  try {
    const mine = req.query.mine === "1" || req.query.mine === "true";
    const notes = await flashNotesService.listActiveFlashNotes(mine ? req.user.id : undefined);
    return res.status(200).json({ sucesso: true, actorId: req.user.id, notes });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    req.log?.error({ err }, "Erro ao listar Flash Notes");
    return res.status(500).json({ sucesso: false, erro: "Falha ao listar Flash Notes." });
  }
}

async function criar(req, res) {
  try {
    const note = await flashNotesService.createFlashNote({
      actorId: req.user.id,
      actorRole: req.user.role || req.perfil?.role,
      content: req.body?.content,
      expiresAt: req.body?.expiresAt ?? req.body?.expires_at,
      backgroundId: req.body?.backgroundId,
      fontClass: req.body?.fontClass,
      alignClass: req.body?.alignClass,
    });
    return res.status(201).json({ sucesso: true, actorId: req.user.id, note });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    req.log?.error({ err }, "Erro ao criar Flash Note");
    return res.status(500).json({ sucesso: false, erro: "Falha ao criar Flash Note." });
  }
}

async function atualizar(req, res) {
  try {
    const note = await flashNotesService.updateFlashNote({
      actorId: req.user.id,
      noteId: req.params.id,
      content: req.body?.content,
      backgroundId: req.body?.backgroundId,
      fontClass: req.body?.fontClass,
      alignClass: req.body?.alignClass,
    });
    return res.status(200).json({ sucesso: true, actorId: req.user.id, note });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    req.log?.error({ err }, "Erro ao atualizar Flash Note");
    return res.status(500).json({ sucesso: false, erro: "Falha ao atualizar Flash Note." });
  }
}

module.exports = { listar, criar, atualizar };
