export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { getPublicProfile, PublicProfileError } from '@/lib/services/public-profile';
import { catalogJson } from '@/lib/security/api-guard';

function errorResponse(error: unknown) {
  if (error instanceof PublicProfileError) {
    return catalogJson({ sucesso: false, erro: error.message }, { status: error.status });
  }
  console.error('[profile/:username] falha inesperada', {
    error: error instanceof Error ? error.message : String(error),
  });
  return catalogJson(
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
    return catalogJson({ sucesso: true, profile });
  } catch (error) {
    return errorResponse(error);
  }
}
