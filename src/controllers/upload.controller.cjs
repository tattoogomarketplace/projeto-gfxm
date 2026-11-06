const { randomUUID } = require("crypto");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { r2Client } = require("../lib/storage/r2.cjs");

const EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

function sanitizeUserSegment(userId) {
  const cleaned = String(userId || "").trim();
  if (!cleaned || cleaned.length > 128) return null;
  if (cleaned.includes("..") || cleaned.includes("/") || cleaned.includes("\\")) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(cleaned)) return null;
  return cleaned;
}

function resolveExtension(fileName, contentType) {
  const raw = String(fileName || "").split(".").pop()?.toLowerCase() || "";
  const candidate = raw ? `.${raw}` : "";
  const allowed = new Set(Object.values(EXTENSIONS));
  if (allowed.has(candidate)) return candidate;
  return EXTENSIONS[contentType] || null;
}

function buildPublicUrl(fileKey) {
  const base = (process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "");
  return `${base}/${fileKey}`;
}

async function presign(req, res) {
  try {
    const userSegment = sanitizeUserSegment(req.user.clerkId || req.user.id);
    if (!userSegment) {
      return res.status(401).json({ erro: "Não autenticado." });
    }

    const fileName = req.body?.fileName;
    const contentType = req.body?.contentType;
    const contentLength = Number(req.body?.contentLength);
    const context = String(req.body?.context || "uploads").replace(/[^a-zA-Z0-9_-]/g, "");

    const extension = resolveExtension(fileName, contentType);
    if (!extension) {
      return res.status(415).json({ erro: "Tipo de arquivo não permitido." });
    }
    if (!Number.isFinite(contentLength) || contentLength <= 0) {
      return res.status(400).json({ erro: "Payload inválido." });
    }

    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket) {
      return res.status(500).json({ erro: "R2_BUCKET_NAME não configurado." });
    }

    const fileKey = `${userSegment}/${context || "uploads"}/${randomUUID()}${extension}`;
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileKey,
      ContentType: contentType,
      ContentLength: contentLength,
    });
    const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });
    return res.status(200).json({
      presignedUrl,
      fileKey,
      publicUrl: buildPublicUrl(fileKey),
    });
  } catch (err) {
    req.log?.error({ err }, "[upload/presign] falha ao gerar URL pré-assinada");
    return res.status(500).json({
      erro: err instanceof Error ? err.message : "Falha ao gerar URL pré-assinada.",
    });
  }
}

module.exports = { presign };
