import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  getUsernameUnlockDate,
  isUsernameChangeLocked,
  isUsernameForbiddenForRole,
  normalizeUsername,
  validateUsername,
  type UsernameValidationReason,
} from '@/lib/username';

/**
 * TATTOOGO MK — Troca do handle publico (@username).
 *
 * Fonte unica de verdade da mutacao, consumida pelo Server Action
 * (`app/actions/username-actions.ts`) e pelo Route Handler
 * (`app/api/user/username/route.ts`). Centralizar aqui garante que as regras de
 * formato, unicidade e a trava de 30 dias sejam identicas por qualquer porta.
 */

export type UsernameChangeResult =
  | { status: 'ok'; username: string; lastUsernameChange: Date }
  | { status: 'unchanged'; username: string; lastUsernameChange: Date | null }
  | { status: 'not_found' }
  | { status: 'forbidden' }
  | { status: 'invalid'; reason: UsernameValidationReason }
  | { status: 'taken' }
  | { status: 'locked'; nextChangeAt: Date };

type LockedPerfilRow = {
  id: string;
  role: string;
  username: string | null;
  last_username_change: Date | null;
  deleted_at: Date | null;
};

/**
 * Aplica a troca do @username dentro de UMA transacao com lock de linha
 * (`SELECT ... FOR UPDATE`). O lock serializa requisicoes concorrentes do mesmo
 * usuario, impedindo que duas trocas simultaneas burlem a trava de 30 dias.
 * Unicidade e reforcada pelo indice unico (`perfis_username_unique_idx`).
 */
export async function changeUsername(
  perfilId: string,
  rawUsername: unknown
): Promise<UsernameChangeResult> {
  const validation = validateUsername(rawUsername);
  if (!validation.valid) {
    return { status: 'invalid', reason: validation.reason };
  }
  const nextUsername = validation.username;

  try {
    return await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<LockedPerfilRow[]>`
        SELECT id, role::text AS role, username, last_username_change, deleted_at
        FROM public.perfis
        WHERE id = ${perfilId}::uuid
        FOR UPDATE
      `;
      const perfil = rows[0];

      if (!perfil || perfil.deleted_at) return { status: 'not_found' } as const;

      // Blindagem soberana: estudios nunca podem possuir @username.
      if (isUsernameForbiddenForRole(perfil.role)) return { status: 'forbidden' } as const;

      // Idempotencia: reenviar o mesmo handle nao consome a trava.
      if (perfil.username && normalizeUsername(perfil.username) === nextUsername) {
        return {
          status: 'unchanged',
          username: perfil.username,
          lastUsernameChange: perfil.last_username_change,
        } as const;
      }

      // Trava de 30 dias: rejeita com a data exata de desbloqueio.
      if (isUsernameChangeLocked(perfil.last_username_change)) {
        return {
          status: 'locked',
          nextChangeAt: getUsernameUnlockDate(perfil.last_username_change) as Date,
        } as const;
      }

      // Unicidade (case-insensitive): handles sao persistidos em minusculas.
      const conflict = await tx.perfil.findFirst({
        where: {
          username: { equals: nextUsername, mode: 'insensitive' },
          id: { not: perfil.id },
        },
        select: { id: true },
      });
      if (conflict) return { status: 'taken' } as const;

      // Atualizacao atomica: handle + timestamp na MESMA instrucao.
      const now = new Date();
      const updated = await tx.perfil.update({
        where: { id: perfil.id },
        data: { username: nextUsername, last_username_change: now },
        select: { username: true, last_username_change: true },
      });

      return {
        status: 'ok',
        username: updated.username ?? nextUsername,
        lastUsernameChange: updated.last_username_change ?? now,
      } as const;
    });
  } catch (error) {
    // Corrida de unicidade: o indice unico garante a integridade.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { status: 'taken' };
    }
    throw error;
  }
}
