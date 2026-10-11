'use server';

import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { changeUsername } from '@/lib/services/username-change';
import type { UsernameValidationReason } from '@/lib/username';

/**
 * TATTOOGO MK — Server Action `updateUsername` (The Shield).
 *
 * Porta soberana para a troca do handle publico (@username). Aplica, nesta
 * ordem, todas as regras do protocolo:
 *   1) Formato: apenas minusculas, digitos e underline (`^[a-z0-9_]+$`).
 *      Espacos e prefixos `@` sao removidos antes de persistir.
 *   2) Unicidade: rejeita handles ja existentes (case-insensitive).
 *   3) Trava de 30 dias: rejeita a troca e devolve a data EXATA de desbloqueio.
 *
 * Toda a escrita acontece em UMA transacao (`changeUsername`) atualizando
 * `username` e `last_username_change` simultaneamente.
 */

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

const INVALID_MESSAGES: Record<UsernameValidationReason, string> = {
  empty: 'Informe um @username.',
  too_short: 'O @username precisa ter ao menos 3 caracteres.',
  too_long: 'O @username pode ter no maximo 20 caracteres.',
  invalid_chars:
    'O @username aceita apenas letras minusculas, numeros e underline.',
  reserved: 'Este @username e reservado.',
};

function formatUnlockDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}

/**
 * Atualiza o @username do usuario autenticado. NUNCA toca no campo `nome`
 * (Display Name), que permanece a identidade visual soberana.
 */
export async function updateUsername(input: { username: unknown }): Promise<UpdateUsernameResult> {
  let userId: string | null = null;
  try {
    ({ userId } = await auth());
  } catch {
    userId = null;
  }

  if (!userId) {
    return { ok: false, reason: 'unauthenticated', error: 'Nao autenticado.' };
  }

  try {
    const perfil = await prisma.perfil.findFirst({
      where: { clerk_id: userId, deleted_at: null },
      select: { id: true },
    });

    if (!perfil) {
      return { ok: false, reason: 'not_found', error: 'Perfil nao encontrado.' };
    }

    const result = await changeUsername(perfil.id, input.username);

    switch (result.status) {
      case 'ok':
        return {
          ok: true,
          username: result.username,
          lastUsernameChange: result.lastUsernameChange.toISOString(),
          unchanged: false,
        };
      case 'unchanged':
        return {
          ok: true,
          username: result.username,
          lastUsernameChange: (result.lastUsernameChange ?? new Date()).toISOString(),
          unchanged: true,
        };
      case 'not_found':
        return { ok: false, reason: 'not_found', error: 'Perfil nao encontrado.' };
      case 'forbidden':
        return {
          ok: false,
          reason: 'forbidden',
          error: 'Estudios nao podem definir um @username.',
        };
      case 'invalid':
        return { ok: false, reason: 'invalid', error: INVALID_MESSAGES[result.reason] };
      case 'taken':
        return { ok: false, reason: 'taken', error: 'Este @username ja esta em uso.' };
      case 'locked': {
        const nextChangeAt = result.nextChangeAt;
        return {
          ok: false,
          reason: 'locked',
          error: `A troca de @username esta bloqueada por 30 dias. Voce podera altera-lo novamente em ${formatUnlockDate(nextChangeAt)}.`,
          nextChangeAt: nextChangeAt.toISOString(),
        };
      }
    }
  } catch (error) {
    console.error('[updateUsername] falha inesperada', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, reason: 'error', error: 'Falha ao salvar o @username.' };
  }
}
