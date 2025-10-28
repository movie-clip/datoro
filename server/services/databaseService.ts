import { PrismaClient, type User, type PopularTicker } from '@prisma/client';
import { buildDatabaseUrl, getPoolConfig } from '../config/database.config.js';

interface ApiRequestData {
  endpoint: string
  method: string
  statusCode: number
  responseTime: number
  cached: boolean
  errorCode?: string
  ipAddress?: string
  authenticatedUserId?: string
}

interface ErrorLogData {
  errorCode: string
  message: string
  stack?: string
  stackTrace?: string
  endpoint?: string
  ticker?: string
  ipAddress?: string
  userAgent?: string
  authenticatedUserId?: string
  severity?: string
  context?: any
}

/**
 * Database Service - User tracking, analytics, popular tickers
 * 
 * Features:
 * - Track user searches by IP
 * - Popular ticker rankings
 * - API request analytics
 * - Performance metrics
 * - Error tracking
 * 
 * Connection pooling configured automatically via database.config.js
 * No manual .env configuration needed!
 */

// Singleton Prisma client
let prisma: PrismaClient | null = null;

/**
 * Get or create Prisma client instance
 * 
 * ⚡ OPTIMIZED CONNECTION POOLING FOR PM2 CLUSTER MODE (4 workers)
 * 
 * Connection pooling parameters (set in DATABASE_URL):
 * - connection_limit: Max concurrent connections per worker
 *   • Render PostgreSQL (97 total): 22 per worker (88 + 9 buffer)
 *   • Local PostgreSQL (100 total): 23 per worker (92 + 8 buffer)
 * 
 * - pool_timeout: 10s (max wait for available connection)
 * - connect_timeout: 5s (initial connection timeout)
 * - statement_timeout: 10000ms (max query execution time)
 * 
 * Query Timeout Strategy:
 * - Standard queries: 5s (user operations, real-time data)
 * - Analytics queries: 10s (popular tickers, search history)
 * - Batch operations: 30s (migrations, data processing)
 * 
 * 📖 Full documentation: docs/DATABASE_OPTIMIZATION.md
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    // Build optimized DATABASE_URL with connection pooling parameters
    const baseUrl = process.env.DATABASE_URL
    
    // In test environment, DATABASE_URL might not be set (using mock)
    let optimizedUrl
    if (baseUrl) {
      optimizedUrl = buildDatabaseUrl(baseUrl)
    } else if (process.env.NODE_ENV === 'test') {
      // Use a dummy URL for tests (will be mocked anyway)
      optimizedUrl = 'postgresql://test:test@localhost:5432/test'
    } else {
      throw new Error('DATABASE_URL environment variable is required')
    }
    
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['error', 'warn'] 
        : ['error'],
      // Use optimized URL with connection pooling configured automatically
      datasources: {
        db: {
          url: optimizedUrl
        }
      }
    });

    // Monitor connection pool health
    if (process.env.NODE_ENV === 'development') {
      console.log('[Database] Prisma client initialized');
      console.log(`[Database] Worker PID: ${process.pid}`);
      
      const poolConfig = getPoolConfig() as any
      console.log('[Database] Connection pool:')
      console.log(`  - Provider: ${poolConfig.provider}`)
      console.log(`  - Per worker: ${poolConfig.connectionsPerWorker}`)
      console.log(`  - Total: ${poolConfig.totalConnections} (${poolConfig.utilization} utilization)`)
    }

    // Handle graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`[Database] ${signal} received. Disconnecting Prisma...`);
      try {
        await prisma!.$disconnect();
        console.log('[Database] Disconnected successfully');
      } catch (err) {
        console.error('[Database] Error during disconnect:', err);
      }
    };

    process.on('beforeExit', () => gracefulShutdown('beforeExit'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  }
  return prisma;
}

/**
 * Query timeout configuration helper
 * 
 * PostgreSQL statement_timeout is set globally in DATABASE_URL (default: 10s).
 * For operations that need different timeouts, use these wrappers.
 * 
 * Note: These require raw query execution. Most operations should use
 * the global timeout set in DATABASE_URL connection string.
 */
