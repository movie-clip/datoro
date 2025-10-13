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

/**
 * Mock Prisma Client with all database operations
 */
export const mockPrismaClient = {
  user: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
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
  
  // Connection management
  $connect: vi.fn(),
  $disconnect: vi.fn(),
}

/**
 * Reset all mocks to clean state
 */
export function resetMockDatabase() {
  vi.clearAllMocks()
}

// In-memory stores for realistic mock behavior
let searchStore = []
let apiRequestStore = []

/**
 * Setup default mock responses
 * Call this in beforeEach() to ensure consistent test state
 */
export function setupDefaultMocks() {
  // Reset stores
  searchStore = []
  apiRequestStore = []
  
  // User operations - return dynamic data based on input
  mockPrismaClient.user.upsert.mockImplementation(async ({ where, create, update }) => ({
    id: `mock-user-${where.ipAddress}`,
    ipAddress: where.ipAddress,
    userAgent: create?.userAgent || update?.userAgent || 'Test Browser',
    lastSeenAt: new Date(),
    createdAt: new Date(),
  }))
  
  mockPrismaClient.user.findUnique.mockImplementation(async ({ where, include }) => {
    const user = {
      id: `mock-user-${where.ipAddress}`,
      ipAddress: where.ipAddress,
      userAgent: 'Test Browser',
      lastSeenAt: new Date(),
      createdAt: new Date(),
    }
    
    // If including searches, add them from the store
    if (include?.searches) {
      const userSearches = searchStore
        .filter(s => s.userId === user.id)
        .sort((a, b) => b.createdAt - a.createdAt)
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
  
  mockPrismaClient.popularTicker.upsert.mockImplementation(async ({ where, create, update }) => ({
    ticker: where.ticker,
    companyName: create?.companyName || update?.companyName || 'Test Company',
    searchCount: (update?.searchCount?.increment || 1) + 100,
    lastSearched: new Date(),
  }))
  
  mockPrismaClient.popularTicker.update.mockImplementation(async ({ where, data }) => ({
    ticker: where.ticker,
    companyName: data.companyName,
    searchCount: 100,
    lastSearched: new Date(),
  }))
  
  // Search tracking - use in-memory store for realistic behavior
  mockPrismaClient.search.create.mockImplementation(async ({ data }) => {
    const entry = {
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
  
  mockPrismaClient.search.findMany.mockImplementation(async ({ where, take }) => {
    // Return searches for this user
    return searchStore
      .filter(s => !where?.userId || s.userId === where.userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, take || 10)
  })
  
  mockPrismaClient.search.deleteMany.mockResolvedValue({ count: 0 })
  
  // API requests - use in-memory store
  mockPrismaClient.apiRequest.create.mockImplementation(async ({ data }) => {
    const entry = {
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
  
  mockPrismaClient.apiRequest.findMany.mockImplementation(async ({ where, take }) => {
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
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, take || 100)
  })
  
  mockPrismaClient.apiRequest.deleteMany.mockImplementation(async ({ where }) => {
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
      ? requests.reduce((sum, r) => sum + r.responseTime, 0) / requests.length
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
export function createMockUser(overrides = {}) {
  return {
    id: 'mock-user-id',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 Test Browser',
    lastSeenAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  }
}

/**
 * Create mock search history entry
 */
export function createMockSearch(overrides = {}) {
  return {
    id: 'mock-search-id',
    userId: 'mock-user-id',
    ticker: 'AAPL',
    source: 'direct',
    searchedAt: new Date(),
    ...overrides,
  }
}

/**
 * Create mock API request entry
 */
export function createMockApiRequest(overrides = {}) {
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
export function createMockPopularTicker(overrides = {}) {
  return {
    ticker: 'AAPL',
    companyName: 'Apple Inc.',
    searchCount: 100,
    lastSearched: new Date(),
    ...overrides,
  }
}
