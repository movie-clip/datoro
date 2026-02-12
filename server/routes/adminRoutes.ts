// server/routes/adminRoutes.ts
// Administrative endpoints (cache, monitoring, readiness)

import express, { type Request, type Response, type NextFunction } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { adminLimiter } from '../middleware/rateLimiter.js'
import { requireAdminKey } from '../middleware/adminKey.js'
import { getCacheService } from '../services/cacheService.js'
import { getMonitoringService } from '../services/monitoringService.js'
import logger from '../services/logger.js'

const router = express.Router()
const cache = getCacheService()
const monitoring = getMonitoringService()

// Optional protection: some platforms expect readiness to be public.
// If you want this endpoint private, set READINESS_REQUIRE_ADMIN_KEY=true.
const readinessAuth = process.env.READINESS_REQUIRE_ADMIN_KEY === 'true'
  ? requireAdminKey({ always: true })
  : (_req: Request, _res: Response, next: NextFunction) => next()

// Dependencies injected from server.mjs
let isDatabaseAvailable = true

/**
 * Initialize admin routes with dependencies
 */
export function initAdminRoutes(deps: { isDatabaseAvailable: boolean }) {
  isDatabaseAvailable = deps.isDatabaseAvailable
  return router
}

/**
 * GET /api/readiness
 * Readiness check (validates database and Redis connectivity)
 * Use this for Docker/k8s health checks with longer timeout
 */
router.get('/readiness', readinessAuth, asyncHandler(async (_req: Request, res: Response) => {
  const checks: { server: string; database: string; redis: string } = {
    server: 'ok',
    database: 'unknown',
    redis: 'unknown',
    timestamp: new Date().toISOString()
  } as any

  // Check database connectivity (with 2s timeout)
  if (isDatabaseAvailable) {
    try {
      const { testDatabaseConnection } = await import('../services/databaseService.js')
      const dbTimeout = new Promise<never>((__, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 2000)
      )
      await Promise.race([testDatabaseConnection(), dbTimeout])
      checks.database = 'connected'
    } catch (_dbError: any) {
      checks.database = 'disconnected'
            logger.warn('[Health] Database check failed:', _dbError.message)
    }
  } else {
    checks.database = 'disabled'
  }

  // Check Redis connectivity
  try {
    const isConnected = await cache.ping()
    checks.redis = isConnected ? 'connected' : 'disconnected'
  } catch (_redisError: any) {
    checks.redis = cache.isMemoryOnly() ? 'memory-fallback' : 'disconnected'
        logger.warn('[Health] Redis check failed:', _redisError.message)
  }

  // Overall health status
  const isHealthy = checks.server === 'ok' && 
                    (checks.database === 'connected' || checks.database === 'disabled') &&
                    (checks.redis === 'connected' || checks.redis === 'memory-fallback')

  res.status(isHealthy ? 200 : 503).json({
    ok: isHealthy,
    checks,
    uptime: monitoring.getSummary().uptime
  })
}))

/**
 * GET /api/cache/stats
 * Cache statistics (admin only)
 */
router.get('/cache/stats', adminLimiter, requireAdminKey(), (_req: Request, res: Response) => {
  const stats = cache.getStats()
  res.json(stats)
})

/**
 * POST /api/cache/clear
 * Manual cache flush (admin only)
 */
router.post('/cache/clear', adminLimiter, requireAdminKey(), asyncHandler(async (_req: Request, res: Response) => {
  await cache.clear()
  cache.resetStats()
    logger.info('[Cache] Manual cache flush requested')
  res.json({ 
    ok: true, 
    message: 'Cache cleared successfully',
    timestamp: new Date().toISOString()
  })
}))

/**
 * GET /api/monitoring/stats
 * Comprehensive monitoring metrics (admin only)
 */
router.get('/monitoring/stats', adminLimiter, requireAdminKey(), (_req: Request, res: Response) => {
  const metrics = monitoring.getMetrics()
  res.json(metrics)
})

/**
 * GET /api/monitoring/cache-latency
 * Cache-source latency breakdown for split ticker endpoints (admin only)
 */
router.get('/monitoring/cache-latency', adminLimiter, requireAdminKey(), (_req: Request, res: Response) => {
  const metrics = monitoring.getMetrics()
  const byCacheSource = metrics?.performance?.byCacheSource || {}

  res.json({
    generatedAt: new Date().toISOString(),
    byCacheSource
  })
})

/**
 * GET /api/monitoring/summary
 * Monitoring summary (public)
 */
router.get('/monitoring/summary', (_req: Request, res: Response) => {
  const summary = monitoring.getSummary()
  res.json(summary)
})

/**
 * GET /api/monitoring/alerts
 * Operational alerts focused on Redis memory-only fallback
 */
router.get('/monitoring/alerts', (_req: Request, res: Response) => {
  const metrics = monitoring.getMetrics()
  const redis = metrics?.system?.redis || null

  res.json({
    ok: !redis?.alert,
    alerts: {
      redis
    },
    timestamp: new Date().toISOString()
  })
})

/**
 * POST /api/monitoring/reset
 * Reset monitoring metrics (admin only)
 */
router.post('/monitoring/reset', adminLimiter, requireAdminKey(), (_req: Request, res: Response) => {
  monitoring.reset()
  res.json({ message: 'Monitoring metrics reset successfully' })
})

export default router
