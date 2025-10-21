// server/services/authService.js
// Authentication service - handles user registration, login, OAuth, sessions

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { OAuth2Client } from 'google-auth-library'
import { getPrismaClient } from './databaseService.js'

const prisma = getPrismaClient()

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('[Auth] CRITICAL: JWT_SECRET environment variable is not set!')
  console.error('[Auth] This will cause authentication failures in production.')
  console.error('[Auth] Using temporary random secret - ALL SESSIONS WILL BE INVALIDATED ON RESTART!')
  // Fallback for development only - NOT secure for production
  process.env.JWT_SECRET = crypto.randomBytes(64).toString('hex')
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

// Initialize Google OAuth client
const googleClient = GOOGLE_CLIENT_ID 
  ? new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
  : null

// ============================================
// Password Authentication
// ============================================

/**
 * Hash password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(12) // 12 rounds = good balance of security/performance
  return bcrypt.hash(password, salt)
}

/**
 * Verify password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - Bcrypt hash
 * @returns {Promise<boolean>} - True if password matches
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

// ============================================
// JWT Token Management
// ============================================

/**
 * Generate JWT token for user
 * @param {object} user - User object
 * @returns {string} - JWT token
 */
export function generateToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    subscriptionTier: user.subscriptionTier
  }
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'factorly',
    audience: 'factorly-users'
  })
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {object|null} - Decoded payload or null if invalid
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'factorly',
      audience: 'factorly-users'
    })
  } catch (error) {
    console.error('[Auth] Token verification failed:', error.message)
    return null
  }
}

// ============================================
// User Registration
// ============================================

/**
 * Register new user with email/password
 * @param {object} data - { email, password, name }
 * @param {string} ipAddress - User's IP address (optional)
 * @param {string} userAgent - User's browser user agent (optional)
 * @returns {Promise<object>} - { user, token }
 */
export async function registerUser(data, ipAddress = null, userAgent = null) {
  const { email, password, name } = data
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format')
  }
  
  // Validate password strength (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters')
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain at least one uppercase letter')
  }
  if (!/[a-z]/.test(password)) {
    throw new Error('Password must contain at least one lowercase letter')
  }
  if (!/[0-9]/.test(password)) {
    throw new Error('Password must contain at least one number')
  }
  
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  })
  
  if (existingUser) {
    throw new Error('Email already registered')
  }
  
  // Hash password
  const hashedPassword = await hashPassword(password)
  
  // Create user
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name || null,
      subscriptionTier: 'free',
      subscriptionStatus: 'active',
      lastLoginAt: new Date()
    },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      emailVerified: true,
      createdAt: true
    }
  })
  
  // Generate token
  const token = generateToken(user)
  
  // Create session with IP and user agent tracking
  await createSession(user.id, token, ipAddress, userAgent)
  
  console.log(`[Auth] User registered: ${user.email}`)
  
  return { user, token }
}

// ============================================
// User Login
// ============================================

/**
 * Login user with email/password
 * @param {object} data - { email, password }
 * @param {string} ipAddress - User's IP address (optional)
 * @param {string} userAgent - User's browser user agent (optional)
 * @returns {Promise<object>} - { user, token }
 */
export async function loginUser(data, ipAddress = null, userAgent = null) {
  const { email, password } = data
  
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  })
  
  if (!user) {
    throw new Error('Invalid email or password')
  }
  
  // Check if user has password (OAuth users don't)
  if (!user.password) {
    throw new Error('Please sign in with Google')
  }
  
  // Verify password
  const isValid = await verifyPassword(password, user.password)
  if (!isValid) {
    throw new Error('Invalid email or password')
  }
  
  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  })
  
  // Generate token
  const token = generateToken(user)
  
  // Create session with IP and user agent tracking
  await createSession(user.id, token, ipAddress, userAgent)
  
  console.log(`[Auth] User logged in: ${user.email}`)
  
  // Return user without password
  const { password: _, ...userWithoutPassword } = user
  return { user: userWithoutPassword, token }
}

// ============================================
// Google OAuth
// ============================================

/**
 * Verify Google OAuth token and create/login user
 * @param {string} googleToken - Google ID token
 * @param {string} ipAddress - User's IP address (optional)
 * @param {string} userAgent - User's browser user agent (optional)
 * @returns {Promise<object>} - { user, token }
 */
