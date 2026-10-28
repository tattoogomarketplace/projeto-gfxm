export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getPublicProfile, PublicProfileError } from '@/lib/services/public-profile';

function errorResponse(error: unknown) {
  if (error instanceof PublicProfileError) {
    return NextResponse.json({ sucesso: false, erro: error.message }, { status: error.status });
  }
  console.error('[profile/:username] falha inesperada', {
    error: error instanceof Error ? error.message : String(error),
  });
  return NextResponse.json(
    { sucesso: false, erro: 'Falha ao carregar o perfil público.' },
    { status: 500 }
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const profile = await getPublicProfile(decodeURIComponent(username));
    return NextResponse.json({ sucesso: true, profile });
  } catch (error) {
    return errorResponse(error);
  }
}
