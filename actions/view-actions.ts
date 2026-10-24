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
