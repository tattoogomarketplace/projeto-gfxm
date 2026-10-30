export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { DEFAULT_MEDIA_FILTER, mediaFilterSchema } from '@/lib/media-filter';
import { getFeedPosts } from '@/lib/services/feed-posts';
import { catalogJson } from '@/lib/security/api-guard';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = mediaFilterSchema.safeParse(url.searchParams.get('media') ?? DEFAULT_MEDIA_FILTER);
    if (!parsed.success) {
      return catalogJson(
        { sucesso: false, erro: 'Filtro de mídia inválido.', items: [] },
        { status: 400 }
      );
    }
    const items = await getFeedPosts(parsed.data);
    return catalogJson({ sucesso: true, items });
  } catch (error) {
    console.error('[feed] falha inesperada', {
      error: error instanceof Error ? error.message : String(error),
    });
    return catalogJson(
      { sucesso: false, erro: 'Falha ao carregar o feed.', items: [] },
      { status: 500 }
    );
  }
}
