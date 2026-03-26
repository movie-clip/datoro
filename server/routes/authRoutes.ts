// server/routes/authRoutes.ts
// Authentication API routes

/// <reference path="../types/express.d.ts" />

import express from 'express'
import type { Request, Response } from 'express'
import type {
  LoginBody,
  GoogleLoginBody,
  AuthResponse,
  AuthUser
} from '../types/api.types.js'
import { body, validationResult } from 'express-validator'
import {
  registerUser,
  loginUser,
  loginWithGoogle,
  logoutUser,
  logoutAllSessions
} from '../services/authService.js'
import { authenticate } from '../middleware/auth.js'
import { speedLimiter } from '../middleware/rateLimiter.js'
import logger from '../services/logger.js'

const router = express.Router()

type AuthRouteError = Error & {
  code?: string
  email?: string
}

function getAuthRouteError(error: unknown): AuthRouteError {
  if (error instanceof Error) {
    return error as AuthRouteError
  }

  return new Error('Unknown authentication error') as AuthRouteError
}

// ============================================
// Register (Email + Password)
// ============================================

router.post(
  '/register',
  speedLimiter, // Rate limit to prevent abuse
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('name').optional().trim().isLength({ max: 100 })
  ],
  async (req: Request, res: Response) => {
    try {
      // Validate input
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        })
      }
      
      const { user, token } = await registerUser(
        req.body, 
        req.ip || null, 
        req.headers['user-agent'] || null
      )
      
      // Set HTTP-only cookie
      const isProduction = process.env.NODE_ENV === 'production'
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',  // 'none' allows cross-domain cookies in production
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      })
      
      res.status(201).json({
        success: true,
        data: { user, token }
      })
      
    } catch (_error: unknown) {
      const authError = getAuthRouteError(_error)
      logger.error('[Auth API] Register error:', authError)
      res.status(400).json({
        success: false,
        error: authError.message
      })
    }
  }
)

// ============================================
// Login (Email + Password)
// ============================================

router.post(
  '/login',
  speedLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req: Request, res: Response<AuthResponse>) => {
    try {
      // Validate input
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        })
      }
      
      const loginBody = req.body as LoginBody
      const { user, token } = await loginUser(loginBody, req.ip || null, req.headers['user-agent'] || null)
      
      // Set HTTP-only cookie
      const isProduction = process.env.NODE_ENV === 'production'
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,  // Must be true for SameSite=none
        sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
        // Don't set domain - let browser use the exact domain the cookie is set from
      }
      
      logger.info('[Auth] Setting cookie with options:', cookieOptions)
      res.cookie('authToken', token, cookieOptions)
      
      logger.info('[Auth] Cookie set, sending response')
      res.json({
        success: true,
        data: { user: user as AuthUser, token }
      })
      
    } catch (_error: unknown) {
      const authError = getAuthRouteError(_error)
      logger.error('[Auth API] Login error:', authError)
      
      // Handle email not verified error
      if (authError.code === 'EMAIL_NOT_VERIFIED') {
        return res.status(403).json({
          success: false,
          error: authError.message,
          code: 'EMAIL_NOT_VERIFIED',
          email: authError.email
        })
      }
      
      res.status(401).json({
        success: false,
        error: authError.message
      })
    }
  }
)

// ============================================
// Login with Google OAuth
// ============================================

router.post(
  '/google',
  speedLimiter,
  [
    body('token').notEmpty().withMessage('Google token required')
  ],
  async (req: Request, res: Response<AuthResponse>) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        })
      }
      
      const googleBody = req.body as GoogleLoginBody
      const { user, token } = await loginWithGoogle(googleBody.credential, req.ip || null, req.headers['user-agent'] || null)
      
      // Set HTTP-only cookie
      const isProduction = process.env.NODE_ENV === 'production'
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      })
      
      res.json({
        success: true,
        data: { user: user as AuthUser, token }
      })
      
    } catch (_error: unknown) {
      const authError = getAuthRouteError(_error)
      logger.error('[Auth API] Google login error:', authError)
      res.status(401).json({
        success: false,
        error: authError.message
      })
    }
  }
)

// ============================================
// Get Current User
// ============================================

router.get(
  '/me',
  authenticate(true), // Require authentication
  async (req: Request, res: Response) => {
    res.json({
      success: true,
      data: { user: req.user }
    })
  }
)

// ============================================
// Logout
// ============================================

router.post(
  '/logout',
  authenticate(true),
  async (req: Request, res: Response) => {
    try {
      // Get token from header or cookie
      let token: string | null = null
      const authHeader = req.headers.authorization
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      } else if (req.cookies && req.cookies.authToken) {
        token = req.cookies.authToken
      }
      
      if (token) {
        await logoutUser(token)
      }
      
      // Clear cookie
      res.clearCookie('authToken')
      
      res.json({
        success: true,
        message: 'Logged out successfully'
      })
      
    } catch (_error: unknown) {
      logger.error('[Auth API] Logout error:', _error)
      res.status(500).json({
        success: false,
        error: 'Logout failed'
      })
    }
  }
)

// ============================================
// Logout from all devices
// ============================================

router.post(
  '/logout-all',
  authenticate(true),
  async (req: Request, res: Response) => {
    try {
      await logoutAllSessions(req.userId!)
      
      // Clear cookie
      res.clearCookie('authToken')
      
      res.json({
        success: true,
        message: 'Logged out from all devices'
      })
      
    } catch (_error: unknown) {
      logger.error('[Auth API] Logout all error:', _error)
      res.status(500).json({
        success: false,
        error: 'Logout failed'
      })
    }
  }
)

// ============================================
// Email Verification
// ============================================

/**
 * Verify email with token
 * GET /api/auth/verify-email/:token
 */
router.get(
  '/verify-email/:token',
  async (req: Request, res: Response) => {
    try {
      const { token } = req.params
      
      if (!token || token.length < 20) {
        return res.status(400).json({
          success: false,
          error: 'Invalid verification token'
        })
      }

      const { verifyEmailToken } = await import('../services/authService.js')
      const result = await verifyEmailToken(token)

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error || 'Verification failed'
        })
      }

      // Send welcome email (optional)
      if (result.user?.email) {
        const { sendWelcomeEmail } = await import('../services/emailService.js')
        sendWelcomeEmail(
          result.user.email,
          result.user.name || 'there'
        ).catch(err => logger.error('[Auth] Welcome email failed:', err))
      }

      res.json({
        success: true,
        message: 'Email verified successfully! You can now log in.',
        data: { user: result.user as AuthUser }
      })

    } catch (_error: unknown) {
      logger.error('[Auth API] Verify email error:', _error)
      res.status(500).json({
        success: false,
        error: 'Verification failed'
      })
    }
  }
)

/**
 * Resend verification email
 * POST /api/auth/resend-verification
 */
router.post(
  '/resend-verification',
  speedLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        })
      }

      const { email } = req.body

      const { resendVerificationEmail } = await import('../services/authService.js')
      const result = await resendVerificationEmail(email)

      if (!result.success) {
        if (result.rateLimited) {
          return res.status(429).json({
            success: false,
            error: result.error || 'Too many requests'
          })
        }
        
        return res.status(400).json({
          success: false,
          error: result.error || 'Failed to resend verification email'
        })
      }

      res.json({
        success: true,
        message: 'Verification email sent! Please check your inbox.'
      })

    } catch (_error: unknown) {
      logger.error('[Auth API] Resend verification error:', _error)
      res.status(500).json({
        success: false,
        error: 'Failed to resend verification email'
      })
    }
  }
)

export default router
