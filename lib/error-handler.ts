import { t } from '@/lib/i18n/store';
import type { Locale, MessageKey } from '@/lib/i18n/types';

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
    haystack.includes('reauthentication') ||
    haystack.includes('re-authentication') ||
    haystack.includes('step-up') ||
    haystack.includes('second factor')
  ) {
    return 'errors.clerk.requiresVerification';
  }
  if (haystack.includes('form_password_incorrect') || haystack.includes('password is incorrect') || haystack.includes('incorrect password') || haystack.includes('current password')) {
    return 'errors.clerk.passwordIncorrect';
  }
  if (haystack.includes('pwned') || haystack.includes('data breach') || haystack.includes('found in a data')) {
    return 'errors.clerk.passwordPwned';
  }
  if (haystack.includes('not strong enough') || haystack.includes('password strength') || haystack.includes('password requirements')) {
    return 'errors.clerk.passwordWeak';
  }
  if (haystack.includes('already registered') || haystack.includes('already exists') || haystack.includes('identifier_exists') || haystack.includes('user already')) {
    return 'errors.clerk.emailExists';
  }
  if (haystack.includes('code is incorrect') || haystack.includes('incorrect code') || haystack.includes('invalid code') || haystack.includes('form_code_incorrect')) {
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
  if (haystack.includes('unauthorized') || haystack.includes('unauthenticated') || haystack.includes('session expired')) {
    return 'errors.unauthorized';
  }
  if (haystack.includes('forbidden') || haystack.includes('not allowed')) {
    return 'errors.forbidden';
  }
  if (haystack.includes('not found') || haystack.includes("couldn't find")) {
    return 'errors.notFound';
  }
  if (haystack.includes('prisma') || haystack.includes('unique constraint') || haystack.includes('p2002')) {
    return 'errors.conflict';
  }
  if (haystack.includes('p2025')) {
    return 'errors.notFound';
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
