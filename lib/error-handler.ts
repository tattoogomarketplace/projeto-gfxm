import { t } from '@/lib/i18n/store';
import { MESSAGE_KEYS } from '@/lib/i18n/dictionary';
import type { Locale, MessageKey } from '@/lib/i18n/types';

const MESSAGE_KEY_SET = new Set<string>(MESSAGE_KEYS);

function isMessageKey(value: string): value is MessageKey {
  return MESSAGE_KEY_SET.has(value);
}

type ClerkErrorItem = {
  code?: string;
  message?: string;
  longMessage?: string;
  meta?: Record<string, unknown>;
};

type ClerkLikeError = {
  errors?: ClerkErrorItem[];
  clerkError?: boolean;
  status?: number;
  message?: string;
  code?: string;
};

type AxiosLikeError = {
  isAxiosError?: boolean;
  code?: string;
  message?: string;
  response?: {
    status?: number;
    data?: unknown;
  };
  request?: unknown;
};

export type ErrorContext =
  | 'generic'
  | 'auth'
  | 'signup'
  | 'reset'
  | 'password'
  | 'api';

const CLERK_CODE_KEYS: Record<string, MessageKey> = {
  form_password_incorrect: 'errors.clerk.passwordIncorrect',
  form_password_pwned: 'errors.clerk.passwordPwned',
  form_password_not_strong_enough: 'errors.clerk.passwordWeak',
  form_password_size_in_bytes_exceeded: 'errors.clerk.passwordSize',
  form_password_validation_failed: 'errors.clerk.passwordWeak',
  form_code_incorrect: 'errors.clerk.codeInvalid',
  form_identification_not_found: 'errors.clerk.identifierNotFound',
  identifier_not_found: 'errors.clerk.identifierNotFound',
  form_identifier_not_found: 'errors.clerk.identifierNotFound',
  form_identifier_exists: 'errors.clerk.emailExists',
  form_identifier_exists_email: 'errors.clerk.emailExists',
  form_param_format_invalid: 'errors.generic',
  session_exists: 'errors.generic',
  requires_verification: 'errors.clerk.requiresVerification',
  session_reverification_required: 'errors.clerk.requiresVerification',
  reverification_cancelled: 'errors.clerk.requiresVerification',
  verification_failed: 'errors.clerk.codeInvalid',
  verification_expired: 'errors.clerk.codeExpired',
  verification_already_verified: 'errors.clerk.codeInvalid',
  too_many_requests: 'errors.rateLimited',
  rate_limit_exceeded: 'errors.rateLimited',
  strategy_for_user_invalid: 'errors.clerk.authFailed',
};

