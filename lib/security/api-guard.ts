import { NextResponse } from 'next/server';
import { resolvePerfilSession } from '@/lib/services/perfil-session';

export const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  Pragma: 'no-cache',
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

export function catalogJson(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: NO_STORE_HEADERS,
  });
}
