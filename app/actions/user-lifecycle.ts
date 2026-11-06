'use server';

import { auth } from '@clerk/nextjs/server';
import { fetchExpressApi, resolveExpressAuthHeaders } from '@/lib/server/express-bff';
import type { AppRole } from '@/lib/utils/auth-redirect';

export type AccountStatus = 'ATIVO' | 'DESATIVADO' | 'AGUARDANDO_EXCLUSAO';

export type LifecycleResult = {
  ok: boolean;
  error?: string;
  userId?: string;
  statusConta?: AccountStatus;
  dataFim?: Date | null;
  role?: AppRole;
};

export type RoleMigrationExtraData = {
  cnpj?: string | null;
  nome?: string | null;
  [key: string]: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readError(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback;
  if (typeof payload.error === 'string' && payload.error) return payload.error;
  if (typeof payload.erro === 'string' && payload.erro) return payload.erro;
  return fallback;
}

function asAccountStatus(value: unknown): AccountStatus | undefined {
  if (value === 'ATIVO' || value === 'DESATIVADO' || value === 'AGUARDANDO_EXCLUSAO') {
    return value;
  }
  return undefined;
}

function asAppRole(value: unknown): AppRole | undefined {
  if (value === 'cliente' || value === 'tatuador' || value === 'estudio') return value;
  return undefined;
}

function asDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function requireActorUserId(): Promise<string | null> {
  try {
    const session = await auth();
    return session.userId ?? null;
  } catch {
    return null;
  }
}

async function callLifecycleApi(pathname: string, body?: unknown): Promise<LifecycleResult> {
  const authHeaders = await resolveExpressAuthHeaders();
  const { status, payload } = await fetchExpressApi(pathname, {
    method: 'POST',
    headers: {
      ...authHeaders,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (status === 401) return { ok: false, error: 'Não autenticado.' };

  if (!isRecord(payload) || payload.ok !== true) {
    return { ok: false, error: readError(payload, 'Falha ao processar o ciclo de vida.') };
  }

  const result: LifecycleResult = {
    ok: true,
    userId: typeof payload.userId === 'string' ? payload.userId : undefined,
    statusConta: asAccountStatus(payload.statusConta),
    role: asAppRole(payload.role),
  };

  const dataFim = asDate(payload.dataFim);
  if (dataFim !== undefined) result.dataFim = dataFim;

  return result;
}

export async function deactivateAccount(userId: string): Promise<LifecycleResult> {
  const actorUserId = await requireActorUserId();
  if (!actorUserId) return { ok: false, error: 'Não autenticado.' };

  const targetId = String(userId || '').trim();
  if (!targetId || targetId !== actorUserId) {
    return { ok: false, error: 'Não autorizado.' };
  }

  try {
    const result = await callLifecycleApi('/api/lifecycle/deactivate');
    if (!result.ok) return result;
    return {
      ok: true,
      userId: targetId,
      statusConta: result.statusConta ?? 'DESATIVADO',
    };
  } catch (error) {
    console.error('[user-lifecycle] falha ao desativar conta', {
      userId: targetId,
      error,
    });
    return { ok: false, error: 'Falha ao desativar conta.' };
  }
}

export async function scheduleAccountDeletion(userId: string): Promise<LifecycleResult> {
  const actorUserId = await requireActorUserId();
  if (!actorUserId) return { ok: false, error: 'Não autenticado.' };

  const targetId = String(userId || '').trim();
  if (!targetId || targetId !== actorUserId) {
    return { ok: false, error: 'Não autorizado.' };
  }

  try {
    const result = await callLifecycleApi('/api/lifecycle/schedule-deletion');
    if (!result.ok) return result;
    return {
      ok: true,
      userId: targetId,
      statusConta: result.statusConta ?? 'AGUARDANDO_EXCLUSAO',
      dataFim: result.dataFim ?? null,
    };
  } catch (error) {
    console.error('[user-lifecycle] falha ao agendar exclusão', {
      userId: targetId,
      error,
    });
    return { ok: false, error: 'Falha ao agendar exclusão.' };
  }
}

export async function reactivateAccount(userId: string): Promise<LifecycleResult> {
  const actorUserId = await requireActorUserId();
  if (!actorUserId) return { ok: false, error: 'Não autenticado.' };

  const targetId = String(userId || '').trim();
  if (!targetId) return { ok: false, error: 'Perfil não encontrado.' };

  try {
    return await callLifecycleApi('/api/lifecycle/reactivate');
  } catch (error) {
    console.error('[user-lifecycle] falha ao reativar conta', {
      userId: targetId,
      error,
    });
    return { ok: false, error: 'Falha ao reativar conta.' };
  }
}

export async function migrateUserRole(
  userId: string,
  newRole: string,
  extraData?: RoleMigrationExtraData
): Promise<LifecycleResult> {
  const actorUserId = await requireActorUserId();
  if (!actorUserId) return { ok: false, error: 'Não autenticado.' };

  const targetId = String(userId || '').trim();
  if (!targetId) return { ok: false, error: 'Perfil não encontrado.' };

  try {
    return await callLifecycleApi('/api/lifecycle/migrate-role', {
      newRole,
      extraData,
    });
  } catch (error) {
    console.error('[user-lifecycle] falha ao migrar papel', {
      userId: targetId,
      error,
    });
    return { ok: false, error: 'Falha ao migrar papel.' };
  }
}
