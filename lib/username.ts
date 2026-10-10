/**
 * TATTOOGO MK — Identidade universal (@username)
 *
 * Regras canonicas de normalizacao/validacao compartilhadas entre o frontend
 * (Magic Username Input) e o backend (Route Handler). O username e um handle
 * publico secundario: NUNCA substitui o nome de exibicao (`nome`).
 */

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

/**
 * Regex ancorada: apenas minusculas, digitos, ponto e underline. Sem espacos,
 * sem acentos e sem caracteres especiais. O primeiro caractere precisa ser
 * letra ou digito (evita handles iniciando com `.` ou `_`).
 */
export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._]*$/;

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
 * minúsculas, sem espacos. Nao remove caracteres invalidos (a validacao
 * precisa reporta-los), apenas aplica trim + lowercase.
 */
export function normalizeUsername(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
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
