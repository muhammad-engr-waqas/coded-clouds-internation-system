/**
 * rateLimiter.js — Redis-backed rate limiters via express-rate-limit + rate-limit-redis
 *
 * Three tiers:
 *   authLimiter     — login/register: 10 req / 15 min per IP (brute-force protection)
 *   apiLimiter      — general API:   100 req / 1 min per IP
 *   strictLimiter   — sensitive ops: 20 req / 1 min per IP (reports, payroll generate)
 *
 * Falls back to in-memory store (MemoryStore) if Redis is unavailable, so the
 * app keeps running — rate limiting just becomes per-process instead of global.
 */

import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../config/redis.js';

function makeStore(prefix) {
  if (!redisClient) return undefined; // fall back to MemoryStore
  return new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: `rl:${prefix}:`,
  });
}

/** 10 requests per 15 minutes — for login / auth routes */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('auth'),
  message: {
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

/** 100 requests per minute — general API protection */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('api'),
  message: {
    message: 'Too many requests. Please slow down.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

/** 20 requests per minute — heavy / sensitive endpoints */
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('strict'),
  message: {
    message: 'Rate limit exceeded on this endpoint. Try again shortly.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});
