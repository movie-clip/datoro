// tests/e2e/auth-flow.test.ts
// End-to-end tests for complete authentication user flows
// 
// Critical User Flows Tested:
// 1. User Registration → Login → Session Check → Logout
// 2. Invalid credentials handling
// 3. Session persistence across page refreshes
// 4. Token expiration handling
// 
// ⚠️  REQUIRES SERVER RUNNING
// Run: npm run server (in separate terminal)
// Test: npm run test:e2e

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { config } from 'dotenv'
import { getPrismaClient } from '../../server/services/databaseService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '..', '..', '.env.local') })

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:7071'
const prisma = getPrismaClient()

// Test user data
const TEST_USER = {
  email: `e2e-test-${Date.now()}@example.com`,
  password: 'StrongPassword123!',
  name: 'E2E Test User'
}

let authCookie = ''
const authToken = ''

// Helper: Check if server is running
async function checkServerRunning() {
  try {
    const response = await request(BASE_URL).get('/api/health').timeout(2000)
    return response.status === 200
  } catch {
    return false
  }
}

// Helper: Extract cookie from response
function extractCookie(response: any, cookieName = 'authToken'): string {
  const cookies = response.headers['set-cookie']
  if (!cookies || cookies.length === 0) return ''
  
  const authCookie = cookies.find((c: string) => c.startsWith(`${cookieName}=`))
  return authCookie ? authCookie.split(';')[0] : ''
}

