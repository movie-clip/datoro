import logger from '../services/logger.js'
import rateLimit from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis'
import slowDown from 'express-slow-down'
import type { Request, Response, NextFunction } from 'express'
import type Redis from 'ioredis'
import { RATE_LIMIT, SPEED_LIMIT } from '../config/constants'

declare global {
  namespace Express {
    interface Request {
      fmpCallTracked?: boolean
    }
  }
}

/**
 * Rate Limiting Middleware
 * 
 * Protects API from abuse by limiting request rates per IP address.
 * 
 * Tiers:
 * - General API: 100 requests/minute
 * - FMP proxy: 50 requests/minute (expensive API calls)
 * - Cache stats: 10 requests/minute (admin endpoints)
 * 
 * Also includes speed limiter to slow down heavy users before blocking.
 * 
 * IMPORTANT: These default limiters use memory store (NOT cluster-safe).
 * Use createRateLimiters() with Redis for production cluster mode.
 */

/**
 * Create rate limiters with optional Redis store
 * @param redisClient - ioredis client (optional, for cluster-safe rate limiting)
 * @returns Object containing all rate limiters
 */
export function createRateLimiters(redisClient: Redis | null = null) {
  // Log Redis status once
  if (redisClient) {
    logger.info('[RateLimit] Using Redis store (cluster-safe, distributed across all workers)');
  } else {
    logger.warn('[RateLimit] Redis not available - using memory store (NOT cluster-safe)');
    logger.warn('[RateLimit] Each PM2 worker has independent counters - rate limits can be bypassed!');
  }
  
  // Create separate stores for each limiter (REQUIRED - cannot share stores)
  return {
    generalLimiter: createGeneralLimiter(redisClient),
    fmpLimiter: createFmpLimiter(redisClient),
    adminLimiter: createAdminLimiter(redisClient),
    aiLimiter: createAiLimiter(redisClient),
  };
}

// Factory functions for each rate limiter type
function createGeneralLimiter(redisClient: Redis | null) {
  const store = createRedisStore(redisClient, 'general');
  return rateLimit({
    windowMs: RATE_LIMIT.WINDOW_MS,
    max: RATE_LIMIT.GENERAL_MAX,
    store,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '60 seconds'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Too many requests',
        message: 'You have exceeded the rate limit. Please try again later.',
        retryAfter: res.getHeader('Retry-After'),
        limit: RATE_LIMIT.GENERAL_MAX,
        window: '1 minute'
      });
    }
  });
}

function createFmpLimiter(redisClient: Redis | null) {
  const store = createRedisStore(redisClient, 'fmp');
  return rateLimit({
    windowMs: RATE_LIMIT.WINDOW_MS,
    max: RATE_LIMIT.FMP_PER_IP_MAX,
    store,
    message: {
      error: 'Too many API requests, please slow down.',
      retryAfter: '60 seconds'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    handler: (req: Request, res: Response) => {
      logger.warn(`[RateLimit] IP ${req.ip} exceeded FMP rate limit (${RATE_LIMIT.FMP_PER_IP_MAX} req/min)`);
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'You are making too many requests to the financial data API. Please slow down.',
        retryAfter: res.getHeader('Retry-After'),
        limit: RATE_LIMIT.FMP_PER_IP_MAX,
        window: '1 minute',
        tip: 'Data is cached for 7 days. Wait a moment and try again to get cached results.'
      });
    }
  });
}

function createAdminLimiter(redisClient: Redis | null) {
  const store = createRedisStore(redisClient, 'admin');
  return rateLimit({
    windowMs: RATE_LIMIT.WINDOW_MS,
    max: RATE_LIMIT.ADMIN_MAX,
    store,
    message: 'Too many requests to admin endpoint',
    standardHeaders: true,
    legacyHeaders: false,
    skipFailedRequests: false,
    handler: (req: Request, res: Response) => {
      logger.warn(`[RateLimit] IP ${req.ip} exceeded admin rate limit`);
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests to this endpoint.',
        retryAfter: res.getHeader('Retry-After'),
        limit: RATE_LIMIT.ADMIN_MAX,
        window: '1 minute'
      });
    }
  });
}

