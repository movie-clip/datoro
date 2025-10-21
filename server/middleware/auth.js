// server/middleware/auth.js
// Authentication middleware - protects routes, verifies JWT tokens

import { verifySession } from '../services/authService.js'

/**
 * Middleware to verify JWT token and attach user to request
 * Optional: If requireAuth=false, continues even if no token
 */
export function authenticate(requireAuth = true) {
  return async (req, res, next) => {
    try {
      // Get token from Authorization header or cookie
      let token = null
      
      // Check Authorization header (Bearer token)
      const authHeader = req.headers.authorization
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
      
      // Check cookie if no header token
      if (!token && req.cookies && req.cookies.authToken) {
        token = req.cookies.authToken
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
      
    } catch (error) {
      console.error('[Auth Middleware] Error:', error)
      
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
export function requireSubscription(allowedTiers = ['premium', 'enterprise']) {
  return (req, res, next) => {
    // User must be authenticated first
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NO_AUTH'
      })
    }
    
    // Check if user's tier is allowed
    if (!allowedTiers.includes(req.user.subscriptionTier)) {
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
export function requireEmailVerification(req, res, next) {
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