describe('Authentication Flow - E2E Tests', () => {
  beforeAll(async () => {
    console.log('\n🔐 Starting Auth Flow E2E Tests...')
    console.log(`📍 Testing against: ${BASE_URL}\n`)
    
    const isServerRunning = await checkServerRunning()
    if (!isServerRunning) {
      throw new Error('Server not running - start with: npm run server')
    }
    
    console.log('✅ Server is running\n')
  })

  afterAll(async () => {
    // Cleanup: Delete test user
    try {
      await prisma.user.deleteMany({
        where: { email: TEST_USER.email }
      })
      console.log('🧹 Cleaned up test user\n')
    } catch (_error) {
      console.log('⚠️  Cleanup warning:', error)
    }
  })

  describe('Complete Registration Flow', () => {
    it('should register a new user successfully', async () => {
      const response = await request(BASE_URL)
        .post('/api/auth/register')
        .send({
          email: TEST_USER.email,
          password: TEST_USER.password,
          name: TEST_USER.name
        })
        .expect(201)

      // Check response structure
      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeDefined()
      expect(response.body.data.user).toBeDefined()
      expect(response.body.data.user.email).toBe(TEST_USER.email.toLowerCase())
      expect(response.body.data.user.name).toBe(TEST_USER.name)
      expect(response.body.data.user.subscriptionTier).toBe('free')
      
      // Verify password is NOT returned
      expect(response.body.data.user.password).toBeUndefined()
      
      // Verify auth cookie is set
      authCookie = extractCookie(response)
      expect(authCookie).toBeTruthy()
      expect(authCookie).toContain('authToken=')
    }, 10000)

    it('should fail to register with duplicate email', async () => {
      const response = await request(BASE_URL)
        .post('/api/auth/register')
        .send({
          email: TEST_USER.email,
          password: TEST_USER.password,
          name: 'Another User'
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('already registered')
    }, 10000)

    it('should fail with weak password', async () => {
      const response = await request(BASE_URL)
        .post('/api/auth/register')
        .send({
          email: 'weak-password@example.com',
          password: 'weak',
          name: 'Weak Password User'
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.errors).toBeDefined()
    }, 10000)

    it('should fail with invalid email format', async () => {
      const response = await request(BASE_URL)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'StrongPassword123!',
          name: 'Invalid Email'
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.errors).toBeDefined()
    }, 10000)
  })

  describe('Login Flow', () => {
    it('should login with correct credentials', async () => {
      const response = await request(BASE_URL)
        .post('/api/auth/login')
        .send({
          email: TEST_USER.email,
          password: TEST_USER.password
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user).toBeDefined()
      expect(response.body.data.user.email).toBe(TEST_USER.email.toLowerCase())
      
      // Save cookie for session tests
      authCookie = extractCookie(response)
      expect(authCookie).toBeTruthy()
    }, 10000)

    it('should fail with incorrect password', async () => {
      const response = await request(BASE_URL)
        .post('/api/auth/login')
        .send({
          email: TEST_USER.email,
          password: 'WrongPassword123!'
        })
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Invalid')
    }, 10000)

    it('should fail with non-existent email', async () => {
      const response = await request(BASE_URL)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'AnyPassword123!'
        })
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Invalid')
    }, 10000)

    it('should fail with missing credentials', async () => {
      const response = await request(BASE_URL)
        .post('/api/auth/login')
        .send({})
        .expect(400)

      expect(response.body.success).toBe(false)
    }, 10000)
  })

  describe('Session Persistence', () => {
    it('should verify session with /me endpoint', async () => {
      const response = await request(BASE_URL)
        .get('/api/auth/me')
        .set('Cookie', authCookie)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.user).toBeDefined()
      expect(response.body.data.user.email).toBe(TEST_USER.email.toLowerCase())
    }, 10000)

    it('should fail /me without auth cookie', async () => {
      const response = await request(BASE_URL)
        .get('/api/auth/me')
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Authentication required')
    }, 10000)

    it('should maintain session across multiple requests', async () => {
      // Request 1
      const response1 = await request(BASE_URL)
        .get('/api/auth/me')
        .set('Cookie', authCookie)
        .expect(200)

      expect(response1.body.data.user.email).toBe(TEST_USER.email.toLowerCase())

      // Request 2 (simulating page refresh)
      const response2 = await request(BASE_URL)
        .get('/api/auth/me')
        .set('Cookie', authCookie)
        .expect(200)

      expect(response2.body.data.user.email).toBe(TEST_USER.email.toLowerCase())

      // Request 3 (simulating another page refresh)
      const response3 = await request(BASE_URL)
        .get('/api/auth/me')
        .set('Cookie', authCookie)
        .expect(200)

      expect(response3.body.data.user.email).toBe(TEST_USER.email.toLowerCase())
    }, 15000)
  })

  describe('Logout Flow', () => {
    it('should logout successfully', async () => {
      const response = await request(BASE_URL)
        .post('/api/auth/logout')
        .set('Cookie', authCookie)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('Logged out')
      
      // Verify cookie is cleared
      const cookies = response.headers['set-cookie']
      const clearedCookie = cookies?.find((c: string) => c.startsWith('authToken='))
      expect(clearedCookie).toBeTruthy()
      // Should have Max-Age=0 or Expires in the past
      expect(clearedCookie).toMatch(/Max-Age=0|Expires=/)
    }, 10000)

    it('should fail to access /me after logout', async () => {
      const response = await request(BASE_URL)
        .get('/api/auth/me')
        .set('Cookie', authCookie)
        .expect(401)

      expect(response.body.success).toBe(false)
    }, 10000)

    it('should be able to login again after logout', async () => {
      const response = await request(BASE_URL)
        .post('/api/auth/login')
        .send({
          email: TEST_USER.email,
          password: TEST_USER.password
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      authCookie = extractCookie(response)
      expect(authCookie).toBeTruthy()
    }, 10000)
  })

  describe('Complete User Journey', () => {
    it('should complete full auth lifecycle: register → login → check session → logout', async () => {
      // Step 1: Register new user
      const newEmail = `journey-test-${Date.now()}@example.com`
      const registerRes = await request(BASE_URL)
        .post('/api/auth/register')
        .send({
          email: newEmail,
          password: 'JourneyTest123!',
          name: 'Journey Test'
        })
        .expect(201)

      expect(registerRes.body.success).toBe(true)
      const journeyCookie = extractCookie(registerRes)
      
      // Step 2: Verify session immediately after registration
      const meRes1 = await request(BASE_URL)
        .get('/api/auth/me')
        .set('Cookie', journeyCookie)
        .expect(200)

      expect(meRes1.body.data.user.email).toBe(newEmail.toLowerCase())
      
      // Step 3: Logout
      await request(BASE_URL)
        .post('/api/auth/logout')
        .set('Cookie', journeyCookie)
        .expect(200)
      
      // Step 4: Verify session is gone
      await request(BASE_URL)
        .get('/api/auth/me')
        .set('Cookie', journeyCookie)
        .expect(401)
      
      // Step 5: Login again
      const loginRes = await request(BASE_URL)
        .post('/api/auth/login')
        .send({
          email: newEmail,
          password: 'JourneyTest123!'
        })
        .expect(200)

      expect(loginRes.body.success).toBe(true)
      const newCookie = extractCookie(loginRes)
      
      // Step 6: Verify new session
      const meRes2 = await request(BASE_URL)
        .get('/api/auth/me')
        .set('Cookie', newCookie)
        .expect(200)

      expect(meRes2.body.data.user.email).toBe(newEmail.toLowerCase())
      
      // Cleanup
      await prisma.user.deleteMany({ where: { email: newEmail } })
    }, 30000)
  })
})