function createAiLimiter(redisClient: Redis | null) {
  const store = createRedisStore(redisClient, 'ai');
  return rateLimit({
    windowMs: RATE_LIMIT.WINDOW_MS,
    max: RATE_LIMIT.AI_MAX,
    store,
    message: 'Too many AI requests',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn(`[RateLimit] IP ${req.ip} exceeded AI rate limit`);
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'AI analysis is resource-intensive. Please wait before making another request.',
        retryAfter: res.getHeader('Retry-After'),
        limit: RATE_LIMIT.AI_MAX,
        window: '1 minute'
      });
    }
  });
}

// Default memory-based limiters (for backwards compatibility)
// WARNING: These are NOT cluster-safe - use createRateLimiters() instead
export const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.GENERAL_MAX,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '60 seconds'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: res.getHeader('Retry-After'),
      limit: RATE_LIMIT.GENERAL_MAX,
      window: '1 minute'
    });
  }
});

// Default FMP limiter (memory-based, NOT cluster-safe)
export const fmpLimiter = createFmpLimiter();

// Global FMP limiter - tracks total API calls across ALL IPs
// Prevents exhausting the 300 req/min FMP quota even with many users
let globalFmpCounter = 0;
let globalFmpWindowStart = Date.now();

export function globalFmpLimiter(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  
  // Reset counter if window expired
  if (now - globalFmpWindowStart >= RATE_LIMIT.WINDOW_MS) {
    globalFmpCounter = 0;
    globalFmpWindowStart = now;
  }
  
  // Check global limit
  if (globalFmpCounter >= RATE_LIMIT.FMP_GLOBAL_MAX) {
    const timeUntilReset = Math.ceil((RATE_LIMIT.WINDOW_MS - (now - globalFmpWindowStart)) / 1000);
    logger.warn(`[RateLimit] Global FMP limit reached (${RATE_LIMIT.FMP_GLOBAL_MAX}/min). Blocking request from ${req.ip}`);
    
    return res.status(503).json({
      error: 'Service temporarily unavailable',
      message: 'The API quota is currently exhausted. Please try again in a moment.',
      retryAfter: `${timeUntilReset} seconds`,
      globalLimit: RATE_LIMIT.FMP_GLOBAL_MAX,
      window: '1 minute'
    });
  }
  
  // Increment counter only for actual API calls (not cached responses)
  // We'll decrement in the route handler if it's a cache hit
  req.fmpCallTracked = true;
  globalFmpCounter++;
  
  next();
}

// Helper to decrement global counter when serving from cache
export function decrementGlobalFmpCounter() {
  if (globalFmpCounter > 0) {
    globalFmpCounter--;
  }
}

// Default admin limiter (memory-based, NOT cluster-safe)
export const adminLimiter = createAdminLimiter();

// Speed limiter - slows down responses before blocking
// Starts adding delay after 30 requests, increases by 500ms per request
export const speedLimiter = slowDown({
  windowMs: SPEED_LIMIT.WINDOW_MS,
  delayAfter: SPEED_LIMIT.DELAY_AFTER,
  delayMs: (hits: number) => hits * SPEED_LIMIT.DELAY_PER_REQUEST_MS,
  maxDelayMs: SPEED_LIMIT.MAX_DELAY_MS,
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
});

// Default AI limiter (memory-based, NOT cluster-safe)
export const aiLimiter = createAiLimiter();

/**
 * Create Redis store for rate limiting
 * Works across PM2 cluster workers for true distributed rate limiting
 * 
 * @param redisClient - ioredis client instance
 * @param prefix - Unique prefix for this rate limiter (REQUIRED - cannot share stores)
 * @returns RedisStore instance or undefined (falls back to memory)
 */
export function createRedisStore(redisClient: Redis | null, prefix: string) {
  if (!redisClient) {
    return undefined; // Use default memory store
  }

  try {
    return new RedisStore({
      // @ts-expect-error - rate-limit-redis types expect 'redis' client, but ioredis works fine
      sendCommand: (...args: string[]) => redisClient.call(...args),
      prefix: `rl:${prefix}:`, // Each limiter MUST have unique prefix
    });
  } catch (error) {
    logger.error(`[RateLimit] Failed to create Redis store for ${prefix}:`, error);
    return undefined;
  }
}

export default {
  // Rate limiter factories
  createRateLimiters,
  createRedisStore,
  
  // Default memory-based limiters (NOT cluster-safe)
  generalLimiter,
  fmpLimiter,
  adminLimiter,
  speedLimiter,
  aiLimiter,
  
  // Global FMP tracking
  globalFmpLimiter,
  decrementGlobalFmpCounter,
};
