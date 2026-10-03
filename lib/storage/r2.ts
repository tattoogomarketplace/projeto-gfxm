import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
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
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  },
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
