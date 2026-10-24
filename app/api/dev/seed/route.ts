export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { RELATIONAL_MOCK_POSTS } from '@/lib/db/seed-mocks';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await prisma.post.deleteMany({});

    const created = await prisma.post.createMany({
      data: RELATIONAL_MOCK_POSTS.map((post) => ({
        imageUrl: post.imageUrl,
        authorName: post.authorName,
        authorAvatar: post.authorAvatar,
        style: post.style,
        viewsCount: post.viewsCount,
      })),
    });

    revalidatePath('/', 'layout');

    return NextResponse.json({
      success: true,
      message: 'Database seeded and cache purged.',
      count: created.count,
    });
  } catch (error) {
    console.error('[api/dev/seed] falha ao semear posts', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        success: false,
        message: 'Falha ao semear o banco e limpar o cache.',
      },
      { status: 500 }
    );
  }
}
