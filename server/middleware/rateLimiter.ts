import logger from '../services/logger.js'
import rateLimit from 'express-rate-limit'
import slowDown from 'express-slow-down'
import type { Request, Response, NextFunction } from 'express'
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
 */

// General API rate limiter (100 req/min)
export const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.GENERAL_MAX,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '60 seconds'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
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

// Strict limiter for FMP API endpoints - Per-IP protection
// FMP paid plan: 300 req/min total, but limit each IP to 30 req/min
// This prevents a single abusive user from exhausting the entire quota
export const fmpLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.FMP_PER_IP_MAX,
  message: {
    error: 'Too many API requests, please slow down.',
    retryAfter: '60 seconds'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests
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

// Very strict limiter for admin/cache endpoints (10 req/min)
export const adminLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.ADMIN_MAX,
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

// AI endpoint limiter (5 req/min - expensive operations)
export const aiLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.AI_MAX,
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

// Create a custom store that uses Redis if available
export function createRedisStore(redisClient: any) {
  if (!redisClient) {
    logger.info('[RateLimit] Using memory store (single server only)');
    return undefined; // Use default memory store
  }

  logger.info('[RateLimit] Using Redis store (distributed)');
  
  return {
    async increment(key: string) {
      const hits = await redisClient.incr(key);
      if (hits === 1) {
        await redisClient.expire(key, RATE_LIMIT.WINDOW_MS / 1000); // Convert to seconds
      }
      return { totalHits: hits };
    },
    async decrement(key: string) {
      const hits = await redisClient.decr(key);
      return { totalHits: Math.max(hits, 0) };
    },
    async resetKey(key: string) {
      await redisClient.del(key);
    }
  };
}

export default {
  generalLimiter,
  fmpLimiter,
  globalFmpLimiter,
  decrementGlobalFmpCounter,
  adminLimiter,
  speedLimiter,
  aiLimiter,
  createRedisStore
};
