export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { resolvePerfilSession } from '@/lib/services/perfil-session';
import { buildPublicUrl, generatePresignedUrl } from '@/lib/storage/r2';

/**
 * Tipos permitidos para upload. Restringir o Content-Type evita que um atacante
 * grave HTML/JS no bucket público e obtenha XSS armazenado no domínio do R2.
 */
const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'application/pdf': '.pdf',
};

const ALLOWED_EXTENSIONS = new Set(Object.values(ALLOWED_CONTENT_TYPES));

function resolveExtension(fileName: string, contentType: string): string {
  const raw = fileName.split('.').pop()?.toLowerCase() ?? '';
  const candidate = raw ? `.${raw}` : '';
  if (ALLOWED_EXTENSIONS.has(candidate)) {
    return candidate;
  }
  return ALLOWED_CONTENT_TYPES[contentType];
}

/**
 * Emite uma URL pré-assinada de PUT para upload direto ao Cloudflare R2,
 * evitando o limite de payload das funções serverless da Vercel.
 *
 * O binário não passa pelo backend: o cliente faz o PUT direto na
 * `presignedUrl` e depois persiste a `publicUrl` retornada.
 */
export async function POST(request: Request) {
  const { userId } = await resolvePerfilSession(request);
  if (!userId) {
    return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
  }

  let body: { fileName?: unknown; contentType?: unknown } = {};
  try {
    body = (await request.json()) as { fileName?: unknown; contentType?: unknown };
  } catch {
    return NextResponse.json({ erro: 'Payload inválido.' }, { status: 400 });
  }

  const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : '';
  const contentType = typeof body.contentType === 'string' ? body.contentType.trim() : '';

  if (!fileName || !contentType) {
    return NextResponse.json(
      { erro: 'fileName e contentType são obrigatórios.' },
      { status: 400 }
    );
  }

  const extension = resolveExtension(fileName, contentType);
  if (!extension) {
    return NextResponse.json(
      { erro: 'Tipo de arquivo não permitido.' },
      { status: 415 }
    );
  }

  // Chave única gerada no servidor: impede sobrescrever arquivos existentes.
  const fileKey = `${randomUUID()}${extension}`;

  try {
    const presignedUrl = await generatePresignedUrl(fileKey, contentType);
    return NextResponse.json({
      presignedUrl,
      fileKey,
      publicUrl: buildPublicUrl(fileKey),
    });
  } catch (error) {
    console.error('[upload/presign] falha ao gerar URL pré-assinada', {
      userId,
      fileKey,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { erro: 'Não foi possível preparar o upload.' },
      { status: 500 }
    );
  }
}