export async function loginWithGoogle(googleToken, ipAddress = null, userAgent = null) {
  if (!googleClient) {
    throw new Error('Google OAuth not configured')
  }
  
  try {
    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: googleToken,
      audience: GOOGLE_CLIENT_ID
    })
    
    const payload = ticket.getPayload()
    const googleId = payload.sub
    const email = payload.email
    const name = payload.name
    const avatarUrl = payload.picture
    const emailVerified = payload.email_verified
    
    // Find or create user
    let user = await prisma.user.findUnique({
      where: { googleId }
    })
    
    if (!user) {
      // Check if email already exists (link accounts)
      user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      })
      
      if (user) {
        // Link Google account to existing user
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
            avatarUrl,
            emailVerified: emailVerified || user.emailVerified,
            lastLoginAt: new Date()
          }
        })
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            email: email.toLowerCase(),
            googleId,
            name,
            avatarUrl,
            emailVerified: emailVerified || false,
            subscriptionTier: 'free',
            subscriptionStatus: 'active',
            lastLoginAt: new Date()
          }
        })
      }
      
      console.log(`[Auth] New Google user: ${user.email}`)
    } else {
      // Update existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: name || user.name,
          avatarUrl: avatarUrl || user.avatarUrl,
          lastLoginAt: new Date()
        }
      })
      
      console.log(`[Auth] Google user logged in: ${user.email}`)
    }
    
    // Generate token
    const token = generateToken(user)
    
    // Create session with IP and user agent tracking
    await createSession(user.id, token, ipAddress, userAgent)
    
    // Return user without sensitive data
    const { password: _, ...userWithoutPassword } = user
    return { user: userWithoutPassword, token }
    
  } catch (error) {
    console.error('[Auth] Google OAuth error:', error.message)
    throw new Error('Google authentication failed')
  }
}

// ============================================
// Session Management
// ============================================

/**
 * Create session for user
 * @param {string} userId - User ID
 * @param {string} token - JWT token
 * @param {string} ipAddress - User's IP address (optional)
 * @param {string} userAgent - User's browser user agent (optional)
 * @returns {Promise<object>} - Session object
 */
async function createSession(userId, token, ipAddress = null, userAgent = null) {
  // Hash token for storage (never store plain tokens)
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
  
  // Calculate expiration (7 days from now)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)
  
  return prisma.session.create({
    data: {
      userId,
      token: hashedToken,
      expiresAt,
      ipAddress,
      userAgent
    }
  })
}

/**
 * Verify session token
 * @param {string} token - JWT token
 * @returns {Promise<object|null>} - User object or null
 */
export async function verifySession(token) {
  // Verify JWT first
  const payload = verifyToken(token)
  if (!payload) {
    return null
  }
  
  // Hash token to compare with database
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
  
  // Find session
  const session = await prisma.session.findUnique({
    where: { token: hashedToken },
    include: { user: true }
  })
  
  if (!session) {
    return null
  }
  
  // Check if session expired
  if (session.expiresAt < new Date()) {
    // Delete expired session
    await prisma.session.delete({
      where: { id: session.id }
    })
    return null
  }
  
  // Return user without password
  const { password: _, ...userWithoutPassword } = session.user
  return userWithoutPassword
}

/**
 * Logout user (delete session)
 * @param {string} token - JWT token
 * @returns {Promise<void>}
 */
export async function logoutUser(token) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
  
  await prisma.session.deleteMany({
    where: { token: hashedToken }
  })
  
  console.log('[Auth] User logged out')
}

/**
 * Delete all sessions for user
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function logoutAllSessions(userId) {
  await prisma.session.deleteMany({
    where: { userId }
  })
  
  console.log(`[Auth] All sessions deleted for user: ${userId}`)
}

// ============================================
// Cleanup (run daily)
// ============================================

/**
 * Delete expired sessions (should run daily via cron)
 * @returns {Promise<number>} - Number of deleted sessions
 */
export async function cleanupExpiredSessions() {
  const result = await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date()
      }
    }
  })
  
  console.log(`[Auth] Deleted ${result.count} expired sessions`)
  return result.count
}
