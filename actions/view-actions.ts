'use server';

import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const registerViewBatchSchema = z.object({
  postIds: z.array(z.string().trim().min(1).max(64)).max(50),
  visitorToken: z.string().trim().min(8).max(128),
});

export type RegisterViewBatchResult =
  | { success: true; registered: number }
  | { success: false; error: string };

const getPostViewersSchema = z.object({
  postId: z.string().trim().min(1).max(64),
});

export type PostViewerUser = {
  id: string;
  username: string;
  avatarUrl: string | null;
};

export type GetPostViewersResult =
  | {
      success: true;
      anonymousCount: number;
      viewers: PostViewerUser[];
      viewsCount: number;
    }
  | { success: false; error: string };

function prismaCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

export async function registerViewBatch(
  postIds: string[],
  visitorToken: string
): Promise<RegisterViewBatchResult> {
  const parsed = registerViewBatchSchema.safeParse({ postIds, visitorToken });
  if (!parsed.success) {
    return { success: false, error: 'Payload de visualizações inválido.' };
  }

  const uniquePostIds = Array.from(new Set(parsed.data.postIds));
  const token = parsed.data.visitorToken;
  if (uniquePostIds.length === 0) {
    return { success: true, registered: 0 };
  }

  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session.userId ?? null;
  } catch {
    userId = null;
  }

  try {
    const registered = await prisma.$transaction(async (tx) => {
      let count = 0;

      const existingPosts = await tx.post.findMany({
        where: { id: { in: uniquePostIds } },
        select: { id: true },
      });
      const validIds = existingPosts.map((post) => post.id);
      if (validIds.length === 0) return 0;

      const alreadyViewed = await tx.postView.findMany({
        where: userId
          ? { postId: { in: validIds }, userId }
          : { postId: { in: validIds }, visitorToken: token },
        select: { postId: true },
      });
      const seen = new Set(alreadyViewed.map((row) => row.postId));

      for (const postId of validIds) {
        if (seen.has(postId)) continue;

        try {
          await tx.postView.create({
            data: {
              postId,
              userId,
              visitorToken: token,
            },
          });
          await tx.post.update({
            where: { id: postId },
            data: { viewsCount: { increment: 1 } },
          });
          count += 1;
        } catch (error) {
          const code = prismaCode(error);
          if (code === 'P2002' || code === 'P2003') continue;
          throw error;
        }
      }

      return count;
    });

    return { success: true, registered };
  } catch (error) {
    console.error('[view-actions] falha ao registrar visualizações', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error: 'Falha ao registrar visualizações.' };
  }
}

function formatHandle(username: string | null, clerkId: string): string {
  const handle = username?.trim().replace(/^@+/, '');
  if (handle) return `@${handle}`;
  return `@${clerkId.slice(0, 8)}`;
}

export async function getPostViewers(postId: string): Promise<GetPostViewersResult> {
  const parsed = getPostViewersSchema.safeParse({ postId });
  if (!parsed.success) {
    return { success: false, error: 'Post inválido.' };
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id: parsed.data.postId },
      select: { id: true, viewsCount: true },
    });
    if (!post) {
      return { success: false, error: 'Post não encontrado.' };
    }

    const [anonymousCount, registeredViews] = await Promise.all([
      prisma.postView.count({
        where: { postId: post.id, userId: null },
      }),
      prisma.postView.findMany({
        where: { postId: post.id, userId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 80,
        select: { userId: true },
      }),
    ]);

    const clerkIds = Array.from(
      new Set(
        registeredViews
          .map((row) => row.userId)
          .filter((id): id is string => Boolean(id))
      )
    );

    const profiles =
      clerkIds.length === 0
        ? []
        : await prisma.perfil.findMany({
            where: { clerk_id: { in: clerkIds }, deleted_at: null },
            select: { clerk_id: true, username: true, nome: true },
          });

    const profileByClerk = new Map(
      profiles.map((perfil) => [perfil.clerk_id ?? '', perfil])
    );

    const viewers: PostViewerUser[] = clerkIds.map((clerkId) => {
      const perfil = profileByClerk.get(clerkId);
      return {
        id: clerkId,
        username: formatHandle(perfil?.username ?? perfil?.nome ?? null, clerkId),
        avatarUrl: null,
      };
    });

    return {
      success: true,
      anonymousCount,
      viewers,
      viewsCount: post.viewsCount,
    };
  } catch (error) {
    console.error('[view-actions] falha ao listar visualizações', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error: 'Falha ao carregar visualizações.' };
  }
}
