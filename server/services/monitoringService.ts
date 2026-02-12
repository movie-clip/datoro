import logger from '../services/logger.js'
import type { Request, Response } from 'express'
import { getCacheService } from './cacheService.js'

/**
 * Monitoring Service
 * 
 * Tracks application metrics and provides a monitoring dashboard
 * Works with or without Sentry
 */

interface SlowQuery {
  endpoint: string
  duration: number
  timestamp: string
  method: string
}

interface RecentError {
  message: string
  code: string
  endpoint: string
  timestamp: string
  stack?: string
  statusCode?: number
}

interface EndpointPerformance {
  count: number
  responseTimes: number[]
  avgResponseTime: number
  p50ResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  maxResponseTime: number
  minResponseTime: number
}

type CacheSource = 'memory' | 'redis' | 'miss' | 'hit' | 'unknown'

interface RedisHealth {
  status: 'connected' | 'memory-only'
  memoryOnlySince: string | null
  memoryOnlyDurationSec: number
  alert: boolean
  alertThresholdSec: number
}

interface Metrics {
  requests: {
    total: number
    byEndpoint: Record<string, number>
    byStatus: {
      '2xx': number
      '3xx': number
      '4xx': number
      '5xx': number
    }
    aborted: number  // Track aborted/cancelled requests
  }
  performance: {
    responseTimes: number[]
    slowQueries: SlowQuery[]
    avgResponseTime: number
    p95ResponseTime: number
    p99ResponseTime: number
    byEndpoint: Record<string, EndpointPerformance>  // Per-endpoint metrics
    byCacheSource: Record<string, EndpointPerformance>
  }
  cache: {
    hits: number
    misses: number
    hitRate: number
    bytesSaved: number
  }
  rateLimit: {
    blocked: number
    slowed: number
    byIP: Record<string, { blocked: number; slowed: number }>
  }
  errors: {
    total: number
    byCode: Record<string, number>
    byEndpoint: Record<string, number>
    recent: RecentError[]
  }
  system: {
    uptime: number
    memory: NodeJS.MemoryUsage
    cpu: any
    redis: RedisHealth
  }
}

class MonitoringService {
  private metrics: Metrics
  private metricsInterval: NodeJS.Timeout | null
  private readonly redisAlertThresholdSec: number
  private redisMemoryOnlySinceMs: number | null
  private redisAlertLogged: boolean

  constructor() {
    this.redisAlertThresholdSec = Number(process.env.REDIS_MEMORY_ONLY_ALERT_SECONDS || 300)
    this.redisMemoryOnlySinceMs = null
    this.redisAlertLogged = false

    this.metrics = {
      requests: {
        total: 0,
        byEndpoint: {},
        byStatus: {
          '2xx': 0,
          '3xx': 0,
          '4xx': 0,
          '5xx': 0
        },
        aborted: 0  // Initialize aborted request counter
      },
      performance: {
        responseTimes: [],
        slowQueries: [],
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        byEndpoint: {},  // Initialize endpoint-specific performance tracking
        byCacheSource: {}
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        bytesSaved: 0
      },
      rateLimit: {
        blocked: 0,
        slowed: 0,
        byIP: {}
      },
      errors: {
        total: 0,
        byCode: {},
        byEndpoint: {},
        recent: []
      },
      system: {
        uptime: Date.now(),
        memory: {} as NodeJS.MemoryUsage,
        cpu: {},
        redis: {
          status: 'connected',
          memoryOnlySince: null,
          memoryOnlyDurationSec: 0,
          alert: false,
          alertThresholdSec: this.redisAlertThresholdSec
        }
      }
    }

    // Store interval reference to allow cleanup
    this.metricsInterval = null
    
    // Start monitoring
    this.start()
  }

  /**
   * Start monitoring (with cleanup safety)
   */
  start(): void {
    if (this.metricsInterval) {
      logger.warn('[MonitoringService] Already started')
      return
    }
    
    // Update metrics every 10 seconds
    this.metricsInterval = setInterval(() => this.updateSystemMetrics(), 10000)
    this.updateSystemMetrics()
    logger.info('[MonitoringService] Started')
  }