const QueryTimeout = {
  FAST: 5000,      // 5s - User operations, real-time data
  STANDARD: 10000, // 10s - Analytics, popular tickers (default in DATABASE_URL)
  SLOW: 30000      // 30s - Batch operations, migrations
};

/**
 * Execute query with custom timeout (for special cases only)
 * Most queries should use the default timeout from DATABASE_URL
 * 
 * TODO: Integrate this into high-risk queries (analytics endpoints, batch operations)
 * 
 * @param {Function} queryFn - Async function that executes the query
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<any>} Query result
 */
// eslint-disable-next-line no-unused-vars
async function _executeWithTimeout(queryFn: (db: PrismaClient) => Promise<any>, timeoutMs = QueryTimeout.STANDARD): Promise<any> {
  const db = getPrismaClient();
  
  try {
    // Set transaction-level timeout
    await db.$executeRaw`SET LOCAL statement_timeout = ${timeoutMs}`;
    return await queryFn(db);
  } catch (error: any) {
    if (error.message?.includes('statement timeout')) {
      console.error(`[Database] Query timeout after ${timeoutMs}ms:`, error.message);
      throw new Error(`Database query exceeded ${timeoutMs}ms timeout. Try optimizing the query or adding indexes.`);
    }
    throw error;
  }
}

// ============================================
// User Management
// ============================================

/**
 * Find or create user by IP address (for anonymous users)
 * 
 * NOTE: After authentication implementation, ipAddress is no longer unique.
 * This function creates/finds anonymous user records by IP.
 * For authenticated users, use the user ID from the JWT token instead.
 * 
 * RACE CONDITION FIX: Uses transaction to prevent duplicate user creation
 * from concurrent requests with the same IP address.
 * 
 * @param {string} ipAddress - User's IP address
 * @param {string} userAgent - Browser user agent
 * @returns {Promise<User>} User object
 */
export async function findOrCreateUser(ipAddress: string, userAgent: string | null = null): Promise<User> {
  const db = getPrismaClient();
  
  try {
    // Use transaction to prevent race condition
    const user = await db.$transaction(async (tx) => {
      // Try to find existing anonymous user with this IP (most recent)
      let existingUser = await tx.user.findFirst({
        where: { 
          ipAddress,
          email: null, // Only anonymous users (no auth)
          googleId: null
        },
        orderBy: { createdAt: 'desc' }
      });
      
      // If user exists, update user agent if changed
      if (existingUser) {
        if (userAgent && existingUser.userAgent !== userAgent) {
          existingUser = await tx.user.update({
            where: { id: existingUser.id },
            data: { 
              userAgent, 
              updatedAt: new Date() 
            }
          });
        }
        return existingUser;
      }
      
      // No user found - create new one
      // The transaction ensures only one user is created even with concurrent requests
      try {
        const newUser = await tx.user.create({
          data: { 
            ipAddress, 
            userAgent 
          }
        });
        return newUser;
      } catch (createError: any) {
        // If creation fails (duplicate), try finding again
        // This handles edge case where another transaction created the user
        const retryUser = await tx.user.findFirst({
          where: { 
            ipAddress,
            email: null,
            googleId: null
          },
          orderBy: { createdAt: 'desc' }
        });
        
        if (retryUser) {
          return retryUser;
        }
        
        // If still not found, rethrow the error
        throw createError;
      }
    });
    
    return user;
  } catch (error: any) {
    console.error('[Database] Error finding/creating user:', error.message);
    throw error;
  }
}

// ============================================
// Search Tracking
// ============================================

