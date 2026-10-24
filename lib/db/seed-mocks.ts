import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

const VERTICAL_CROP = 'w=1080&h=1920&fit=crop&q=80&auto=format';

export const GHOST_ARTIST_ID = '00000000-0000-4000-a000-000000000123';
export const GHOST_ARTIST_CLERK_ID = 'ghost-artist-123';
export const GHOST_ARTIST_EMAIL = 'ghost.artist@tattoogo.mock';
export const GHOST_ARTIST_CPF = '00000000000';
export const GHOST_ARTIST_NAME = 'Marina Costa (Mock)';
export const GHOST_ARTIST_USERNAME = 'marina_costa_mock';

export const RELATIONAL_MOCK_POSTS = [
  {
    imageUrl: `https://images.unsplash.com/photo-1605497788044-5a32c7078486?${VERTICAL_CROP}`,
    authorName: 'Rafael Lima',
    authorAvatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&q=80&auto=format&fit=crop',
    style: 'Realismo',
    viewsCount: 18420,
  },
  {
    imageUrl: `https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?${VERTICAL_CROP}`,
    authorName: 'Marina Costa',
    authorAvatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&q=80&auto=format&fit=crop',
    style: 'Fine Line',
    viewsCount: 12840,
  },
  {
    imageUrl: `https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?${VERTICAL_CROP}`,
    authorName: 'Bianca Souza',
    authorAvatar:
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=240&q=80&auto=format&fit=crop',
    style: 'Blackwork',
    viewsCount: 22110,
  },
  {
    imageUrl: `https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?${VERTICAL_CROP}`,
    authorName: 'Diego Martins',
    authorAvatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&q=80&auto=format&fit=crop',
    style: 'Old School',
    viewsCount: 9732,
  },
  {
    imageUrl: `https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?${VERTICAL_CROP}`,
    authorName: 'Camila Rocha',
    authorAvatar:
      'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=240&q=80&auto=format&fit=crop',
    style: 'Minimalista',
    viewsCount: 15601,
  },
  {
    imageUrl: `https://images.unsplash.com/photo-1610859923918-ee3d5c85c1d3?${VERTICAL_CROP}`,
    authorName: 'Lucas Ferreira',
    authorAvatar:
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=240&q=80&auto=format&fit=crop',
    style: 'Geometrico',
    viewsCount: 6420,
  },
  {
    imageUrl: `https://images.unsplash.com/photo-1542727365-19732a80dcfd?${VERTICAL_CROP}`,
    authorName: 'Marina Costa',
    authorAvatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&q=80&auto=format&fit=crop',
    style: 'Oriental',
    viewsCount: 20112,
  },
  {
    imageUrl: `https://images.unsplash.com/photo-1560707854-fb9a10eeaace?${VERTICAL_CROP}`,
    authorName: 'Diego Martins',
    authorAvatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&q=80&auto=format&fit=crop',
    style: 'Neo Traditional',
    viewsCount: 8810,
  },
  {
    imageUrl: `https://images.unsplash.com/photo-1562962230-16e4623d36e6?${VERTICAL_CROP}`,
    authorName: 'Bianca Souza',
    authorAvatar:
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=240&q=80&auto=format&fit=crop',
    style: 'Aquarela',
    viewsCount: 13440,
  },
] as const;

const GHOST_ARTIST_CREATE = {
  id: GHOST_ARTIST_ID,
  clerk_id: GHOST_ARTIST_CLERK_ID,
  email: GHOST_ARTIST_EMAIL,
  nome: GHOST_ARTIST_NAME,
  username: GHOST_ARTIST_USERNAME,
  cpf: GHOST_ARTIST_CPF,
  role: 'tatuador' as const,
  kyc_status: 'nao_aplicavel' as const,
  accepted_terms: true,
  onboarded: true,
  language: 'pt-BR',
  status_responsavel: 'dispensado' as const,
  statusConta: 'ATIVO' as const,
};

const GHOST_ARTIST_UPDATE = {
  deleted_at: null,
  agenda_bloqueada: false,
  nome: GHOST_ARTIST_NAME,
  username: GHOST_ARTIST_USERNAME,
  cpf: GHOST_ARTIST_CPF,
  role: 'tatuador' as const,
  kyc_status: 'nao_aplicavel' as const,
  accepted_terms: true,
  onboarded: true,
  statusConta: 'ATIVO' as const,
};

export async function upsertGhostArtist() {
  return prisma.perfil.upsert({
    where: { clerk_id: GHOST_ARTIST_CLERK_ID },
    create: GHOST_ARTIST_CREATE,
    update: GHOST_ARTIST_UPDATE,
    select: { id: true, nome: true },
  });
}

export async function ensureMocksExist(): Promise<void> {
  const count = await prisma.post.count();
  if (count > 0) return;

  const ghostArtist = await upsertGhostArtist();
  const authorName = ghostArtist.nome ?? GHOST_ARTIST_NAME;

  await prisma.post.createMany({
    data: RELATIONAL_MOCK_POSTS.map((post) => ({
      imageUrl: post.imageUrl,
      authorName,
      authorAvatar: post.authorAvatar,
      style: post.style,
      viewsCount: post.viewsCount,
    })),
  });

  try {
    revalidatePath('/');
    revalidatePath('/dashboard/inspiracoes');
    revalidatePath('/dashboard/galeria');
    revalidatePath('/dashboard/cliente');
  } catch (error) {
    console.error('[seed-mocks] falha ao revalidar cache', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
