export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { normalizeLocale } from '@/lib/i18n/store';
import { LOCALES, type Locale } from '@/lib/i18n/types';
import { describeRequestAuth, resolvePerfilSession } from '@/lib/services/perfil-session';
import { invalidPayloadBody, localeSchema } from '@/lib/security/validation';

const ALLOWED_LANGUAGES: readonly Locale[] = LOCALES;

/** Aceita `language` OU `locale`; exige ao menos um locale suportado. */
const payloadSchema = z
  .object({
    language: localeSchema.optional(),
    locale: localeSchema.optional(),
  })
  .refine((data) => Boolean(data.language ?? data.locale), {
    message: 'Idioma inválido.',
  });

async function syncLanguage(request: Request) {
  // Sanitização impiedosa PRIMEIRO: idioma malformado nunca toca em sessão/banco.
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ sucesso: false, erro: 'Payload inválido.' }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { ...invalidPayloadBody(parsed.error), allowed: ALLOWED_LANGUAGES },
      { status: 400 }
    );
  }

  const { userId } = await resolvePerfilSession(request);
  if (!userId) {
    console.error('[user/language] 401 - sessão não resolvida', {
      ...describeRequestAuth(request),
      method: request.method,
    });
    return NextResponse.json({ sucesso: false, erro: 'Não autenticado.' }, { status: 401 });
  }

  const language = parsed.data.language ?? parsed.data.locale;
  if (!language) {
    return NextResponse.json(
      { sucesso: false, erro: 'Idioma inválido.', allowed: ALLOWED_LANGUAGES },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.perfil.updateMany({
      where: { clerk_id: userId, deleted_at: null },
      data: { language },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { sucesso: false, erro: 'Perfil não encontrado.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ sucesso: true, language });
  } catch (error) {
    console.error('[user/language] falha ao persistir idioma', {
      userId,
      language,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { sucesso: false, erro: 'Falha ao sincronizar o idioma.' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { userId } = await resolvePerfilSession(request);
  if (!userId) {
    return NextResponse.json({ sucesso: false, erro: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const perfil = await prisma.perfil.findFirst({
      where: { clerk_id: userId, deleted_at: null },
      select: { language: true },
    });

    if (!perfil) {
      return NextResponse.json({ sucesso: false, erro: 'Perfil não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ sucesso: true, language: normalizeLocale(perfil.language) });
  } catch (error) {
    console.error('[user/language] falha ao ler idioma', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { sucesso: false, erro: 'Falha ao sincronizar o idioma.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return syncLanguage(request);
}

export async function PUT(request: Request) {
  return syncLanguage(request);
}
