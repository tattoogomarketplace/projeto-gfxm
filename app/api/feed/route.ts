export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getFeedPosts } from '@/lib/services/feed-posts';

export async function GET() {
  try {
    const items = await getFeedPosts();
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