const CONTEXT_FALLBACK: Record<ErrorContext, MessageKey> = {
  generic: 'errors.generic',
  auth: 'errors.clerk.authFailed',
  signup: 'errors.clerk.signupFailed',
  reset: 'errors.clerk.resetFailed',
  password: 'errors.clerk.passwordChangeFailed',
  api: 'errors.generic',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function firstClerkError(err: unknown): ClerkErrorItem | null {
  if (!isRecord(err) || !Array.isArray(err.errors) || err.errors.length === 0) {
    return null;
  }
  const first = err.errors[0];
  return isRecord(first) ? (first as ClerkErrorItem) : null;
}

function collectText(err: unknown): string {
  const chunks: string[] = [];
  const clerk = firstClerkError(err);
  if (clerk) {
    chunks.push(asString(clerk.code), asString(clerk.longMessage), asString(clerk.message));
  }
  if (isRecord(err)) {
    chunks.push(asString(err.code), asString(err.message), asString(err.status));
    const response = isRecord(err.response) ? err.response : null;
    const data = response && isRecord(response.data) ? response.data : isRecord(err.data) ? err.data : null;
    if (data) {
      chunks.push(
        asString(data.erro),
        asString(data.error),
        asString(data.message),
        asString(data.msg),
        asString(data.code)
      );
    }
    const meta = isRecord(err.meta) ? err.meta : null;
    if (meta) {
      const target = meta.target;
      if (Array.isArray(target)) {
        chunks.push(target.map((item) => asString(item)).filter(Boolean).join(' '));
      } else {
        chunks.push(asString(target));
      }
      chunks.push(asString(meta.field_name), asString(meta.modelName));
    }
  }
  if (err instanceof Error) {
    chunks.push(err.message, err.name);
  }
  return chunks.filter(Boolean).join(' ').toLowerCase();
}

function matchByText(haystack: string): MessageKey | null {
  if (!haystack) return null;

  if (
    haystack.includes('additional verification') ||
    haystack.includes('requires_verification') ||
    haystack.includes('verification required') ||
    haystack.includes('reverification') ||
    haystack.includes('reauthentication') ||
    haystack.includes('re-authentication') ||
    haystack.includes('step-up') ||
    haystack.includes('step_up') ||
    haystack.includes('second factor')
  ) {
    return 'errors.clerk.requiresVerification';
  }
  if (haystack.includes('form_password_incorrect') || haystack.includes('password is incorrect') || haystack.includes('incorrect password') || haystack.includes('current password') || haystack.includes('senha incorreta') || haystack.includes('senha inválida') || haystack.includes('senha invalida') || haystack.includes('senha atual incorreta')) {
    return 'errors.clerk.passwordIncorrect';
  }
  if (haystack.includes('clerk not ready') || haystack.includes('clerk is not') || haystack.includes('clerk não') || haystack.includes('clerk nao') || haystack.includes('not_ready') || haystack.includes('not ready')) {
    return 'errors.clerk.notReady';
  }
  if (
    haystack.includes('email code unavailable') ||
    haystack.includes('email_code_unavailable') ||
    haystack.includes('login por código de e-mail') ||
    haystack.includes('login por codigo de e-mail')
  ) {
    return 'auth.emailCodeUnavailable';
  }
  if (haystack.includes('cnpj') && (haystack.includes('não encontrado') || haystack.includes('nao encontrado') || haystack.includes('not found'))) {
    return 'auth.cnpjNotFound';
  }
  if (haystack.includes('cnpj') && (haystack.includes('inválido') || haystack.includes('invalido') || haystack.includes('invalid'))) {
    return 'auth.invalidCnpj';
  }
  if (
    (haystack.includes('e-mail ou cpf') ||
      haystack.includes('email ou cpf') ||
      haystack.includes('não conferem') ||
      haystack.includes('nao conferem') ||
      haystack.includes('não coincidem') ||
      haystack.includes('no coinciden') ||
      haystack.includes('do not match'))
  ) {
    return 'auth.emailCpfMismatch';
  }
  if (haystack.includes('pwned') || haystack.includes('data breach') || haystack.includes('found in a data')) {
    return 'errors.clerk.passwordPwned';
  }
  if (haystack.includes('not strong enough') || haystack.includes('password strength') || haystack.includes('password requirements')) {
    return 'errors.clerk.passwordWeak';
  }
  if (
    haystack.includes('cpf') &&
    (haystack.includes('cadastrad') ||
      haystack.includes('registrad') ||
      haystack.includes('já existe') ||
      haystack.includes('ja existe') ||
      haystack.includes('already') ||
      haystack.includes('p2002') ||
      haystack.includes('unique'))
  ) {
    return 'errors.clerk.cpfExists';
  }
  if (haystack.includes('already registered') || haystack.includes('already exists') || haystack.includes('identifier_exists') || haystack.includes('user already')) {
    return 'errors.clerk.emailExists';
  }
  if (
    (haystack.includes('e-mail') ||
      haystack.includes('email') ||
      haystack.includes('correo') ||
      haystack.includes('correio')) &&
    (haystack.includes('cadastrad') ||
      haystack.includes('registrad') ||
      haystack.includes('já existe') ||
      haystack.includes('ja existe'))
  ) {
    return 'errors.clerk.emailExists';
  }
  if (
    haystack.includes('code is incorrect') ||
    haystack.includes('incorrect code') ||
    haystack.includes('invalid code') ||
    haystack.includes('form_code_incorrect') ||
    haystack.includes('código inválido') ||
    haystack.includes('codigo invalido')
  ) {
    return 'errors.clerk.codeInvalid';
  }
  if (haystack.includes('expired') && haystack.includes('code')) {
    return 'errors.clerk.codeExpired';
  }
  if (haystack.includes('too many') || haystack.includes('rate limit') || haystack.includes('try again later')) {
    return 'errors.rateLimited';
  }
  if (haystack.includes('network') || haystack.includes('failed to fetch') || haystack.includes('fetch failed') || haystack.includes('econnrefused') || haystack.includes('enotfound')) {
    return 'errors.network';
  }
  if (haystack.includes('timeout') || haystack.includes('timed out') || haystack.includes('etimedout')) {
    return 'errors.timeout';
  }
  if (
    haystack.includes('session expired') ||
    haystack.includes('session_expired') ||
    haystack.includes('sessão expirada') ||
    haystack.includes('sessao expirada') ||
    haystack.includes('sessão inválida') ||
    haystack.includes('sessao invalida')
  ) {
    return 'errors.sessionExpired';
  }
  if (
    haystack.includes('unauthorized') ||
    haystack.includes('unauthenticated') ||
    haystack.includes('não autenticado') ||
    haystack.includes('nao autenticado')
  ) {
    return 'errors.unauthorized';
  }
  if (
    haystack.includes('perfil não encontrado') ||
    haystack.includes('perfil nao encontrado')
  ) {
    return 'errors.notFound';
  }
  if (
    haystack.includes('payload inválido') ||
    haystack.includes('payload invalido') ||
    haystack.includes('idioma inválido') ||
    haystack.includes('idioma invalido') ||
    haystack.includes('mensagem vazia')
  ) {
    return 'errors.generic';
  }
  if (
    haystack.includes('falha ao sincronizar o idioma') ||
    haystack.includes('falha ao sincronizar o idioma.')
  ) {
    return 'errors.server';
  }
  if (haystack.includes('forbidden') || haystack.includes('not allowed')) {
    return 'errors.forbidden';
  }
  if (haystack.includes('not found') || haystack.includes("couldn't find")) {
    return 'errors.notFound';
  }
  if (haystack.includes('prisma') || haystack.includes('unique constraint') || haystack.includes('p2002')) {
    if (haystack.includes('cpf')) return 'errors.clerk.cpfExists';
    if (haystack.includes('email') || haystack.includes('e-mail')) return 'errors.clerk.emailExists';
    return 'errors.conflict';
  }
  if (haystack.includes('p2025')) {
    return 'errors.notFound';
  }
  if (
    haystack.includes('upload_prepare_failed') ||
    haystack.includes('upload-prepare-failed') ||
    haystack.includes('não foi possível preparar o upload') ||
    haystack.includes('nao foi possivel preparar o upload')
  ) {
    return 'toast.uploadPrepareFailed';
  }
  if (
    haystack.includes('upload_put_failed') ||
    haystack.includes('upload-put-failed') ||
    haystack.includes('falha ao enviar o arquivo') ||
    haystack.includes('falha ao enviar a imagem')
  ) {
    return 'toast.uploadPutFailed';
  }
  if (
    haystack.includes('não foi possível validar o documento') ||
    haystack.includes('nao foi possivel validar o documento')
  ) {
    return 'toast.docValidateFailed';
  }
  if (
    haystack.includes('falha ao carregar a galeria') ||
    haystack.includes('gallery-load-failed')
  ) {
    return 'gallery.loadError';
  }
  if (
    haystack.includes('ai-unavailable') ||
    haystack.includes('falar com o assistente') ||
    haystack.includes('assistente temporariamente') ||
    haystack.includes('assistente não retornou') ||
    haystack.includes('assistente nao retornou')
  ) {
    return 'ai.unavailable';
  }
  if (haystack.includes('falha ao solicitar afiliação') || haystack.includes('falha ao solicitar afiliacao')) {
    return 'toast.affiliateFailed';
  }
  if (
    haystack.includes('falha ao processar o expediente') ||
    haystack.includes('falha ao carregar expediente') ||
    haystack.includes('falha ao carregar o expediente')
  ) {
    return 'toast.hoursLoadFailed';
  }
  if (haystack.includes('falha ao criar agendamento')) {
    return 'toast.scheduleFailed';
  }

  return null;
}

function statusKey(status: number): MessageKey | null {
  if (status === 401) return 'errors.unauthorized';
  if (status === 403) return 'errors.forbidden';
  if (status === 404) return 'errors.notFound';
  if (status === 408) return 'errors.timeout';
  if (status === 409) return 'errors.conflict';
  if (status === 429) return 'errors.rateLimited';
  if (status >= 500) return 'errors.server';
  return null;
}

function networkKey(err: unknown): MessageKey | null {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'errors.offline';
  }
  if (!isRecord(err)) return null;
  const axiosErr = err as AxiosLikeError;
  const code = asString(axiosErr.code).toUpperCase();
  if (code === 'ERR_NETWORK' || code === 'ECONNABORTED' || code === 'ERR_CANCELED') {
    return code === 'ECONNABORTED' ? 'errors.timeout' : 'errors.network';
  }
  if (axiosErr.isAxiosError && !axiosErr.response) {
    return 'errors.network';
  }
  if (err instanceof TypeError && /fetch|network/i.test(err.message)) {
    return 'errors.network';
  }
  return null;
}

