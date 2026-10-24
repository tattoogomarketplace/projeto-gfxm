import { ensureMocksExist } from '@/lib/db/seed-mocks';
import type { InspirationItem } from '@/lib/gallery-mock';
import { prisma } from '@/lib/prisma';

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

export async function getFeedPosts(): Promise<InspirationItem[]> {
  await ensureMocksExist();

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
