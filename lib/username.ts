/**
 * TATTOOGO MK — Identidade universal (@username)
 *
 * Regras canonicas de normalizacao/validacao compartilhadas entre o frontend
 * (Magic Username Input) e o backend (Route Handler / Server Action). O username
 * e um handle publico secundario: NUNCA substitui o nome de exibicao (`nome`).
 */

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

/**
 * Regex ancorada: apenas minusculas, digitos e underline. Sem espacos, sem
 * acentos, sem pontos e sem caracteres especiais.
 */
export const USERNAME_PATTERN = /^[a-z0-9_]+$/;

/**
 * Trava de negocio: o handle publico so pode ser alterado a cada 30 dias.
 * A regra vive aqui (fonte unica) e e aplicada tanto no application layer
 * quanto replicada por trigger no banco (database/migrations).
 */
export const USERNAME_CHANGE_LOCK_DAYS = 30;
export const USERNAME_CHANGE_LOCK_MS = USERNAME_CHANGE_LOCK_DAYS * 24 * 60 * 60 * 1000;

/**
 * Handles reservados para rotas do produto, marcas protegidas e termos
 * institucionais. Comparados sempre em minusculas.
 */
export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  'admin',
  'administrador',
  'tatuogo',
  'tattoogo',
  'tattoogomk',
  'tattoogomarketplace',
  'suporte',
  'support',
  'help',
  'ajuda',
  'oficial',
  'official',
  'equipe',
  'team',
  'root',
  'moderador',
  'mod',
  'api',
  'www',
  'app',
  'dashboard',
  'login',
  'register',
  'cadastro',
  'perfil',
  'profile',
  'conta',
  'account',
  'chat',
  'galeria',
  'gallery',
  'artista',
  'estudio',
  'studio',
]);

export type UsernameValidationReason =
  | 'empty'
  | 'too_short'
  | 'too_long'
  | 'invalid_chars'
  | 'reserved';

export type UsernameValidation =
  | { valid: true; username: string }
  | { valid: false; reason: UsernameValidationReason };

/**
 * Normaliza a entrada do usuario para o formato canonico armazenado:
 * remove TODOS os espacos, remove prefixos `@` e aplica minusculas. Nao remove
 * caracteres invalidos do meio (a validacao precisa reporta-los).
 */
export function normalizeUsername(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .replace(/^@+/, '')
    .toLowerCase();
}

/**
 * Sanitiza o CORPO do handle enquanto o usuario digita. O `@` e um prefixo
 * visual inline (fora do `<input>`), entao aqui tratamos apenas o corpo:
 * remove prefixos `@` (evita `@@`), aplica minusculas e mantem somente
 * `[a-z0-9_]` — espacos e simbolos sao removidos no mesmo tick.
 *
 * Compartilhado entre o `SearchBar` (descoberta) e a tela de onboarding para
 * garantir mascaramento identico e inviolavel por qualquer porta de entrada.
 */
export function sanitizeUsernameBody(raw: unknown): string {
  return String(raw ?? '')
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
}

export function isUsernameValid(value: unknown): boolean {
  return validateUsername(value).valid;
}

export function validateUsername(value: unknown): UsernameValidation {
  const username = normalizeUsername(value);

  if (!username) return { valid: false, reason: 'empty' };
  if (username.length < USERNAME_MIN_LENGTH) return { valid: false, reason: 'too_short' };
  if (username.length > USERNAME_MAX_LENGTH) return { valid: false, reason: 'too_long' };
  if (!USERNAME_PATTERN.test(username)) return { valid: false, reason: 'invalid_chars' };
  if (RESERVED_USERNAMES.has(username)) return { valid: false, reason: 'reserved' };

  return { valid: true, username };
}

/**
 * Estudios (role = estudio) sao estritamente proibidos de possuir username.
 * Centralizado aqui para que frontend e backend usem exatamente a mesma regra.
 */
export function isUsernameForbiddenForRole(role: unknown): boolean {
  return normalizeUsername(role) === 'estudio';
}

/**
 * Instante exato em que a trava de 30 dias expira. `null` quando o usuario
 * ainda nunca trocou o handle (primeira definicao e livre).
 */
export function getUsernameUnlockDate(lastChange: Date | null | undefined): Date | null {
  if (!lastChange) return null;
  return new Date(new Date(lastChange).getTime() + USERNAME_CHANGE_LOCK_MS);
}

/**
 * `true` enquanto o usuario estiver dentro da janela de 30 dias da ultima
 * troca. Aceitar `now` injetavel mantem a funcao pura e testavel.
 */
export function isUsernameChangeLocked(
  lastChange: Date | null | undefined,
  now: Date = new Date()
): boolean {
  const unlock = getUsernameUnlockDate(lastChange);
  if (!unlock) return false;
  return now.getTime() < unlock.getTime();
}
