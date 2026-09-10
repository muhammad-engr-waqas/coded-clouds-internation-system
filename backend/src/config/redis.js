/**
 * redis.js — Reusable ioredis client
 *
 * Rules:
 *  - Single instance exported; import this everywhere instead of creating new Redis().
 *  - If REDIS_URL is missing OR Redis is unreachable, `redisClient` is null and all
 *    helpers are no-ops — the app continues serving from MongoDB without caching.
 *  - Never let a Redis error crash the process.
 */

import Redis from 'ioredis';

let redisClient = null;

if (process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      connectTimeout: 5000,
      maxRetriesPerRequest: null,    // null = don't throw on retry exhaustion
      enableReadyCheck: false,       // don't block commands until READY
      lazyConnect: true,             // connect on first command, not at startup
      tls: process.env.REDIS_URL.startsWith('rediss://') ? {} : undefined,
    });

    redisClient.on('connect', () =>
      console.log('✅ Redis connected:', process.env.REDIS_URL.split('@').pop())
    );

    redisClient.on('error', (err) => {
      // Log but never crash — all helpers return null/false on error
      console.error('⚠️  Redis error (falling back to DB):', err.message);
    });

    redisClient.on('close', () =>
      console.warn('⚠️  Redis connection closed')
    );
  } catch (err) {
    console.error('⚠️  Redis init failed (falling back to DB):', err.message);
    redisClient = null;
  }
} else {
  console.warn('⚠️  REDIS_URL not set — caching/rate-limiting disabled');
}

// ─── Safe helpers ────────────────────────────────────────────────────────────
// All helpers are async and silently return null/false on Redis failure so
// callers never need try/catch around cache operations.

/** GET a cached value. Returns parsed object or null. */
export async function getCache(key) {
  if (!redisClient) return null;
  try {
    const raw = await redisClient.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error(`Redis GET "${key}" failed:`, err.message);
    return null;
  }
}

/** SET a value with an optional TTL in seconds (default 5 min). */
export async function setCache(key, value, ttlSeconds = 300) {
  if (!redisClient) return;
  try {
    await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    console.error(`Redis SET "${key}" failed:`, err.message);
  }
}

/** DELETE one exact key. */
export async function delCache(key) {
  if (!redisClient) return;
  try {
    await redisClient.del(key);
  } catch (err) {
    console.error(`Redis DEL "${key}" failed:`, err.message);
  }
}

/**
 * DELETE all keys matching a glob pattern (e.g. "employees:*").
 * Uses SCAN so it never blocks the Redis event loop.
 */
export async function delCachePattern(pattern) {
  if (!redisClient) return;
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length) await redisClient.del(...keys);
    } while (cursor !== '0');
  } catch (err) {
    console.error(`Redis SCAN/DEL "${pattern}" failed:`, err.message);
  }
}

/** Store a token in the blacklist until it expires. */
export async function blacklistToken(token, ttlSeconds) {
  if (!redisClient) return;
  try {
    await redisClient.set(`bl:${token}`, '1', 'EX', ttlSeconds);
  } catch (err) {
    console.error('Redis blacklistToken failed:', err.message);
  }
}

/** Returns true if the token has been blacklisted (logged out). */
export async function isTokenBlacklisted(token) {
  if (!redisClient) return false;
  try {
    return (await redisClient.exists(`bl:${token}`)) === 1;
  } catch (err) {
    console.error('Redis isTokenBlacklisted failed:', err.message);
    return false; // fail open — don't block valid users when Redis is down
  }
}

export { redisClient };
export default redisClient;
