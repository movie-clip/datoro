import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';
import crypto from 'crypto';

/**
 * Multi-layer cache service with memory (L1) and Redis (L2)
 * 
 * Layer 1 (Memory): Fast, volatile, small (100MB, 500 items)
 * Layer 2 (Redis): Persistent, shared across instances, larger
 * 
 * Usage:
 *   const cache = new CacheService();
 *   await cache.connect();
 *   
 *   // Get with auto-fetch
 *   const data = await cache.getOrFetch('key', async () => {
 *     return await expensiveApiCall();
 *   }, 3600);
 */
class CacheService {
  constructor(options = {}) {
    this.redisUrl = options.redisUrl || process.env.REDIS_URL || null;
    this.redisEnabled = !!this.redisUrl;
    this.redis = null;
    this.connected = false;

    // Layer 1: In-memory LRU cache (fast, volatile)
    this.memoryCache = new LRUCache({
      max: options.maxMemoryItems || 500,
      maxSize: options.maxMemorySize || 100 * 1024 * 1024, // 100MB
      sizeCalculation: (value) => {
        return JSON.stringify(value).length;
      },
      ttl: options.memoryTtl || 60 * 1000, // 1 minute
      updateAgeOnGet: true,
      updateAgeOnHas: false,
    });

    // Statistics
    this.stats = {
      hits: { memory: 0, redis: 0, total: 0 },
      misses: 0,
      sets: 0,
      errors: 0,
      totalRequests: 0,
    };

    console.log(`[CacheService] Initialized with Redis ${this.redisEnabled ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * Connect to Redis (if enabled)
   */
  async connect() {
    if (!this.redisEnabled) {
      console.log('[CacheService] Running without Redis (memory-only mode)');
      return;
    }

    try {
      this.redis = new Redis(this.redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            console.error('[CacheService] Redis connection failed after 3 retries');
            return null; // Stop retrying
          }
          return Math.min(times * 200, 2000); // Exponential backoff
        },
        lazyConnect: true,
      });

      // Event handlers
      this.redis.on('connect', () => {
        console.log('[CacheService] Connected to Redis');
        this.connected = true;
      });

      this.redis.on('error', (err) => {
        console.error('[CacheService] Redis error:', err.message);
        this.stats.errors++;
      });

      this.redis.on('close', () => {
        console.log('[CacheService] Redis connection closed');
        this.connected = false;
      });

      // Connect
      await this.redis.connect();
    } catch (error) {
      console.error('[CacheService] Failed to connect to Redis:', error.message);
      console.log('[CacheService] Falling back to memory-only mode');
      this.redisEnabled = false;
      this.redis = null;
    }
  }

  /**
   * Generate cache key from components
   */
  generateKey(prefix, ...parts) {
    const sanitized = parts.map(p => String(p).toUpperCase().trim());
    return `${prefix}:${sanitized.join(':')}`;
  }

  /**
   * Generate hash for complex objects (for cache keys)
   */
  hashObject(obj) {
    const str = JSON.stringify(obj);
    return crypto.createHash('md5').update(str).digest('hex').substring(0, 8);
  }

  /**
   * Get from cache (checks L1 memory, then L2 Redis)
   */
  async get(key) {
    this.stats.totalRequests++;

    // Layer 1: Memory cache (fast)
    const memValue = this.memoryCache.get(key);
    if (memValue !== undefined) {
      this.stats.hits.memory++;
      this.stats.hits.total++;
      return { data: memValue, source: 'memory' };
    }

    // Layer 2: Redis cache (slower but persistent)
    if (this.redisEnabled && this.connected) {
      try {
        const redisValue = await this.redis.get(key);
        if (redisValue) {
          const parsed = JSON.parse(redisValue);
          
          // Promote to L1 cache
          this.memoryCache.set(key, parsed);
          
          this.stats.hits.redis++;
          this.stats.hits.total++;
          return { data: parsed, source: 'redis' };
        }
      } catch (error) {
        console.error('[CacheService] Redis GET error:', error.message);
        this.stats.errors++;
      }
    }

    // Cache miss
    this.stats.misses++;
    return { data: null, source: null };
  }

  /**
   * Set in cache (stores in both L1 and L2)
   */
  async set(key, value, ttlSeconds = 3600) {
    this.stats.sets++;

    // Layer 1: Memory cache
    this.memoryCache.set(key, value);

    // Layer 2: Redis cache
    if (this.redisEnabled && this.connected) {
      try {
        const serialized = JSON.stringify(value);
        if (ttlSeconds > 0) {
          await this.redis.setex(key, ttlSeconds, serialized);
        } else {
          await this.redis.set(key, serialized);
        }
      } catch (error) {
        console.error('[CacheService] Redis SET error:', error.message);
        this.stats.errors++;
      }
    }
  }

  /**
   * Get or fetch (auto-fetch on cache miss)
   */
  async getOrFetch(key, fetchFn, ttlSeconds = 3600) {
    const cached = await this.get(key);
    
    if (cached.data !== null) {
      return cached.data;
    }

    // Cache miss - fetch data
    const freshData = await fetchFn();
    
    if (freshData !== null && freshData !== undefined) {
      await this.set(key, freshData, ttlSeconds);
    }

    return freshData;
  }

  /**
   * Delete from cache
   */
  async delete(key) {
    this.memoryCache.delete(key);
    
    if (this.redisEnabled && this.connected) {
      try {
        await this.redis.del(key);
      } catch (error) {
        console.error('[CacheService] Redis DEL error:', error.message);
        this.stats.errors++;
      }
    }
  }

  /**
   * Delete multiple keys by pattern (Redis only)
   */
  async deletePattern(pattern) {
    if (!this.redisEnabled || !this.connected) {
      console.warn('[CacheService] Pattern delete requires Redis');
      return 0;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        const deleted = await this.redis.del(...keys);
        console.log(`[CacheService] Deleted ${deleted} keys matching pattern: ${pattern}`);
        return deleted;
      }
      return 0;
    } catch (error) {
      console.error('[CacheService] Redis pattern delete error:', error.message);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Clear all cache
   */
  async clear() {
    this.memoryCache.clear();
    
    if (this.redisEnabled && this.connected) {
      try {
        await this.redis.flushdb();
        console.log('[CacheService] Cleared Redis cache');
      } catch (error) {
        console.error('[CacheService] Redis FLUSHDB error:', error.message);
        this.stats.errors++;
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalHits = this.stats.hits.total;
    const totalRequests = this.stats.totalRequests;
    const hitRate = totalRequests > 0 ? (totalHits / totalRequests * 100).toFixed(2) : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      memorySize: this.memoryCache.size,
      memoryItems: this.memoryCache.calculatedSize,
      redisEnabled: this.redisEnabled,
      redisConnected: this.connected,
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      hits: { memory: 0, redis: 0, total: 0 },
      misses: 0,
      sets: 0,
      errors: 0,
      totalRequests: 0,
    };
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.redis && this.connected) {
      await this.redis.quit();
      console.log('[CacheService] Disconnected from Redis');
    }
  }
}

// TTL constants (in seconds)
export const CacheTTL = {
  PRICE: 5 * 60,                    // 5 minutes (real-time data)
  PRICE_HISTORY: 60 * 60,           // 1 hour (historical prices)
  INCOME_STATEMENT: 24 * 60 * 60,   // 24 hours (daily updates)
  BALANCE_SHEET: 24 * 60 * 60,      // 24 hours
  CASH_FLOW: 24 * 60 * 60,          // 24 hours
  REVENUE_SEGMENTS: 24 * 60 * 60,   // 24 hours
  COMPANY_PROFILE: 7 * 24 * 60 * 60, // 7 days (rarely changes)
  AI_ANALYSIS: 30 * 24 * 60 * 60,   // 30 days (expensive to regenerate)
};

// Singleton instance
let cacheInstance = null;

export function getCacheService() {
  if (!cacheInstance) {
    cacheInstance = new CacheService();
  }
  return cacheInstance;
}

export default CacheService;
