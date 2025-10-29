// server/services/authService.ts
// Authentication service - handles user registration, login, OAuth, sessions

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { OAuth2Client } from 'google-auth-library'
import { getPrismaClient } from './databaseService.js'
import type { User } from '@prisma/client'
import { CACHE_TTL } from '../config/constants.js'

const prisma = getPrismaClient()

interface RegisterData {
  email: string
  password: string
  name?: string
}

interface LoginData {
  email: string
  password: string
}

interface UserWithoutPassword extends Omit<User, 'password'> {}

interface AuthResult {
  user: Partial<User>
  token: string
}

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex')
if (!process.env.JWT_SECRET) {
  console.error('[Auth] CRITICAL: JWT_SECRET environment variable is not set!')
  console.error('[Auth] This will cause authentication failures in production.')
  console.error('[Auth] Using temporary random secret - ALL SESSIONS WILL BE INVALIDATED ON RESTART!')
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

// Initialize Google OAuth client
const googleClient: OAuth2Client | null = GOOGLE_CLIENT_ID 
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
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12) // 12 rounds = good balance of security/performance
  return bcrypt.hash(password, salt)
}

/**
 * Verify password against hash
 * @param {string} password - Plain text password
 * @param {string} hash - Bcrypt hash
 * @returns {Promise<boolean>} - True if password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
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
export function generateToken(user: Partial<User>): string {
  const payload = {
    userId: user.id,
    email: user.email,
    subscriptionTier: user.subscriptionTier
  }
  
  return jwt.sign(payload, JWT_SECRET as string, {
    expiresIn: JWT_EXPIRES_IN as string,
    issuer: 'datoro',
    audience: 'datoro-users'
  } as jwt.SignOptions)
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {object|null} - Decoded payload or null if invalid
 */
export function verifyToken(token: string): any | null {
  try {
    return jwt.verify(token, JWT_SECRET as string, {
      issuer: 'datoro',
      audience: 'datoro-users'
    })
  } catch (_error: any) {
    console.error('[Auth] Token verification failed:', _error.message)
    return null
  }
}

// ============================================
// Email Verification
// ============================================

/**
 * Generate secure verification token (32 bytes, URL-safe)
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

/**
 * Get verification token expiry (24 hours from now)
 */
export function getVerificationTokenExpiry(): Date {
  const expiry = new Date()
  expiry.setHours(expiry.getHours() + 24) // 24 hour expiry
  return expiry
}

/**
 * Verify email with token
 * @param {string} token - Verification token from email link
 * @returns {Promise<{ success: boolean, user?: Partial<User>, error?: string }>}
 */
export async function verifyEmailToken(token: string): Promise<{
  success: boolean
  user?: Partial<User>
  error?: string
}> {
  try {
    // Find user with matching token
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpiry: {
          gt: new Date() // Token not expired
        }
      }
    })

    if (!user) {
      return {
        success: false,
        error: 'Invalid or expired verification token'
      }
    }

    // Check if already verified
    if (user.emailVerified) {
      const { password, ...userWithoutPassword } = user
      return {
        success: true,
        user: userWithoutPassword,
        error: 'Email already verified'
      }
    }

    // Update user: set emailVerified = true, clear token
    const verifiedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        emailVerified: true,
        subscriptionTier: true,
        createdAt: true
      }
    })

    console.log(`[Auth] Email verified for user: ${verifiedUser.email}`)

    return {
      success: true,
      user: verifiedUser
    }
  } catch (error: any) {
    console.error('[Auth] Email verification error:', error)
    return {
      success: false,
      error: 'Failed to verify email'
    }
  }
}

/**
 * Resend verification email
 * @param {string} email - User email
 * @returns {Promise<{ success: boolean, error?: string, rateLimited?: boolean }>}
 */
