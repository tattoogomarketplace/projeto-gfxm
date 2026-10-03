import { NextResponse } from 'next/server';
import { resolvePerfilSession } from '@/lib/services/perfil-session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT =
  'Você é o assistente virtual de elite do TattooGo MK, um marketplace premium de tatuagens. Seu tom é profissional, sofisticado, prestativo e direto. Você ajuda clientes com ideias de estilos (fineline, realismo, old school, etc.), dúvidas sobre cuidados pós-tatuagem e como agendar com os melhores artistas da plataforma. Responda sempre em português do Brasil e seja conciso.';

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

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

  let body: { message?: unknown; messages?: IncomingMessage[] } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: 'Payload inválido.' }, { status: 400 });
  }

  const history = Array.isArray(body.messages) ? body.messages : [];
  const latest =
    typeof body.message === 'string' && body.message.trim()
      ? [{ role: 'user' as ChatRole, content: body.message.trim() }]
      : [];
  const contents = toGeminiContents(history.length > 0 ? history : latest);

  if (contents.length === 0) {
    return NextResponse.json({ erro: 'Mensagem vazia.' }, { status: 400 });
  }

  const geminiResponse = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    }),
  });

  const payload = (await geminiResponse.json().catch(() => ({}))) as GeminiApiResponse;
  if (!geminiResponse.ok) {
    return NextResponse.json(
      { erro: payload.error?.message || 'Falha ao consultar o assistente.' },
      { status: 502 }
    );
  }

  const reply = extractReply(payload);
  if (!reply) {
    return NextResponse.json({ erro: 'O assistente não retornou uma resposta.' }, { status: 502 });
  }

  return NextResponse.json({ role: 'assistant', content: reply });
}
