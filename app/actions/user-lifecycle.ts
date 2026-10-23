'use server';

import { AccountStatus, type PerfilRole } from '@prisma/client';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { after } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseAppRole, type AppRole } from '@/lib/utils/auth-redirect';
import { isValidCnpj, onlyCnpjDigits } from '@/lib/utils/cnpj';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

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

type PerfilLifecycleRow = {
  id: string;
  clerk_id: string | null;
  role: PerfilRole;
  cnpj: string | null;
  statusConta: AccountStatus;
  dataFim: Date | null;
  deleted_at: Date | null;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function requireActorUserId(): Promise<string | null> {
  try {
    const session = await auth();
    return session.userId ?? null;
  } catch {
    return null;
  }
}

async function findPerfilForLifecycle(userId: string): Promise<PerfilLifecycleRow | null> {
  const id = String(userId || '').trim();
  if (!id) return null;

  const select = {
    id: true,
    clerk_id: true,
    role: true,
    cnpj: true,
    statusConta: true,
    dataFim: true,
    deleted_at: true,
  } as const;

  const byClerk = await prisma.perfil.findUnique({
    where: { clerk_id: id },
    select,
  });
  if (byClerk) return byClerk;

  if (!isUuid(id)) return null;

  return prisma.perfil.findUnique({
    where: { id },
    select,
  });
}

function denyUnlessOwner(actorUserId: string | null, perfil: PerfilLifecycleRow): string | null {
  if (!actorUserId) return 'Não autenticado.';
  if (!perfil.clerk_id || perfil.clerk_id !== actorUserId) {
    return 'Não autorizado.';
  }
  return null;
}

function normalizeCnpj(value: unknown): string | null {
  const digits = onlyCnpjDigits(String(value ?? ''));
  if (!digits) return null;
  return isValidCnpj(digits) ? digits : null;
}

function resolveKycStatusForRole(role: AppRole): 'pendente' | 'nao_aplicavel' {
  return role === 'cliente' ? 'nao_aplicavel' : 'pendente';
}

export async function deactivateAccount(userId: string): Promise<LifecycleResult> {
  const actorUserId = await requireActorUserId();
  if (!actorUserId) return { ok: false, error: 'Não autenticado.' };

  const targetId = String(userId || '').trim();
  if (!targetId || targetId !== actorUserId) {
    return { ok: false, error: 'Não autorizado.' };
  }

  after(() => {
    void (async () => {
      try {
        const perfil = await findPerfilForLifecycle(targetId);
        if (!perfil) return;
        const denied = denyUnlessOwner(actorUserId, perfil);
        if (denied) return;
        await prisma.perfil.updateMany({
          where: { id: perfil.id, clerk_id: actorUserId, deleted_at: null },
          data: {
            statusConta: AccountStatus.DESATIVADO,
            agenda_bloqueada: true,
          },
        });
      } catch (error) {
        console.error('[user-lifecycle] falha ao desativar conta em background', {
          userId: targetId,
          error,
        });
      }
    })();
  });

  return {
    ok: true,
    userId: targetId,
    statusConta: AccountStatus.DESATIVADO,
  };
}

export async function scheduleAccountDeletion(userId: string): Promise<LifecycleResult> {
  const actorUserId = await requireActorUserId();
  if (!actorUserId) return { ok: false, error: 'Não autenticado.' };

  const targetId = String(userId || '').trim();
  if (!targetId || targetId !== actorUserId) {
    return { ok: false, error: 'Não autorizado.' };
  }

  const dataFim = new Date(Date.now() + NINETY_DAYS_MS);
  const now = new Date();

  after(() => {
    void (async () => {
      try {
        const perfil = await findPerfilForLifecycle(targetId);
        if (!perfil) return;
        const denied = denyUnlessOwner(actorUserId, perfil);
        if (denied) return;
        await prisma.perfil.updateMany({
          where: { id: perfil.id, clerk_id: actorUserId },
          data: {
            statusConta: AccountStatus.AGUARDANDO_EXCLUSAO,
            dataFim,
            deleted_at: perfil.deleted_at ?? now,
            agenda_bloqueada: true,
          },
        });
      } catch (error) {
        console.error('[user-lifecycle] falha ao agendar exclusão em background', {
          userId: targetId,
          error,
        });
      }
    })();
  });

  return {
    ok: true,
    userId: targetId,
    statusConta: AccountStatus.AGUARDANDO_EXCLUSAO,
    dataFim,
  };
}

export async function reactivateAccount(userId: string): Promise<LifecycleResult> {
  const actorUserId = await requireActorUserId();
  if (!actorUserId) return { ok: false, error: 'Não autenticado.' };

  const perfil = await findPerfilForLifecycle(userId);
  if (!perfil) return { ok: false, error: 'Perfil não encontrado.' };

  const denied = denyUnlessOwner(actorUserId, perfil);
  if (denied) return { ok: false, error: denied };

  const mutated = await prisma.perfil.updateMany({
    where: { id: perfil.id, clerk_id: actorUserId },
    data: {
      statusConta: AccountStatus.ATIVO,
      dataFim: null,
      deleted_at: null,
      agenda_bloqueada: false,
    },
  });
  if (mutated.count === 0) return { ok: false, error: 'Perfil não encontrado.' };

  const updated = await prisma.perfil.findFirst({
    where: { id: perfil.id, clerk_id: actorUserId },
    select: { id: true, statusConta: true, dataFim: true, role: true },
  });
  if (!updated) return { ok: false, error: 'Perfil não encontrado.' };

  return {
    ok: true,
    userId: updated.id,
    statusConta: updated.statusConta,
    dataFim: updated.dataFim,
    role: updated.role,
  };
}

export async function migrateUserRole(
  userId: string,
  newRole: string,
  extraData?: RoleMigrationExtraData
): Promise<LifecycleResult> {
  const actorUserId = await requireActorUserId();
  if (!actorUserId) return { ok: false, error: 'Não autenticado.' };

  const perfil = await findPerfilForLifecycle(userId);
  if (!perfil) return { ok: false, error: 'Perfil não encontrado.' };

  const denied = denyUnlessOwner(actorUserId, perfil);
  if (denied) return { ok: false, error: denied };

  const role = parseAppRole(newRole);
  if (!role) return { ok: false, error: 'Papel inválido.' };

  const cnpj =
    role === 'estudio'
      ? normalizeCnpj(extraData?.cnpj) ?? perfil.cnpj
      : perfil.cnpj;

  if (role === 'estudio' && extraData?.cnpj != null && extraData.cnpj !== '' && !normalizeCnpj(extraData.cnpj)) {
    return { ok: false, error: 'CNPJ inválido.' };
  }

  const nome =
    typeof extraData?.nome === 'string' && extraData.nome.trim()
      ? extraData.nome.trim()
      : undefined;

  const roleChanged = perfil.role !== role;

  const mutated = await prisma.perfil.updateMany({
    where: { id: perfil.id, clerk_id: actorUserId, deleted_at: null },
    data: {
      role,
      ...(role === 'estudio' && cnpj ? { cnpj } : {}),
      ...(nome ? { nome } : {}),
      ...(roleChanged
        ? {
            kyc_status: resolveKycStatusForRole(role),
            has_seen_welcome_notice: false,
          }
        : {}),
    },
  });
  if (mutated.count === 0) return { ok: false, error: 'Perfil não encontrado.' };

  const updated = await prisma.perfil.findFirst({
    where: { id: perfil.id, clerk_id: actorUserId, deleted_at: null },
    select: { id: true, clerk_id: true, role: true, statusConta: true, dataFim: true, cnpj: true },
  });
  if (!updated) return { ok: false, error: 'Perfil não encontrado.' };

  const clerkId = updated.clerk_id;
  if (clerkId) {
    const client = await clerkClient();
    const publicMetadata: Record<string, unknown> = { role: updated.role };
    if (updated.role === 'estudio' && updated.cnpj) {
      publicMetadata.cnpj = updated.cnpj;
    }

    await client.users.updateUserMetadata(clerkId, { publicMetadata });
  }

  return {
    ok: true,
    userId: updated.id,
    statusConta: updated.statusConta,
    dataFim: updated.dataFim,
    role: updated.role,
  };
}
