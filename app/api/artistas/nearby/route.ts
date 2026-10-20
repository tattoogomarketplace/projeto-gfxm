export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { GeoError, getNearbyArtists } from '@/lib/services/geo';
import { resolvePerfilSession } from '@/lib/services/perfil-session';

function errorResponse(error: unknown) {
  if (error instanceof GeoError) {
    return NextResponse.json({ sucesso: false, erro: error.message }, { status: error.status });
  }
  console.error('[artistas/nearby] falha inesperada', {
    error: error instanceof Error ? error.message : String(error),
  });
  return NextResponse.json(
    { sucesso: false, erro: 'Falha ao localizar artistas próximos.' },
    { status: 500 }
  );
}

export async function GET(request: Request) {
  try {
    const { userId } = await resolvePerfilSession(request);
    if (!userId) {
      return NextResponse.json({ sucesso: false, erro: 'Não autenticado.' }, { status: 401 });
    }

    const url = new URL(request.url);
    const payload = await getNearbyArtists(
      url.searchParams.get('lat') ?? url.searchParams.get('latitude'),
      url.searchParams.get('lng') ?? url.searchParams.get('longitude'),
      url.searchParams.get('radius') ?? url.searchParams.get('radiusKm')
    );
    return NextResponse.json({ sucesso: true, ...payload });
  } catch (error) {
    return errorResponse(error);
  }
}
