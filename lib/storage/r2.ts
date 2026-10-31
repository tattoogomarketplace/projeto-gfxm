import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Cloudflare R2 é compatível com a API S3. O endpoint é regionalmente virtual
 * e deve seguir EXATAMENTE o formato abaixo, derivado do account id.
 */
const R2_ENDPOINT = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const R2_BUCKET = process.env.R2_BUCKET_NAME ?? '';

/**
 * Cliente S3 apontando para o R2. O `region: 'auto'` é exigido pelo
 * Cloudflare R2; qualquer outra região faz a assinatura falhar com 403.
 */
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  },
  // SDK v3.729+ assina checksums (x-amz-checksum-crc32) por padrão. O PUT
  // do browser não envia esses headers → 403 SignatureDoesNotMatch, que o
  // Safari mascara como TypeError "Load failed" quando o CORS do R2 oculta
  // o status. WHEN_REQUIRED alinha a assinatura ao Content-Type do cliente.
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

export type PresignedUpload = {
  presignedUrl: string;
  fileKey: string;
  publicUrl: string;
};

/**
 * Gera uma URL pré-assinada de PUT para o frontend enviar o arquivo
 * diretamente ao R2, contornando os limites de payload das funções serverless
 * da Vercel. O binário NUNCA transita pelo backend.
 *
 * @param fileName      Chave final no bucket (já deve ser única).
 * @param contentType   Content-Type a ser gravado no objeto; precisa bater com o
 *                      header enviado no PUT do cliente, senão a assinatura falha.
 * @param contentLength Tamanho exato do objeto. Assinado na URL para o R2 recusar
 *                      PUTs maiores do que o limite validado no presign.
 */
export async function generatePresignedUrl(
  fileName: string,
  contentType: string,
  contentLength: number
): Promise<string> {
  if (!process.env.R2_ACCOUNT_ID) {
    throw new Error('R2_ACCOUNT_ID não configurado.');
  }
  if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    throw new Error('Credenciais do R2 não configuradas.');
  }
  if (!R2_BUCKET) {
    throw new Error('R2_BUCKET_NAME não configurado.');
  }

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: fileName,
    ContentType: contentType,
    ContentLength: contentLength,
  });

  // 5 minutos: janela suficiente para iniciar o upload sem expor a assinatura.
  return getSignedUrl(r2Client, command, { expiresIn: 300 });
}

/**
 * Monta a URL pública do objeto a partir do domínio público/custom domain
 * configurado no R2 (`R2_PUBLIC_URL`), evitando barras duplicadas.
 */
export function buildPublicUrl(fileKey: string): string {
  const base = (process.env.R2_PUBLIC_URL ?? '').replace(/\/+$/, '');
  return `${base}/${fileKey}`;
}

export type R2ObjectPayload = {
  body: Uint8Array;
  contentType: string | null;
  contentLength: number;
};

/**
 * Lê um objeto do bucket via API S3 (credenciais do servidor), permitindo
 * consumir documentos mesmo em bucket privado e sem expor a chave no cliente.
 * O chamador é responsável por validar a chave antes de invocar.
 */
export async function fetchR2Object(fileKey: string): Promise<R2ObjectPayload> {
  if (!R2_BUCKET) {
    throw new Error('R2_BUCKET_NAME não configurado.');
  }

  const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: fileKey });
  const response = await r2Client.send(command);

  if (!response.Body) {
    throw new Error('Objeto do R2 sem corpo.');
  }

  const body = await response.Body.transformToByteArray();
  return {
    body,
    contentType: response.ContentType ?? null,
    contentLength: response.ContentLength ?? body.byteLength,
  };
}

export type R2PrefixPayload = {
  body: Uint8Array;
  contentType: string | null;
  /** Tamanho total do objeto, quando o R2 informa via Content-Range. */
  totalLength: number | null;
  /** Indica que o objeto é maior que o prefixo lido (stream interrompido). */
  truncated: boolean;
};

async function readBoundedPrefix(
  body: unknown,
  maxBytes: number
): Promise<{ bytes: Uint8Array; truncated: boolean }> {
  const iterable = body as AsyncIterable<Uint8Array> | undefined;
  if (iterable && typeof iterable[Symbol.asyncIterator] === 'function') {
    const chunks: Uint8Array[] = [];
    let total = 0;
    for await (const chunk of iterable) {
      const view = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
      const remaining = maxBytes - total;
      if (view.byteLength >= remaining) {
        chunks.push(view.subarray(0, remaining));
        total = maxBytes;
        break;
      }
      chunks.push(view);
      total += view.byteLength;
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { bytes, truncated: total >= maxBytes };
  }

  const blob = body as { transformToByteArray?: () => Promise<Uint8Array> } | undefined;
  if (blob?.transformToByteArray) {
    const full = await blob.transformToByteArray();
    const bytes = full.subarray(0, maxBytes);
    return { bytes, truncated: full.byteLength > maxBytes };
  }

  throw new Error('Corpo do objeto do R2 não é legível.');
}

function parseContentRangeTotal(value: string | null | undefined): number | null {
  const match = value?.match(/^bytes\s+\d+-\d+\/(\d+)$/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Lê apenas os primeiros `maxBytes` de um objeto no R2, usando `Range` na API
 * S3. Mantém a memória da função serverless limitada (padrão: 8 KB) mesmo para
 * arquivos de até 10 MB, viabilizando a inspeção forense de Magic Bytes sem
 * baixar o binário inteiro. O stream é interrompido assim que o limite é
 * atingido, protegendo contra respostas que ignorem o `Range`.
 */
export async function fetchR2ObjectPrefix(
  fileKey: string,
  maxBytes: number
): Promise<R2PrefixPayload> {
  if (!R2_BUCKET) {
    throw new Error('R2_BUCKET_NAME não configurado.');
  }
  if (!Number.isInteger(maxBytes) || maxBytes <= 0) {
    throw new Error('Limite de leitura inválido.');
  }

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: fileKey,
    Range: `bytes=0-${maxBytes - 1}`,
  });
  const response = await r2Client.send(command);

  if (!response.Body) {
    throw new Error('Objeto do R2 sem corpo.');
  }

  const { bytes, truncated } = await readBoundedPrefix(response.Body, maxBytes);
  return {
    body: bytes,
    contentType: response.ContentType ?? null,
    totalLength: parseContentRangeTotal(response.ContentRange),
    truncated,
  };
}

/**
 * Remove um objeto órfão do bucket (upload que falhou na inspeção forense).
 * Falhas na limpeza são apenas logadas: a resposta de rejeição ao cliente não
 * pode depender da disponibilidade do storage.
 */
export async function deleteR2Object(fileKey: string): Promise<void> {
  if (!R2_BUCKET) {
    console.warn('[r2] R2_BUCKET_NAME ausente; limpeza de objeto ignorada.');
    return;
  }
  try {
    await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: fileKey }));
  } catch (error) {
    console.error('[r2] falha ao remover objeto órfão', {
      fileKey,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
