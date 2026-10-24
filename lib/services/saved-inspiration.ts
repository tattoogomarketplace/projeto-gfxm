import type { InspirationItem } from '@/lib/gallery-mock';
import { mapPostToInspiration } from '@/lib/services/feed-posts';
import { prisma } from '@/lib/prisma';

export class SavedInspirationError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'SavedInspirationError';
  }
}

export type SavedInspirationToggleResult = {
  isSaved: boolean;
  message: string;
};

function normalizeId(value: string): string {
  return typeof value === 'string' ? value.trim() : '';
}

function prismaCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

export async function toggleSavedInspiration(
  userIdRaw: string,
  postIdRaw: string
): Promise<SavedInspirationToggleResult> {
  const userId = normalizeId(userIdRaw);
  const postId = normalizeId(postIdRaw);

  if (!userId || !postId) {
    throw new SavedInspirationError(400, 'userId e postId são obrigatórios.');
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true },
  });
  if (!post) {
    throw new SavedInspirationError(404, 'Inspiração não encontrada.');
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const existingSave = await tx.savedInspiration.findUnique({
        where: {
          userId_postId: { userId, postId },
        },
      });

      if (existingSave) {
        await tx.savedInspiration.delete({
          where: {
            userId_postId: { userId, postId },
          },
        });
        return {
          isSaved: false,
          message: 'Inspiração removida dos salvos.',
        };
      }

      await tx.savedInspiration.create({
        data: { userId, postId },
      });
      return {
        isSaved: true,
        message: 'Inspiração salva.',
      };
    });
  } catch (error) {
    const code = prismaCode(error);
    if (code === 'P2002') {
      return {
        isSaved: true,
        message: 'Inspiração salva.',
      };
    }
    if (code === 'P2025') {
      return {
        isSaved: false,
        message: 'Inspiração removida dos salvos.',
      };
    }
    if (code === 'P2003') {
      throw new SavedInspirationError(404, 'Inspiração não encontrada.');
    }
    if (code === 'P2021' || code === 'P2010') {
      console.error('[saved-inspiration] persistência indisponível', {
        code,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new SavedInspirationError(500, 'Persistência de salvos indisponível.');
    }
    throw error;
  }
}

export async function listSavedInspirations(
  userId: string,
  options?: { take?: number }
): Promise<InspirationItem[]> {
  const clerkUserId = normalizeId(userId);
  if (!clerkUserId) return [];

  const take = options?.take;
  if (typeof take === 'number' && (!Number.isFinite(take) || take < 1)) {
    return [];
  }

  try {
    const rows = await prisma.savedInspiration.findMany({
      where: { userId: clerkUserId },
      orderBy: { createdAt: 'desc' },
      ...(typeof take === 'number' ? { take } : {}),
      select: {
        post: {
          select: {
            id: true,
            imageUrl: true,
            authorName: true,
            authorAvatar: true,
            style: true,
            viewsCount: true,
          },
        },
      },
    });

    return rows.map((row) => mapPostToInspiration(row.post));
  } catch (error) {
    const code = prismaCode(error);
    if (code === 'P2021' || code === 'P2010') {
      console.error('[saved-inspiration] listagem indisponível', {
        code,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
    throw error;
  }
}

export async function listSavedInspirationIds(userId: string): Promise<string[]> {
  const clerkUserId = normalizeId(userId);
  if (!clerkUserId) return [];

  try {
    const rows = await prisma.savedInspiration.findMany({
      where: { userId: clerkUserId },
      orderBy: { createdAt: 'desc' },
      select: { postId: true },
    });
    return rows.map((row) => row.postId);
  } catch (error) {
    const code = prismaCode(error);
    if (code === 'P2021' || code === 'P2010') {
      console.error('[saved-inspiration] ids de salvos indisponíveis', {
        code,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
    throw error;
  }
}
