import 'server-only';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const VERIFY_TIMEOUT_MS = 8000;

export type TurnstileVerification =
  | { configured: false; success: true }
  | { configured: true; success: boolean; errorCodes: string[] };

export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

export function resolveClientIp(request: Request): string | undefined {
  const headers = request.headers;
  const direct = headers.get('cf-connecting-ip') || headers.get('x-real-ip');
  if (direct?.trim()) return direct.trim();

  const forwarded = headers.get('x-forwarded-for');
  if (!forwarded) return undefined;
  const first = forwarded.split(',')[0]?.trim();
  return first || undefined;
}

/**
 * Valida um token do Cloudflare Turnstile via `siteverify`.
 *
 * Fail-open apenas quando `TURNSTILE_SECRET_KEY` não está configurada
 * (ambientes de desenvolvimento): sem segredo não há como validar, então não
 * bloqueamos o fluxo. Em produção, a ausência de segredo deve ser tratada como
 * misconfiguração — por isso a checagem `/api/health` deve garantir a variável.
 */
export async function verifyTurnstileToken(
  token: unknown,
  remoteIp?: string
): Promise<TurnstileVerification> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    return { configured: false, success: true };
  }

  const response = typeof token === 'string' ? token.trim() : '';
  if (!response) {
    return { configured: true, success: false, errorCodes: ['missing-input-response'] };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
  try {
    const payload = new URLSearchParams({ secret, response });
    if (remoteIp) payload.set('remoteip', remoteIp);

    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload.toString(),
      cache: 'no-store',
      signal: controller.signal,
    });

    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      'error-codes'?: string[];
    };

    return {
      configured: true,
      success: Boolean(data.success),
      errorCodes: Array.isArray(data['error-codes']) ? data['error-codes'] : [],
    };
  } catch (error) {
    console.error('[turnstile] falha na verificação siteverify', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { configured: true, success: false, errorCodes: ['internal-error'] };
  } finally {
    clearTimeout(timeout);
  }
}
