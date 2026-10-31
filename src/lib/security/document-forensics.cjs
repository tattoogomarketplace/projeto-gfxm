const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46];
const RIFF_MAGIC = [0x52, 0x49, 0x46, 0x46];
const WEBP_MAGIC = [0x57, 0x45, 0x42, 0x50];
const FTYP_MAGIC = [0x66, 0x74, 0x79, 0x70];

const MIME_BY_EXT = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  pdf: "application/pdf",
  webp: "image/webp",
  avif: "image/avif",
};

const SAFE_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

function startsWith(body, magic) {
  if (!body || body.length < magic.length) return false;
  return magic.every((byte, index) => body[index] === byte);
}

function includesBytes(body, needle, from = 0) {
  if (!needle.length || !body || body.length < needle.length) return false;
  const limit = body.length - needle.length;
  for (let i = from; i <= limit; i += 1) {
    let matched = true;
    for (let j = 0; j < needle.length; j += 1) {
      if (body[i + j] !== needle[j]) {
        matched = false;
        break;
      }
    }
    if (matched) return true;
  }
  return false;
}

function asciiIncludes(body, token) {
  const sample = Buffer.from(body.subarray(0, Math.min(body.length, 64 * 1024))).toString("latin1");
  return sample.includes(token);
}

function isWebp(body) {
  return (
    body.length >= 12 &&
    startsWith(body, RIFF_MAGIC) &&
    body[8] === WEBP_MAGIC[0] &&
    body[9] === WEBP_MAGIC[1] &&
    body[10] === WEBP_MAGIC[2] &&
    body[11] === WEBP_MAGIC[3]
  );
}

function isAvif(body) {
  if (body.length < 12) return false;
  if (!includesBytes(body.subarray(4, 8), FTYP_MAGIC)) return false;
  return (
    asciiIncludes(body.subarray(8, Math.min(body.length, 64)), "avif") ||
    asciiIncludes(body.subarray(8, Math.min(body.length, 64)), "avis")
  );
}

function detectMimeType(body, declared, fileName) {
  if (startsWith(body, JPEG_MAGIC)) return "image/jpeg";
  if (startsWith(body, PNG_MAGIC)) return "image/png";
  if (startsWith(body, PDF_MAGIC)) return "application/pdf";
  if (isWebp(body)) return "image/webp";
  if (isAvif(body)) return "image/avif";

  const normalized = (declared || "").trim().toLowerCase();
  if (normalized === "image/jpg") return "image/jpeg";
  if (
    normalized === "image/jpeg" ||
    normalized === "image/png" ||
    normalized === "image/webp" ||
    normalized === "image/avif" ||
    normalized === "application/pdf"
  ) {
    return normalized;
  }

  const ext = (fileName || "").split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

function isSafeImageMime(value) {
  return SAFE_IMAGE_MIME_TYPES.includes(value);
}

function inspectImageBuffer({ body, declaredMime, fileName, expectedExtension }) {
  const size = body?.byteLength ?? 0;

  if (!body || size === 0) {
    return { ok: false, mimeType: "application/octet-stream", reason: "Arquivo vazio.", size };
  }

  const detected = detectMimeType(body, declaredMime, fileName);

  if (!isSafeImageMime(detected)) {
    return {
      ok: false,
      mimeType: detected,
      reason: "Conteúdo não corresponde a uma imagem segura (JPEG, PNG, WEBP ou AVIF).",
      size,
    };
  }

  if (detected === "image/jpeg" && !startsWith(body, JPEG_MAGIC)) {
    return { ok: false, mimeType: detected, reason: "Assinatura JPEG inválida.", size };
  }
  if (detected === "image/png" && !startsWith(body, PNG_MAGIC)) {
    return { ok: false, mimeType: detected, reason: "Assinatura PNG inválida.", size };
  }
  if (detected === "image/webp" && !isWebp(body)) {
    return { ok: false, mimeType: detected, reason: "Assinatura WEBP inválida.", size };
  }
  if (detected === "image/avif" && !isAvif(body)) {
    return { ok: false, mimeType: detected, reason: "Assinatura AVIF inválida.", size };
  }

  const expected = (expectedExtension ?? "").trim().toLowerCase().replace(/^\./, "");
  if (expected) {
    const expectedMime = MIME_BY_EXT[expected];
    if (!expectedMime || expectedMime !== detected) {
      return {
        ok: false,
        mimeType: detected,
        reason: "Assinatura do arquivo não corresponde à extensão informada.",
        size,
      };
    }
  }

  return { ok: true, mimeType: detected, reason: null, size };
}

module.exports = {
  SAFE_IMAGE_MIME_TYPES,
  detectMimeType,
  inspectImageBuffer,
};
