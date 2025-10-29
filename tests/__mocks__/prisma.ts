/**
 * Mock Prisma Client for Testing
 * 
 * This mock allows tests to run without a live database connection.
 * Use vi.mock() to replace the real Prisma client with this mock.
 * 
 * @example
 * import { vi } from 'vitest'
 * import { mockPrismaClient } from '../__mocks__/prisma.js'
 * 
 * vi.mock('@prisma/client', () => ({
 *   PrismaClient: vi.fn(() => mockPrismaClient),
 * }))
 */

import { vi } from 'vitest'

interface MockUser {
  id: string
  ipAddress: string | null
  userAgent: string | null
  email?: string | null
  googleId?: string | null
  lastLoginAt: Date
  createdAt: Date
  searches?: MockSearch[]
}

interface MockSearch {
  id: string
  userId: string
  ticker: string
  query?: string | null
  source: string
  createdAt: Date
}

interface MockApiRequest {
  id: string
  userId: string | null
  endpoint: string
  method: string
  statusCode: number
  responseTime: number
  cached: boolean
  errorCode: string | null
  createdAt: Date
}

/**
 * Mock Prisma Client with all database operations
 */
export const mockPrismaClient = {
  user: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  
  popularTicker: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  
  search: {
    create: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  
  apiRequest: {
    create: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  
  errorLog: {
    create: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  
  // Prisma raw queries
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
  
  // Transaction support (for race condition fix)
  $transaction: vi.fn(async (callback: any) => {
    // Execute callback with mockPrismaClient as transaction client
    return callback(mockPrismaClient)
  }),
  
  // Connection management
  $connect: vi.fn(),
  $disconnect: vi.fn(),
}

/**
 * Reset all mocks to clean state
 */
export function resetMockDatabase(): void {
  vi.clearAllMocks()
}

// In-memory stores for realistic mock behavior
let userStore: MockUser[] = [] // Track users created during tests
let searchStore: MockSearch[] = []
let apiRequestStore: MockApiRequest[] = []

/**
 * Setup default mock responses
 * Call this in beforeEach() to ensure consistent test state
 */
export function setupDefaultMocks(): void {
  // Reset stores
  userStore = []
  searchStore = []
  apiRequestStore = []
  
  // User operations - return dynamic data based on input
  mockPrismaClient.user.upsert.mockImplementation(async ({ where, create, update }: any) => ({
    id: `mock-user-${where.ipAddress}`,
    ipAddress: where.ipAddress,
    userAgent: create?.userAgent || update?.userAgent || 'Test Browser',
    lastLoginAt: new Date(),
    createdAt: new Date(),
  }))
  
  // findFirst - for finding existing users by IP (used in transaction and getUserSearchHistory)
  mockPrismaClient.user.findFirst.mockImplementation(async ({ where, include, orderBy }: any): Promise<MockUser | null> => {
    // Find matching user in store
    let user = userStore.find(u => {
      if (where?.ipAddress && u.ipAddress !== where.ipAddress) return false
      if (where?.email !== undefined && u.email !== where.email) return false
      if (where?.googleId !== undefined && u.googleId !== where.googleId) return false
      return true
    })
    
    if (!user) return null
    
    // Clone user to avoid mutation and update lastLoginAt (simulate real DB behavior)
    await new Promise(resolve => setTimeout(resolve, 2)) // Ensure time advances
    user = { ...user, lastLoginAt: new Date() }
    
    // If including searches, add them from the store
    if (include?.searches) {
      const userSearches = searchStore
        .filter(s => s.userId === user!.id)
        .sort((_a, _b) => _b.createdAt.getTime() - _a.createdAt.getTime())
        .slice(0, include.searches.take || 10)
        .map(s => ({
          id: s.id,
          userId: s.userId,
          ticker: s.ticker,
          query: s.query,
          source: s.source,
          createdAt: s.createdAt
        }))
      user.searches = userSearches
    }
    
    return user
  })
  
  // create - for creating new users in transaction
  mockPrismaClient.user.create.mockImplementation(async ({ data }: any): Promise<MockUser> => {
    const user: MockUser = {
      id: `mock-user-${data.ipAddress || 'anonymous'}-${Date.now()}`,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      email: data.email || null,
      googleId: data.googleId || null,
      lastLoginAt: new Date(),
      createdAt: new Date(),
    }
    // Add to in-memory store
    userStore.push(user)
    return user
  })
  
  // update - for updating lastLoginAt in transaction
  mockPrismaClient.user.update.mockImplementation(async ({ where, data }: any): Promise<MockUser> => {
    // Find user in store
    const userIndex = userStore.findIndex(u => u.id === where.id)
    if (userIndex >= 0) {
      // Add tiny delay to ensure lastLoginAt changes in tests
      await new Promise(resolve => setTimeout(resolve, 1))
      
      // Update existing user
      userStore[userIndex] = {
        ...userStore[userIndex],
        ...data,
        lastLoginAt: data.lastLoginAt || new Date()
      }
      return userStore[userIndex]
    }
    
    // Fallback for tests that don't use store
    return {
      id: where.id || `mock-user-update-${Date.now()}`,
      ipAddress: data.ipAddress || '192.168.1.1',
      userAgent: data.userAgent || 'Test Browser',
      lastLoginAt: data.lastLoginAt || new Date(),
      createdAt: new Date(Date.now() - 86400000), // 1 day ago
    }
  })
  
  mockPrismaClient.user.findUnique.mockImplementation(async ({ where, include }: any): Promise<unknown> => {
    const user: unknown = {
      id: `mock-user-${where.ipAddress}`,
      ipAddress: where.ipAddress,
      userAgent: 'Test Browser',
      lastLoginAt: new Date(),
      createdAt: new Date(),
    }
    
    // If including searches, add them from the store
    if (include?.searches) {
      const userSearches = searchStore
        .filter(s => s.userId === user.id)
        .sort((_a, _b) => _b.createdAt.getTime() - _a.createdAt.getTime())
        .slice(0, include.searches.take || 10)
        .map(s => ({
          ticker: s.ticker,
          query: s.query,
          source: s.source,
          createdAt: s.createdAt
        }))
      user.searches = userSearches
    }
    
    return user
  })
  
  // Popular tickers
  mockPrismaClient.popularTicker.findMany.mockResolvedValue([
    {
      ticker: 'AAPL',
      companyName: 'Apple Inc.',
      searchCount: 150,
      lastSearched: new Date(),
    },
    {
      ticker: 'MSFT',
      companyName: 'Microsoft Corporation',
      searchCount: 120,
      lastSearched: new Date(),
    },
    {
      ticker: 'GOOGL',
      companyName: 'Alphabet Inc.',
      searchCount: 95,
      lastSearched: new Date(),
    },
  ])
  
  mockPrismaClient.popularTicker.upsert.mockImplementation(async ({ where, create, update }: any) => ({
    ticker: where.ticker,
    companyName: create?.companyName || update?.companyName || 'Test Company',
    searchCount: (update?.searchCount?.increment || 1) + 100,
    lastSearched: new Date(),
  }))
  
  mockPrismaClient.popularTicker.update.mockImplementation(async ({ where, data }: any) => ({
    ticker: where.ticker,
    companyName: data.companyName,
    searchCount: 100,
    lastSearched: new Date(),
  }))
  
  // Search tracking - use in-memory store for realistic behavior
  mockPrismaClient.search.create.mockImplementation(async ({ data }: any): Promise<MockSearch> => {
    const entry: MockSearch = {
      id: `mock-search-${Date.now()}-${Math.random()}`,
      userId: data.userId,
      ticker: data.ticker,
      query: data.query || null,
      source: data.source || 'direct',
      createdAt: new Date(),
    }
    searchStore.push(entry)
    return entry
  })
  
  mockPrismaClient.search.findMany.mockImplementation(async ({ where, take }: any): Promise<MockSearch[]> => {
    // Return searches for this user
    return searchStore
      .filter(s => !where?.userId || s.userId === where.userId)
      .sort((_a, _b) => _b.createdAt.getTime() - _a.createdAt.getTime())
      .slice(0, take || 10)
  })
  
  mockPrismaClient.search.deleteMany.mockResolvedValue({ count: 0 })
  
  // API requests - use in-memory store
  mockPrismaClient.apiRequest.create.mockImplementation(async ({ data }: any): Promise<MockApiRequest> => {
    const entry: MockApiRequest = {
      id: `mock-api-request-${Date.now()}-${Math.random()}`,
      userId: data.userId || null,
      endpoint: data.endpoint,
      method: data.method || 'GET',
      statusCode: data.statusCode,
      responseTime: data.responseTime,
      cached: data.cached || false,
      errorCode: data.errorCode || null,
      createdAt: new Date(),
    }
    apiRequestStore.push(entry)
    return entry
  })
  
  mockPrismaClient.apiRequest.findMany.mockImplementation(async ({ where, take }: any): Promise<MockApiRequest[]> => {
    let filtered = apiRequestStore
    
    // Apply where filters
    if (where?.userId) {
      filtered = filtered.filter(r => r.userId === where.userId)
    }
    if (where?.createdAt?.gte) {
      filtered = filtered.filter(r => r.createdAt >= where.createdAt.gte)
    }
    
    // Sort and limit
    return filtered
      .sort((_a, _b) => _b.createdAt.getTime() - _a.createdAt.getTime())
      .slice(0, take || 100)
  })
  
  mockPrismaClient.apiRequest.deleteMany.mockImplementation(async ({ where }: any) => {
    const beforeCount = apiRequestStore.length
    if (where?.createdAt?.lt) {
      apiRequestStore = apiRequestStore.filter(r => r.createdAt >= where.createdAt.lt)
    }
    return { count: beforeCount - apiRequestStore.length }
  })
  
  // Error log
  mockPrismaClient.errorLog.deleteMany.mockImplementation(async () => {
    // Mock deletion - always return success
    return { count: 0 }
  })
  
  // Raw queries for stats
  mockPrismaClient.$queryRaw.mockImplementation(async () => {
    // Mock API request stats
    const requests = apiRequestStore
    const totalRequests = requests.length
    const successfulRequests = requests.filter(r => r.statusCode < 400).length
    const cachedRequests = requests.filter(r => r.cached).length
    const avgResponseTime = requests.length > 0
      ? requests.reduce((_sum, _r) => _sum + _r.responseTime, 0) / requests.length
      : 0
    
    return [{
      totalRequests: BigInt(totalRequests),
      successfulRequests: BigInt(successfulRequests),
      cachedRequests: BigInt(cachedRequests),
      avgResponseTime: Math.round(avgResponseTime)
    }]
  })
}

/**
 * Create mock user data
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 'mock-user-id',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 Test Browser',
    lastLoginAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  }
}

/**
 * Create mock search history entry
 */
export function createMockSearch(overrides: Partial<MockSearch> = {}): MockSearch {
  return {
    id: 'mock-search-id',
    userId: 'mock-user-id',
    ticker: 'AAPL',
    source: 'direct',
    createdAt: new Date(),
    ...overrides,
  }
}

/**
 * Create mock API request entry
 */
export function createMockApiRequest(overrides: Partial<Omit<MockApiRequest, 'id' | 'createdAt'>> = {}): any {
  return {
    id: 'mock-api-request-id',
    endpoint: '/api/v3/profile/AAPL',
    method: 'GET',
    statusCode: 200,
    responseTime: 234,
    cached: false,
    timestamp: new Date(),
    ...overrides,
  }
}

/**
 * Create mock popular ticker entry
 */
export function createMockPopularTicker(overrides: unknown = {}): any {
  return {
    ticker: 'AAPL',
    companyName: 'Apple Inc.',
    searchCount: 100,
    lastSearched: new Date(),
    ...overrides,
  }
}

