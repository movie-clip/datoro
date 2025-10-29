// server/routes/adminRoutes.ts
// Administrative endpoints (cache, monitoring, readiness)

import express, { type Request, type Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { adminLimiter } from '../middleware/rateLimiter.js'
import { getCacheService } from '../services/cacheService.js'
import { getMonitoringService } from '../services/monitoringService.js'

const router = express.Router()
const cache = getCacheService()
const monitoring = getMonitoringService()

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
router.get('/readiness', asyncHandler(async (_req: Request, res: Response) => {
  const checks: unknown = {
    server: 'ok',
    database: 'unknown',
    redis: 'unknown',
    timestamp: new Date().toISOString()
  }

  // Check database connectivity (with 2s timeout)
  if (isDatabaseAvailable) {
    try {
      const { testDatabaseConnection } = await import('../services/databaseService.js')
      const dbTimeout = new Promise((__, _reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 2000)
      )
      await Promise.race([testDatabaseConnection(), dbTimeout])
      checks.database = 'connected'
    } catch (_dbError: any) {
      checks.database = 'disconnected'
      console.warn('[Health] Database check failed:', dbError.message)
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
    console.warn('[Health] Redis check failed:', redisError.message)
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
router.get('/cache/stats', adminLimiter, (_req: Request, res: Response) => {
  const stats = cache.getStats()
  res.json(stats)
})

/**
 * POST /api/cache/clear
 * Manual cache flush (admin only)
 */
router.post('/cache/clear', adminLimiter, asyncHandler(async (_req: Request, res: Response) => {
  await cache.clear()
  cache.resetStats()
  console.log('[Cache] Manual cache flush requested')
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
router.get('/monitoring/stats', adminLimiter, (_req: Request, res: Response) => {
  const metrics = monitoring.getMetrics()
  res.json(metrics)
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
 * POST /api/monitoring/reset
 * Reset monitoring metrics (admin only)
 */
router.post('/monitoring/reset', adminLimiter, (_req: Request, res: Response) => {
  monitoring.reset()
  res.json({ message: 'Monitoring metrics reset successfully' })
})

export default router
