export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { GHOST_ARTIST_NAME, RELATIONAL_MOCK_POSTS, upsertGhostArtist } from '@/lib/db/seed-mocks';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ghostArtist = await upsertGhostArtist();

    await prisma.savedInspiration.deleteMany({ where: { userId } });

    const posts = await prisma.post.createManyAndReturn({
      data: RELATIONAL_MOCK_POSTS.map((post) => ({
        imageUrl: post.imageUrl,
        authorName: ghostArtist.nome ?? GHOST_ARTIST_NAME,
        authorAvatar: post.authorAvatar,
        style: post.style,
        viewsCount: post.viewsCount,
      })),
    });

    await prisma.savedInspiration.createMany({
      data: posts.map((post) => ({
        userId,
        postId: post.id,
      })),
    });

    revalidatePath('/', 'layout');

    return NextResponse.json({
      success: true,
      message: 'Posts created and saved to user profile.',
      ghostArtistId: ghostArtist.id,
    });
  } catch (e) {
    console.error('[api/dev/seed] falha ao semear posts', {
      error: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
