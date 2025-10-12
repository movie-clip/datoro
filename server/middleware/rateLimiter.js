import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

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
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '60 seconds'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: res.getHeader('Retry-After'),
      limit: 100,
      window: '1 minute'
    });
  }
});

// Strict limiter for FMP API endpoints (50 req/min)
export const fmpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50,
  message: {
    error: 'Too many API requests, please slow down.',
    retryAfter: '60 seconds'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests
  handler: (req, res) => {
    console.warn(`[RateLimit] IP ${req.ip} exceeded FMP rate limit`);
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'You are making too many requests to the financial data API. Please slow down.',
      retryAfter: res.getHeader('Retry-After'),
      limit: 50,
      window: '1 minute',
      tip: 'Consider caching data on the client side to reduce requests.'
    });
  }
});

// Very strict limiter for admin/cache endpoints (10 req/min)
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many requests to admin endpoint',
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
  handler: (req, res) => {
    console.warn(`[RateLimit] IP ${req.ip} exceeded admin rate limit`);
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests to this endpoint.',
      retryAfter: res.getHeader('Retry-After'),
      limit: 10,
      window: '1 minute'
    });
  }
});

// Speed limiter - slows down responses before blocking
// Starts adding delay after 30 requests, increases by 500ms per request
export const speedLimiter = slowDown({
  windowMs: 60 * 1000, // 1 minute
  delayAfter: 30, // Allow 30 requests per minute at full speed
  delayMs: (hits) => hits * 500, // Add 500ms delay per request over limit
  maxDelayMs: 5000, // Max delay of 5 seconds
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
});

// AI endpoint limiter (5 req/min - expensive operations)
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: 'Too many AI requests',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`[RateLimit] IP ${req.ip} exceeded AI rate limit`);
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'AI analysis is resource-intensive. Please wait before making another request.',
      retryAfter: res.getHeader('Retry-After'),
      limit: 5,
      window: '1 minute'
    });
  }
});

// Create a custom store that uses Redis if available
export function createRedisStore(redisClient) {
  if (!redisClient) {
    console.log('[RateLimit] Using memory store (single server only)');
    return undefined; // Use default memory store
  }

  console.log('[RateLimit] Using Redis store (distributed)');
  
  return {
    async increment(key) {
      const hits = await redisClient.incr(key);
      if (hits === 1) {
        await redisClient.expire(key, 60); // 1 minute TTL
      }
      return { totalHits: hits };
    },
    async decrement(key) {
      const hits = await redisClient.decr(key);
      return { totalHits: Math.max(hits, 0) };
    },
    async resetKey(key) {
      await redisClient.del(key);
    }
  };
}

export default {
  generalLimiter,
  fmpLimiter,
  adminLimiter,
  speedLimiter,
  aiLimiter,
  createRedisStore
};
