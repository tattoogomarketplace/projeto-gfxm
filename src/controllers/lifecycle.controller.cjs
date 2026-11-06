const lifecycleService = require("../services/lifecycle.service.cjs");

function fail(res, err, fallback) {
  if (err && err.status) {
    return res.status(err.status).json({ ok: false, error: err.message });
  }
  return res.status(500).json({ ok: false, error: fallback });
}

async function deactivate(req, res) {
  try {
    const result = await lifecycleService.deactivateAccount({ actor: req.user });
    return res.status(200).json(result);
  } catch (err) {
    return fail(res, err, "Falha ao desativar conta.");
  }
}

async function scheduleDeletion(req, res) {
  try {
    const result = await lifecycleService.scheduleAccountDeletion({ actor: req.user });
    return res.status(200).json(result);
  } catch (err) {
    return fail(res, err, "Falha ao agendar exclusão.");
  }
}

async function reactivate(req, res) {
  try {
    const result = await lifecycleService.reactivateAccount({ actor: req.user });
    return res.status(200).json(result);
  } catch (err) {
    return fail(res, err, "Falha ao reativar conta.");
  }
}

async function migrateRole(req, res) {
  try {
    const result = await lifecycleService.migrateUserRole({
      actor: req.user,
      newRole: req.body?.newRole ?? req.body?.role,
      extraData: req.body?.extraData ?? req.body,
    });
    return res.status(200).json(result);
  } catch (err) {
    return fail(res, err, "Falha ao migrar papel.");
  }
}

async function desativarComClerk(req, res) {
  try {
    const result = await lifecycleService.desativarContaComClerk({ actor: req.user });
    return res.status(202).json(result);
  } catch (err) {
    if (err && err.status) {
      return res.status(err.status).json({ success: false, erro: err.message });
    }
    return res.status(500).json({ success: false, erro: "Falha ao desativar conta." });
  }
}

module.exports = {
  deactivate,
  scheduleDeletion,
  reactivate,
  migrateRole,
  desativarComClerk,
};
