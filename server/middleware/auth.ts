// server/middleware/auth.ts
// Authentication middleware - protects routes, verifies JWT tokens

import { verifySession } from '../services/authService.js'
import type { Request, Response, NextFunction } from 'express'
import type { User } from '@prisma/client'

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: Partial<User> | null
      userId?: string
    }
  }
}

/**
 * Middleware to verify JWT token and attach user to request
 * Optional: If requireAuth=false, continues even if no token
 */
export function authenticate(requireAuth = true) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get token from Authorization header or cookie
      let token = null
      
      // Check Authorization header (Bearer token)
      const authHeader = req.headers.authorization
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
        console.log('[Auth Middleware] Token from header')
      }
      
      // Check cookie if no header token
      if (!token && req.cookies && req.cookies.authToken) {
        token = req.cookies.authToken
        console.log('[Auth Middleware] Token from cookie')
      }
      
      // Debug logging
      if (!token) {
        console.log('[Auth Middleware] No token found. Cookies:', Object.keys(req.cookies || {}))
      }
      
      // If no token and auth required, reject
      if (!token) {
        if (requireAuth) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required',
            code: 'NO_TOKEN'
          })
        } else {
          // Continue without auth
          req.user = null
          return next()
        }
      }
      
      // Verify token and get user
      const user = await verifySession(token)
      
      if (!user) {
        if (requireAuth) {
          return res.status(401).json({
            success: false,
            error: 'Invalid or expired token',
            code: 'INVALID_TOKEN'
          })
        } else {
          req.user = null
          return next()
        }
      }
      
      // Attach user to request
      req.user = user
      req.userId = user.id
      
      next()
      
    } catch (_error: any) {
      console.error('[Auth Middleware] Error:', _error)
      
      if (requireAuth) {
        return res.status(500).json({
          success: false,
          error: 'Authentication error',
          code: 'AUTH_ERROR'
        })
      } else {
        req.user = null
        next()
      }
    }
  }
}

/**
 * Middleware to check user subscription tier
 * @param {string[]} allowedTiers - Array of allowed tiers ['free', 'premium', 'enterprise']
 */
export function requireSubscription(allowedTiers: string[] = ['premium', 'enterprise']) {
  return (req: Request, res: Response, next: NextFunction) => {
    // User must be authenticated first
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NO_AUTH'
      })
    }
    
    // Check if user's tier is allowed
    if (!allowedTiers.includes(req.user.subscriptionTier!)) {
      return res.status(403).json({
        success: false,
        error: 'Subscription upgrade required',
        code: 'INSUFFICIENT_SUBSCRIPTION',
        requiredTiers: allowedTiers,
        currentTier: req.user.subscriptionTier
      })
    }
    
    // Check if subscription is active
    if (req.user.subscriptionStatus !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Subscription expired or canceled',
        code: 'INACTIVE_SUBSCRIPTION',
        status: req.user.subscriptionStatus
      })
    }
    
    next()
  }
}

/**
 * Middleware to check if user's email is verified
 */
export function requireEmailVerification(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'NO_AUTH'
    })
  }
  
  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      error: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED'
    })
  }
  
  next()
}
