import { inspectImageBuffer } from '@/lib/ai/document-forensics';
import { deleteR2Object, fetchR2ObjectPrefix } from '@/lib/storage/r2';

/**
 * GUARDA DE PERSISTÊNCIA DE MÍDIA (Fase 2)
 *
 * Toda URL de imagem que será gravada em `Portfolio.url_imagem` ou
 * `FlashNote.imageUrl` passa por duas barreiras antes do Prisma:
 *
 * 1) SSRF / Host-Binding — a URL só é aceita se pertencer ao host público do
 *    bucket (`R2_PUBLIC_URL`) e se a chave estiver no prefixo do próprio
 *    usuário e no contexto correto (`portfolio` / `flash-notes`). Isso impede
 *    que um cliente faça o servidor buscar hosts arbitrários ou referencie
 *    mídia de terceiros.
 * 2) Magic Bytes — lemos apenas os primeiros 8 KB do objeto via `Range` e
 *    validamos a assinatura real (JPEG, PNG, WEBP ou AVIF) contra a extensão
 *    da chave. O binário nunca é baixado inteiro, mantendo a função serverless
 *    dentro do limite de memória mesmo para objetos de 10 MB.
 *
 * Em falha de Magic Bytes, o objeto órfão é removido do bucket para não deixar
 * payload inválido disponível publicamente.
 */

export const MEDIA_FORENSIC_PREFIX_BYTES = 8 * 1024;

/** Extensões seguras aceitas na persistência (espelham o presign de imagem). */
export const PERSISTED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif'] as const;

export type PersistedImageContext = 'portfolio' | 'flash-notes';

export type PersistedImageBinding = {
  imageUrl: string;
  fileKey: string;
  extension: string;
  mimeType: string;
};

export class MediaSecurityError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, message: string, code = 'MEDIA_REJECTED') {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'MediaSecurityError';
  }
}

function publicBaseUrl(): URL | null {
  const raw = (process.env.R2_PUBLIC_URL ?? '').trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return parsed;
  } catch {
    return null;
  }
}

function isSafeSegment(segment: string): boolean {
  return Boolean(segment) && segment !== '.' && segment !== '..' && !/[/\\]/.test(segment);
}

function normalizeSegments(pathname: string): string[] | null {
  const decoded = (() => {
    try {
      return decodeURIComponent(pathname);
    } catch {
      return null;
    }
  })();
  if (!decoded) return null;

  const segments = decoded.split('/').filter((segment) => segment.length > 0);
  if (segments.length < 3) return null;
  if (!segments.every(isSafeSegment)) return null;
  return segments;
}

function resolveExtension(fileKey: string): string {
  const raw = fileKey.split('.').pop()?.toLowerCase() ?? '';
  return raw;
}

/**
 * Resolve a chave no bucket a partir de uma URL pública, aplicando host-binding
 * estrito. A comparação é feita por `URL.hostname` (não por prefixo textual),
 * o que bloqueia truques como `https://r2.dominio.com.atacante.net/...`.
 */
