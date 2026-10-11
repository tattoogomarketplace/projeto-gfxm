import { prisma } from '@/lib/prisma';
import { normalizeUsername, USERNAME_MAX_LENGTH } from '@/lib/username';

/**
 * TATTOOGO MK — Descoberta global restrita (`@username`).
 *
 * Regra de negocio soberana: a busca global de usuarios consulta EXCLUSIVAMENTE
 * a coluna `username`. O `nome` (Display Name) continua sendo a identidade
 * visual principal, mas NUNCA participa do filtro — usuarios nao podem mais ser
 * descobertos pelo nome generico. Isso eleva o valor de exclusividade do handle.
 */

export type UserSearchResult = {
  id: string;
  /** Display Name — identidade visual dominante na hierarquia do resultado. */
  name: string | null;
  /** Handle publico (`@username`). Unico criterio de descoberta. */
  username: string | null;
  avatarUrl: string | null;
};

export const USER_SEARCH_MIN_LENGTH = 2;
export const USER_SEARCH_LIMIT = 20;

/**
 * Remove o prefixo `@` digitado na barra de busca. Assim `@gabriel` e `gabriel`
 * consultam exatamente o mesmo handle no banco.
 */
export function stripUsernamePrefix(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/^@+/, '')
    .trim();
}

/**
 * Normaliza a entrada para o formato canonico de consulta (`@` removido,
 * minusculas, truncado ao tamanho maximo de um handle).
 */
export function normalizeSearchQuery(value: unknown): string {
  return normalizeUsername(stripUsernamePrefix(value)).slice(0, USERNAME_MAX_LENGTH);
}

export async function searchPerfisByUsername(
  rawQuery: unknown,
  excludePerfilId?: string
): Promise<UserSearchResult[]> {
  const query = normalizeSearchQuery(rawQuery);
  if (query.length < USER_SEARCH_MIN_LENGTH) return [];

  const rows = await prisma.perfil.findMany({
    where: {
      deleted_at: null,
      // UNICO criterio de busca: o handle publico. O `nome` jamais entra aqui.
      username: { contains: query, mode: 'insensitive' },
      ...(excludePerfilId ? { id: { not: excludePerfilId } } : {}),
    },
    select: { id: true, nome: true, username: true },
    orderBy: { username: 'asc' },
    take: USER_SEARCH_LIMIT,
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.nome,
    username: row.username,
    avatarUrl: null,
  }));
}
