import { MediaType } from '@prisma/client';
import { ensureMocksExist } from '@/lib/db/seed-mocks';
import type { InspirationItem } from '@/lib/gallery-mock';
import type { MediaFilter } from '@/lib/media-filter';
import { prisma } from '@/lib/prisma';

type FeedPostRow = {
  id: string;
  imageUrl: string;
  authorName: string;
  authorAvatar: string;
  style: string;
  viewsCount: number;
};

function mediaTypeWhere(filter: MediaFilter): { mediaType: MediaType } | undefined {
  if (filter === 'photo') return { mediaType: MediaType.PHOTO };
  if (filter === 'video') return { mediaType: MediaType.VIDEO };
  return undefined;
}

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

export async function getFeedPosts(filter: MediaFilter = 'photo'): Promise<InspirationItem[]> {
  try {
    await ensureMocksExist();
  } catch (error) {
    console.error('[feed-posts] auto-seed falhou', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const mediaWhere = mediaTypeWhere(filter);
  const rows = await prisma.post.findMany({
    where: mediaWhere,
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
