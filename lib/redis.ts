import { Redis } from '@upstash/redis';

let client: Redis | null = null;
let resolved = false;

/**
 * Lazily resolves a singleton Upstash Redis client.
 *
 * Returns `null` when the REST credentials are absent so callers can degrade
 * gracefully instead of throwing during build or in environments without
 * Redis (e.g. local UI-only previews).
 */
export function getRedis(): Redis | null {
  if (resolved) return client;
  resolved = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    client = null;
    return client;
  }

  client = new Redis({ url, token });
  return client;
}

export function isRedisConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}
