export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { RELATIONAL_MOCK_POSTS } from '@/lib/db/seed-mocks';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.savedInspiration.deleteMany({ where: { userId } });

    const posts = await prisma.post.createManyAndReturn({
      data: RELATIONAL_MOCK_POSTS.map((post) => ({
        imageUrl: post.imageUrl,
        authorName: post.authorName,
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