/**
 * Track a ticker search
 * 
 * @param {string} ipAddress - User's IP
 * @param {string} ticker - Stock ticker (e.g., 'AAPL')
 * @param {string} userAgent - Browser user agent
 * @param {string} source - Search source (direct, search, autocomplete)
 * @param {string} query - Original search query (optional)
 * @param {string} authenticatedUserId - Authenticated user ID from JWT (optional)
 * @returns {Promise<void>}
 */
export async function trackSearch(
  ipAddress: string,
  ticker: string,
  userAgent: string | null = null,
  source = 'direct',
  query: string | null = null,
  authenticatedUserId: string | null = null
): Promise<void> {
  const db = getPrismaClient();
  
  try {
    // Use authenticated user ID if available, otherwise find/create anonymous user
    let userId;
    if (authenticatedUserId) {
      userId = authenticatedUserId;
      console.log(`[Database] Tracking search for authenticated user: ${authenticatedUserId}`);
    } else {
      const user = await findOrCreateUser(ipAddress, userAgent);
      userId = user.id;
    }
    
    // Normalize ticker
    const normalizedTicker = ticker.toUpperCase().trim();
    
    // Record search
    await db.search.create({
      data: {
        userId,
        ticker: normalizedTicker,
        query,
        source
      }
    });
    
    // Update popular ticker count
    await db.popularTicker.upsert({
      where: { ticker: normalizedTicker },
      update: {
        searchCount: { increment: 1 },
        lastSearched: new Date()
      },
      create: {
        ticker: normalizedTicker,
        searchCount: 1
      }
    });
    
    console.log(`[Database] Tracked search: ${normalizedTicker} from ${authenticatedUserId ? 'authenticated user' : ipAddress}`);
  } catch (error: any) {
    console.error('[Database] Error tracking search:', error.message);
    // Don't throw - tracking failures shouldn't break app
  }
}

/**
 * Get user's recent searches
 * 
 * @param {string} ipAddress - User's IP
 * @param {number} limit - Number of results (default 10)
 * @returns {Promise<Array>} Recent searches
 */
export async function getUserSearchHistory(ipAddress: string, limit = 10): Promise<any[]> {
  const db = getPrismaClient();
  
  try {
    const user = await db.user.findFirst({
      where: { 
        ipAddress,
        email: null, // Anonymous users only
        googleId: null
      },
      orderBy: { createdAt: 'desc' },
      include: {
        searches: {
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            ticker: true,
            query: true,
            source: true,
            createdAt: true
          }
        }
      }
    });
    
    return user?.searches || [];
  } catch (error: any) {
    console.error('[Database] Error fetching search history:', error.message);
    return [];
  }
}

// ============================================
// Popular Tickers
// ============================================

/**
 * Get popular tickers by search count
 * 
 * @param {number} limit - Number of results (default 10)
 * @param {number} daysAgo - Consider searches from last N days (default 30)
 * @returns {Promise<Array>} Popular tickers with search counts
 */
export async function getPopularTickers(limit = 10, daysAgo = 30): Promise<any> {
  const db = getPrismaClient();
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
    
    return await db.popularTicker.findMany({
      where: {
        lastSearched: {
          gte: cutoffDate
        }
      },
      take: limit,
      orderBy: { searchCount: 'desc' },
      select: {
        ticker: true,
        companyName: true,
        searchCount: true,
        lastSearched: true
      }
    });
  } catch (error: any) {
    console.error('[Database] Error fetching popular tickers:', error.message);
    return [];
  }
}

/**
 * Update company name for a ticker (upsert: create if not exists)
 * 
 * @param {string} ticker - Stock ticker
 * @param {string} companyName - Company name
 * @returns {Promise<void>}
 */
export async function updateTickerCompanyName(ticker: string, companyName: string): Promise<void> {
  const db = getPrismaClient();
  
  try {
    await db.popularTicker.upsert({
      where: { ticker: ticker.toUpperCase() },
      update: { companyName },
      create: { 
        ticker: ticker.toUpperCase(),
        companyName,
        searchCount: 0 // Will be incremented by trackSearch
      }
    });
  } catch (error: any) {
    console.error('[Database] Error updating company name:', error.message);
  }
}

