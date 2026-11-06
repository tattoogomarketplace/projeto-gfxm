'use server';

import { fetchExpressApi, resolveExpressAuthHeaders } from '@/lib/server/express-bff';

export type UpdateUsernameFailureReason =
  | 'unauthenticated'
  | 'not_found'
  | 'forbidden'
  | 'invalid'
  | 'taken'
  | 'locked'
  | 'error';

export type UpdateUsernameResult =
  | {
      ok: true;
      username: string;
      lastUsernameChange: string;
      unchanged: boolean;
    }
  | {
      ok: false;
      reason: UpdateUsernameFailureReason;
      error: string;
      nextChangeAt?: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asFailureReason(value: unknown): UpdateUsernameFailureReason {
  if (
    value === 'unauthenticated' ||
    value === 'not_found' ||
    value === 'forbidden' ||
    value === 'invalid' ||
    value === 'taken' ||
    value === 'locked' ||
    value === 'error'
  ) {
    return value;
  }
  return 'error';
}

export async function updateUsername(input: { username: unknown }): Promise<UpdateUsernameResult> {
  try {
    const authHeaders = await resolveExpressAuthHeaders();
    const { status, payload } = await fetchExpressApi('/api/user/username/action', {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: input.username }),
    });

    if (status === 401) {
      return { ok: false, reason: 'unauthenticated', error: 'Nao autenticado.' };
    }

    if (isRecord(payload) && payload.ok === true && typeof payload.username === 'string') {
      return {
        ok: true,
        username: payload.username,
        lastUsernameChange:
          typeof payload.lastUsernameChange === 'string'
            ? payload.lastUsernameChange
            : new Date().toISOString(),
        unchanged: payload.unchanged === true,
      };
    }

    if (isRecord(payload) && payload.ok === false) {
      const result: UpdateUsernameResult = {
        ok: false,
        reason: asFailureReason(payload.reason),
        error:
          typeof payload.error === 'string' && payload.error
            ? payload.error
            : 'Falha ao salvar o @username.',
      };
      if (typeof payload.nextChangeAt === 'string') {
        result.nextChangeAt = payload.nextChangeAt;
      }
      return result;
    }

    return { ok: false, reason: 'error', error: 'Falha ao salvar o @username.' };
  } catch (error) {
    console.error('[updateUsername] falha inesperada', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, reason: 'error', error: 'Falha ao salvar o @username.' };
  }
}
