export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { ArtistVitrineError, getPublicArtistVitrine } from '@/lib/services/artist-vitrine';
import { catalogJson } from '@/lib/security/api-guard';

function errorResponse(error: unknown) {
  if (error instanceof ArtistVitrineError) {
    return catalogJson({ sucesso: false, erro: error.message }, { status: error.status });
  }
  console.error('[artistas/:id] falha inesperada', {
    error: error instanceof Error ? error.message : String(error),
  });
  return catalogJson(
    { sucesso: false, erro: 'Falha ao carregar a vitrine do artista.' },
    { status: 500 }
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vitrine = await getPublicArtistVitrine(id);
    return catalogJson({ sucesso: true, ...vitrine });
  } catch (error) {
    return errorResponse(error);
  }
}