// ============================================
// API Request Tracking
// ============================================

/**
 * Track an API request
 * 
 * @param {Object} data - Request data
 * @param {string} data.endpoint - API endpoint path
 * @param {string} data.method - HTTP method (GET, POST, etc.)
 * @param {number} data.statusCode - Response status code
 * @param {number} data.responseTime - Response time in milliseconds
 * @param {boolean} data.cached - Whether response was cached
 * @param {string} data.errorCode - Error code if any
 * @param {string} data.ipAddress - User's IP (optional)
 * @param {string} data.authenticatedUserId - Authenticated user ID from JWT (optional)
 * @returns {Promise<void>}
 */
export async function trackApiRequest(data: ApiRequestData): Promise<void> {
  const db = getPrismaClient();
  
  try {
    // Use authenticated user ID if available, otherwise find anonymous user by IP
    let userId = null;
    if (data.authenticatedUserId) {
      userId = data.authenticatedUserId;
    } else if (data.ipAddress) {
      const user = await db.user.findFirst({
        where: { 
          ipAddress: data.ipAddress,
          email: null, // Anonymous users only
          googleId: null
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true }
      });
      userId = user?.id;
    }
    
    await db.apiRequest.create({
      data: {
        userId,
        endpoint: data.endpoint,
        method: data.method || 'GET',
        statusCode: data.statusCode,
        responseTime: data.responseTime,
        cached: data.cached || false,
        errorCode: data.errorCode || null
      }
    });
  } catch (error: any) {
    console.error('[Database] Error tracking API request:', error.message);
    // Don't throw - tracking failures shouldn't break app
  }
}

/**
 * Get API request statistics
 * 
 * @param {number} hours - Last N hours (default 24)
 * @returns {Promise<Object>} Statistics
 */
export async function getApiRequestStats(hours = 24): Promise<any> {
  const db = getPrismaClient();
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hours);
    
    const requests = await db.apiRequest.findMany({
      where: {
        createdAt: { gte: cutoffDate }
      },
      select: {
        statusCode: true,
        responseTime: true,
        cached: true,
        errorCode: true
      }
    });
    
    const total = requests.length;
    const successful = requests.filter(r => r.statusCode < 400).length;
    const cached = requests.filter(r => r.cached).length;
    const errors = requests.filter(r => r.statusCode >= 400).length;
    
    const responseTimes = requests.map(r => r.responseTime);
    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;
    
    return {
      total,
      successful,
      successRate: total > 0 ? ((successful / total) * 100).toFixed(2) + '%' : '0%',
      cached,
      cacheHitRate: total > 0 ? ((cached / total) * 100).toFixed(2) + '%' : '0%',
      errors,
      errorRate: total > 0 ? ((errors / total) * 100).toFixed(2) + '%' : '0%',
      avgResponseTime: avgResponseTime + 'ms'
    };
  } catch (error: any) {
    console.error('[Database] Error fetching API stats:', error.message);
    return null;
  }
}

// ============================================
// Daily Analytics
// ============================================

/**
 * Update daily analytics (run via cron job)
 * Aggregates data from the last 24 hours
 * 
 * @param {Date} date - Date to aggregate (default today)
 * @returns {Promise<void>}
 */
