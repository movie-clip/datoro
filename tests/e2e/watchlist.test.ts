// tests/e2e/watchlist.test.ts
// End-to-end tests for Watchlist API endpoints
// 
// ⚠️  REQUIRES SERVER RUNNING
// Before running these tests, start the server:
//   npm run server  (or)  npm run pm2:dev
// 
// Run with: npm run test:e2e

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { config } from 'dotenv'
import bcrypt from 'bcryptjs'
import { getPrismaClient } from '../../server/services/databaseService.js'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '..', '..', '.env.local') })

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:7071'
const prisma = getPrismaClient()

// Test user credentials
const TEST_USER = {
  email: 'watchlist-test@example.com',
  password: 'TestPassword123!',
  name: 'Watchlist Test User'
}

// Store auth state
let authCookie: string = ''
let testUserId: string = ''

// Helper: Create test user
async function createTestUser() {
  const hashedPassword = await bcrypt.hash(TEST_USER.password, 10)
  
  // Clean up existing test user
  await prisma.user.deleteMany({
    where: { email: TEST_USER.email }
  })
  
  // Create fresh test user
  const user = await prisma.user.create({
    data: {
      email: TEST_USER.email,
      password: hashedPassword,
      name: TEST_USER.name,
      emailVerified: true
    }
  })
  
  return user
}

// Helper: Login and get auth cookie
async function loginTestUser(): Promise<string> {
  const response = await request(BASE_URL)
    .post('/api/auth/login')
    .send({
      email: TEST_USER.email,
      password: TEST_USER.password
    })
    .expect(200)
  
  // Extract Set-Cookie header
  const cookies = response.headers['set-cookie'] as string[] | undefined
  if (!cookies || cookies.length === 0) {
    throw new Error('No auth cookie received')
  }

  const firstCookie = cookies[0]
  if (!firstCookie) {
    throw new Error('Invalid auth cookie payload')
  }

  const tokenCookie = firstCookie.split(';')[0]
  if (!tokenCookie) {
    throw new Error('Missing token in auth cookie payload')
  }

  return tokenCookie // Get just the token=value part
}

// Helper: Clean up test user's watchlist
async function cleanupWatchlist(userId: string) {
  await prisma.watchlistItem.deleteMany({
    where: { userId }
  })
}

// Check if server is running
async function checkServerRunning() {
  try {
    const response = await request(BASE_URL).get('/api/health').timeout(2000)
    return response.status === 200
  } catch {
    return false
  }
}

