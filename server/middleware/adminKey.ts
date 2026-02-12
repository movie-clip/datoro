// server/middleware/adminKey.ts
// Simple protection for internal/admin endpoints.
//
// Behavior:
// - Production: requires an X-Admin-Key header matching ADMIN_API_KEY (or ADMIN_KEY).
//   If the secret is not configured, the endpoint is disabled (503) to avoid accidental exposure.
// - Dev/Test: if no secret configured, middleware is a no-op for developer convenience.
//
// NOTE: This is intentionally separate from user auth. Use this for operational endpoints
// (cache flush, monitoring reset, database pool stats, etc.).

import crypto from 'crypto'
import type { Request, Response, NextFunction } from 'express'
import logger from '../services/logger.js'

interface RequireAdminKeyOptions {
  /**
   * If true, enforce even outside production.
   * Defaults to false.
   */
  always?: boolean

  /**
   * Customize header name (defaults to X-Admin-Key).
   */
  headerName?: string
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

export function requireAdminKey(options: RequireAdminKeyOptions = {}) {
  const headerName = (options.headerName || 'X-Admin-Key').toLowerCase()

  return (req: Request, res: Response, next: NextFunction) => {
    const isProd = process.env.NODE_ENV === 'production'
    const enforce = Boolean(options.always) || isProd

    const configuredSecret = process.env.ADMIN_API_KEY || process.env.ADMIN_KEY || ''

    // In non-prod, allow access if not configured (keeps local dev/tests simple)
    if (!enforce && !configuredSecret) {
      return next()
    }

    // In prod, do NOT allow endpoints to be exposed without a configured secret
    if (enforce && !configuredSecret) {
      logger.error('[AdminKey] CRITICAL: ADMIN_API_KEY is not configured. Blocking internal endpoint.')
      return res.status(503).json({
        error: 'Admin endpoint is not configured',
        code: 'ADMIN_KEY_NOT_CONFIGURED'
      })
    }

    const presented = (req.headers[headerName] as string | undefined) || ''
    if (!presented) {
      return res.status(401).json({
        error: 'Admin key required',
        code: 'ADMIN_KEY_REQUIRED'
      })
    }

    if (!timingSafeEqual(presented, configuredSecret)) {
      // Do not log the key. Minimal metadata only.
      logger.warn('[AdminKey] Invalid admin key attempt', {
        path: req.path,
        method: req.method,
        ip: req.ip
      })
      return res.status(403).json({
        error: 'Forbidden',
        code: 'ADMIN_KEY_INVALID'
      })
    }

    return next()
  }
}