export async function updateDailyAnalytics(date: Date = new Date()): Promise<void> {
  const db = getPrismaClient();
  
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get requests for the day
    const requests = await db.apiRequest.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      select: {
        userId: true,
        statusCode: true,
        responseTime: true,
        cached: true,
        endpoint: true
      }
    });
    
    // Calculate metrics
    const totalRequests = requests.length;
    const uniqueUsers = new Set(requests.map(r => r.userId).filter(Boolean)).size;
    const cached = requests.filter(r => r.cached).length;
    const cacheHitRate = totalRequests > 0 ? (cached / totalRequests) : 0;
    const errors = requests.filter(r => r.statusCode >= 400).length;
    const errorRate = totalRequests > 0 ? (errors / totalRequests) : 0;
    const avgResponseTime = totalRequests > 0
      ? Math.round(requests.reduce((sum, r) => sum + r.responseTime, 0) / totalRequests)
      : 0;
    
    // Find top endpoint
    const endpointCounts: Record<string, number> = {};
    requests.forEach(r => {
      endpointCounts[r.endpoint] = (endpointCounts[r.endpoint] || 0) + 1;
    });
    const topEndpoint = (Object.entries(endpointCounts)
      .sort((a: any, b: any) => b[1] - a[1])[0]?.[0] as string) || null;
    
    // Find top ticker
    const searches = await db.search.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      select: { ticker: true }
    });
    
    const tickerCounts: Record<string, number> = {};
    searches.forEach(s => {
      tickerCounts[s.ticker] = (tickerCounts[s.ticker] || 0) + 1;
    });
    const topTicker = (Object.entries(tickerCounts)
      .sort((a: any, b: any) => b[1] - a[1])[0]?.[0] as string) || null;
    
    // Upsert daily analytics
    await db.dailyAnalytics.upsert({
      where: { date: startOfDay },
      update: {
        totalRequests,
        uniqueUsers,
        cacheHitRate,
        avgResponseTime,
        errorRate,
        topTicker,
        topEndpoint,
        updatedAt: new Date()
      },
      create: {
        date: startOfDay,
        totalRequests,
        uniqueUsers,
        cacheHitRate,
        avgResponseTime,
        errorRate,
        topTicker,
        topEndpoint
      }
    });
    
    console.log(`[Database] Updated daily analytics for ${startOfDay.toDateString()}`);
  } catch (error: any) {
    console.error('[Database] Error updating daily analytics:', error.message);
  }
}

/**
 * Get daily analytics for a date range
 * 
 * @param {number} days - Number of days (default 30)
 * @returns {Promise<Array>} Daily analytics
 */
export async function getDailyAnalytics(days = 30): Promise<any[]> {
  const db = getPrismaClient();
  
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    
    return await db.dailyAnalytics.findMany({
      where: {
        date: { gte: startDate }
      },
      orderBy: { date: 'desc' }
    });
  } catch (error: any) {
    console.error('[Database] Error fetching daily analytics:', error.message);
    return [];
  }
}

// ============================================
// Error Logging
// ============================================

/**
 * Log an error to database
 * 
 * @param {Object} data - Error data
 * @param {string} data.errorCode - Error code (E001, E002, etc.)
 * @param {string} data.message - Error message
 * @param {string} data.endpoint - API endpoint (optional)
 * @param {string} data.ticker - Stock ticker (optional)
 * @param {string} data.stackTrace - Stack trace (optional)
 * @param {string} data.ipAddress - User's IP (optional)
 * @returns {Promise<void>}
 */
export async function logError(data: ErrorLogData): Promise<void> {
  const db = getPrismaClient();
  
  try {
    // Check if similar error exists (same code + endpoint + ticker)
    const existing = await db.errorLog.findFirst({
      where: {
        errorCode: data.errorCode,
        endpoint: data.endpoint || null,
        ticker: data.ticker || null,
        resolved: false
      }
    });
    
    if (existing) {
      // Update existing error (increment count, update lastSeen)
      await db.errorLog.update({
        where: { id: existing.id },
        data: {
          count: { increment: 1 },
          lastSeen: new Date(),
          message: data.message, // Update with latest message
          stackTrace: data.stackTrace || existing.stackTrace
        }
      });
    } else {
      // Create new error log
      await db.errorLog.create({
        data: {
          errorCode: data.errorCode,
          message: data.message,
          endpoint: data.endpoint || null,
          ticker: data.ticker || null,
          stackTrace: data.stackTrace || null,
          ipAddress: data.ipAddress || null,
          count: 1
        }
      });
    }
  } catch (error: any) {
    console.error('[Database] Error logging error:', error.message);
    // Don't throw - error logging failures shouldn't break app
  }
}

