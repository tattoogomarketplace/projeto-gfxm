import { NextResponse } from 'next/server';
import { catalogJson } from '@/lib/security/api-guard';

const FORWARD_HEADERS = ['authorization', 'cookie', 'accept', 'accept-language'] as const;

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

function buildUpstreamUrl(request: Request, pathname: string): string {
  const incoming = new URL(request.url);
  const target = new URL(pathname, `${expressOrigin()}/`);
  target.search = incoming.search;
  return target.toString();
}

function forwardHeaders(request: Request): Headers {
  const headers = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
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
