export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { RELATIONAL_MOCK_POSTS } from '@/lib/db/seed-mocks';
import { prisma } from '@/lib/prisma';

const GHOST_ARTIST_ID = '00000000-0000-4000-a000-000000000123';
const GHOST_ARTIST_CLERK_ID = 'ghost-artist-123';
const GHOST_ARTIST_EMAIL = 'ghost.artist@tattoogo.mock';
const GHOST_ARTIST_CPF = '00000000000';
const GHOST_ARTIST_NAME = 'Marina Costa (Mock)';
const GHOST_ARTIST_USERNAME = 'marina_costa_mock';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ghostArtist = await prisma.perfil.upsert({
      where: { clerk_id: GHOST_ARTIST_CLERK_ID },
      create: {
        id: GHOST_ARTIST_ID,
        clerk_id: GHOST_ARTIST_CLERK_ID,
        email: GHOST_ARTIST_EMAIL,
        nome: GHOST_ARTIST_NAME,
        username: GHOST_ARTIST_USERNAME,
        cpf: GHOST_ARTIST_CPF,
        role: 'tatuador',
        kyc_status: 'nao_aplicavel',
        accepted_terms: true,
        onboarded: true,
        language: 'pt-BR',
        status_responsavel: 'dispensado',
        statusConta: 'ATIVO',
      },
      update: {
        deleted_at: null,
        agenda_bloqueada: false,
        nome: GHOST_ARTIST_NAME,
        username: GHOST_ARTIST_USERNAME,
        cpf: GHOST_ARTIST_CPF,
        role: 'tatuador',
        kyc_status: 'nao_aplicavel',
        accepted_terms: true,
        onboarded: true,
        statusConta: 'ATIVO',
      },
      select: { id: true, nome: true },
    });

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