/**
 * Get recent errors
 * 
 * @param {number} limit - Number of errors (default 20)
 * @param {boolean} unresolvedOnly - Only unresolved errors (default true)
 * @returns {Promise<Array>} Recent errors
 */
export async function getRecentErrors(limit = 20, unresolvedOnly = true): Promise<any[]> {
  const db = getPrismaClient();
  
  try {
    return await db.errorLog.findMany({
      where: unresolvedOnly ? { resolved: false } : undefined,
      take: limit,
      orderBy: { lastSeen: 'desc' },
      select: {
        errorCode: true,
        message: true,
        endpoint: true,
        ticker: true,
        count: true,
        firstSeen: true,
        lastSeen: true
      }
    });
  } catch (error: any) {
    console.error('[Database] Error fetching recent errors:', error.message);
    return [];
  }
}

/**
 * Mark error as resolved
 * 
 * @param {string} errorCode - Error code
 * @param {string} endpoint - Endpoint (optional)
 * @param {string} ticker - Ticker (optional)
 * @returns {Promise<void>}
 */
export async function resolveError(errorCode: string, endpoint: string | null = null, ticker: string | null = null): Promise<void> {
  const db = getPrismaClient();
  
  try {
    await db.errorLog.updateMany({
      where: {
        errorCode,
        endpoint,
        ticker,
        resolved: false
      },
      data: {
        resolved: true,
        resolvedAt: new Date()
      }
    });
    
    console.log(`[Database] Resolved error: ${errorCode}`);
  } catch (error: any) {
    console.error('[Database] Error tracking search:', error.message);
  }
}

// ============================================
// Health Check
// ============================================

/**
 * Check database connection health
 * 
 * @returns {Promise<boolean>} True if connected
 */
export async function checkDatabaseHealth(): Promise<any> {
  const db = getPrismaClient();
  
  try {
    const start = Date.now()
    await db.$queryRaw`SELECT 1`;
    const latency = Date.now() - start
    return { status: 'healthy', latency };
  } catch (error: any) {
    console.error('[Database] Health check failed:', error.message);
    return { status: 'unhealthy', latency: 0, error: error.message };
  }
}

// Alias for health check endpoint
export const testDatabaseConnection = checkDatabaseHealth;

// ============================================
// Cleanup & Maintenance
// ============================================

/**
 * Clean up old data (run via cron job)
 * 
 * @param {number} daysToKeep - Keep data for N days (default 90)
 * @returns {Promise<void>}
 */
export async function cleanupOldData(daysToKeep = 90): Promise<any> {
  const db = getPrismaClient();
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    // Delete old API requests
    const deletedRequests = await db.apiRequest.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });
    
    // Delete old searches (keep popular ticker aggregates)
    const deletedSearches = await db.search.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });
    
    // Delete resolved errors older than 30 days
    const errorCutoff = new Date();
    errorCutoff.setDate(errorCutoff.getDate() - 30);
    const deletedErrors = await db.errorLog.deleteMany({
      where: {
        resolved: true,
        resolvedAt: { lt: errorCutoff }
      }
    });
    
    console.log(`[Database] Cleanup completed:
      - Deleted ${deletedRequests.count} old API requests
      - Deleted ${deletedSearches.count} old searches
      - Deleted ${deletedErrors.count} resolved errors`);
    
    return {
      searchHistory: deletedSearches.count,
      apiRequests: deletedRequests.count,
      errors: deletedErrors.count
    };
  } catch (error: any) {
    console.error('[Database] Error during cleanup:', error.message);
    return { searchHistory: 0, apiRequests: 0, errors: 0 };
  }
}

// Export Prisma client for advanced queries
export { prisma as db };
