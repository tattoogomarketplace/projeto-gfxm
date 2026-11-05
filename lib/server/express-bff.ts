import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { catalogJson } from '@/lib/security/api-guard';

const FORWARD_HEADERS = ['authorization', 'cookie', 'accept', 'accept-language'] as const;
const RAW_FORWARD_HEADERS = [
  ...FORWARD_HEADERS,
  'content-type',
  'svix-id',
  'svix-timestamp',
  'svix-signature',
] as const;

export function expressOrigin(): string {
  return (process.env.EXPRESS_URL || 'http://localhost:3001').replace(/\/$/, '');
}

export async function fetchExpressApi(
  pathname: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<{ status: number; payload: unknown }> {
  const timeoutMs = init?.timeoutMs ?? 15_000;
  const { timeoutMs: _ignored, ...requestInit } = init ?? {};
  void _ignored;
  const url = new URL(pathname, `${expressOrigin()}/`).toString();
  const upstream = await fetch(url, {
    ...requestInit,
    cache: requestInit.cache ?? 'no-store',
    redirect: requestInit.redirect ?? 'manual',
    signal: requestInit.signal ?? AbortSignal.timeout(timeoutMs),
  });
  const payload = await upstream.json().catch(() => null);
  return { status: upstream.status, payload };
}

export async function resolveExpressAuthHeaders(): Promise<Record<string, string>> {
  const headersInit: Record<string, string> = { Accept: 'application/json' };
  let token: string | null = null;
  let cookie: string | null = null;

  try {
    const { getToken } = await auth();
    token = (await getToken()) || null;
  } catch {
    token = null;
  }

  try {
    const incoming = await headers();
    cookie = incoming.get('cookie');
    if (!token) {
      const authorization = incoming.get('authorization');
      if (authorization?.startsWith('Bearer ')) {
        const extracted = authorization.slice(7).trim();
        if (extracted) token = extracted;
      }
    }
  } catch {
    cookie = null;
  }

  if (token) headersInit.Authorization = `Bearer ${token}`;
  if (cookie) headersInit.cookie = cookie;
  return headersInit;
}

export async function fetchExpressAuthed(
  pathname: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<{ status: number; payload: unknown }> {
  const authHeaders = await resolveExpressAuthHeaders();
  const merged = new Headers(init?.headers);
  for (const [key, value] of Object.entries(authHeaders)) {
    if (!merged.has(key)) merged.set(key, value);
  }
  return fetchExpressApi(pathname, { ...init, headers: merged });
}

function buildUpstreamUrl(request: Request, pathname: string): string {
  const incoming = new URL(request.url);
  const target = new URL(pathname, `${expressOrigin()}/`);
  target.search = incoming.search;
  return target.toString();
}

function forwardHeaders(request: Request): Headers {
  const headersInit = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = request.headers.get(name);
    if (value) headersInit.set(name, value);
  }
  return headersInit;
}

export type ProxyCatalogOptions = {
  fallbackError: string;
  emptyItems?: boolean;
  noStore?: boolean;
};

function fallbackBody(options: ProxyCatalogOptions) {
  if (options.emptyItems) {
    return { sucesso: false, erro: options.fallbackError, items: [] };
  }
  return { sucesso: false, erro: options.fallbackError };
}

function jsonResponse(body: unknown, status: number, noStore: boolean) {
  if (noStore) {
    return catalogJson(body, { status });
  }
  return NextResponse.json(body, { status });
}

export async function proxyExpressCatalog(
  request: Request,
  pathname: string,
  options: ProxyCatalogOptions
): Promise<NextResponse> {
  const noStore = options.noStore !== false;
  try {
    const upstream = await fetch(buildUpstreamUrl(request, pathname), {
      method: 'GET',
      headers: forwardHeaders(request),
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
    });

    const payload = await upstream.json().catch(() => null);
    if (payload == null || typeof payload !== 'object') {
      return jsonResponse(fallbackBody(options), 500, noStore);
    }
    return jsonResponse(payload, upstream.status, noStore);
  } catch (error) {
    console.error('[express-bff] falha ao delegar catálogo', {
      pathname,
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse(fallbackBody(options), 500, noStore);
  }
}

export type ProxyRequestOptions = {
  method?: string;
  fallbackError?: string;
  timeoutMs?: number;
};

export async function proxyExpressRequest(
  request: Request,
  pathname: string,
  options?: ProxyRequestOptions
): Promise<NextResponse> {
  const method = (options?.method ?? request.method ?? 'GET').toUpperCase();
  const fallbackError = options?.fallbackError ?? 'Falha ao processar a requisição.';
  const timeoutMs = options?.timeoutMs ?? 15_000;
  const headersInit = forwardHeaders(request);
  const contentType = request.headers.get('content-type');
  if (contentType) headersInit.set('content-type', contentType);

  let body: ArrayBuffer | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    body = await request.arrayBuffer();
  }

  try {
    const upstream = await fetch(buildUpstreamUrl(request, pathname), {
      method,
      headers: headersInit,
      body: body && body.byteLength > 0 ? body : undefined,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });
    const payload = await upstream.json().catch(() => null);
    if (payload == null) {
      return NextResponse.json({ sucesso: false, erro: fallbackError }, { status: 500 });
    }
    return NextResponse.json(payload, { status: upstream.status });
  } catch (error) {
    console.error('[express-bff] falha ao delegar requisição', {
      pathname,
      method,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ sucesso: false, erro: fallbackError }, { status: 500 });
  }
}

export async function proxyExpressRaw(
  request: Request,
  pathname: string
): Promise<NextResponse> {
  const headersInit = new Headers();
  for (const name of RAW_FORWARD_HEADERS) {
    const value = request.headers.get(name);
    if (value) headersInit.set(name, value);
  }
  const body = await request.arrayBuffer();

  try {
    const upstream = await fetch(buildUpstreamUrl(request, pathname), {
      method: 'POST',
      headers: headersInit,
      body,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await upstream.json().catch(() => null);
    if (payload == null) {
      return NextResponse.json({ error: 'webhook_proxy_failed' }, { status: 500 });
    }
    return NextResponse.json(payload, { status: upstream.status });
  } catch (error) {
    console.error('[express-bff] falha ao delegar webhook', {
      pathname,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'webhook_proxy_failed' }, { status: 500 });
  }
}
