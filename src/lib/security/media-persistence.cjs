const { inspectImageBuffer } = require("./document-forensics.cjs");
const { deleteR2Object, fetchR2ObjectPrefix } = require("../storage/r2.cjs");

const MEDIA_FORENSIC_PREFIX_BYTES = 8 * 1024;
const PERSISTED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "avif"];

class MediaSecurityError extends Error {
  constructor(status, message, code = "MEDIA_REJECTED") {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "MediaSecurityError";
  }
}

function publicBaseUrl() {
  const raw = (process.env.R2_PUBLIC_URL ?? "").trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed;
  } catch {
    return null;
  }
}

function isSafeSegment(segment) {
  return Boolean(segment) && segment !== "." && segment !== ".." && !/[/\\]/.test(segment);
}

function normalizeSegments(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const segments = decoded.split("/").filter((segment) => segment.length > 0);
  if (segments.length < 3) return null;
  if (!segments.every(isSafeSegment)) return null;
  return segments;
}

function resolveExtension(fileKey) {
  return fileKey.split(".").pop()?.toLowerCase() ?? "";
}

function resolveR2MediaKey(imageUrl, context, ownerIds) {
  const trimmed = (imageUrl ?? "").trim();
  if (!trimmed) {
    throw new MediaSecurityError(400, "Informe a URL da imagem.", "MEDIA_URL_REQUIRED");
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new MediaSecurityError(400, "URL da imagem inválida.", "MEDIA_URL_INVALID");
  }

  if (parsed.protocol !== "https:") {
    throw new MediaSecurityError(400, "A URL da imagem deve ser HTTPS.", "MEDIA_URL_INSECURE");
  }
  if (parsed.username || parsed.password) {
    throw new MediaSecurityError(400, "URL da imagem inválida.", "MEDIA_URL_INVALID");
  }

  const base = publicBaseUrl();
  if (!base) {
    throw new MediaSecurityError(503, "Storage de mídia não configurado.", "MEDIA_STORAGE_MISCONFIGURED");
  }

  if (parsed.hostname.toLowerCase() !== base.hostname.toLowerCase()) {
    throw new MediaSecurityError(
      400,
      "A imagem precisa estar hospedada no storage oficial.",
      "MEDIA_HOST_NOT_ALLOWED"
    );
  }
  if (parsed.port && parsed.port !== base.port) {
    throw new MediaSecurityError(400, "URL da imagem inválida.", "MEDIA_URL_INVALID");
  }

  const baseSegments = base.pathname.split("/").filter(Boolean);
  const urlSegments = normalizeSegments(parsed.pathname);
  if (!urlSegments) {
    throw new MediaSecurityError(400, "Caminho da imagem inválido.", "MEDIA_PATH_INVALID");
  }

  let keySegments = urlSegments;
  if (baseSegments.length > 0) {
    const matchesPrefix = baseSegments.every((segment, index) => urlSegments[index] === segment);
    if (!matchesPrefix) {
      throw new MediaSecurityError(400, "Caminho da imagem inválido.", "MEDIA_PATH_INVALID");
    }
    keySegments = urlSegments.slice(baseSegments.length);
  }

  if (keySegments.length !== 3) {
    throw new MediaSecurityError(400, "Referência de mídia inválida.", "MEDIA_PATH_INVALID");
  }

  const [ownerSegment, contextSegment, fileSegment] = keySegments;
  const allowedOwners = new Set((ownerIds || []).filter((id) => typeof id === "string" && id.trim()));
  if (allowedOwners.size === 0 || !allowedOwners.has(ownerSegment)) {
    throw new MediaSecurityError(403, "A imagem não pertence ao seu espaço de upload.", "MEDIA_OWNER_MISMATCH");
  }
  if (contextSegment !== context) {
    throw new MediaSecurityError(400, "A imagem foi enviada para um contexto diferente.", "MEDIA_CONTEXT_MISMATCH");
  }
  if (!isSafeSegment(fileSegment)) {
    throw new MediaSecurityError(400, "Referência de mídia inválida.", "MEDIA_PATH_INVALID");
  }

  const extension = resolveExtension(fileSegment);
  if (!PERSISTED_IMAGE_EXTENSIONS.includes(extension)) {
    throw new MediaSecurityError(
      415,
      "Formato de imagem não suportado. Envie JPEG, PNG, WEBP ou AVIF.",
      "MEDIA_EXTENSION_NOT_ALLOWED"
    );
  }

  return { fileKey: keySegments.join("/"), extension };
}

function isNotFoundError(error) {
  if (!error || typeof error !== "object") return false;
  const name = error.name;
  const status = error.$metadata?.httpStatusCode;
  return name === "NoSuchKey" || name === "NotFound" || status === 404;
}

async function assertSafeR2Image({ fileKey, extension }) {
  let prefix;
  try {
    prefix = await fetchR2ObjectPrefix(fileKey, MEDIA_FORENSIC_PREFIX_BYTES);
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new MediaSecurityError(404, "Imagem não encontrada no storage.", "MEDIA_NOT_FOUND");
    }
    throw new MediaSecurityError(502, "Falha ao inspecionar a imagem no storage.", "MEDIA_STORAGE_ERROR");
  }

  const inspection = inspectImageBuffer({
    body: prefix.body,
    declaredMime: prefix.contentType,
    fileName: fileKey,
    expectedExtension: extension,
  });

  if (!inspection.ok) {
    await deleteR2Object(fileKey);
    throw new MediaSecurityError(
      400,
      inspection.reason ?? "Conteúdo do arquivo não corresponde a uma imagem segura.",
      "MEDIA_MAGIC_BYTES_REJECTED"
    );
  }

  return { mimeType: inspection.mimeType, size: inspection.size };
}

async function verifyPersistedImage({ imageUrl, context, ownerIds }) {
  const { fileKey, extension } = resolveR2MediaKey(imageUrl, context, ownerIds);
  const { mimeType } = await assertSafeR2Image({ fileKey, extension });

  return {
    imageUrl: (imageUrl ?? "").trim(),
    fileKey,
    extension,
    mimeType,
  };
}

module.exports = {
  MEDIA_FORENSIC_PREFIX_BYTES,
  PERSISTED_IMAGE_EXTENSIONS,
  MediaSecurityError,
  resolveR2MediaKey,
  assertSafeR2Image,
  verifyPersistedImage,
};
