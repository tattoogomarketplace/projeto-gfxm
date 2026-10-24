import type { InspirationItem } from '@/lib/gallery-mock';
import { prisma } from '@/lib/prisma';

const PREMIUM_FEED_POSTS = [
  {
    imageUrl:
      'https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?w=800&q=80&auto=format&fit=crop',
    authorName: 'Rafael Lima',
    authorAvatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&q=80&auto=format&fit=crop',
    style: 'Realismo',
  },
  {
    imageUrl:
      'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=800&q=80&auto=format&fit=crop',
    authorName: 'Marina Costa',
    authorAvatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&q=80&auto=format&fit=crop',
    style: 'Fine Line',
  },
  {
    imageUrl:
      'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=800&q=80&auto=format&fit=crop',
    authorName: 'Bianca Souza',
    authorAvatar:
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=240&q=80&auto=format&fit=crop',
    style: 'Blackwork',
  },
  {
    imageUrl:
      'https://images.unsplash.com/photo-1542727365-19732a80dcfd?w=800&q=80&auto=format&fit=crop',
    authorName: 'Diego Martins',
    authorAvatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&q=80&auto=format&fit=crop',
    style: 'Old School',
  },
  {
    imageUrl:
      'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800&q=80&auto=format&fit=crop',
    authorName: 'Camila Rocha',
    authorAvatar:
      'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=240&q=80&auto=format&fit=crop',
    style: 'Minimalista',
  },
] as const;

type FeedPostRow = {
  id: string;
  imageUrl: string;
  authorName: string;
  authorAvatar: string;
  style: string;
  viewsCount: number;
};

function artistInitial(nome: string): string {
  const letter = nome.trim().charAt(0);
  return letter ? letter.toUpperCase() : 'A';
}

export function mapPostToInspiration(post: FeedPostRow): InspirationItem {
  const artistName = post.authorName.trim();
  return {
    id: post.id,
    imageUrl: post.imageUrl,
    style: post.style,
    artistName,
    artistId: null,
    artistUsername: null,
    likes: 0,
    viewsCount: post.viewsCount ?? 0,
    artistAvatarUrl: post.authorAvatar,
    artistInitial: artistInitial(artistName),
  };
}

async function seedFeedPostsIfEmpty(): Promise<void> {
  const count = await prisma.post.count();
  if (count > 0) return;

  try {
    await prisma.post.createMany({
      data: PREMIUM_FEED_POSTS.map((post) => ({
        imageUrl: post.imageUrl,
        authorName: post.authorName,
        authorAvatar: post.authorAvatar,
        style: post.style,
      })),
    });
  } catch (error) {
    const code =
      error && typeof error === 'object' ? (error as { code?: unknown }).code : undefined;
    if (code !== 'P2002') {
      console.error('[feed-posts] falha ao semear posts', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export async function getFeedPosts(): Promise<InspirationItem[]> {
  await seedFeedPostsIfEmpty();

  const rows = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      imageUrl: true,
      authorName: true,
      authorAvatar: true,
      style: true,
      viewsCount: true,
    },
  });

  return rows.map(mapPostToInspiration);
}
