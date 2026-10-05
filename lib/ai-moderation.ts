export type ModerationSource = 'gemini' | 'fallback';

export type PortfolioModerationVerdict = {
  allowed: boolean;
  source: ModerationSource;
  reason?: string;
};

export type StudioCaptionInput = {
  style: string;
  bodyPart: string;
  sessionDuration: string;
  isHealed: boolean;
  notes?: string;
};

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';
const GEMINI_TIMEOUT_MS = 8000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const TRANSIENT_STATUS = new Set([401, 403, 408, 429, 500, 502, 503, 504]);

type GeminiPart = { text?: string };
type GeminiApiResponse = {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  error?: { message?: string; code?: number };
};

function extractText(payload: GeminiApiResponse): string {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part) => part.text ?? '')
    .join('')
    .trim();
}

function isTransientStatus(status: number): boolean {
  return TRANSIENT_STATUS.has(status);
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(parts: unknown[]): Promise<{ ok: boolean; status: number; text: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, status: 503, text: '' };
  }

  try {
    const response = await fetchWithTimeout(
      `${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 256,
          },
        }),
      },
      GEMINI_TIMEOUT_MS
    );

    const payload = (await response.json().catch(() => ({}))) as GeminiApiResponse;
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        text: payload.error?.message || '',
      };
    }
    return { ok: true, status: response.status, text: extractText(payload) };
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    console.error('[ai-moderation] falha de rede/timeout no Gemini', {
      error: error instanceof Error ? error.message : String(error),
      aborted,
    });
    return { ok: false, status: aborted ? 408 : 503, text: '' };
  }
}

function resolveAllowedHost(imageUrl: string): boolean {
  try {
    const url = new URL(imageUrl);
    if (url.protocol !== 'https:') return false;
    const base = (process.env.R2_PUBLIC_URL ?? '').replace(/\/+$/, '');
    if (!base) return true;
    return imageUrl.startsWith(`${base}/`);
  } catch {
    return false;
  }
}

async function loadImageInlineData(
  imageUrl: string
): Promise<{ mimeType: string; data: string } | null> {
  if (!resolveAllowedHost(imageUrl)) return null;
  try {
    const response = await fetchWithTimeout(imageUrl, { method: 'GET', cache: 'no-store' }, GEMINI_TIMEOUT_MS);
    if (!response.ok) return null;
    const mimeType = (response.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
    if (!mimeType.startsWith('image/')) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) return null;
    return { mimeType, data: buffer.toString('base64') };
  } catch (error) {
    console.error('[ai-moderation] falha ao obter imagem para moderação', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function parseModerationText(text: string): boolean | null {
  const normalized = text
    .replace(/```+/g, '')
    .replace(/["']/g, '')
    .trim()
    .toUpperCase();
  if (!normalized) return null;
  if (/(^|\b)(REJEITADO|REJECTED|NAO|NÃO)(\b|$)/.test(normalized)) return false;
  if (/(^|\b)(APROVADO|APPROVED|SIM)(\b|$)/.test(normalized)) return true;
  return null;
}

export async function moderatePortfolioImage(imageUrl: string): Promise<PortfolioModerationVerdict> {
  const image = await loadImageInlineData(imageUrl);
  if (!image) {
    return { allowed: true, source: 'fallback', reason: 'imagem_indisponivel' };
  }

  const result = await callGemini([
    {
      text: `Você é o moderador visual de um marketplace premium de tatuagens.
Analise a imagem. Responda APENAS APROVADO se for arte de tatuagem, flash, pele tatuada ou desenho de studio seguro.
Responda APENAS REJEITADO se houver nudez explícita, violência extrema, conteúdo sexual ou violação grave.
Não explique.`,
    },
    { inlineData: { mimeType: image.mimeType, data: image.data } },
  ]);

  if (!result.ok || isTransientStatus(result.status)) {
    console.warn('[ai-moderation] Gemini indisponível; publicação segue com fallback.', {
      status: result.status,
    });
    return { allowed: true, source: 'fallback', reason: `gemini_${result.status}` };
  }

  const parsed = parseModerationText(result.text);
  if (parsed === false) {
    return { allowed: false, source: 'gemini', reason: 'conteudo_rejeitado' };
  }
  return { allowed: true, source: parsed === true ? 'gemini' : 'fallback' };
}

export async function refineStudioCaption(
  input: StudioCaptionInput,
  structuredCaption: string
): Promise<string> {
  const notes = (input.notes ?? '').trim();
  const result = await callGemini([
    {
      text: `Você é o editor de um portfólio de tattoo studio de alto padrão.
Reescreva o texto abaixo como uma legenda formal, em português do Brasil, no máximo duas frases.
Tom de ateliê premium: sóbrio, preciso, sem gírias, sem hashtags, sem emojis, sem chamada comercial.
Preserve estilo, parte do corpo, duração da sessão e status de cicatrização.
Se o texto extra for informal, eleve o registro sem inventar fatos.

Texto:
${structuredCaption}${notes ? `\nNotas do artista: ${notes}` : ''}`,
    },
  ]);

  if (!result.ok || isTransientStatus(result.status) || !result.text) {
    return structuredCaption;
  }

  const cleaned = result.text
    .replace(/[#*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned || cleaned.length > 420) return structuredCaption;
  return cleaned;
}

/**
 * Compatível com o fluxo legado. 403/rede nunca rejeitam a peça:
 * apenas um veredito explícito de recusa bloqueia.
 */
export const moderateImageWithGemini = async (base64Image: string): Promise<boolean> => {
  if (!base64Image.trim()) return true;
  const result = await callGemini([
    {
      text: `Você é um moderador de um marketplace de tatuagens. Analise esta imagem.
Retorne APENAS a palavra 'APROVADO' se for uma tatuagem, um desenho, estúdio ou profissional seguro.
Retorne 'REJEITADO' se contiver nudez explícita, violência extrema, sangue real excessivo, conteúdo sexual ou violação de diretrizes.
Não adicione explicações.`,
    },
    { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
  ]);
  if (!result.ok || isTransientStatus(result.status)) {
    return true;
  }
  return parseModerationText(result.text) !== false;
};
