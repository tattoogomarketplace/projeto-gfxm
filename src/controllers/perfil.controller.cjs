const { obterPerfil, desativarConta } = require("../services/perfil.service.cjs");
const lifecycleService = require("../services/lifecycle.service.cjs");
const ensurePerfilService = require("../services/ensure-perfil.service.cjs");

async function me(req, res) {
  try {
    const perfil = await obterPerfil(req.user.id);
    return res.status(200).json({ sucesso: true, perfil });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    return res.status(500).json({ sucesso: false, erro: "Falha ao carregar perfil." });
  }
}

async function desativar(req, res) {
  try {
    const result = await desativarConta(req.user.id);
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    return res.status(500).json({ sucesso: false, erro: "Falha ao desativar conta." });
  }
}

async function desativarComClerk(req, res) {
  try {
    const result = await lifecycleService.desativarContaComClerk({ actor: req.user });
    return res.status(202).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, erro: err.message });
    }
    return res.status(500).json({ success: false, erro: "Falha ao desativar conta." });
  }
}

async function ensure(req, res) {
  try {
    const perfil = await ensurePerfilService.ensurePerfilForClerkIdentity({
      clerkId: req.user.clerkId,
      emailHint: req.body?.email ?? req.user.email,
      nomeHint: req.body?.nome,
      roleHint: req.body?.role ?? req.user.role,
    });
    if (!perfil) {
      return res.status(422).json({ sucesso: false, erro: "Perfil não persistido." });
    }
    return res.status(200).json({
      sucesso: true,
      reactivated: false,
      needsOnboarding: !perfil.has_seen_welcome_notice,
      onboarding_completed: Boolean(perfil.has_seen_welcome_notice),
      perfil,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    return res.status(500).json({ sucesso: false, erro: "Falha ao garantir perfil." });
  }
}

async function onboarding(req, res) {
  try {
    const perfil = await ensurePerfilService.ensurePerfilForClerkIdentity({
      clerkId: req.user.clerkId,
      emailHint: req.body?.email ?? req.user.email,
      nomeHint: req.body?.nome,
      roleHint: req.body?.role ?? req.user.role,
    });
    if (!perfil) {
      return res.status(422).json({ sucesso: false, erro: "Perfil não persistido." });
    }
    const { prisma } = require("../services/prisma.service.cjs");
    await prisma.perfil.updateMany({
      where: { id: perfil.id, clerk_id: req.user.clerkId, deleted_at: null },
      data: { has_seen_welcome_notice: true },
    });
    const updated = await prisma.perfil.findFirst({
      where: { id: perfil.id },
      select: {
        id: true,
        email: true,
        role: true,
        deleted_at: true,
        has_seen_welcome_notice: true,
        nome: true,
        username: true,
        kyc_status: true,
      },
    });
    return res.status(200).json({
      sucesso: true,
      reactivated: false,
      needsOnboarding: false,
      onboarding_completed: true,
      perfil: updated || perfil,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    return res.status(500).json({ sucesso: false, erro: "Falha ao concluir onboarding." });
  }
}

module.exports = { me, desativar, desativarComClerk, ensure, onboarding };
