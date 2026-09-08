/**
 * cache.js — Express middleware helpers for Redis caching & invalidation
 *
 * Usage in routes:
 *
 *   import { cache, invalidate } from '../middleware/cache.js';
 *
 *   // Cache a GET response for 5 min:
 *   router.get('/settings', protect, cache('settings:singleton', 300), getSettings);
 *
 *   // Invalidate one or more patterns after a mutation:
 *   router.patch('/settings', protect, isAdmin, updateSettings,
 *     invalidate(['settings:singleton'])
 *   );
 *
 * If Redis is down, cache() is a no-op (passes straight to the controller)
 * and invalidate() silently skips — no errors, no crashes.
 */

import { getCache, setCache, delCache, delCachePattern } from '../config/redis.js';

/**
 * cache(key, ttlSeconds)
 *
 * `key` can be:
 *   - a static string:  'settings:singleton'
 *   - a function:       (req) => `employees:list:${req.query.page || 1}:${req.query.search || ''}`
 *
 * Returns a middleware that:
 *   1. Checks Redis — if hit, responds immediately with cached JSON.
 *   2. If miss, intercepts res.json() to store the response before sending.
 */
export function cache(key, ttlSeconds = 300) {
  return async (req, res, next) => {
    const cacheKey = typeof key === 'function' ? key(req) : key;

    // Try cache hit
    const cached = await getCache(cacheKey);
    if (cached !== null) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Cache miss — intercept res.json so we can store the response
    res.setHeader('X-Cache', 'MISS');
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setCache(cacheKey, body, ttlSeconds); // fire-and-forget
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * invalidate(patterns)
 *
 * `patterns` is an array of strings or functions (req) => string.
 * Strings ending with '*' use pattern-based SCAN+DEL; exact strings use DEL.
 *
 * This is an AFTER middleware — put it AFTER the controller in the chain:
 *   router.post('/', protect, createEmployee, invalidate(['employees:*', 'report:workforce']))
 *
 * Works because express-async-errors lets controllers throw; invalidate only
 * runs if the controller called next() or res.json() without an error.
 */
export function invalidate(patterns = []) {
  return async (req, res, next) => {
    // Intercept res.json so we invalidate AFTER the response is ready
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await Promise.all(
          patterns.map((p) => {
            const key = typeof p === 'function' ? p(req) : p;
            return key.endsWith('*') ? delCachePattern(key) : delCache(key);
          })
        );
      }
      return originalJson(body);
    };
    next();
  };
}