  /**
   * Stop monitoring and cleanup interval
   */
  stop(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
      this.metricsInterval = null
      logger.info('[MonitoringService] Stopped')
    }
  }

  /**
   * Track request
   */
  trackRequest(req: Request, res: Response, duration: number): void {
    this.metrics.requests.total++

    // Track by endpoint
    const endpoint = this.normalizeEndpoint(req.path)
    this.metrics.requests.byEndpoint[endpoint] = 
      (this.metrics.requests.byEndpoint[endpoint] || 0) + 1

    // Track by status code range
    const statusRange = `${Math.floor(res.statusCode / 100)}xx` as keyof typeof this.metrics.requests.byStatus
    if (this.metrics.requests.byStatus[statusRange] !== undefined) {
      this.metrics.requests.byStatus[statusRange]++
    }

    // Track response time
    this.trackResponseTime(duration)
    
    // Track endpoint-specific performance
    this.trackEndpointPerformance(endpoint, duration)

    // Track cache-source performance for ticker split endpoints
    if (this.shouldTrackCacheSourceForEndpoint(endpoint)) {
      const cacheSource = this.normalizeCacheSource(res.getHeader('X-Cache'))
      this.trackCacheSourcePerformance(endpoint, cacheSource, duration)
    }

    // Track slow queries (>2 seconds)
    if (duration > 2000) {
      this.metrics.performance.slowQueries.push({
        endpoint,
        duration,
        timestamp: new Date().toISOString(),
        method: req.method
      })

      // Keep only last 50 slow queries
      if (this.metrics.performance.slowQueries.length > 50) {
        this.metrics.performance.slowQueries.shift()
      }
    }
  }

  /**
   * Track response time
   */
  trackResponseTime(duration: number): void {
    this.metrics.performance.responseTimes.push(duration)

    // Keep only last 1000 response times
    if (this.metrics.performance.responseTimes.length > 1000) {
      this.metrics.performance.responseTimes.shift()
    }

    // Calculate percentiles
    if (this.metrics.performance.responseTimes.length > 0) {
      const sorted = [...this.metrics.performance.responseTimes].sort((a, b) => a - b)
      const len = sorted.length

      this.metrics.performance.avgResponseTime = 
        Math.round(sorted.reduce((a, b) => a + b, 0) / len)
      
      this.metrics.performance.p95ResponseTime = 
        Math.round(sorted[Math.floor(len * 0.95)])
      
      this.metrics.performance.p99ResponseTime = 
        Math.round(sorted[Math.floor(len * 0.99)])
    }
  }

  /**
   * Track endpoint-specific performance metrics
   */
  trackEndpointPerformance(endpoint: string, duration: number): void {
    // Initialize endpoint metrics if not exists
    if (!this.metrics.performance.byEndpoint[endpoint]) {
      this.metrics.performance.byEndpoint[endpoint] = {
        count: 0,
        responseTimes: [],
        avgResponseTime: 0,
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity
      }
    }

    const endpointMetrics = this.metrics.performance.byEndpoint[endpoint]
    endpointMetrics.count++
    endpointMetrics.responseTimes.push(duration)

    // Keep only last 100 response times per endpoint
    if (endpointMetrics.responseTimes.length > 100) {
      endpointMetrics.responseTimes.shift()
    }

    // Calculate percentiles for this endpoint
    if (endpointMetrics.responseTimes.length > 0) {
      const sorted = [...endpointMetrics.responseTimes].sort((a, b) => a - b)
      const len = sorted.length

      endpointMetrics.avgResponseTime = Math.round(sorted.reduce((a, b) => a + b, 0) / len)
      endpointMetrics.p50ResponseTime = Math.round(sorted[Math.floor(len * 0.50)])
      endpointMetrics.p95ResponseTime = Math.round(sorted[Math.floor(len * 0.95)])
      endpointMetrics.p99ResponseTime = Math.round(sorted[Math.floor(len * 0.99)])
      endpointMetrics.maxResponseTime = Math.round(sorted[len - 1])
      endpointMetrics.minResponseTime = Math.round(sorted[0])
    }
  }

  /**
   * Track cache-source latency for selected endpoints
   */
  trackCacheSourcePerformance(endpoint: string, source: CacheSource, duration: number): void {
    const key = `${endpoint}|${source}`

    if (!this.metrics.performance.byCacheSource[key]) {
      this.metrics.performance.byCacheSource[key] = {
        count: 0,
        responseTimes: [],
        avgResponseTime: 0,
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity
      }
    }

    const sourceMetrics = this.metrics.performance.byCacheSource[key]
    sourceMetrics.count++
    sourceMetrics.responseTimes.push(duration)

    if (sourceMetrics.responseTimes.length > 200) {
      sourceMetrics.responseTimes.shift()
    }

    const sorted = [...sourceMetrics.responseTimes].sort((a, b) => a - b)
    const len = sorted.length
    sourceMetrics.avgResponseTime = Math.round(sorted.reduce((a, b) => a + b, 0) / len)
    sourceMetrics.p50ResponseTime = Math.round(sorted[Math.floor(len * 0.50)])
    sourceMetrics.p95ResponseTime = Math.round(sorted[Math.floor(len * 0.95)])
    sourceMetrics.p99ResponseTime = Math.round(sorted[Math.floor(len * 0.99)])
    sourceMetrics.maxResponseTime = Math.round(sorted[len - 1])
    sourceMetrics.minResponseTime = Math.round(sorted[0])
  }

  private shouldTrackCacheSourceForEndpoint(endpoint: string): boolean {
    return endpoint.endsWith('/static') || endpoint.endsWith('/dynamic')
  }

  private normalizeCacheSource(cacheHeader: unknown): CacheSource {
    const value = String(cacheHeader || '').toLowerCase().trim()

    if (!value) return 'unknown'
    if (value.includes('memory')) return 'memory'
    if (value.includes('redis')) return 'redis'
    if (value.includes('miss')) return 'miss'
    if (value.includes('hit')) return 'hit'
    return 'unknown'
  }

  /**
   * Track cache hit/miss
   */
  trackCache(hit: boolean, bytesSaved = 0): void {
    if (hit) {
      this.metrics.cache.hits++
      this.metrics.cache.bytesSaved += bytesSaved
    } else {
      this.metrics.cache.misses++
    }

    const total = this.metrics.cache.hits + this.metrics.cache.misses
    this.metrics.cache.hitRate = total > 0 
      ? Math.round((this.metrics.cache.hits / total) * 100) 
      : 0
  }

  /**
   * Track rate limit event
   */
  trackRateLimit(type: 'blocked' | 'slowed', ip: string): void {
    if (type === 'blocked') {
      this.metrics.rateLimit.blocked++
    } else if (type === 'slowed') {
      this.metrics.rateLimit.slowed++
    }

    // Track by IP
    this.metrics.rateLimit.byIP[ip] = this.metrics.rateLimit.byIP[ip] || { blocked: 0, slowed: 0 }
    this.metrics.rateLimit.byIP[ip][type]++

    // Keep only top 20 IPs
    const topIPs = Object.entries(this.metrics.rateLimit.byIP)
      .sort((a, b) => (b[1].blocked + b[1].slowed) - (a[1].blocked + a[1].slowed))
      .slice(0, 20)
    
    this.metrics.rateLimit.byIP = Object.fromEntries(topIPs)
  }

  /**
   * Track error
   */
  trackError(error: any, req: Request): void {
    this.metrics.errors.total++

    // Track by error code
    const code = error.code || 'UNKNOWN'
    this.metrics.errors.byCode[code] = (this.metrics.errors.byCode[code] || 0) + 1

    // Track by endpoint
    const endpoint = this.normalizeEndpoint(req.path)
    this.metrics.errors.byEndpoint[endpoint] = 
      (this.metrics.errors.byEndpoint[endpoint] || 0) + 1

    // Store recent errors
    this.metrics.errors.recent.unshift({
      message: error.message,
      code,
      endpoint,
      timestamp: new Date().toISOString(),
      statusCode: error.statusCode || 500
    });

    // Keep only last 20 errors
    if (this.metrics.errors.recent.length > 20) {
      this.metrics.errors.recent.pop();
    }
  }

  /**
   * Track aborted/cancelled request
   * Called when client cancels request (AbortController)
   */
  trackAbortedRequest(): void {
    this.metrics.requests.aborted++
  }

  /**
   * Update system metrics
   */
  updateSystemMetrics(): void {
    const used = process.memoryUsage();
    
    this.metrics.system.memory = {
      heapUsed: Math.round(used.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(used.heapTotal / 1024 / 1024), // MB
      rss: Math.round(used.rss / 1024 / 1024), // MB
      external: Math.round(used.external / 1024 / 1024) // MB
    } as any;

    this.metrics.system.uptime = Math.round((Date.now() - this.metrics.system.uptime) / 1000);
    
    // CPU usage (basic - percentage of time spent)
    const cpuUsage = process.cpuUsage();
    this.metrics.system.cpu = {
      user: Math.round(cpuUsage.user / 1000), // ms
      system: Math.round(cpuUsage.system / 1000) // ms
    };

    // Redis memory-only fallback monitoring (performance alert)
    const cache = getCacheService()
    const now = Date.now()
    const memoryOnly = cache.isMemoryOnly()

    if (memoryOnly && this.redisMemoryOnlySinceMs === null) {
      this.redisMemoryOnlySinceMs = now
    }

    if (!memoryOnly && this.redisMemoryOnlySinceMs !== null) {
      const fallbackDurationSec = Math.floor((now - this.redisMemoryOnlySinceMs) / 1000)
      if (fallbackDurationSec >= 30) {
        logger.info('[Monitoring] Redis recovered from memory-only fallback mode', {
          durationSec: fallbackDurationSec
        })
      }
      this.redisMemoryOnlySinceMs = null
      this.redisAlertLogged = false
    }

    const memoryOnlyDurationSec = this.redisMemoryOnlySinceMs
      ? Math.floor((now - this.redisMemoryOnlySinceMs) / 1000)
      : 0
    const redisAlert = memoryOnly && memoryOnlyDurationSec >= this.redisAlertThresholdSec

    if (redisAlert && !this.redisAlertLogged) {
      this.redisAlertLogged = true
      logger.error('[Monitoring] Redis memory-only alert threshold exceeded', {
        thresholdSec: this.redisAlertThresholdSec,
        memoryOnlyDurationSec
      })
    }

    this.metrics.system.redis = {
      status: memoryOnly ? 'memory-only' : 'connected',
      memoryOnlySince: this.redisMemoryOnlySinceMs
        ? new Date(this.redisMemoryOnlySinceMs).toISOString()
        : null,
      memoryOnlyDurationSec,
      alert: redisAlert,
      alertThresholdSec: this.redisAlertThresholdSec
    }
  }

  /**
   * Normalize endpoint for grouping
   */
  normalizeEndpoint(path: string): string {
    // Replace dynamic segments with placeholders
    return path
      .replace(/\/[A-Z]{1,5}(?=\/|$)/g, '/:ticker') // Ticker symbols
      .replace(/\/\d+/g, '/:id') // Numeric IDs
      .replace(/\/[a-f0-9-]{32,}/g, '/:hash'); // Hashes
  }

  /**
   * Get all metrics
   */
  getMetrics(): any {
    return {
      ...this.metrics,
      system: {
        ...this.metrics.system,
        uptimeFormatted: this.formatUptime(this.metrics.system.uptime)
      }
    };
  }

  /**
   * Get summary
   */
  getSummary(): any {
    const metrics = this.getMetrics();
    const totalRequests = metrics.requests.total;
    const errorRate = totalRequests > 0 
      ? Number(((metrics.errors.total / totalRequests) * 100).toFixed(2))
      : 0;
    const redisDegraded = Boolean(metrics.system?.redis?.alert)

    return {
      status: errorRate > 5 || redisDegraded ? 'degraded' : 'healthy',
      uptime: metrics.system.uptimeFormatted,
      requests: {
        total: totalRequests,
        successRate: `${100 - errorRate}%`
      },
      performance: {
        avg: `${metrics.performance.avgResponseTime}ms`,
        p95: `${metrics.performance.p95ResponseTime}ms`,
        p99: `${metrics.performance.p99ResponseTime}ms`
      },
      cache: {
        hitRate: `${metrics.cache.hitRate}%`,
        bytesSaved: this.formatBytes(metrics.cache.bytesSaved)
      },
      redis: {
        status: metrics.system?.redis?.status || 'unknown',
        alert: Boolean(metrics.system?.redis?.alert),
        memoryOnlyDurationSec: metrics.system?.redis?.memoryOnlyDurationSec || 0
      },
      errors: {
        total: metrics.errors.total,
        rate: `${errorRate}%`
      }
    };
  }

  /**
   * Format uptime
   */
  formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  }

  /**
   * Format bytes
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Reset metrics
   */
  reset(): void {
    const uptime = this.metrics.system.uptime;
    this.metrics = {
      requests: {
        total: 0,
        byEndpoint: {},
        byStatus: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
        aborted: 0  // Initialize aborted counter on reset
      },
      performance: {
        responseTimes: [],
        slowQueries: [],
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        byEndpoint: {},  // Reset endpoint-specific performance tracking
        byCacheSource: {}
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        bytesSaved: 0
      },
      rateLimit: {
        blocked: 0,
        slowed: 0,
        byIP: {}
      },
      errors: {
        total: 0,
        byCode: {},
        byEndpoint: {},
        recent: []
      },
      system: {
        uptime,
        memory: {} as any,
        cpu: {},
        redis: {
          status: this.redisMemoryOnlySinceMs ? 'memory-only' : 'connected',
          memoryOnlySince: this.redisMemoryOnlySinceMs
            ? new Date(this.redisMemoryOnlySinceMs).toISOString()
            : null,
          memoryOnlyDurationSec: this.redisMemoryOnlySinceMs
            ? Math.floor((Date.now() - this.redisMemoryOnlySinceMs) / 1000)
            : 0,
          alert: false,
          alertThresholdSec: this.redisAlertThresholdSec
        }
      }
    };
  }
}

// Singleton instance
let monitoringInstance: MonitoringService | null = null;

export function getMonitoringService(): MonitoringService {
  if (!monitoringInstance) {
    monitoringInstance = new MonitoringService();
  }
  return monitoringInstance;
}

export default MonitoringService;
