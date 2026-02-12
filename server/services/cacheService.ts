import Redis from 'ioredis'
import { LRUCache } from 'lru-cache'
import crypto from 'crypto'
import { MEMORY_LIMITS, CACHE_TTL, REDIS_TTL } from '../config/constants.js'
import logger from './logger.js'

interface CacheServiceOptions {
  redisUrl?: string | null
  maxMemoryItems?: number
  maxMemorySize?: number
  memoryTtl?: number
}

interface CacheStats {
  hits: {
    memory: number
    redis: number
    total: number
  }
  misses: number
  sets: number
  errors: number
  totalRequests: number
  cacheWrites: number
  skippedWrites: number
}

interface CacheResult<T> {
  data: T | null
  source: 'memory' | 'redis' | null
}

type FetchFunction<T> = () => Promise<T>

/**
 * Fast hash function for cache keys (faster than JSON.stringify + MD5)
 * Uses simple string concatenation with separator for simple objects
 */
function _fastHash(value: any): string {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (typeof value === 'object' && value !== null) {
    // For simple objects, use string concat (3x faster than JSON.stringify)
    if (Array.isArray(value)) {
      return value.map(_fastHash).join('|')
    }
    // Sort keys for consistent hashing
    const keys = Object.keys(value).sort()
    return keys.map(k => `${k}:${_fastHash(value[k])}`).join('|')
  }
  return String(value)
}

