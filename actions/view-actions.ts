'use server';

import { z } from 'zod';
import { fetchExpressApi, resolveExpressAuthHeaders } from '@/lib/server/express-bff';

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readError(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback;
  if (typeof payload.error === 'string' && payload.error) return payload.error;
  if (typeof payload.erro === 'string' && payload.erro) return payload.erro;
  return fallback;
}

async function callViewsApi(pathname: string, init?: RequestInit) {
  const authHeaders = await resolveExpressAuthHeaders();
  return fetchExpressApi(pathname, {
    ...init,
    headers: {
      ...authHeaders,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
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

  try {
    const { payload } = await callViewsApi('/api/views/batch', {
      method: 'POST',
      body: JSON.stringify({ postIds: uniquePostIds, visitorToken: token }),
    });

    if (isRecord(payload) && payload.success === true && typeof payload.registered === 'number') {
      return { success: true, registered: payload.registered };
    }

    return { success: false, error: readError(payload, 'Falha ao registrar visualizações.') };
  } catch (error) {
    console.error('[view-actions] falha ao registrar visualizações', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error: 'Falha ao registrar visualizações.' };
  }
}

export async function getPostViewers(postId: string): Promise<GetPostViewersResult> {
  const parsed = getPostViewersSchema.safeParse({ postId });
  if (!parsed.success) {
    return { success: false, error: 'Post inválido.' };
  }

  try {
    const { payload } = await callViewsApi(
      `/api/views/${encodeURIComponent(parsed.data.postId)}`
    );

    if (
      isRecord(payload) &&
      payload.success === true &&
      typeof payload.anonymousCount === 'number' &&
      typeof payload.viewsCount === 'number' &&
      Array.isArray(payload.viewers)
    ) {
      return {
        success: true,
        anonymousCount: payload.anonymousCount,
        viewers: payload.viewers as PostViewerUser[],
        viewsCount: payload.viewsCount,
      };
    }

    return { success: false, error: readError(payload, 'Falha ao carregar visualizações.') };
  } catch (error) {
    console.error('[view-actions] falha ao listar visualizações', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error: 'Falha ao carregar visualizações.' };
  }
}
