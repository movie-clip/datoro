// tests/e2e/helpers.ts
// Shared E2E test helpers and utilities
// 
// Usage:
//   import { checkServerRunning, createTestUser, loginTestUser } from './helpers'

import request from 'supertest'
import bcrypt from 'bcrypt'
import { getPrismaClient } from '../../server/services/databaseService.js'

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:7071'
const prisma = getPrismaClient()

/**
 * Check if server is running and healthy
 * @param timeout - Request timeout in milliseconds (default: 2000)
 * @returns true if server is healthy, false otherwise
 */
export async function checkServerRunning(timeout = 2000): Promise<boolean> {
  try {
    const response = await request(BASE_URL)
      .get('/api/health')
      .timeout(timeout)
    return response.status === 200
  } catch {
    return false
  }
}

/**
 * Extract auth cookie from response
 * @param response - Supertest response object
 * @param cookieName - Name of cookie to extract (default: 'authToken')
 * @returns Cookie string (e.g., 'authToken=xyz') or empty string
 */
export function extractCookie(response: any, cookieName = 'authToken'): string {
  const cookies = response.headers['set-cookie']
  if (!cookies || cookies.length === 0) return ''
  
  const authCookie = cookies.find((c: string) => c.startsWith(`${cookieName}=`))
  return authCookie ? authCookie.split(';')[0] : ''
}

/**
 * Generate unique test user email
 * @param prefix - Email prefix (default: 'e2e-test')
 * @returns Unique email address
 */
export function generateTestUserEmail(prefix = 'e2e-test'): string {
  return `${prefix}-${Date.now()}@example.com`
}

/**
 * Create test user in database
 * @param email - User email
 * @param password - User password (will be hashed)
 * @param name - User display name
 * @returns Created user object
 */
export async function createTestUser(
  email: string,
  password: string,
  name: string
) {
  const hashedPassword = await bcrypt.hash(password, 10)
  
  // Clean up existing test user (if any)
  await prisma.user.deleteMany({
    where: { email }
  })
  
  // Create fresh test user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      emailVerified: true
    }
  })
  
  return user
}

/**
 * Login test user and get auth cookie
 * @param email - User email
 * @param password - User password
 * @returns Auth cookie string
 */
export async function loginTestUser(email: string, password: string): Promise<string> {
  const response = await request(BASE_URL)
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200)
  
  return extractCookie(response)
}

/**
 * Register new user via API
 * @param email - User email
 * @param password - User password
 * @param name - User display name
 * @returns Auth cookie string
 */
export async function registerTestUser(
  email: string,
  password: string,
  name: string
): Promise<string> {
  const response = await request(BASE_URL)
    .post('/api/auth/register')
    .send({ email, password, name })
    .expect(201)
  
  return extractCookie(response)
}

/**
 * Delete test user from database
 * @param userId - User ID to delete
 */
export async function deleteTestUser(userId: string): Promise<void> {
  await prisma.user.delete({
    where: { id: userId }
  })
}

/**
 * Clean up user's watchlist
 * @param userId - User ID
 */
export async function cleanupWatchlist(userId: string): Promise<void> {
  await prisma.watchlistItem.deleteMany({
    where: { userId }
  })
}

/**
 * Wait for specified duration
 * @param ms - Milliseconds to wait
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Validate batch data structure
 * @param data - Batch data object
 * @throws Error if validation fails
 */
export function validateBatchData(data: any): void {
  if (!data) throw new Error('Batch data is undefined')
  if (!data.ticker) throw new Error('Batch data missing ticker')
  if (!data.timestamp) throw new Error('Batch data missing timestamp')
  if (!data.data) throw new Error('Batch data missing data object')
  
  const requiredEndpoints = [
    'profile',
    'quote',
    'incomeAnnual',
    'incomeQuarter',
    'balanceAnnual',
    'balanceQuarter',
    'cashflowAnnual',
    'cashflowQuarter',
    'keyMetrics',
    'ratios',
    'dividends',
    'splits',
    'insiderTrades',
    'institutionalHolders',
    'earnings',
    'earningsCalendar',
    'dcf'
  ]
  
  requiredEndpoints.forEach(endpoint => {
    if (!(endpoint in data._data)) {
      throw new Error(`Batch data missing ${endpoint}`)
    }
  })
}

/**
 * Make authenticated API request
 * @param method - HTTP method
 * @param path - API path
 * @param authCookie - Auth cookie string
 * @param body - Request body (optional)
 * @returns Supertest request object (call .expect() to execute)
 */
export function authenticatedRequest(
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  authCookie: string,
  body?: any
) {
  const req = request(BASE_URL)[method](path).set('Cookie', authCookie)
  
  if (body) {
    return req.send(body)
  }
  
  return req
}

/**
 * Test data: Valid tickers
 */
export const TEST_TICKERS = {
  VALID: 'AAPL',
  VALID_ALT: 'MSFT',
  VALID_TECH: 'GOOGL',
  INVALID: 'INVALIDXYZ',
  EMPTY: ''
} as const

/**
 * Test data: Test user credentials
 */
export const TEST_USER_DEFAULTS = {
  password: 'TestPassword123!',
  name: 'E2E Test User'
} as const

/**
 * Assert response is successful
 * @param response - Supertest response
 */
export function assertSuccess(response: any): void {
  if (!response.body.success) {
    throw new Error(`Expected success but got: ${JSON.stringify(response.body)}`)
  }
}

/**
 * Assert response is error
 * @param response - Supertest response
 */
export function assertError(response: any): void {
  if (response.body.success) {
    throw new Error(`Expected error but got success: ${JSON.stringify(response.body)}`)
  }
}

/**
 * Get Prisma client instance
 */
export function getPrisma() {
  return prisma
}

/**
 * Get base URL for tests
 */
export function getBaseUrl(): string {
  return BASE_URL
}
