// server/routes/authRoutes.js
// Authentication API routes

import express from 'express'
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

const router = express.Router()

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
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        })
      }
      
      const { user, token } = await registerUser(req.body)
      
      // Set HTTP-only cookie (more secure than localStorage)
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      })
      
      res.status(201).json({
        success: true,
        data: { user, token }
      })
      
    } catch (error) {
      console.error('[Auth API] Register error:', error)
      res.status(400).json({
        success: false,
        error: error.message
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
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        })
      }
      
      const { user, token } = await loginUser(req.body)
      
      // Set HTTP-only cookie
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      })
      
      res.json({
        success: true,
        data: { user, token }
      })
      
    } catch (error) {
      console.error('[Auth API] Login error:', error)
      res.status(401).json({
        success: false,
        error: error.message
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
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        })
      }
      
      const { user, token } = await loginWithGoogle(req.body.token)
      
      // Set HTTP-only cookie
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      })
      
      res.json({
        success: true,
        data: { user, token }
      })
      
    } catch (error) {
      console.error('[Auth API] Google login error:', error)
      res.status(401).json({
        success: false,
        error: error.message
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
  async (req, res) => {
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
  async (req, res) => {
    try {
      // Get token from header or cookie
      let token = null
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
      
    } catch (error) {
      console.error('[Auth API] Logout error:', error)
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
  async (req, res) => {
    try {
      await logoutAllSessions(req.userId)
      
      // Clear cookie
      res.clearCookie('authToken')
      
      res.json({
        success: true,
        message: 'Logged out from all devices'
      })
      
    } catch (error) {
      console.error('[Auth API] Logout all error:', error)
      res.status(500).json({
        success: false,
        error: 'Logout failed'
      })
    }
  }
)

export default router