/**
 * Multi-layer cache service with memory (L1) and Redis (L2)
 * 
 * Layer 1 (Memory): Fast, volatile, small (100MB, 500 items)
 * Layer 2 (Redis): Persistent, shared across instances, larger
 * 
 * Features:
 * - Cache stampede protection via request coalescing
 * - Probabilistic early expiration to prevent thundering herd
 * - ETag support for conditional requests
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
  private redisUrl: string | null
  private redisEnabled: boolean
  private redis: Redis | null
  private connected: boolean
  private memoryCache: LRUCache<string, any>
  public stats: CacheStats
  
  // Request coalescing to prevent cache stampede
  private pendingFetches: Map<string, Promise<any>>

  constructor(options: CacheServiceOptions = {}) {
    this.redisUrl = options.redisUrl || process.env.REDIS_URL || null
    this.redisEnabled = !!this.redisUrl
    this.redis = null
    this.connected = false
    this.pendingFetches = new Map()

    // Layer 1: In-memory LRU cache (fast, volatile)
    this.memoryCache = new LRUCache({
      max: options.maxMemoryItems || 500,
      maxSize: options.maxMemorySize || MEMORY_LIMITS.CACHE_SIZE,
      sizeCalculation: (value: any) => {
        return JSON.stringify(value).length
      },
      ttl: options.memoryTtl || CACHE_TTL.MEMORY,
      updateAgeOnGet: true,
      updateAgeOnHas: false,
    })

    // Statistics
    this.stats = {
      hits: { memory: 0, redis: 0, total: 0 },
      misses: 0,
      sets: 0,
      errors: 0,
      totalRequests: 0,
      cacheWrites: 0,
      skippedWrites: 0,
    }

    logger.debug(`[CacheService] Initialized with Redis ${this.redisEnabled ? 'ENABLED' : 'DISABLED'}`)
  }

  /**
   * Connect to Redis (if enabled)
   */
  async connect(): Promise<void> {
    if (!this.redisEnabled) {
      logger.debug('[CacheService] Running without Redis (memory-only mode)')
      return
    }

    try {
      this.redis = new Redis(this.redisUrl!, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          if (times > 3) {
            logger.error('[CacheService] Redis connection failed after 3 retries')
            return null // Stop retrying
          }
          return Math.min(times * 200, 2000) // Exponential backoff
        },
        lazyConnect: true,
      })

      // Event handlers
      this.redis.on('connect', () => {
        logger.debug('[CacheService] Connected to Redis')
        this.connected = true
      })

      this.redis.on('error', (err: Error) => {
        logger.error('[CacheService] Redis error:', err.message)
        this.stats.errors++
      })

      this.redis.on('close', () => {
        logger.debug('[CacheService] Redis connection closed')
        this.connected = false
      })

      // Connect
      await this.redis.connect()
    } catch (_error) {
      logger.error('[CacheService] Failed to connect to Redis:', (_error as Error).message)
      logger.debug('[CacheService] Falling back to memory-only mode')
      this.redisEnabled = false
      this.redis = null
    }
  }

  /**
   * Generate cache key from components
   */
  generateKey(prefix: string, ...parts: unknown[]): string {
    const sanitized = parts.map(p => String(p).toUpperCase().trim())
    return `${prefix}:${sanitized.join(':')}`
  }

  /**
   * Generate hash for complex objects (for cache keys)
   */
  hashObject(obj: any): string {
    const str = JSON.stringify(obj)
    return crypto.createHash('md5').update(str).digest('hex').substring(0, 8)
  }

  /**
   * Get from cache (checks L1 memory, then L2 Redis)
   */
  async get<T = any>(key: string): Promise<CacheResult<T>> {
    this.stats.totalRequests++

    // Layer 1: Memory cache (fast)
    const memValue = this.memoryCache.get(key)
    if (memValue !== undefined) {
      this.stats.hits.memory++
      this.stats.hits.total++
      return { data: memValue, source: 'memory' }
    }

    // Layer 2: Redis cache (slower but persistent)
    if (this.redisEnabled && this.connected && this.redis) {
      try {
        const redisValue = await this.redis.get(key)
        if (redisValue) {
          const parsed = JSON.parse(redisValue)
          
          // Promote to L1 cache
          this.memoryCache.set(key, parsed)
          
          this.stats.hits.redis++
          this.stats.hits.total++
          return { data: parsed, source: 'redis' }
        }
      } catch (_error) {
        logger.error('[CacheService] Redis GET error:', (_error as Error).message)
        this.stats.errors++
      }
    }

    // Cache miss
    this.stats.misses++
    return { data: null, source: null }
  }

  /**
   * Set in cache with TTL-based conditional writes
   * Skips write if key exists and has > 50% TTL remaining (reduces Redis writes)
   */
  async set<T = any>(key: string, value: T, ttlSeconds: number = REDIS_TTL.DEFAULT): Promise<void> {
    this.stats.sets++

    // Layer 1: Memory cache (store raw data)
    this.memoryCache.set(key, value)

    // Layer 2: Redis cache with conditional write
    if (this.redisEnabled && this.connected && this.redis) {
      try {
        // Check if key exists and has sufficient TTL remaining
        const existingTTL = await this.redis.ttl(key)
        
        // Skip write if key has > 50% of original TTL remaining (reduce write load)
        if (existingTTL > ttlSeconds * 0.5) {
          this.stats.skippedWrites++
          return
        }
        
        this.stats.cacheWrites++
        const serialized = JSON.stringify(value)
        if (ttlSeconds > 0) {
          await this.redis.setex(key, ttlSeconds, serialized)
        } else {
          await this.redis.set(key, serialized)
        }
      } catch (_error) {
        logger.error('[CacheService] Redis SET error:', (_error as Error).message)
        this.stats.errors++
      }
    }
  }
  
  /**
   * Fast non-blocking cache write (fire-and-forget)
   * Use this for cache writes that shouldn't block request response
   * Skips TTL check - always writes to avoid extra Redis network call
   */
  setFast<T = any>(key: string, value: T, ttlSeconds: number = REDIS_TTL.DEFAULT): void {
    this.stats.sets++

    // Layer 1: Memory cache (instant)
    this.memoryCache.set(key, value)

    // Layer 2: Redis cache (fire-and-forget - don't block caller)
    if (this.redisEnabled && this.connected && this.redis) {
      setImmediate(() => {
        const serialized = JSON.stringify(value)
        this.stats.cacheWrites++
        
        const promise = ttlSeconds > 0 
          ? this.redis!.setex(key, ttlSeconds, serialized)
          : this.redis!.set(key, serialized)
        
        promise.catch((_error: Error) => {
          logger.error('[CacheService] Redis SETFAST error:', _error.message)
          this.stats.errors++
        })
      })
    }
  }
  
  /**
   * Generate ETag from data (MD5 hash)
   */
  generateETag(data: any): string {
    return crypto.createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 16)
  }

  /**
   * Get or fetch with cache stampede protection
   * 
   * Features:
   * - Request coalescing: Multiple simultaneous requests for same key share one fetch
   * - Probabilistic early expiration: Randomly refresh before TTL expires on popular keys
   */
  async getOrFetch<T = any>(key: string, fetchFn: FetchFunction<T>, ttlSeconds: number = REDIS_TTL.DEFAULT): Promise<T> {
    // Check if there's already a pending fetch for this key (request coalescing)
    const pendingFetch = this.pendingFetches.get(key)
    if (pendingFetch) {
      logger.debug(`[CacheService] Coalescing request for key: ${key}`)
      return pendingFetch
    }
    
    const cached = await this.get<T>(key)
    
    if (cached.data !== null) {
      // Probabilistic early expiration to prevent cache stampede on popular keys
      // For keys with TTL > 1 hour, randomly refresh 5-10% before expiration
      if (ttlSeconds > 3600) {
        const shouldEarlyRefresh = Math.random() < 0.05 // 5% chance
        if (shouldEarlyRefresh) {
          logger.debug(`[CacheService] Probabilistic early refresh for key: ${key}`)
          // Trigger background refresh (don't await)
          this.refreshInBackground(key, fetchFn, ttlSeconds)
        }
      }
      
      return cached.data
    }

    // Cache miss - fetch data with request coalescing
    const fetchPromise = (async () => {
      try {
        const freshData = await fetchFn()
        
        if (freshData !== null && freshData !== undefined) {
          await this.set(key, freshData, ttlSeconds)
        }
        
        return freshData
      } finally {
        // Clean up pending fetch
        this.pendingFetches.delete(key)
      }
    })()
    
    // Store pending fetch for coalescing
    this.pendingFetches.set(key, fetchPromise)
    
    return fetchPromise
  }
  
  /**
   * Refresh cache in background (for probabilistic early expiration)
   */
  private async refreshInBackground<T = any>(key: string, fetchFn: FetchFunction<T>, ttlSeconds: number): Promise<void> {
    try {
      const freshData = await fetchFn()
      if (freshData !== null && freshData !== undefined) {
        await this.set(key, freshData, ttlSeconds)
      }
    } catch (error) {
      logger.error(`[CacheService] Background refresh failed for key ${key}:`, error)
    }
  }

  /**
   * Delete from cache
   */
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key)
    
    if (this.redisEnabled && this.connected && this.redis) {
      try {
        await this.redis.del(key)
      } catch (_error) {
        logger.error('[CacheService] Redis DEL error:', (_error as Error).message)
        this.stats.errors++
      }
    }
  }

  /**
   * Delete multiple keys by pattern (Redis only)
   */
  async deletePattern(pattern: string): Promise<number> {
    if (!this.redisEnabled || !this.connected || !this.redis) {
      logger.warn('[CacheService] Pattern delete requires Redis')
      return 0
    }

    try {
      const keys = await this.redis.keys(pattern)
      if (keys.length > 0) {
        const deleted = await this.redis.del(...keys)
        logger.debug(`[CacheService] Deleted ${deleted} keys matching pattern: ${pattern}`)
        return deleted
      }
      return 0
    } catch (_error) {
      logger.error('[CacheService] Redis pattern delete error:', (_error as Error).message)
      this.stats.errors++
      return 0
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear()
    
    if (this.redisEnabled && this.connected && this.redis) {
      try {
        await this.redis.flushdb()
        logger.debug('[CacheService] Cleared Redis cache')
      } catch (_error) {
        logger.error('[CacheService] Redis FLUSHDB error:', (_error as Error).message)
        this.stats.errors++
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalHits = this.stats.hits.total
    const totalRequests = this.stats.totalRequests
    const hitRate = totalRequests > 0 ? (totalHits / totalRequests * 100).toFixed(2) : 0

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      memorySize: this.memoryCache.size,
      memoryItems: this.memoryCache.calculatedSize,
      redisEnabled: this.redisEnabled,
      redisConnected: this.connected,
    }
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: { memory: 0, redis: 0, total: 0 },
      misses: 0,
      sets: 0,
      errors: 0,
      totalRequests: 0,
      cacheWrites: 0,
      skippedWrites: 0,
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.redis && this.connected) {
      await this.redis.quit()
      logger.debug('[CacheService] Disconnected from Redis')
    }
  }

  /**
   * Ping Redis to check connectivity (for health checks)
  /**
   * Ping Redis to check connectivity (for health checks)
   */
  async ping(): Promise<boolean> {
    if (!this.redisEnabled || !this.connected || !this.redis) {
      return false
    }
    try {
      const result = await this.redis.ping()
      return result === 'PONG'
    } catch (_error) {
      logger.error('[CacheService] Ping failed:', (_error as Error).message)
      return false
    }
  }

  /**
   * Check if running in memory-only mode (Redis disabled/unavailable)
   */
  isMemoryOnly(): boolean {
    return !this.redisEnabled || !this.connected
  }

  /**
   * Get Redis client for advanced usage (e.g., rate limiting)
   * Returns null if Redis is not available
   */
  getRedisClient(): Redis | null {
    return this.redisEnabled && this.connected ? this.redis : null
  }
}

// Re-export Redis TTL constants from centralized config
export { REDIS_TTL as CacheTTL } from '../config/constants'

// Singleton instance
let cacheInstance: CacheService | null = null

export function getCacheService(): CacheService {
  if (!cacheInstance) {
    cacheInstance = new CacheService()
  }
  return cacheInstance
}

export default CacheService
