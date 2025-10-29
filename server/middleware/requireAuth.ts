// server/middleware/requireAuth.ts
// Strict authentication enforcement middleware with type safety

import type { Request, Response, NextFunction } from 'express'
import type { User } from '@prisma/client'

/**
 * Authenticated Request type - guarantees user exists
 * Use this type for routes that require authentication
 */
export interface AuthenticatedRequest extends Request {
  user: Partial<User> & { id: string } // id is required
  userId: string
}

/**
 * Type guard to check if request has authenticated user
 */
export function isAuthenticated(req: Request): req is AuthenticatedRequest {
  return !!req.user && !!req.user.id
}

/**
 * Middleware that REQUIRES authentication
 * Use this instead of authenticate() when you need guaranteed user access
 * 
 * Benefits:
 * - TypeScript type safety: req is typed as AuthenticatedRequest
 * - No need for req.user?.id or req.user.id! (non-null assertions)
 * - Clearer intent: route REQUIRES auth vs optional auth
 * 
 * Usage:
 * router.get('/protected', requireAuth, (req: AuthenticatedRequest, _res) => {
 *   const userId = req.user.id // No ?, no !, TypeScript knows it exists
 * })
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // Check if authenticate() middleware ran and set req.user
  if (!req.user || !req.user.id) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'UNAUTHORIZED'
    })
    return
  }

  // TypeScript now knows req is AuthenticatedRequest
  next()
}

/**
 * Alternative: Combine authenticate + requireAuth in one middleware
 * This is useful if you want to skip the authenticate() middleware
 * and handle everything in one place
 */
export function enforceAuth(req: Request, res: Response, next: NextFunction): void {
  if (!isAuthenticated(req)) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in.',
      code: 'UNAUTHORIZED'
    })
    return
  }
  
  next()
}
