import { NextResponse } from 'next/server';
import { resolvePerfilSession } from '@/lib/services/perfil-session';

export const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  Pragma: 'no-cache',
};

export const CATALOG_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
};

export function unauthorizedJson() {
  return NextResponse.json(
    { sucesso: false, erro: 'Não autenticado.' },
    { status: 401, headers: NO_STORE_HEADERS }
  );
}

export async function requireApiUserId(
  request: Request
): Promise<{ userId: string; response: null } | { userId: null; response: NextResponse }> {
  const { userId } = await resolvePerfilSession(request);
  if (!userId) {
    return { userId: null, response: unauthorizedJson() };
  }
  return { userId, response: null };
}

export function catalogJson(body: unknown, init?: { status?: number; cache?: boolean }) {
  const status = init?.status ?? 200;
  const headers = init?.cache && status === 200 ? CATALOG_CACHE_HEADERS : NO_STORE_HEADERS;
  return NextResponse.json(body, { status, headers });
}
