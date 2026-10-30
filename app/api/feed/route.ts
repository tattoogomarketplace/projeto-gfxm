export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { DEFAULT_MEDIA_FILTER, mediaFilterSchema } from '@/lib/media-filter';
import { getFeedPosts } from '@/lib/services/feed-posts';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = mediaFilterSchema.safeParse(url.searchParams.get('media') ?? DEFAULT_MEDIA_FILTER);
    if (!parsed.success) {
      return NextResponse.json(
        { sucesso: false, erro: 'Filtro de mídia inválido.', items: [] },
        { status: 400 }
      );
    }
    const items = await getFeedPosts(parsed.data);
    return NextResponse.json({ sucesso: true, items });
  } catch (error) {
    console.error('[feed] falha inesperada', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { sucesso: false, erro: 'Falha ao carregar o feed.', items: [] },
      { status: 500 }
    );
  }
}
