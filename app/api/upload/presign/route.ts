export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { resolvePerfilSession } from '@/lib/services/perfil-session';
import { buildPublicUrl, generatePresignedUrl } from '@/lib/storage/r2';
import { resolveClientIp, verifyTurnstileToken } from '@/lib/security/turnstile';
import {
  invalidPayloadBody,
  PRESIGN_CONTENT_TYPE_EXTENSIONS,
  presignUploadSchema,
} from '@/lib/security/validation';

const ALLOWED_EXTENSIONS = new Set<string>(Object.values(PRESIGN_CONTENT_TYPE_EXTENSIONS));

function resolveExtension(
  fileName: string,
  contentType: keyof typeof PRESIGN_CONTENT_TYPE_EXTENSIONS
): string {
  const raw = fileName.split('.').pop()?.toLowerCase() ?? '';
  const candidate = raw ? `.${raw}` : '';
  if (ALLOWED_EXTENSIONS.has(candidate)) {
    return candidate;
  }
  return PRESIGN_CONTENT_TYPE_EXTENSIONS[contentType];
}

function sanitizeUserSegment(userId: string): string | null {
  const cleaned = userId.trim();
  if (!cleaned || cleaned.length > 128) return null;
  if (cleaned.includes('..') || cleaned.includes('/') || cleaned.includes('\\')) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(cleaned)) return null;
  return cleaned;
}

export async function POST(request: Request) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ erro: 'Payload inválido.' }, { status: 400 });
  }

  const parsed = presignUploadSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(invalidPayloadBody(parsed.error), { status: 400 });
  }

  const { userId } = await resolvePerfilSession(request);
  if (!userId) {
    return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
  }

  const userSegment = sanitizeUserSegment(userId);
  if (!userSegment) {
    return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
  }

  const turnstile = await verifyTurnstileToken(
    parsed.data.turnstileToken,
    resolveClientIp(request)
  );
  if (turnstile.configured && !turnstile.success) {
    return NextResponse.json(
      {
        erro: 'Falha na verificação anti-bot. Recarregue a página e tente novamente.',
        codigo: 'TURNSTILE_REQUIRED',
      },
      { status: 403 }
    );
  }

  const { fileName, contentType, contentLength, context } = parsed.data;

  const extension = resolveExtension(fileName, contentType);
  if (!extension) {
    return NextResponse.json(
      { erro: 'Tipo de arquivo não permitido.' },
      { status: 415 }
    );
  }

  const fileKey = `${userSegment}/${context}/${randomUUID()}${extension}`;

  try {
    const presignedUrl = await generatePresignedUrl(fileKey, contentType, contentLength);
    return NextResponse.json({
      presignedUrl,
      fileKey,
      publicUrl: buildPublicUrl(fileKey),
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    console.error('[upload/presign] falha ao gerar URL pré-assinada', {
      userId,
      fileKey,
      error: raw,
    });
    return NextResponse.json({ erro: raw }, { status: 500 });
  }
}
