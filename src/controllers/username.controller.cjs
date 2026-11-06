const usernameService = require("../services/username.service.cjs");

const INVALID_MESSAGES = {
  empty: "Informe um @username.",
  too_short: "O @username precisa ter ao menos 3 caracteres.",
  too_long: "O @username pode ter no maximo 20 caracteres.",
  invalid_chars: "O @username aceita apenas letras minusculas, numeros e underline.",
  reserved: "Este @username e reservado.",
};

function formatUnlockDate(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(date));
}

async function check(req, res) {
  try {
    const username = req.query.username ?? req.body?.username;
    const result = await usernameService.checkAvailability({
      actorId: req.user.id,
      username,
    });
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    return res.status(500).json({ sucesso: false, erro: "Falha ao verificar @username." });
  }
}

async function claim(req, res) {
  try {
    const result = await usernameService.claimUsername({
      actorId: req.user.id,
      username: req.body?.username,
    });
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      const payload = { sucesso: false, erro: err.message, reason: err.reason };
      if (err.nextChangeAt) payload.nextChangeAt = err.nextChangeAt;
      if (err.reason === "invalid") {
        payload.erro = INVALID_MESSAGES[err.reason] || err.message;
      }
      return res.status(err.status).json(payload);
    }
    return res.status(500).json({ sucesso: false, erro: "Falha ao salvar o @username." });
  }
}

async function updateAction(req, res) {
  try {
    const result = await usernameService.changeUsername(req.user.id, req.body?.username);
    switch (result.status) {
      case "ok":
        return res.status(200).json({
          ok: true,
          username: result.username,
          lastUsernameChange: result.lastUsernameChange.toISOString(),
          unchanged: false,
        });
      case "unchanged":
        return res.status(200).json({
          ok: true,
          username: result.username,
          lastUsernameChange: (result.lastUsernameChange ?? new Date()).toISOString(),
          unchanged: true,
        });
      case "not_found":
        return res.status(404).json({ ok: false, reason: "not_found", error: "Perfil nao encontrado." });
      case "forbidden":
        return res.status(403).json({
          ok: false,
          reason: "forbidden",
          error: "Estudios nao podem definir um @username.",
        });
      case "invalid":
        return res.status(400).json({
          ok: false,
          reason: "invalid",
          error: INVALID_MESSAGES[result.reason] || "Username inválido.",
        });
      case "taken":
        return res.status(409).json({
          ok: false,
          reason: "taken",
          error: "Este @username ja esta em uso.",
        });
      case "locked":
        return res.status(423).json({
          ok: false,
          reason: "locked",
          error: `A troca de @username esta bloqueada por 30 dias. Voce podera altera-lo novamente em ${formatUnlockDate(result.nextChangeAt)}.`,
          nextChangeAt: result.nextChangeAt.toISOString(),
        });
      default:
        return res.status(500).json({ ok: false, reason: "error", error: "Falha ao salvar o @username." });
    }
  } catch {
    return res.status(500).json({ ok: false, reason: "error", error: "Falha ao salvar o @username." });
  }
}

async function getLanguage(req, res) {
  try {
    const result = await usernameService.getLanguage(req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    return res.status(500).json({ sucesso: false, erro: "Falha ao carregar o idioma." });
  }
}

async function setLanguage(req, res) {
  try {
    const language = req.body?.language ?? req.body?.locale;
    const result = await usernameService.setLanguage(req.user.id, language);
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      const payload = { sucesso: false, erro: err.message };
      if (err.allowed) payload.allowed = err.allowed;
      return res.status(err.status).json(payload);
    }
    return res.status(500).json({ sucesso: false, erro: "Falha ao sincronizar o idioma." });
  }
}

module.exports = { check, claim, updateAction, getLanguage, setLanguage };
