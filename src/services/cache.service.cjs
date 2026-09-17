const { Redis } = require("@upstash/redis");

const redis = Redis.fromEnv();

async function cacheGet(key) {
  try {
    return await redis.get(key);
  } catch {
    return null;
  }
}

async function cacheSet(key, value, ttlSec) {
  try {
    await redis.set(key, value, { ex: ttlSec });
  } catch {
    return;
  }
}

async function cacheDel(key) {
  try {
    await redis.del(key);
  } catch {
    return;
  }
}

async function acquireLock(key, ttlSec) {
  try {
    return await redis.set(key, "locked", { nx: true, ex: ttlSec });
  } catch {
    return null;
  }
}

module.exports = { redis, cacheGet, cacheSet, cacheDel, acquireLock };
