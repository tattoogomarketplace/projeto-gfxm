export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LOCALES, type Locale } from '@/lib/i18n/types';
import { describeRequestAuth, resolvePerfilSession } from '@/lib/services/perfil-session';

const ALLOWED_LANGUAGES: readonly Locale[] = LOCALES;

type LanguagePayload = {
  language?: unknown;
  locale?: unknown;
};

function parseLanguage(body: LanguagePayload): Locale | null {
  const raw = body.language ?? body.locale;
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  return (ALLOWED_LANGUAGES as readonly string[]).includes(value) ? (value as Locale) : null;
}

async function syncLanguage(request: Request) {
  const { userId } = await resolvePerfilSession(request);
  if (!userId) {
    console.error('[user/language] 401 - sessão não resolvida', {
      ...describeRequestAuth(request),
      method: request.method,
    });
    return NextResponse.json({ sucesso: false, erro: 'Não autenticado.' }, { status: 401 });
  }

  let body: LanguagePayload = {};
  try {
    body = (await request.json()) as LanguagePayload;
  } catch {
    return NextResponse.json({ sucesso: false, erro: 'Payload inválido.' }, { status: 400 });
  }

  const language = parseLanguage(body);
  if (!language) {
    return NextResponse.json(
      {
        sucesso: false,
        erro: 'Idioma inválido.',
        allowed: ALLOWED_LANGUAGES,
      },
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

export async function POST(request: Request) {
  return syncLanguage(request);
}

export async function PUT(request: Request) {
  return syncLanguage(request);
}
