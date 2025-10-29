import Redis from 'ioredis'
import { LRUCache } from 'lru-cache'
import crypto from 'crypto'
import { MEMORY_LIMITS, CACHE_TTL, REDIS_TTL } from '../config/constants'

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
}

interface CacheResult<T> {
  data: T | null
  source: 'memory' | 'redis' | null
}

type FetchFunction<T> = () => Promise<T>

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
  private redisUrl: string | null
  private redisEnabled: boolean
  private redis: Redis | null
  private connected: boolean
  private memoryCache: LRUCache<string, any>
  public stats: CacheStats

  constructor(options: CacheServiceOptions = {}) {
    this.redisUrl = options.redisUrl || process.env.REDIS_URL || null
    this.redisEnabled = !!this.redisUrl
    this.redis = null
    this.connected = false

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
    }

    console.log(`[CacheService] Initialized with Redis ${this.redisEnabled ? 'ENABLED' : 'DISABLED'}`)
  }

  /**
   * Connect to Redis (if enabled)
   */
  async connect(): Promise<void> {
    if (!this.redisEnabled) {
      console.log('[CacheService] Running without Redis (memory-only mode)')
      return
    }

    try {
      this.redis = new Redis(this.redisUrl!, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number) => {
          if (times > 3) {
            console.error('[CacheService] Redis connection failed after 3 retries')
            return null // Stop retrying
          }
          return Math.min(times * 200, 2000) // Exponential backoff
        },
        lazyConnect: true,
      })

      // Event handlers
      this.redis.on('connect', () => {
        console.log('[CacheService] Connected to Redis')
        this.connected = true
      })

      this.redis.on('error', (err: Error) => {
        console.error('[CacheService] Redis error:', err.message)
        this.stats.errors++
      })

      this.redis.on('close', () => {
        console.log('[CacheService] Redis connection closed')
        this.connected = false
      })

      // Connect
      await this.redis.connect()
    } catch (_error) {
      console.error('[CacheService] Failed to connect to Redis:', (error as Error).message)
      console.log('[CacheService] Falling back to memory-only mode')
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
        console.error('[CacheService] Redis GET error:', (error as Error).message)
        this.stats.errors++
      }
    }

    // Cache miss
    this.stats.misses++
    return { data: null, source: null }
  }

  /**
   * Set in cache (stores in both L1 and L2)
   */
  async set<T = any>(key: string, value: T, ttlSeconds = REDIS_TTL.DEFAULT): Promise<void> {
    this.stats.sets++

    // Layer 1: Memory cache (store raw data)
    this.memoryCache.set(key, value)

    // Layer 2: Redis cache
    if (this.redisEnabled && this.connected && this.redis) {
      try {
        const serialized = JSON.stringify(value)
        if (ttlSeconds > 0) {
          await this.redis.setex(key, ttlSeconds, serialized)
        } else {
          await this.redis.set(key, serialized)
        }
      } catch (_error) {
        console.error('[CacheService] Redis SET error:', (error as Error).message)
        this.stats.errors++
      }
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
   * Get or fetch (auto-fetch on cache miss)
   */
  async getOrFetch<T = any>(key: string, fetchFn: FetchFunction<T>, ttlSeconds = REDIS_TTL.DEFAULT): Promise<T> {
    const cached = await this.get<T>(key)
    
    if (cached.data !== null) {
      return cached.data
    }

    // Cache miss - fetch data
    const freshData = await fetchFn()
    
    if (freshData !== null && freshData !== undefined) {
      await this.set(key, freshData, ttlSeconds)
    }

    return freshData
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
        console.error('[CacheService] Redis DEL error:', (error as Error).message)
        this.stats.errors++
      }
    }
  }

  /**
   * Delete multiple keys by pattern (Redis only)
   */
  async deletePattern(pattern: string): Promise<number> {
    if (!this.redisEnabled || !this.connected || !this.redis) {
      console.warn('[CacheService] Pattern delete requires Redis')
      return 0
    }

    try {
      const keys = await this.redis.keys(pattern)
      if (keys.length > 0) {
        const deleted = await this.redis.del(...keys)
        console.log(`[CacheService] Deleted ${deleted} keys matching pattern: ${pattern}`)
        return deleted
      }
      return 0
    } catch (_error) {
      console.error('[CacheService] Redis pattern delete error:', (error as Error).message)
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
        console.log('[CacheService] Cleared Redis cache')
      } catch (_error) {
        console.error('[CacheService] Redis FLUSHDB error:', (error as Error).message)
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
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.redis && this.connected) {
      await this.redis.quit()
      console.log('[CacheService] Disconnected from Redis')
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
      console.error('[CacheService] Ping failed:', (error as Error).message)
      return false
    }
  }

  /**
   * Check if running in memory-only mode (Redis disabled/unavailable)
   */
  isMemoryOnly(): boolean {
    return !this.redisEnabled || !this.connected
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
