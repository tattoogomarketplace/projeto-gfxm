export type AttestationPlatform = 'android' | 'ios';

export const APP_INTEGRITY_HEADER = 'x-app-integrity-token';

export interface AttestationOptions {
  platform?: AttestationPlatform;
  required?: boolean;
  maxAgeSeconds?: number;
  now?: number;
  resolveKeys?: (platform: AttestationPlatform) => Promise<JsonWebKey[]>;
}

export interface AttestationResult {
  enforced: boolean;
  strict: boolean;
  success: boolean;
  verified: boolean;
  platform?: AttestationPlatform;
  errorCodes: string[];
}

export interface AttestationGuard {
  allowed: boolean;
  status: 200 | 403;
  code: string;
  result: AttestationResult;
}

interface DecodedJws {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signingInput: string;
  signature: Uint8Array;
}

interface SignatureVerification {
  verified: boolean;
  errorCodes: string[];
}

interface CachedJwks {
  keys: JsonWebKey[];
  expiresAt: number;
}

const JWKS_TTL_MS = 10 * 60 * 1000;
const jwksCache = new Map<AttestationPlatform, CachedJwks>();

function readEnv(name: string): string {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);

  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(padded, 'base64'));
  }

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeJws(token: string): DecodedJws | null {
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => !part)) {
    return null;
  }

  try {
    const decoder = new TextDecoder();
    const header = JSON.parse(decoder.decode(base64UrlToBytes(parts[0]))) as Record<string, unknown>;
    const payload = JSON.parse(decoder.decode(base64UrlToBytes(parts[1]))) as Record<string, unknown>;
    return {
      header,
      payload,
      signingInput: `${parts[0]}.${parts[1]}`,
      signature: base64UrlToBytes(parts[2]),
    };
  } catch {
    return null;
  }
}

function detectPlatform(decoded: DecodedJws): AttestationPlatform | undefined {
  const payload = decoded.payload;
  if (asRecord(payload.requestDetails) || asRecord(payload.appIntegrity) || asRecord(payload.deviceIntegrity)) {
    return 'android';
  }
  if (asRecord(payload.receipt) || asString(payload.bundleId) || asString(payload.bid)) {
    return 'ios';
  }
  return undefined;
}

function normalizeKeys(raw: unknown): JsonWebKey[] {
  const container = asRecord(raw);
  const list = Array.isArray(raw) ? raw : container && Array.isArray(container.keys) ? container.keys : [];
  return list.filter((key): key is JsonWebKey => Boolean(asRecord(key) && asString((key as JsonWebKey).kty)));
}

function parseInlineKeys(raw: string): JsonWebKey[] {
  try {
    return normalizeKeys(JSON.parse(raw));
  } catch {
    return [];
  }
}

async function loadTrustKeys(platform: AttestationPlatform): Promise<JsonWebKey[]> {
  const inline = platform === 'android' ? readEnv('APP_INTEGRITY_ANDROID_KEYS_JSON') : readEnv('APP_INTEGRITY_IOS_KEYS_JSON');
  if (inline) {
    return parseInlineKeys(inline);
  }

  const url = platform === 'android' ? readEnv('APP_INTEGRITY_ANDROID_JWKS_URL') : readEnv('APP_INTEGRITY_IOS_JWKS_URL');
  if (!url) {
    return [];
  }

  const cached = jwksCache.get(platform);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.keys;
  }

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      return cached?.keys ?? [];
    }
    const keys = normalizeKeys((await response.json()) as unknown);
    jwksCache.set(platform, { keys, expiresAt: now + JWKS_TTL_MS });
    return keys;
  } catch {
    return cached?.keys ?? [];
  }
}

async function verifySignature(decoded: DecodedJws, keys: JsonWebKey[]): Promise<SignatureVerification> {
  const alg = asString(decoded.header.alg);
  if (!alg) {
    return { verified: false, errorCodes: ['missing-algorithm'] };
  }
  if (alg !== 'ES256' && alg !== 'RS256') {
    return { verified: false, errorCodes: ['unsupported-algorithm'] };
  }
  if (keys.length === 0) {
    return { verified: false, errorCodes: ['trust-anchor-absent'] };
  }

  const data = new TextEncoder().encode(decoded.signingInput);
  const signature = new Uint8Array(decoded.signature);
  for (const key of keys) {
    try {
      if (alg === 'ES256') {
        const cryptoKey = await crypto.subtle.importKey('jwk', key, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
        const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, cryptoKey, signature, data);
        if (valid) return { verified: true, errorCodes: [] };
      } else {
        const cryptoKey = await crypto.subtle.importKey(
          'jwk',
          key,
          { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
          false,
          ['verify']
        );
        const valid = await crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, cryptoKey, signature, data);
        if (valid) return { verified: true, errorCodes: [] };
      }
    } catch {
      continue;
    }
  }

  return { verified: false, errorCodes: ['invalid-signature'] };
}