export async function resendVerificationEmail(email: string): Promise<{
  success: boolean
  error?: string
  rateLimited?: boolean
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      // Don't reveal if email exists
      return {
        success: false,
        error: 'If an account with that email exists, a verification email will be sent.'
      }
    }

    // Already verified
    if (user.emailVerified) {
      return {
        success: false,
        error: 'Email already verified'
      }
    }

    // Rate limiting: Only allow resend if 60 seconds have passed
    if (user.emailVerificationSentAt) {
      const secondsSinceLastSent = (Date.now() - user.emailVerificationSentAt.getTime()) / 1000
      if (secondsSinceLastSent < 60) {
        return {
          success: false,
          rateLimited: true,
          error: `Please wait ${Math.ceil(60 - secondsSinceLastSent)} seconds before requesting another email`
        }
      }
    }

    // Generate new token
    const verificationToken = generateVerificationToken()
    const verificationTokenExpiry = getVerificationTokenExpiry()

    // Update user with new token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpiry,
        emailVerificationSentAt: new Date()
      }
    })

    // Send email (import at top of file needed)
    const { sendVerificationEmail } = await import('./emailService.js')
    const emailResult = await sendVerificationEmail(
      user.email!,
      user.name || 'there',
      verificationToken
    )

    if (!emailResult.success) {
      return {
        success: false,
        error: 'Failed to send verification email'
      }
    }

    console.log(`[Auth] Verification email resent to: ${user.email}`)

    return {
      success: true
    }
  } catch (error: any) {
    console.error('[Auth] Resend verification error:', error)
    return {
      success: false,
      error: 'Failed to resend verification email'
    }
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
export async function registerUser(data: RegisterData, ipAddress: string | null = null, userAgent: string | null = null): Promise<AuthResult> {
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
  
  // Generate verification token
  const verificationToken = generateVerificationToken()
  const verificationTokenExpiry = getVerificationTokenExpiry()
  
  // Create user (NOT verified yet)
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name || null,
      emailVerified: false, // Require email verification
      verificationToken,
      verificationTokenExpiry,
      emailVerificationSentAt: new Date(),
      subscriptionTier: 'free',
      subscriptionStatus: 'active'
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
  
  // Send verification email
  const { sendVerificationEmail } = await import('./emailService.js')
  const emailResult = await sendVerificationEmail(
    user.email!,
    user.name || 'there',
    verificationToken
  )
  
  if (!emailResult.success) {
    console.warn(`[Auth] Failed to send verification email to ${user.email}:`, emailResult.error)
  } else {
    console.log(`[Auth] Verification email sent to: ${user.email}`)
  }
  
  // Generate token for auto-login after registration (even unverified)
  // User can browse but some features require verification
  const token = generateToken(user)
  
  // Create session with IP and user agent tracking
  await createSession(user.id, token, ipAddress, userAgent)
  
  console.log(`[Auth] User registered: ${user.email} (email verification pending)`)
  
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
export async function loginUser(data: LoginData, ipAddress: string | null = null, userAgent: string | null = null): Promise<AuthResult> {
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
  
  // Check email verification
  if (!user.emailVerified) {
    const error: any = new Error('Please verify your email address before logging in')
    error.code = 'EMAIL_NOT_VERIFIED'
    error.email = user.email
    throw error
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
export async function loginWithGoogle(googleToken: string, ipAddress: string | null = null, userAgent: string | null = null): Promise<AuthResult> {
  if (!googleClient) {
    throw new Error('Google OAuth not configured')
  }
  
  try {
    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: googleToken,
      audience: GOOGLE_CLIENT_ID
    })
    
    const payload = ticket.getPayload()!
    const googleId = payload.sub
    const email = payload.email!
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
    
  } catch (_error: any) {
    console.error('[Auth] Google OAuth error:', _error.message);
    throw new Error('Google authentication failed');
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
async function createSession(userId: string, token: string, ipAddress: string | null = null, userAgent: string | null = null): Promise<unknown> {
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

// In-memory session cache (60 second TTL to reduce DB load)
const sessionCache = new Map<string, { user: Partial<User> | null; expiresAt: number }>()

/**
 * Verify session token
 * @param {string} token - JWT token
 * @returns {Promise<object|null>} - User object or null
 */
export async function verifySession(token: string): Promise<Partial<User> | null> {
  // Verify JWT first (fast, no DB)
  const payload = verifyToken(token)
  if (!payload) {
    return null
  }
  
  // Hash token to compare with database
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
  
  // Check cache first (avoid DB query on every request)
  const cached = sessionCache.get(hashedToken)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user
  }
  
  // Find session in database
  const session = await prisma.session.findUnique({
    where: { token: hashedToken },
    include: { user: true }
  })
  
  if (!session) {
    // Cache negative result for 10 seconds to prevent repeated DB queries
    sessionCache.set(hashedToken, { user: null, expiresAt: Date.now() + 10000 })
    return null
  }
  
  // Check if session expired
  if (session.expiresAt < new Date()) {
    // Delete expired session
    await prisma.session.delete({
      where: { id: session.id }
    })
    sessionCache.delete(hashedToken)
    return null
  }
  
  // Return user without password
  const { password: _, ...userWithoutPassword } = session.user
  
  // Cache valid session
  sessionCache.set(hashedToken, {
    user: userWithoutPassword,
    expiresAt: Date.now() + CACHE_TTL.SESSION
  })
  
  return userWithoutPassword
}

/**
 * Logout user (delete session)
 * @param {string} token - JWT token
 * @returns {Promise<void>}
 */
export async function logoutUser(token: string): Promise<void> {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
  
  await prisma.session.deleteMany({
    where: { token: hashedToken }
  })
  
  // Clear from cache
  sessionCache.delete(hashedToken)
  
  console.log('[Auth] User logged out')
}

/**
 * Delete all sessions for user
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function logoutAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId }
  })
  
  // Clear all cached sessions for this user (brute force: clear entire cache)
  sessionCache.clear()
  
  console.log(`[Auth] All sessions deleted for user: ${userId}`)
}

// ============================================
// Cleanup (run daily)
// ============================================

/**
 * Delete expired sessions (should run daily via cron)
 * @returns {Promise<number>} - Number of deleted sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
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
