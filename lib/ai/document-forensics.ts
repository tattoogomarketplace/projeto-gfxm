export type CredentialKind = 'pessoal' | 'habilidade';

export type ForensicResult = {
  ok: boolean;
  mimeType: string;
  reason: string | null;
  fileName: string;
  size: number;
};

const MIN_BYTES = 8 * 1024;
const MAX_BYTES = 10 * 1024 * 1024;

const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46];
const RIFF_MAGIC = [0x52, 0x49, 0x46, 0x46];
const WEBP_MAGIC = [0x57, 0x45, 0x42, 0x50];
const FTYP_MAGIC = [0x66, 0x74, 0x79, 0x70];

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  pdf: 'application/pdf',
  webp: 'image/webp',
  avif: 'image/avif',
};

/**
 * Tipos de imagem aceitos na persistência de mídia de portfólio e Flash Notes.
 * Qualquer assinatura fora desta lista é rejeitada antes do Prisma.
 */
export const SAFE_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

export type SafeImageMime = (typeof SAFE_IMAGE_MIME_TYPES)[number];

function startsWith(body: Uint8Array, magic: number[]): boolean {
  if (body.length < magic.length) return false;
  return magic.every((byte, index) => body[index] === byte);
}

function includesBytes(body: Uint8Array, needle: number[], from = 0): boolean {
  if (needle.length === 0 || body.length < needle.length) return false;
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

function asciiIncludes(body: Uint8Array, token: string): boolean {
  const sample = Buffer.from(body.subarray(0, Math.min(body.length, 64 * 1024))).toString(
    'latin1'
  );
  return sample.includes(token);
}

export function detectMimeType(body: Uint8Array, declared?: string, fileName?: string): string {
  if (startsWith(body, JPEG_MAGIC)) return 'image/jpeg';
  if (startsWith(body, PNG_MAGIC)) return 'image/png';
  if (startsWith(body, PDF_MAGIC)) return 'application/pdf';
  if (isWebp(body)) return 'image/webp';
  if (isAvif(body)) return 'image/avif';

  const normalized = (declared || '').trim().toLowerCase();
  if (normalized === 'image/jpg') return 'image/jpeg';
  if (
    normalized === 'image/jpeg' ||
    normalized === 'image/png' ||
    normalized === 'image/webp' ||
    normalized === 'image/avif' ||
    normalized === 'application/pdf'
  ) {
    return normalized;
  }

  const ext = (fileName || '').split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

/** Container RIFF/WEBP: `RIFF....WEBP` — o tamanho ocupa os bytes 4..8. */
function isWebp(body: Uint8Array): boolean {
  return (
    body.length >= 12 &&
    startsWith(body, RIFF_MAGIC) &&
    body[8] === WEBP_MAGIC[0] &&
    body[9] === WEBP_MAGIC[1] &&
    body[10] === WEBP_MAGIC[2] &&
    body[11] === WEBP_MAGIC[3]
  );
}

/**
 * Container ISOBMFF de AVIF: `....ftyp` no offset 4, seguido de uma das marcas
 * de compatibilidade (`avif` ou `avis`).
 */
function isAvif(body: Uint8Array): boolean {
  if (body.length < 12) return false;
  if (!includesBytes(body.subarray(4, 8), FTYP_MAGIC)) return false;
  return asciiIncludes(body.subarray(8, Math.min(body.length, 64)), 'avif') ||
    asciiIncludes(body.subarray(8, Math.min(body.length, 64)), 'avis');
}

function kindLabel(kind: CredentialKind): string {
  return kind === 'pessoal' ? 'documento pessoal' : 'comprovante profissional';
}

function inspectJpeg(body: Uint8Array, kind: CredentialKind): string | null {
  if (!startsWith(body, JPEG_MAGIC)) {
    return `O ${kindLabel(kind)} não possui assinatura JPEG válida.`;
  }
  const eoi = [0xff, 0xd9];
  const tail = body.subarray(Math.max(0, body.length - 8));
  if (!includesBytes(tail, eoi) && !includesBytes(body, eoi, Math.max(0, body.length - 4096))) {
    return `O ${kindLabel(kind)} JPEG parece incompleto ou corrompido.`;
  }
  return null;
}

function inspectPng(body: Uint8Array, kind: CredentialKind): string | null {
  if (!startsWith(body, PNG_MAGIC)) {
    return `O ${kindLabel(kind)} não possui assinatura PNG válida.`;
  }
  const ihdr = [0x49, 0x48, 0x44, 0x52];
  if (!includesBytes(body.subarray(0, 32), ihdr, 8)) {
    return `O ${kindLabel(kind)} PNG está sem cabeçalho IHDR.`;
  }
  const iend = [0x49, 0x45, 0x4e, 0x44];
  if (!includesBytes(body.subarray(Math.max(0, body.length - 16)), iend)) {
    return `O ${kindLabel(kind)} PNG parece incompleto.`;
  }
  return null;
}

function inspectPdf(body: Uint8Array, kind: CredentialKind): string | null {
  if (!startsWith(body, PDF_MAGIC)) {
    return `O ${kindLabel(kind)} não possui assinatura PDF válida.`;
  }
  const hasEof = asciiIncludes(body, '%%EOF') || asciiIncludes(body.subarray(Math.max(0, body.length - 2048)), '%%EOF');
  const hasStructure = asciiIncludes(body, '/Type') || asciiIncludes(body, 'endobj') || asciiIncludes(body, '/Page');
  if (!hasEof && !hasStructure) {
    return `O ${kindLabel(kind)} PDF não apresenta estrutura de documento oficial.`;
  }
  return null;
}

export function inspectDocumentBuffer(input: {
  body: Uint8Array;
  declaredMime?: string;
  fileName?: string;
  kind: CredentialKind;
}): ForensicResult {
  const fileName = (input.fileName || '').trim() || (input.kind === 'pessoal' ? 'documento-pessoal' : 'comprovante-habilidade');
  const size = input.body.byteLength;

  if (!input.body || size === 0) {
    return {
      ok: false,
      mimeType: 'application/octet-stream',
      reason: `O ${kindLabel(input.kind)} está vazio.`,
      fileName,
      size,
    };
  }

  if (size > MAX_BYTES) {
    return {
      ok: false,
      mimeType: detectMimeType(input.body, input.declaredMime, fileName),
      reason: `O ${kindLabel(input.kind)} excede o tamanho máximo de 10 MB.`,
      fileName,
      size,
    };
  }

  if (size < MIN_BYTES) {
    return {
      ok: false,
      mimeType: detectMimeType(input.body, input.declaredMime, fileName),
      reason: `O ${kindLabel(input.kind)} é pequeno demais para um documento oficial nítido.`,
      fileName,
      size,
    };
  }

  const mimeType = detectMimeType(input.body, input.declaredMime, fileName);
  if (mimeType !== 'image/jpeg' && mimeType !== 'image/png' && mimeType !== 'application/pdf') {
    return {
      ok: false,
      mimeType,
      reason: `Formato inválido no ${kindLabel(input.kind)}. Envie JPG, PNG ou PDF.`,
      fileName,
      size,
    };
  }

  const structureReason =
    mimeType === 'image/jpeg'
      ? inspectJpeg(input.body, input.kind)
      : mimeType === 'image/png'
        ? inspectPng(input.body, input.kind)
        : inspectPdf(input.body, input.kind);

  if (structureReason) {
    return { ok: false, mimeType, reason: structureReason, fileName, size };
  }

  return { ok: true, mimeType, reason: null, fileName, size };
}

export function namesAlign(personalName: string, professionalName: string): boolean {
  const tokenize = (value: string): string[] =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((token) => token.length > 2);

  const left = tokenize(personalName);
  const right = tokenize(professionalName);
  if (left.length === 0 || right.length === 0) return true;

  const leftSet = new Set(left);
  return right.some((token) => leftSet.has(token));
}

export type ImageForensicResult = {
  ok: boolean;
  mimeType: string;
  reason: string | null;
  /** Tamanho lido (prefixo), não necessariamente o objeto inteiro. */
  size: number;
};

function isSafeImageMime(value: string): value is SafeImageMime {
  return (SAFE_IMAGE_MIME_TYPES as readonly string[]).includes(value);
}

/**
 * Inspeção forense de Magic Bytes para mídia persistida (portfólio e Flash
 * Notes). Opera sobre um PREFIXO do objeto — basta o cabeçalho — e valida que a
 * assinatura real corresponde a JPEG, PNG, WEBP ou AVIF.
 *
 * Quando `expectedExtension` é informado (extensão da chave no R2), a assinatura
 * detectada precisa bater com ela: um `.png` que na verdade é HTML/PDF é
 * rejeitado, impedindo uploads de payload disfarçados de imagem.
 */
export function inspectImageBuffer(input: {
  body: Uint8Array;
  declaredMime?: string | null;
  fileName?: string | null;
  expectedExtension?: string | null;
}): ImageForensicResult {
  const size = input.body?.byteLength ?? 0;

  if (!input.body || size === 0) {
    return { ok: false, mimeType: 'application/octet-stream', reason: 'Arquivo vazio.', size };
  }

  const detected = detectMimeType(input.body, input.declaredMime ?? undefined, input.fileName ?? undefined);

  if (!isSafeImageMime(detected)) {
    return {
      ok: false,
      mimeType: detected,
      reason: 'Conteúdo não corresponde a uma imagem segura (JPEG, PNG, WEBP ou AVIF).',
      size,
    };
  }

  if (detected === 'image/jpeg' && !startsWith(input.body, JPEG_MAGIC)) {
    return { ok: false, mimeType: detected, reason: 'Assinatura JPEG inválida.', size };
  }
  if (detected === 'image/png' && !startsWith(input.body, PNG_MAGIC)) {
    return { ok: false, mimeType: detected, reason: 'Assinatura PNG inválida.', size };
  }
  if (detected === 'image/webp' && !isWebp(input.body)) {
    return { ok: false, mimeType: detected, reason: 'Assinatura WEBP inválida.', size };
  }
  if (detected === 'image/avif' && !isAvif(input.body)) {
    return { ok: false, mimeType: detected, reason: 'Assinatura AVIF inválida.', size };
  }

  const expected = (input.expectedExtension ?? '').trim().toLowerCase().replace(/^\./, '');
  if (expected) {
    const expectedMime = MIME_BY_EXT[expected];
    if (!expectedMime || expectedMime !== detected) {
      return {
        ok: false,
        mimeType: detected,
        reason: 'Assinatura do arquivo não corresponde à extensão informada.',
        size,
      };
    }
  }

  return { ok: true, mimeType: detected, reason: null, size };
}
