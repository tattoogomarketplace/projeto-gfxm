import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
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
 * @param fileName    Chave final no bucket (já deve ser única).
 * @param contentType Content-Type a ser gravado no objeto; precisa bater com o
 *                    header enviado no PUT do cliente, senão a assinatura falha.
 */
export async function generatePresignedUrl(
  fileName: string,
  contentType: string
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