function verifyTargetApp(payload: Record<string, unknown>, platform: AttestationPlatform): string[] {
  const expected =
    platform === 'android' ? readEnv('APP_INTEGRITY_ANDROID_PACKAGE') : readEnv('APP_INTEGRITY_IOS_BUNDLE_ID');
  if (!expected) {
    return [];
  }

  const appIntegrity = asRecord(payload.appIntegrity);
  const requestDetails = asRecord(payload.requestDetails);
  const actual =
    platform === 'android'
      ? asString(appIntegrity?.packageName) ??
        asString(requestDetails?.requestPackageName) ??
        asString(payload.packageName)
      : asString(payload.bundleId) ?? asString(payload.bundle_id) ?? asString(payload.bid);

  if (actual && actual !== expected) {
    return ['app-identity-mismatch'];
  }
  return [];
}

function verifyPlatformVerdicts(payload: Record<string, unknown>, platform: AttestationPlatform): string[] {
  const errorCodes: string[] = [];

  if (platform === 'android') {
    const appIntegrity = asRecord(payload.appIntegrity);
    const appVerdict = asString(appIntegrity?.appRecognitionVerdict);
    if (appVerdict && appVerdict !== 'PLAY_RECOGNIZED') {
      errorCodes.push(`app-integrity:${appVerdict}`);
    }

    const deviceIntegrity = asRecord(payload.deviceIntegrity);
    const deviceVerdicts = deviceIntegrity?.deviceRecognitionVerdict;
    if (Array.isArray(deviceVerdicts) && !deviceVerdicts.includes('MEETS_DEVICE_INTEGRITY')) {
      errorCodes.push('device-integrity:not-meets');
    }
  }

  return errorCodes;
}

function verifyFreshness(payload: Record<string, unknown>, options: AttestationOptions): string[] {
  const requestDetails = asRecord(payload.requestDetails);
  const rawTimestamp = requestDetails?.timestampMillis ?? payload.timestampMillis;
  const timestamp = typeof rawTimestamp === 'string' ? Number(rawTimestamp) : rawTimestamp;
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    return [];
  }

  const maxAgeSeconds = options.maxAgeSeconds ?? Number(readEnv('APP_INTEGRITY_MAX_AGE_SECONDS') || 0);
  if (!maxAgeSeconds || maxAgeSeconds <= 0) {
    return [];
  }

  const now = options.now ?? Date.now();
  return now - timestamp > maxAgeSeconds * 1000 ? ['stale-integrity-token'] : [];
}

export function isAppIntegrityEnforced(): boolean {
  return readEnv('APP_INTEGRITY_ENFORCE').toLowerCase() === 'true';
}

export function extractAppIntegrityToken(source: Request | Headers): string | undefined {
  const headers = source instanceof Headers ? source : source.headers;
  if (!headers || typeof headers.get !== 'function') {
    return undefined;
  }
  const raw = headers.get(APP_INTEGRITY_HEADER);
  return raw && raw.trim() ? raw.trim() : undefined;
}

export async function verifyAppIntegrityToken(
  token: unknown,
  options: AttestationOptions = {}
): Promise<AttestationResult> {
  const enforced = isAppIntegrityEnforced();
  const strict = options.required ?? enforced;
  const base = { enforced, strict, verified: false } as const;

  const raw = typeof token === 'string' ? token.trim() : '';
  if (!raw) {
    return { ...base, success: !strict, errorCodes: ['missing-integrity-token'] };
  }

  const decoded = decodeJws(raw);
  if (!decoded) {
    return { ...base, success: false, errorCodes: ['malformed-integrity-token'] };
  }

  const platform = options.platform ?? detectPlatform(decoded);
  if (!platform) {
    return { ...base, success: false, errorCodes: ['unknown-platform'] };
  }

  const errorCodes = [
    ...verifyTargetApp(decoded.payload, platform),
    ...verifyPlatformVerdicts(decoded.payload, platform),
    ...verifyFreshness(decoded.payload, options),
  ];

  const keys = options.resolveKeys ? await options.resolveKeys(platform) : await loadTrustKeys(platform);
  const signature = await verifySignature(decoded, keys);
  if (signature.errorCodes.includes('invalid-signature') || signature.errorCodes.includes('unsupported-algorithm')) {
    errorCodes.push(...signature.errorCodes);
  }

  const success = errorCodes.length === 0;
  return { enforced, strict, success, verified: signature.verified, platform, errorCodes };
}

export async function guardAppIntegrity(
  source: Request | Headers,
  options: AttestationOptions = {}
): Promise<AttestationGuard> {
  const result = await verifyAppIntegrityToken(extractAppIntegrityToken(source), options);
  if (result.strict && !result.success) {
    return {
      allowed: false,
      status: 403,
      code: result.errorCodes[0] ?? 'integrity-rejected',
      result,
    };
  }
  return { allowed: true, status: 200, code: 'ok', result };
}
