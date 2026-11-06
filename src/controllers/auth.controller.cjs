const { timingSafeEqual } = require("crypto");
const { aceitarTermos, verificarDuplicidade } = require("../services/perfil.service.cjs");
const { prisma } = require("../services/prisma.service.cjs");
const { verifyTurnstileToken, resolveClientIp } = require("../middlewares/turnstile.cjs");

async function register(_req, res) {
  return res.status(501).json({
    sucesso: false,
    erro: "Autenticacao migrada para Clerk. Use o fluxo de login da aplicacao.",
  });
}

async function login(_req, res) {
  return res.status(501).json({
    sucesso: false,
    erro: "Autenticacao migrada para Clerk. Use o fluxo de login da aplicacao.",
  });
}

async function checkDuplicidade(req, res) {
  try {
    const { email, cpf } = req.body || {};
    const result = await verificarDuplicidade({ email, cpf });
    return res.status(200).json({ sucesso: true, ...result });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    return res.status(500).json({ sucesso: false, erro: "Falha ao verificar duplicidade." });
  }
}

async function aceiteTermos(req, res) {
  try {
    await aceitarTermos(req.user.id);
    return res.status(200).json({ sucesso: true });
  } catch {
    return res.status(500).json({ sucesso: false, erro: "Falha ao salvar aceite." });
  }
}

const CPF_NOT_REGISTERED_MESSAGE = "Este CPF não está cadastrado em nenhuma conta ativa.";
const TURNSTILE_FORBIDDEN = {
  sucesso: false,
  erro: "Falha na verificação anti-bot. Recarregue a página e tente novamente.",
  codigo: "TURNSTILE_REQUIRED",
};

function onlyCpfDigits(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 11);
}

function isValidCpf(value) {
  const cpf = onlyCpfDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  function mod11(base, factor) {
    let sum = 0;
    for (let i = 0; i < base.length; i += 1) sum += Number(base[i]) * (factor - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  }
  if (mod11(cpf.slice(0, 9), 10) !== Number(cpf[9])) return false;
  return mod11(cpf.slice(0, 10), 11) === Number(cpf[10]);
}

function readCpfFromMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return "";
  return onlyCpfDigits(String(metadata.cpf || ""));
}

function cpfMatches(stored, provided) {
  if (stored.length !== 11 || provided.length !== 11) return false;
  return timingSafeEqual(Buffer.from(stored), Buffer.from(provided));
}

async function turnstileGate(req, res) {
  const token = req.body?.turnstileToken;
  if (typeof token !== "string" || !token.trim()) {
    return res.status(403).json(TURNSTILE_FORBIDDEN);
  }
  const result = await verifyTurnstileToken(token, resolveClientIp(req));
  if (result.configured && !result.success) {
    return res.status(403).json(TURNSTILE_FORBIDDEN);
  }
  return res.status(200).json({ sucesso: true });
}

async function verifyResetCredentials(req, res) {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const cpf = onlyCpfDigits(req.body?.cpf);
  if (!email || !isValidCpf(cpf)) {
    return res.status(400).json({ ok: false, error: CPF_NOT_REGISTERED_MESSAGE });
  }

  try {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      return res.status(500).json({ ok: false, error: "Não foi possível validar as credenciais." });
    }
    const { createClerkClient } = require("@clerk/backend");
    const client = createClerkClient({ secretKey });
    const list = await client.users.getUserList({ emailAddress: [email], limit: 10 });
    const users = Array.isArray(list) ? list : list.data || [];
    if (!users.length) {
      return res.status(404).json({ ok: false, error: CPF_NOT_REGISTERED_MESSAGE });
    }

    for (const user of users) {
      let storedCpf =
        readCpfFromMetadata(user.publicMetadata) ||
        readCpfFromMetadata(user.unsafeMetadata) ||
        readCpfFromMetadata(user.privateMetadata);
      if (storedCpf.length !== 11) {
        const perfil = await prisma.perfil.findFirst({
          where: { deleted_at: null, OR: [{ clerk_id: user.id }, { email }] },
          select: { cpf: true, clerk_id: true, email: true },
        });
        const sameIdentity =
          perfil?.clerk_id === user.id ||
          String(perfil?.email || "").trim().toLowerCase() === email;
        if (sameIdentity) storedCpf = onlyCpfDigits(perfil?.cpf || "");
      }
      if (cpfMatches(storedCpf, cpf)) {
        return res.status(200).json({ ok: true });
      }
    }
    return res.status(404).json({ ok: false, error: CPF_NOT_REGISTERED_MESSAGE });
  } catch (err) {
    req.log?.error({ err }, "[auth/verify-reset-credentials] falha");
    return res.status(500).json({ ok: false, error: "Não foi possível validar as credenciais." });
  }
}

async function recoveryValidateDocument(_req, res) {
  return res.status(202).json({
    success: true,
    valid: true,
    status: "em_analise",
  });
}

module.exports = {
  register,
  login,
  checkDuplicidade,
  aceiteTermos,
  turnstileGate,
  verifyResetCredentials,
  recoveryValidateDocument,
};