function resolveKey(err: unknown, context: ErrorContext): MessageKey {
  const rawMessage =
    err instanceof Error ? err.message.trim() : isRecord(err) ? asString(err.message) : '';
  if (rawMessage && isMessageKey(rawMessage)) {
    return rawMessage;
  }

  const clerk = firstClerkError(err);
  const clerkCode = asString(clerk?.code).toLowerCase();
  if (clerkCode && CLERK_CODE_KEYS[clerkCode]) {
    return CLERK_CODE_KEYS[clerkCode];
  }

  const text = collectText(err);
  const fromText = matchByText(`${clerkCode} ${text}`);
  if (fromText) return fromText;

  const fromNetwork = networkKey(err);
  if (fromNetwork) return fromNetwork;

  if (isRecord(err)) {
    const status =
      typeof err.status === 'number'
        ? err.status
        : typeof (err as AxiosLikeError).response?.status === 'number'
          ? (err as AxiosLikeError).response?.status
          : undefined;
    if (typeof status === 'number') {
      const fromStatus = statusKey(status);
      if (fromStatus) return fromStatus;
    }
  }

  return CONTEXT_FALLBACK[context];
}

export function formatAppError(
  err: unknown,
  context: ErrorContext = 'generic',
  locale?: Locale
): string {
  const key = resolveKey(err, context);
  return t(key, undefined, locale);
}