export function resolveR2MediaKey(
  imageUrl: string,
  context: PersistedImageContext,
  ownerIds: readonly string[]
): { fileKey: string; extension: string } {
  const trimmed = (imageUrl ?? '').trim();
  if (!trimmed) {
    throw new MediaSecurityError(400, 'Informe a URL da imagem.', 'MEDIA_URL_REQUIRED');
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new MediaSecurityError(400, 'URL da imagem inválida.', 'MEDIA_URL_INVALID');
  }

  if (parsed.protocol !== 'https:') {
    throw new MediaSecurityError(400, 'A URL da imagem deve ser HTTPS.', 'MEDIA_URL_INSECURE');
  }
  if (parsed.username || parsed.password) {
    throw new MediaSecurityError(400, 'URL da imagem inválida.', 'MEDIA_URL_INVALID');
  }

  const base = publicBaseUrl();
  if (!base) {
    throw new MediaSecurityError(
      503,
      'Storage de mídia não configurado.',
      'MEDIA_STORAGE_MISCONFIGURED'
    );
  }

  if (parsed.hostname.toLowerCase() !== base.hostname.toLowerCase()) {
    throw new MediaSecurityError(
      400,
      'A imagem precisa estar hospedada no storage oficial.',
      'MEDIA_HOST_NOT_ALLOWED'
    );
  }
  if (parsed.port && parsed.port !== base.port) {
    throw new MediaSecurityError(400, 'URL da imagem inválida.', 'MEDIA_URL_INVALID');
  }

  const baseSegments = base.pathname.split('/').filter(Boolean);
  const urlSegments = normalizeSegments(parsed.pathname);
  if (!urlSegments) {
    throw new MediaSecurityError(400, 'Caminho da imagem inválido.', 'MEDIA_PATH_INVALID');
  }

  let keySegments = urlSegments;
  if (baseSegments.length > 0) {
    const matchesPrefix = baseSegments.every((segment, index) => urlSegments[index] === segment);
    if (!matchesPrefix) {
      throw new MediaSecurityError(400, 'Caminho da imagem inválido.', 'MEDIA_PATH_INVALID');
    }
    keySegments = urlSegments.slice(baseSegments.length);
  }

  if (keySegments.length !== 3) {
    throw new MediaSecurityError(400, 'Referência de mídia inválida.', 'MEDIA_PATH_INVALID');
  }

  const [ownerSegment, contextSegment, fileSegment] = keySegments;
  const allowedOwners = new Set(ownerIds.filter((id) => typeof id === 'string' && id.trim()));
  if (allowedOwners.size === 0 || !allowedOwners.has(ownerSegment)) {
    throw new MediaSecurityError(
      403,
      'A imagem não pertence ao seu espaço de upload.',
      'MEDIA_OWNER_MISMATCH'
    );
  }
  if (contextSegment !== context) {
    throw new MediaSecurityError(
      400,
      'A imagem foi enviada para um contexto diferente.',
      'MEDIA_CONTEXT_MISMATCH'
    );
  }
  if (!isSafeSegment(fileSegment)) {
    throw new MediaSecurityError(400, 'Referência de mídia inválida.', 'MEDIA_PATH_INVALID');
  }

  const extension = resolveExtension(fileSegment);
  if (!(PERSISTED_IMAGE_EXTENSIONS as readonly string[]).includes(extension)) {
    throw new MediaSecurityError(
      415,
      'Formato de imagem não suportado. Envie JPEG, PNG, WEBP ou AVIF.',
      'MEDIA_EXTENSION_NOT_ALLOWED'
    );
  }

  return { fileKey: keySegments.join('/'), extension };
}

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const name = (error as { name?: string }).name;
  const status =
    (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
  return name === 'NoSuchKey' || name === 'NotFound' || status === 404;
}

/**
 * Executa a leitura forense de Magic Bytes sobre o prefixo do objeto. Em caso
 * de conteúdo inválido, apaga o objeto órfão e lança `MediaSecurityError`.
 */
export async function assertSafeR2Image(input: {
  fileKey: string;
  extension: string;
}): Promise<{ mimeType: string; size: number }> {
  let prefix;
  try {
    prefix = await fetchR2ObjectPrefix(input.fileKey, MEDIA_FORENSIC_PREFIX_BYTES);
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new MediaSecurityError(
        404,
        'Imagem não encontrada no storage.',
        'MEDIA_NOT_FOUND'
      );
    }
    throw new MediaSecurityError(
      502,
      'Falha ao inspecionar a imagem no storage.',
      'MEDIA_STORAGE_ERROR'
    );
  }

  const inspection = inspectImageBuffer({
    body: prefix.body,
    declaredMime: prefix.contentType,
    fileName: input.fileKey,
    expectedExtension: input.extension,
  });

  if (!inspection.ok) {
    await deleteR2Object(input.fileKey);
    throw new MediaSecurityError(
      400,
      inspection.reason ??
        'Conteúdo do arquivo não corresponde a uma imagem segura.',
      'MEDIA_MAGIC_BYTES_REJECTED'
    );
  }

  return { mimeType: inspection.mimeType, size: inspection.size };
}

/**
 * Ponto único de entrada: host-binding + ownership + contexto + Magic Bytes.
 * Retorna a URL canônica a ser persistida.
 */
export async function verifyPersistedImage(input: {
  imageUrl: string;
  context: PersistedImageContext;
  ownerIds: readonly string[];
}): Promise<PersistedImageBinding> {
  const { fileKey, extension } = resolveR2MediaKey(
    input.imageUrl,
    input.context,
    input.ownerIds
  );
  const { mimeType } = await assertSafeR2Image({ fileKey, extension });

  return {
    imageUrl: (input.imageUrl ?? '').trim(),
    fileKey,
    extension,
    mimeType,
  };
}
