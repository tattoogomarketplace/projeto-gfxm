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

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  pdf: 'application/pdf',
};

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

  const normalized = (declared || '').trim().toLowerCase();
  if (normalized === 'image/jpg') return 'image/jpeg';
  if (normalized === 'image/jpeg' || normalized === 'image/png' || normalized === 'application/pdf') {
    return normalized;
  }

  const ext = (fileName || '').split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
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