export function clerkErrorMessage(err: unknown, locale?: Locale): string {
  return formatAppError(err, 'auth', locale);
}

export function passwordErrorMessage(err: unknown, locale?: Locale): string {
  return formatAppError(err, 'password', locale);
}

export function apiErrorMessage(err: unknown, locale?: Locale): string {
  return formatAppError(err, 'api', locale);
}

export function isClerkError(err: unknown): err is ClerkLikeError {
  return Boolean(firstClerkError(err) || (isRecord(err) && err.clerkError === true));
}

const REVERIFICATION_CODES = new Set([
  'session_reverification_required',
  'requires_verification',
  'verification_required',
  'reverification_required',
]);

const VERIFICATION_LEVELS = new Set(['first_factor', 'second_factor', 'multi_factor']);

/**
 * True when Clerk demands a step-up (reauthentication) before a sensitive
 * operation such as `user.updatePassword`. Reuses the shared matcher so the
 * detection never drifts from `formatAppError`.
 */
export function isReverificationError(err: unknown): boolean {
  const clerkCode = asString(firstClerkError(err)?.code).toLowerCase();
  if (clerkCode && REVERIFICATION_CODES.has(clerkCode)) return true;
  return resolveKey(err, 'password') === 'errors.clerk.requiresVerification';
}

/**
 * Reads the verification level Clerk expects from the error metadata, if any.
 * Returns `undefined` when absent or unrecognized so callers can fall back to
 * the default first-factor flow.
 */
export function extractReverificationLevel(err: unknown): string | undefined {
  const meta = firstClerkError(err)?.meta;
  if (!isRecord(meta)) return undefined;
  const level = meta.level;
  return typeof level === 'string' && VERIFICATION_LEVELS.has(level) ? level : undefined;
}
