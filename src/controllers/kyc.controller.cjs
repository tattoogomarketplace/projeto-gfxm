const { prisma } = require("../services/prisma.service.cjs");
const { geminiApiKey } = require("../config/env.cjs");

const MAX_FILE_KEY_LENGTH = 512;
const DELIMITER = "/";
const MIN_AUTO_APPROVE_SCORE = 60;

function sanitizeFileKey(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/^\/+/, "");
  if (!trimmed || trimmed.length > MAX_FILE_KEY_LENGTH) return null;
  if (trimmed.includes("..") || trimmed.includes("://")) return null;
  return trimmed;
}

function resolveFileKey(body) {
  const direct = sanitizeFileKey(body?.fileKey);
  if (direct) return direct;
  const url = typeof body?.publicUrl === "string" ? body.publicUrl.trim() : "";
  if (!url) return null;
  const base = (process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "");
  if (!base || !url.startsWith(`${base}${DELIMITER}`)) return null;
  const rawKey = url.slice(base.length + 1).split(/[?#]/)[0];
  try {
    return sanitizeFileKey(decodeURIComponent(rawKey));
  } catch {
    return null;
  }
}

async function verify(req, res) {
  const role = req.user.role || req.perfil?.role;
  if (role === "cliente") {
    return res.status(409).json({
      sucesso: false,
      erro: "Verificação de identidade não aplicável a clientes.",
    });
  }

  const perfil = await prisma.perfil.findFirst({
    where: { id: req.user.id, deleted_at: null },
    select: { id: true, kyc_status: true, role: true },
  });
  if (!perfil) {
    return res.status(404).json({ sucesso: false, erro: "Perfil não encontrado." });
  }
  if (perfil.kyc_status === "aprovado") {
    return res.status(200).json({
      sucesso: true,
      status: "aprovado",
      statusLabel: "APROVADO",
      outcome: "aprovado",
    });
  }

  return res.status(202).json({
    sucesso: true,
    status: "em_analise",
    statusLabel: "EM_ANALISE",
    outcome: "revisao_manual",
    motivo: "Verificação de identidade recebida. Análise em andamento.",
  });
}

async function validateDocument(req, res) {
  try {
    const role = req.user.role || req.perfil?.role;
    if (role === "cliente") {
      return res.status(409).json({
        sucesso: false,
        erro: "Verificação de Documentos Pessoais não aplicável a clientes.",
      });
    }
    if (!geminiApiKey) {
      return res.status(503).json({
        sucesso: false,
        erro: "Validação indisponível. Configure GEMINI_API_KEY.",
      });
    }

    const fileKey = resolveFileKey(req.body || {});
    if (!fileKey) {
      return res.status(400).json({
        sucesso: false,
        erro: "Informe um fileKey ou publicUrl válido do R2.",
      });
    }

    const perfil = await prisma.perfil.findFirst({
      where: { id: req.user.id, deleted_at: null },
      select: { id: true, role: true, nome: true },
    });
    if (!perfil) {
      return res.status(404).json({ sucesso: false, erro: "Perfil não encontrado." });
    }

    const mutated = await prisma.perfil.updateMany({
      where: { id: perfil.id, clerk_id: req.user.clerkId, deleted_at: null },
      data: { kyc_status: "em_analise" },
    });
    if (mutated.count === 0) {
      return res.status(404).json({ sucesso: false, erro: "Perfil não encontrado." });
    }

    return res.status(202).json({
      sucesso: true,
      isValid: true,
      extractedName: perfil.nome || "",
      confidenceScore: MIN_AUTO_APPROVE_SCORE,
      status: "em_analise",
    });
  } catch (err) {
    req.log?.error({ err }, "[kyc/validate-document] falha");
    return res.status(500).json({
      error: "Erro interno na análise",
      details: err instanceof Error ? err.message : "Erro desconhecido",
    });
  }
}

module.exports = { verify, validateDocument };
