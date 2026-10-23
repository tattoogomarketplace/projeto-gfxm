import { NextResponse } from 'next/server';

export const RATE_LIMIT_WINDOW_MS = 10_000;

export const RATE_LIMIT_USERNAME = 12;
export const RATE_LIMIT_STRICT = 5;
export const RATE_LIMIT_PUBLIC = 40;
export const RATE_LIMIT_STANDARD = 60;

const MEMORY_BUCKET_CAP = 10_000;
const RATE_LIMIT_MESSAGE = 'Muitas tentativas. Aguarde um momento e tente novamente.';

type RateLimitRule = {
  limit: number;
  prefix: string;
};

type RateLimitDecision = {
  success: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
};

const memoryBuckets: Map<string, number[]> = (globalThis as unknown as {
  __tattoogoRateBuckets?: Map<string, number[]>;
}).__tattoogoRateBuckets ?? new Map<string, number[]>();

(globalThis as unknown as { __tattoogoRateBuckets?: Map<string, number[]> }).__tattoogoRateBuckets =
  memoryBuckets;

function matchRateLimitRule(pathname: string): RateLimitRule | null {
  if (pathname === '/api' || !pathname.startsWith('/api/')) return null;
  if (pathname === '/api/webhooks' || pathname.startsWith('/api/webhooks/')) return null;

  if (pathname === '/api/user/username' || pathname.startsWith('/api/user/username/')) {
    return { limit: RATE_LIMIT_USERNAME, prefix: 'username' };
  }

  if (
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/cnpj/') ||
    pathname.startsWith('/api/kyc/') ||
    pathname === '/api/search' ||
    pathname.startsWith('/api/search/') ||
    pathname.startsWith('/api/studios/validate-cnpj') ||
    pathname.startsWith('/api/artist/verify-ai')
  ) {
    return { limit: RATE_LIMIT_STRICT, prefix: 'strict' };
  }

  if (
    pathname.startsWith('/api/galeria') ||
    pathname.startsWith('/api/artistas') ||
    pathname.startsWith('/api/reviews') ||
    pathname.startsWith('/api/budget') ||
    pathname.startsWith('/api/catalogo')
  ) {
    return { limit: RATE_LIMIT_PUBLIC, prefix: 'public' };
  }

  return { limit: RATE_LIMIT_STANDARD, prefix: 'api' };
}

export function resolveRateLimitIp(request: Request): string {
  const headers = request.headers;
  const direct = headers.get('cf-connecting-ip') || headers.get('x-real-ip');
  if (direct?.trim()) return direct.trim();

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  return 'unknown';
}

function sanitizeKeyPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9:._-]/g, '_').slice(0, 128);
}

function memorySlidingWindow(key: string, limit: number, windowMs: number): RateLimitDecision {
  const now = Date.now();
  const cutoff = now - windowMs;
  const previous = memoryBuckets.get(key) ?? [];
  const fresh = previous.filter((stamp) => stamp > cutoff);
  fresh.push(now);

  if (memoryBuckets.size >= MEMORY_BUCKET_CAP && !memoryBuckets.has(key)) {
    const oldest = memoryBuckets.keys().next().value;
    if (oldest) memoryBuckets.delete(oldest);
  }

  memoryBuckets.set(key, fresh);

  const remaining = Math.max(0, limit - fresh.length);
  return {
    success: fresh.length <= limit,
    limit,
    remaining,
    resetMs: (fresh[0] ?? now) + windowMs,
  };
}

async function redisSlidingWindow(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitDecision | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/+$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const now = Date.now();
  const member = `${now}-${Math.random().toString(36).slice(2, 12)}`;

  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['ZREMRANGEBYSCORE', key, 0, now - windowMs],
      ['ZADD', key, now, member],
      ['ZCARD', key],
      ['PEXPIRE', key, windowMs],
    ]),
    cache: 'no-store',
  });

  if (!res.ok) return null;

  const payload = (await res.json()) as Array<{ result?: unknown; error?: string }>;
  if (!Array.isArray(payload) || payload.some((item) => item?.error)) return null;

  const count = Number(payload[2]?.result);
  if (!Number.isFinite(count)) return null;

  return {
    success: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    resetMs: now + windowMs,
  };
}

function tooManyRequests(decision: RateLimitDecision): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((decision.resetMs - Date.now()) / 1000));
  return NextResponse.json(
    { sucesso: false, erro: RATE_LIMIT_MESSAGE },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(decision.limit),
        'X-RateLimit-Remaining': String(decision.remaining),
        'X-RateLimit-Reset': String(Math.ceil(decision.resetMs / 1000)),
        'Cache-Control': 'no-store',
      },
    }
  );
}

export async function enforceApiRateLimit(request: Request): Promise<NextResponse | null> {
  const pathname = new URL(request.url).pathname;
  const rule = matchRateLimitRule(pathname);
  if (!rule) return null;

  const ip = resolveRateLimitIp(request);
  const key = `rl:v1:${rule.prefix}:${sanitizeKeyPart(ip)}`;

  try {
    const redisDecision = await redisSlidingWindow(key, rule.limit, RATE_LIMIT_WINDOW_MS);
    const decision = redisDecision ?? memorySlidingWindow(key, rule.limit, RATE_LIMIT_WINDOW_MS);
    if (decision.success) return null;
    return tooManyRequests(decision);
  } catch {
    const decision = memorySlidingWindow(key, rule.limit, RATE_LIMIT_WINDOW_MS);
    if (decision.success) return null;
    return tooManyRequests(decision);
  }
}
