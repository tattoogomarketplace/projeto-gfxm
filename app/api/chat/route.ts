import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { resolvePerfilSession } from '@/lib/services/perfil-session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT =
  'Você é o assistente virtual de elite do TattooGo MK, um marketplace premium de tatuagens. Seu tom é profissional, sofisticado, prestativo e direto. Você ajuda clientes com ideias de estilos (fineline, realismo, old school, etc.), dúvidas sobre cuidados pós-tatuagem e como agendar com os melhores artistas da plataforma. Responda sempre em português do Brasil e seja conciso.';

export async function POST(req: Request) {
  const { userId } = await resolvePerfilSession(req);
  if (!userId) {
    return new Response(JSON.stringify({ erro: 'Não autenticado.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.USER_LLM_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ erro: 'Assistente indisponível. Configure USER_LLM_API_KEY.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { messages } = await req.json();
  const openai = createOpenAI({
    apiKey,
    baseURL: process.env.USER_LLM_BASE_URL || undefined,
  });
  const modelId = process.env.USER_LLM_MODEL || 'gpt-4o-mini';

  const result = streamText({
    model: openai(modelId),
    system: SYSTEM_PROMPT,
    messages,
  });

  return result.toDataStreamResponse();
}