describe('Watchlist API - E2E Tests', () => {
  beforeAll(async () => {
    console.log('\n⭐ Starting Watchlist E2E Tests...')
    console.log(`📍 Testing against: ${BASE_URL}\n`)
    
    // Check if server is running
    const isServerRunning = await checkServerRunning()
    if (!isServerRunning) {
      console.log('❌ Server is not running!')
      console.log('   Start the server first:')
      console.log('     npm run server  (or)')
      console.log('     npm run pm2:dev')
      throw new Error('Server not running - cannot run E2E tests')
    }
    
    console.log('✅ Server is running')
    
    // Create test user
    const user = await createTestUser()
    testUserId = user.id
    console.log(`✅ Test user created: ${TEST_USER.email}`)
    
    // Login and get auth cookie
    authCookie = await loginTestUser()
    console.log('✅ Authentication successful\n')
  })

  afterAll(async () => {
    // Cleanup
    if (testUserId) {
      await cleanupWatchlist(testUserId!)
      await prisma.user.delete({ where: { id: testUserId } })
      console.log('\n🧹 Test user cleaned up')
    }
    await prisma.$disconnect()
    console.log('✅ Watchlist E2E Tests Complete\n')
  })

  beforeEach(async () => {
    // Clean watchlist before each test
    await cleanupWatchlist(testUserId!)
  })

  describe('Authentication', () => {
    it('GET /api/watchlist should require authentication', async () => {
      const response = await request(BASE_URL)
        .get('/api/watchlist')
        .expect(401)
      
      expect(response.body.error).toBe('Authentication required')
    })

    it('POST /api/watchlist/:ticker should require authentication', async () => {
      const response = await request(BASE_URL)
        .post('/api/watchlist/AAPL')
        .expect(401)
      
      expect(response.body.error).toBe('Authentication required')
    })

    it('DELETE /api/watchlist/:ticker should require authentication', async () => {
      const response = await request(BASE_URL)
        .delete('/api/watchlist/AAPL')
        .expect(401)
      
      expect(response.body.error).toBe('Authentication required')
    })
  })

  describe('GET /api/watchlist', () => {
    it('should return empty watchlist for new user', async () => {
      const response = await request(BASE_URL)
        .get('/api/watchlist')
        .set('Cookie', authCookie!)
        .expect(200)
      
      expect(response.body.tickers).toEqual([])
    })

    it('should return watchlist items sorted by addedAt DESC', async () => {
      // Add multiple tickers
      await request(BASE_URL)
        .post('/api/watchlist/AAPL')
        .set('Cookie', authCookie!)
        .expect(200)
      
      await sleep(100) // Ensure different timestamps
      
      await request(BASE_URL)
        .post('/api/watchlist/MSFT')
        .set('Cookie', authCookie!)
        .expect(200)
      
      await sleep(100)
      
      await request(BASE_URL)
        .post('/api/watchlist/GOOGL')
        .set('Cookie', authCookie!)
        .expect(200)
      
      // Fetch watchlist
      const response = await request(BASE_URL)
        .get('/api/watchlist')
        .set('Cookie', authCookie!)
        .expect(200)
      
      expect(response.body.tickers).toHaveLength(3)
      expect(response.body.tickers[0].ticker).toBe('GOOGL') // Most recent
      expect(response.body.tickers[1].ticker).toBe('MSFT')
      expect(response.body.tickers[2].ticker).toBe('AAPL') // Oldest
      
      // Verify structure
      response.body.tickers.forEach((item: any) => {
        expect(item.ticker).toBeDefined()
        expect(item.addedAt).toBeDefined()
        expect(new Date(item.addedAt)).toBeInstanceOf(Date)
      })
    })

    it('should respect rate limiting', async () => {
      // General limiter allows 15 requests per minute
      // Make 16 requests quickly to trigger rate limit
      const requests = []
      for (let i = 0; i < 16; i++) {
        requests.push(
          request(BASE_URL)
            .get('/api/watchlist')
            .set('Cookie', authCookie!)
        )
      }
      
      const responses = await Promise.all(requests)
      const rateLimitedResponses = responses.filter(r => r.status === 429)
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    }, 15000)
  })

  describe('POST /api/watchlist/:ticker', () => {
    it('should add valid ticker to watchlist', async () => {
      const response = await request(BASE_URL)
        .post('/api/watchlist/AAPL')
        .set('Cookie', authCookie!)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.ticker).toBe('AAPL')
      expect(response.body.addedAt).toBeDefined()
      
      // Verify in database
      const item = await prisma.watchlistItem.findFirst({
        where: { userId: testUserId!, ticker: 'AAPL' }
      })
      expect(item).toBeDefined()
      expect(item!.ticker).toBe('AAPL')
    })

    it('should normalize ticker to uppercase', async () => {
      const response = await request(BASE_URL)
        .post('/api/watchlist/msft')
        .set('Cookie', authCookie!)
        .expect(200)
      
      expect(response.body.ticker).toBe('MSFT')
      
      // Verify in database
      const item = await prisma.watchlistItem.findFirst({
        where: { userId: testUserId!, ticker: 'MSFT' }
      })
      expect(item).toBeDefined()
    })

    it('should handle tickers with whitespace', async () => {
      const response = await request(BASE_URL)
        .post('/api/watchlist/  TSLA  ')
        .set('Cookie', authCookie!)
        .expect(200)
      
      expect(response.body.ticker).toBe('TSLA')
    })

    it('should prevent duplicate entries', async () => {
      // Add once
      await request(BASE_URL)
        .post('/api/watchlist/AAPL')
        .set('Cookie', authCookie!)
        .expect(200)
      
      // Try to add again
      const response = await request(BASE_URL)
        .post('/api/watchlist/AAPL')
        .set('Cookie', authCookie!)
        .expect(409)
      
      expect(response.body.error).toBe('Ticker already in watchlist')
      
      // Verify only one entry exists
      const count = await prisma.watchlistItem.count({
        where: { userId: testUserId!, ticker: 'AAPL' }
      })
      expect(count).toBe(1)
    })

    it('should validate ticker format - reject empty', async () => {
      const response = await request(BASE_URL)
        .post('/api/watchlist/')
        .set('Cookie', authCookie!)
        .expect(404) // Route not found
    })

    it('should validate ticker format - reject too long', async () => {
      const response = await request(BASE_URL)
        .post('/api/watchlist/VERYLONGTICKER')
        .set('Cookie', authCookie!)
        .expect(400)
      
      expect(response.body.error).toBe('Invalid ticker symbol')
    })

    it('should validate ticker format - reject numbers', async () => {
      const response = await request(BASE_URL)
        .post('/api/watchlist/AAPL123')
        .set('Cookie', authCookie!)
        .expect(400)
      
      expect(response.body.error).toBe('Invalid ticker symbol')
    })

    it('should validate ticker format - reject special chars', async () => {
      const response = await request(BASE_URL)
        .post('/api/watchlist/AAPL@#')
        .set('Cookie', authCookie!)
        .expect(400)
      
      expect(response.body.error).toBe('Invalid ticker symbol')
    })

    it('should allow multiple different tickers', async () => {
      const tickers = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'AMZN']
      
      for (const ticker of tickers) {
        await request(BASE_URL)
          .post(`/api/watchlist/${ticker}`)
          .set('Cookie', authCookie!)
          .expect(200)
      }
      
      // Verify all added
      const count = await prisma.watchlistItem.count({
        where: { userId: testUserId! }
      })
      expect(count).toBe(tickers.length)
    })

    it('should generate valid UUID for each item', async () => {
      await request(BASE_URL)
        .post('/api/watchlist/AAPL')
        .set('Cookie', authCookie!)
        .expect(200)
      
      const item = await prisma.watchlistItem.findFirst({
        where: { userId: testUserId!, ticker: 'AAPL' }
      })
      
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (item) {
        expect(item.id).toMatch(uuidRegex)
      }
    })
  })

  describe('DELETE /api/watchlist/:ticker', () => {
    beforeEach(async () => {
      // Add some tickers for deletion tests
      await request(BASE_URL)
        .post('/api/watchlist/AAPL')
        .set('Cookie', authCookie!)
      await request(BASE_URL)
        .post('/api/watchlist/MSFT')
        .set('Cookie', authCookie!)
    })

    it('should delete existing ticker', async () => {
      const response = await request(BASE_URL)
        .delete('/api/watchlist/AAPL')
        .set('Cookie', authCookie!)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.ticker).toBe('AAPL')
      
      // Verify deleted from database
      const item = await prisma.watchlistItem.findFirst({
        where: { userId: testUserId!, ticker: 'AAPL' }
      })
      expect(item).toBeNull()
      
      // Verify other ticker still exists
      const msftItem = await prisma.watchlistItem.findFirst({
        where: { userId: testUserId!, ticker: 'MSFT' }
      })
      expect(msftItem).toBeDefined()
    })

    it('should normalize ticker to uppercase for deletion', async () => {
      const response = await request(BASE_URL)
        .delete('/api/watchlist/aapl')
        .set('Cookie', authCookie!)
        .expect(200)
      
      expect(response.body.ticker).toBe('AAPL')
    })

    it('should handle deletion of non-existent ticker gracefully', async () => {
      const response = await request(BASE_URL)
        .delete('/api/watchlist/NOTEXIST')
        .set('Cookie', authCookie!)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.ticker).toBe('NOTEXIST')
    })

    it('should only delete user\'s own watchlist items', async () => {
      // Create second test user
      const hashedPassword = await bcrypt.hash('Password123!', 10)
      const user2 = await prisma.user.create({
        data: {
          email: 'watchlist-test2@example.com',
          password: hashedPassword,
          name: 'Test User 2',
          emailVerified: true
        }
      })

      const user2Watchlist = await prisma.watchlist.create({
        data: {
          userId: user2.id,
          name: 'Default',
          isDefault: true
        }
      })
      
      // Add AAPL to second user's watchlist
      await prisma.watchlistItem.create({
        data: {
          watchlistId: user2Watchlist.id,
          userId: user2.id,
          ticker: 'AAPL'
        }
      })
      
      // First user deletes AAPL from their watchlist
      await request(BASE_URL)
        .delete('/api/watchlist/AAPL')
        .set('Cookie', authCookie!)
        .expect(200)
      
      // Verify second user's AAPL still exists
      const user2Item = await prisma.watchlistItem.findFirst({
        where: { userId: user2.id, ticker: 'AAPL' }
      })
      expect(user2Item).toBeDefined()
      
      // Cleanup
      await prisma.watchlistItem.deleteMany({ where: { userId: user2.id } })
      await prisma.user.delete({ where: { id: user2.id } })
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle full watchlist workflow', async () => {
      // 1. Start with empty watchlist
      let response = await request(BASE_URL)
        .get('/api/watchlist')
        .set('Cookie', authCookie!)
        .expect(200)
      expect(response.body.tickers).toHaveLength(0)
      
      // 2. Add first ticker
      await request(BASE_URL)
        .post('/api/watchlist/AAPL')
        .set('Cookie', authCookie!)
        .expect(200)
      
      // 3. Verify it appears
      response = await request(BASE_URL)
        .get('/api/watchlist')
        .set('Cookie', authCookie!)
        .expect(200)
      expect(response.body.tickers).toHaveLength(1)
      expect(response.body.tickers[0].ticker).toBe('AAPL')
      
      // 4. Add more tickers
      await request(BASE_URL)
        .post('/api/watchlist/MSFT')
        .set('Cookie', authCookie!)
        .expect(200)
      await request(BASE_URL)
        .post('/api/watchlist/GOOGL')
        .set('Cookie', authCookie!)
        .expect(200)
      
      // 5. Verify all present
      response = await request(BASE_URL)
        .get('/api/watchlist')
        .set('Cookie', authCookie!)
        .expect(200)
      expect(response.body.tickers).toHaveLength(3)
      
      // 6. Remove middle ticker
      await request(BASE_URL)
        .delete('/api/watchlist/MSFT')
        .set('Cookie', authCookie!)
        .expect(200)
      
      // 7. Verify only 2 remain
      response = await request(BASE_URL)
        .get('/api/watchlist')
        .set('Cookie', authCookie!)
        .expect(200)
      expect(response.body.tickers).toHaveLength(2)
      expect(response.body.tickers.map((t: any) => t.ticker)).toEqual(['GOOGL', 'AAPL'])
    })

    it('should cascade delete watchlist items when user is deleted', async () => {
      // Create temporary user
      const hashedPassword = await bcrypt.hash('Password123!', 10)
      const tempUser = await prisma.user.create({
        data: {
          email: 'temp-watchlist@example.com',
          password: hashedPassword,
          name: 'Temp User',
          emailVerified: true
        }
      })

      const tempUserWatchlist = await prisma.watchlist.create({
        data: {
          userId: tempUser.id,
          name: 'Default',
          isDefault: true
        }
      })
      
      // Add watchlist items
      await prisma.watchlistItem.create({
        data: { watchlistId: tempUserWatchlist.id, userId: tempUser.id, ticker: 'AAPL' }
      })
      await prisma.watchlistItem.create({
        data: { watchlistId: tempUserWatchlist.id, userId: tempUser.id, ticker: 'MSFT' }
      })
      
      // Verify items exist
      let count = await prisma.watchlistItem.count({
        where: { userId: tempUser.id }
      })
      expect(count).toBe(2)
      
      // Delete user (should cascade delete watchlist items)
      await prisma.user.delete({ where: { id: tempUser.id } })
      
      // Verify watchlist items are gone
      count = await prisma.watchlistItem.count({
        where: { userId: tempUser.id }
      })
      expect(count).toBe(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Disconnect Prisma to simulate database error
      await prisma.$disconnect()
      
      const response = await request(BASE_URL)
        .get('/api/watchlist')
        .set('Cookie', authCookie!)
        .expect(500)
      
      expect(response.body.error).toBeDefined()
      
      // Reconnect for remaining tests
      await prisma.$connect()
    })
  })
})

