// server/middleware/auth.ts
// Authentication middleware - protects routes, verifies JWT tokens

/// <reference path="../types/express.d.ts" />

import { verifySession } from '../services/authService.js'
import type { Request, Response, NextFunction } from 'express'
import type { User } from '@prisma/client'
import logger from '../services/logger.js'

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
        logger.debug('[Auth Middleware] Token from header')
      }
      
      // Check cookie if no header token
      if (!token && req.cookies && req.cookies.authToken) {
        token = req.cookies.authToken
        logger.debug('[Auth Middleware] Token from cookie')
      }
      
      // Debug logging
      if (!token) {
        logger.debug('[Auth Middleware] No token found. Cookies:', Object.keys(req.cookies || {}))
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
      
      // Ensure user has required id property
      if (!user.id) {
        throw new Error('User object missing required id property')
      }
      
      // Attach user to request
      req.user = user as Partial<User> & { id: string }
      req.userId = user.id
      
      next()
      
    } catch (_error: any) {
      logger.error('[Auth Middleware] Error:', _error)
      
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
 * Middleware: Require active subscription (trial or paid)
 * Blocks access for users without an active subscription
 */
export function requireActiveSubscription() {
  return (req: Request, res: Response, next: NextFunction) => {
    // User must be authenticated first
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NO_AUTH'
      })
    }
    
    // Check if user has a subscription
    if (!req.user.subscription) {
      return res.status(403).json({
        success: false,
        error: 'Subscription required',
        code: 'NO_SUBSCRIPTION',
        subscribeUrl: '/pricing'
      })
    }
    
    // Check if trial is active
    if (req.user.subscription.isInTrial) {
      const trialEndsAt = new Date(req.user.subscription.trialEndsAt!)
      if (new Date() > trialEndsAt) {
        return res.status(403).json({
          success: false,
          error: 'Trial expired - please subscribe',
          code: 'TRIAL_EXPIRED',
          subscribeUrl: '/pricing'
        })
      }
      return next() // Trial active, allow access
    }
    
    // Check if paid subscription is active
    if (req.user.subscription.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: 'Subscription inactive',
        code: 'INACTIVE_SUBSCRIPTION',
        status: req.user.subscription.status,
        manageUrl: '/subscription/manage'
      })
    }
    
    next() // Paid and active, allow access
  }
}

/**
 * DEPRECATED: Old multi-tier subscription check
 * Use requireActiveSubscription() instead
 * @param {string[]} allowedTiers - Array of allowed tiers ['free', 'premium', 'enterprise']
 */
export function requireSubscription(_allowedTiers: string[] = ['premium', 'enterprise']) {
  // Redirect to new single-tier middleware
  return requireActiveSubscription()
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
