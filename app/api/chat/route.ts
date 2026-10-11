import { NextResponse } from 'next/server';
import { BRAND_NAME } from '@/lib/i18n/brands';
import { normalizeLocale } from '@/lib/i18n/store';
import type { Locale } from '@/lib/i18n/types';
import { resolvePerfilSession } from '@/lib/services/perfil-session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const LOCALE_LANGUAGE_NAME: Record<Locale, string> = {
  'pt-BR': 'Brazilian Portuguese (português do Brasil)',
  'pt-PT': 'European Portuguese (português de Portugal)',
  en: 'English',
  es: 'Spanish (español)',
  fr: 'French (français)',
  de: 'German (Deutsch)',
  it: 'Italian (italiano)',
  ja: 'Japanese (日本語)',
  zh: 'Simplified Chinese (简体中文)',
  ko: 'Korean (한국어)',
  ar: 'Arabic (العربية)',
  ru: 'Russian (русский)',
  hi: 'Hindi (हिन्दी)',
  nl: 'Dutch (Nederlands)',
  tr: 'Turkish (Türkçe)',
  pl: 'Polish (polski)',
};

function buildSystemPrompt(locale: Locale): string {
  const language = LOCALE_LANGUAGE_NAME[locale];
  return [
    `You are the elite virtual assistant of ${BRAND_NAME}, a premium tattoo marketplace.`,
    'Your tone is professional, sophisticated, helpful and direct.',
    'You help clients with style ideas (fineline, realism, old school, etc.), aftercare questions and booking the best artists on the platform.',
    `You must always respond in ${language}.`,
    'Be concise. Never translate or alter the brand name.',
  ].join(' ');
}

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';

type ChatRole = 'user' | 'assistant';

type IncomingMessage = {
  role?: string;
  content?: string;
};

type GeminiPart = { text?: string };
type GeminiContent = { role: 'user' | 'model'; parts: GeminiPart[] };
type GeminiCandidate = { content?: { parts?: GeminiPart[] } };
type GeminiApiResponse = {
  candidates?: GeminiCandidate[];
  error?: { message?: string };
};

function toGeminiContents(messages: IncomingMessage[]): GeminiContent[] {
  const contents: GeminiContent[] = [];

  for (const message of messages) {
    const text = typeof message.content === 'string' ? message.content.trim() : '';
    if (!text) continue;
    const role: 'user' | 'model' = message.role === 'assistant' || message.role === 'model' ? 'model' : 'user';
    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      last.parts[0].text = `${last.parts[0].text ?? ''}\n${text}`;
      continue;
    }
    contents.push({ role, parts: [{ text }] });
  }

  if (contents.length === 0 || contents[0].role !== 'user') {
    return [];
  }

  return contents;
}

function extractReply(payload: GeminiApiResponse): string {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part) => part.text ?? '')
    .join('')
    .trim();
}

export async function POST(req: Request) {
  const { userId } = await resolvePerfilSession(req);
  if (!userId) {
    return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { erro: 'Assistente indisponível. Configure GEMINI_API_KEY.' },
      { status: 503 }
    );
  }

  let body: { message?: unknown; messages?: IncomingMessage[]; locale?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: 'Payload inválido.' }, { status: 400 });
  }

  const locale = normalizeLocale(body.locale);
  const history = Array.isArray(body.messages) ? body.messages : [];
  const latest =
    typeof body.message === 'string' && body.message.trim()
      ? [{ role: 'user' as ChatRole, content: body.message.trim() }]
      : [];
  const contents = toGeminiContents(history.length > 0 ? history : latest);

  if (contents.length === 0) {
    return NextResponse.json({ erro: 'Mensagem vazia.' }, { status: 400 });
  }

  let geminiResponse: Response;
  try {
    geminiResponse = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildSystemPrompt(locale) }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    });
  } catch (error) {
    console.error('[chat] falha de rede no Gemini', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { erro: 'Assistente temporariamente indisponível. Tente novamente em instantes.' },
      { status: 503 }
    );
  }

  const payload = (await geminiResponse.json().catch(() => ({}))) as GeminiApiResponse;
  if (!geminiResponse.ok) {
    const status = geminiResponse.status === 403 || geminiResponse.status === 401 ? 503 : 502;
    return NextResponse.json(
      { erro: 'Assistente temporariamente indisponível. Tente novamente em instantes.' },
      { status }
    );
  }

  const reply = extractReply(payload);
  if (!reply) {
    return NextResponse.json({ erro: 'O assistente não retornou uma resposta.' }, { status: 502 });
  }

  return NextResponse.json({ role: 'assistant', content: reply });
}
