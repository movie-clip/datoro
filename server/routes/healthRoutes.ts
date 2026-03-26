// server/routes/healthRoutes.ts
// Health, monitoring, and administrative endpoints

import express, { type Request, type Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { adminLimiter } from '../middleware/rateLimiter.js'
import { requireAdminKey } from '../middleware/adminKey.js'
import { getMonitoringService } from '../services/monitoringService.js'
import { getPrismaClient } from '../services/databaseService.js'

const router = express.Router()
const monitoring = getMonitoringService()

// Dependencies injected from server.mjs
let _isDatabaseAvailable = true

/**
 * Initialize health routes with dependencies
 */
export function initHealthRoutes(deps: { isDatabaseAvailable: boolean }) {
  _isDatabaseAvailable = deps.isDatabaseAvailable
  return router
}

/**
 * GET /api/health
 * Basic health check (fast, no external dependencies)
 * Returns monitoring summary
 */
router.get('/', (_req: Request, res: Response) => {
  const summary = monitoring.getSummary()
  res.json({ 
    ok: true,
    ...summary
  })
})

router.head('/', (_req: Request, res: Response) => {
  res.status(200).end()
})

/**
 * GET /api/health/database
 * Database connection pool health check
 * 
 * Features:
 * - Tests connectivity with simple query
 * - Returns connection pool statistics
 * - Warns about concerning metrics
 * - Worker-specific stats (PM2 cluster mode)
 */
router.get('/database', adminLimiter, requireAdminKey(), asyncHandler(async (req: Request, res: Response) => {
  const prisma = getPrismaClient()
  
  // Test database connectivity with simple query
  const testStart = Date.now()
  await prisma.$queryRaw`SELECT 1 as connected`
  const queryDuration = Date.now() - testStart
  
  // Get connection pool statistics
  const poolStats = await prisma.$queryRaw`
    SELECT 
      count(*) FILTER (WHERE state = 'active') as active_connections,
      count(*) FILTER (WHERE state = 'idle') as idle_connections,
      count(*) as total_connections,
      max(EXTRACT(EPOCH FROM (now() - query_start)) * 1000)::int as longest_query_ms
    FROM pg_stat_activity
    WHERE datname = current_database()
  ` as any[]
  
  const stats = poolStats[0]
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    worker_pid: process.pid,
    query_duration_ms: queryDuration,
    connections: {
      active: Number(stats.active_connections),
      idle: Number(stats.idle_connections),
      total: Number(stats.total_connections)
    },
    longest_query_ms: stats.longest_query_ms || 0,
    warning: undefined as string | undefined
  }
  
  // Add warnings for concerning metrics
  if (health.connections.total > 50) {
    health.warning = 'High connection count (>50). Consider reducing connection_limit per worker.'
  }
  if (health.longest_query_ms > 5000) {
    health.warning = 'Long-running query detected (>5s). Check query performance.'
  }
  if (queryDuration > 100) {
    health.warning = 'Slow database response (>100ms). Check database health.'
  }
  
  res.json(health)
}))

export default router
