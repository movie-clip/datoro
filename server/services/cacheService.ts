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
type CacheValue = string | number | boolean | object

/**
 * Fast hash function for cache keys (faster than JSON.stringify + MD5)
 * Uses simple string concatenation with separator for simple objects
 */
function _fastHash(value: unknown): string {
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
    const record = value as Record<string, unknown>
    const keys = Object.keys(record).sort()
    return keys.map(k => `${k}:${_fastHash(record[k])}`).join('|')
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
  private hasConnectedOnce: boolean
  private startupRedisErrorLogged: boolean
  private memoryCache: LRUCache<string, CacheValue>
  public stats: CacheStats
  
  // Request coalescing to prevent cache stampede
  private pendingFetches: Map<string, Promise<CacheValue>>

  constructor(options: CacheServiceOptions = {}) {
    this.redisUrl = options.redisUrl || process.env.REDIS_URL || null
    this.redisEnabled = !!this.redisUrl
    this.redis = null
    this.connected = false
    this.hasConnectedOnce = false
    this.startupRedisErrorLogged = false
    this.pendingFetches = new Map()

    // Layer 1: In-memory LRU cache (fast, volatile)
    this.memoryCache = new LRUCache({
      max: options.maxMemoryItems || 500,
      maxSize: options.maxMemorySize || MEMORY_LIMITS.CACHE_SIZE,
      sizeCalculation: (value: CacheValue) => {
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
      const redisConnection = this.redisUrl ? new URL(this.redisUrl) : null
      if (redisConnection) {
        logger.info('[CacheService] Connecting to Redis', {
          protocol: redisConnection.protocol.replace(':', ''),
          host: redisConnection.host,
          authenticated: Boolean(redisConnection.username || redisConnection.password)
        })
      }

      this.redis = new Redis(this.redisUrl!, {
        maxRetriesPerRequest: 3,
        connectTimeout: 5000,
        retryStrategy: (times: number) => {
          if (times > 3) {
            return null // Stop retrying
          }
          return Math.min(times * 200, 2000) // Exponential backoff
        },
        lazyConnect: true,
      })

      // Event handlers
      this.redis.on('connect', () => {
        logger.info('[CacheService] Connected to Redis')
        this.connected = true
        this.hasConnectedOnce = true
        this.startupRedisErrorLogged = false
      })

      this.redis.on('error', (err: Error) => {
        const errorMeta = {
          error: err.message,
          code: (err as NodeJS.ErrnoException).code
        }

        if (!this.hasConnectedOnce) {
          if (!this.startupRedisErrorLogged) {
            logger.error('[CacheService] Redis startup connection error', errorMeta)
            this.startupRedisErrorLogged = true
          }
        } else {
          logger.error('[CacheService] Redis runtime error', errorMeta)
        }

        this.stats.errors++
      })

      this.redis.on('close', () => {
        logger.debug('[CacheService] Redis connection closed')
        this.connected = false
      })

      // Connect
      await this.redis.connect()
    } catch (_error) {
      if (!this.startupRedisErrorLogged) {
        logger.error('[CacheService] Failed to connect to Redis', {
          error: (_error as Error).message,
          code: (_error as NodeJS.ErrnoException).code
        })
      }

      this.redis?.disconnect()
      this.connected = false
      logger.warn('[CacheService] Falling back to memory-only mode')
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
  hashObject(obj: unknown): string {
    const str = JSON.stringify(obj)
    return crypto.createHash('md5').update(str).digest('hex').substring(0, 8)
  }

  /**
   * Get from cache (checks L1 memory, then L2 Redis)
   */
  async get<T = unknown>(key: string): Promise<CacheResult<T>> {
    this.stats.totalRequests++

    // Layer 1: Memory cache (fast)
    const memValue = this.memoryCache.get(key)
    if (memValue !== undefined) {
      this.stats.hits.memory++
      this.stats.hits.total++
      return { data: memValue as T, source: 'memory' }
    }

    // Layer 2: Redis cache (slower but persistent)
    if (this.redisEnabled && this.connected && this.redis) {
      try {
        const redisValue = await this.redis.get(key)
        if (redisValue) {
          const parsed = JSON.parse(redisValue)
          
          // Promote to L1 cache
          if (parsed !== null && parsed !== undefined) {
            this.memoryCache.set(key, parsed as CacheValue)
          }
          
          this.stats.hits.redis++
          this.stats.hits.total++
          return { data: parsed as T, source: 'redis' }
        }
      } catch (_error) {
        logger.error('[CacheService] Redis GET error', {
          error: (_error as Error).message,
          code: (_error as NodeJS.ErrnoException).code
        })
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
  async set<T = unknown>(key: string, value: T, ttlSeconds: number = REDIS_TTL.DEFAULT): Promise<void> {
    this.stats.sets++

    // Layer 1: Memory cache (store raw data)
    if (value !== null && value !== undefined) {
      this.memoryCache.set(key, value as CacheValue)
    }

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
        logger.error('[CacheService] Redis SET error', {
          error: (_error as Error).message,
          code: (_error as NodeJS.ErrnoException).code
        })
        this.stats.errors++
      }
    }
  }
  
  /**
   * Fast non-blocking cache write (fire-and-forget)
   * Use this for cache writes that shouldn't block request response
   * Skips TTL check - always writes to avoid extra Redis network call
   */
  setFast<T = unknown>(key: string, value: T, ttlSeconds: number = REDIS_TTL.DEFAULT): void {
    this.stats.sets++

    // Layer 1: Memory cache (instant)
    if (value !== null && value !== undefined) {
      this.memoryCache.set(key, value as CacheValue)
    }

    // Layer 2: Redis cache (fire-and-forget - don't block caller)
    if (this.redisEnabled && this.connected && this.redis) {
      setImmediate(() => {
        const serialized = JSON.stringify(value)
        this.stats.cacheWrites++
        
        const promise = ttlSeconds > 0 
          ? this.redis!.setex(key, ttlSeconds, serialized)
          : this.redis!.set(key, serialized)
        
        promise.catch((_error: Error) => {
          logger.error('[CacheService] Redis SETFAST error', {
            error: _error.message,
            code: (_error as NodeJS.ErrnoException).code
          })
          this.stats.errors++
        })
      })
    }
  }
  
  /**
   * Generate ETag from data (MD5 hash)
   */
  generateETag(data: unknown): string {
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
  async getOrFetch<T = unknown>(key: string, fetchFn: FetchFunction<T>, ttlSeconds: number = REDIS_TTL.DEFAULT): Promise<T> {
    // Check if there's already a pending fetch for this key (request coalescing)
    const pendingFetch = this.pendingFetches.get(key)
    if (pendingFetch) {
      logger.debug(`[CacheService] Coalescing request for key: ${key}`)
      return pendingFetch as Promise<T>
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
    this.pendingFetches.set(key, fetchPromise as Promise<CacheValue>)
    
    return fetchPromise
  }
  
  /**
   * Refresh cache in background (for probabilistic early expiration)
   */
  private async refreshInBackground<T = unknown>(key: string, fetchFn: FetchFunction<T>, ttlSeconds: number): Promise<void> {
    try {
      const freshData = await fetchFn()
      if (freshData !== null && freshData !== undefined) {
        await this.set(key, freshData, ttlSeconds)
      }
    } catch (error) {
      logger.error(`[CacheService] Background refresh failed for key ${key}`, {
        error: error instanceof Error ? error.message : String(error)
      })
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
        logger.error('[CacheService] Redis DEL error', {
          error: (_error as Error).message,
          code: (_error as NodeJS.ErrnoException).code
        })
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
      const matchedKeys: string[] = []
      let cursor = '0'

      do {
        const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 500)
        cursor = nextCursor
        if (Array.isArray(keys) && keys.length > 0) {
          matchedKeys.push(...keys)
        }
      } while (cursor !== '0')

      // Also clear matching memory keys for consistency
      const escapedPattern = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.')
      const regex = new RegExp(`^${escapedPattern}$`)
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          this.memoryCache.delete(key)
        }
      }

      if (matchedKeys.length > 0) {
        // Chunk deletes to avoid oversized Redis command payloads
        let deleted = 0
        const chunkSize = 500
        for (let i = 0; i < matchedKeys.length; i += chunkSize) {
          const chunk = matchedKeys.slice(i, i + chunkSize)
          deleted += await this.redis.del(...chunk)
        }

        logger.debug(`[CacheService] Deleted ${deleted} keys matching pattern via SCAN: ${pattern}`)
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
