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
  /** Papel do perfil (`cliente` | `tatuador` | `estudio`). */
  role: string;
};

export const USER_SEARCH_MIN_LENGTH = 2;
/** Teto rigido de payload: nunca devolvemos mais que este numero de linhas. */
export const USER_SEARCH_LIMIT = 10;

/**
 * Gate soberano do `@`. A query DEVE casar exatamente `^@[a-z0-9_]+$`:
 * lowercase, sem espacos, sem acentos, sem simbolos e com o `@` obrigatorio.
 * Nenhuma query fora deste padrao chega ao banco de dados.
 */
export const USER_SEARCH_QUERY_PATTERN = /^@[a-z0-9_]+$/;

/**
 * Valida a query crua antes de qualquer operacao de banco. Alem do regex
 * ancorado, rejeita payloads maiores que o tamanho canonico de um handle
 * (`@` + USERNAME_MAX_LENGTH) para blindar contra overloading.
 */
export function isValidUsernameSearchQuery(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.length > USERNAME_MAX_LENGTH + 1) return false;
  return USER_SEARCH_QUERY_PATTERN.test(value);
}

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
      // `startsWith` (prefixo) e index-friendly: usa o btree unico de `username`
      // (`perfis_username_unique_idx`). `contains` (`%query%`) forcaria um full
      // scan. Usernames sao persistidos em lowercase, entao o `mode:
      // 'insensitive'` (redundante e hostile ao indice) nao e necessario.
      username: { startsWith: query },
      ...(excludePerfilId ? { id: { not: excludePerfilId } } : {}),
    },
    // Selectivity: apenas o minimo necessario para o dropdown de busca.
    select: { id: true, nome: true, username: true, role: true },
    orderBy: { username: 'asc' },
    take: USER_SEARCH_LIMIT,
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.nome,
    username: row.username,
    avatarUrl: null,
    role: row.role,
  }));
}
