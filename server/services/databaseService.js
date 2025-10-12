import { PrismaClient } from '@prisma/client';

/**
 * Database Service - User tracking, analytics, popular tickers
 * 
 * Features:
 * - Track user searches by IP
 * - Popular ticker rankings
 * - API request analytics
 * - Performance metrics
 * - Error tracking
 */

// Singleton Prisma client
let prisma;

/**
 * Get or create Prisma client instance
 * 
 * Connection pooling configured for optimal performance:
 * - connection_limit: Max concurrent connections
 * - pool_timeout: Max time to wait for connection (seconds)
 * - connect_timeout: Initial connection timeout (seconds)
 * 
 * Recommended for Supabase:
 * - Free tier: connection_limit=5
 * - Paid tier: connection_limit=10-20 depending on plan
 */
export function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
      // Connection pool configuration
      // Set these in DATABASE_URL: ?connection_limit=10&pool_timeout=10&connect_timeout=5
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });

    // Handle graceful shutdown
    process.on('beforeExit', async () => {
      await prisma.$disconnect();
    });
  }
  return prisma;
}

// ============================================
// User Management
// ============================================

/**
 * Find or create user by IP address
 * 
 * @param {string} ipAddress - User's IP address
 * @param {string} userAgent - Browser user agent
 * @returns {Promise<User>} User object
 */
export async function findOrCreateUser(ipAddress, userAgent = null) {
  const db = getPrismaClient();
  
  try {
    return await db.user.upsert({
      where: { ipAddress },
      update: { 
        userAgent, 
        updatedAt: new Date() 
      },
      create: { 
        ipAddress, 
        userAgent 
      }
    });
  } catch (error) {
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
 * @returns {Promise<void>}
 */
export async function trackSearch(ipAddress, ticker, userAgent = null, source = 'direct', query = null) {
  const db = getPrismaClient();
  
  try {
    // Find or create user
    const user = await findOrCreateUser(ipAddress, userAgent);
    
    // Normalize ticker
    const normalizedTicker = ticker.toUpperCase().trim();
    
    // Record search
    await db.search.create({
      data: {
        userId: user.id,
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
    
    console.log(`[Database] Tracked search: ${normalizedTicker} from ${ipAddress}`);
  } catch (error) {
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
export async function getUserSearchHistory(ipAddress, limit = 10) {
  const db = getPrismaClient();
  
  try {
    const user = await db.user.findUnique({
      where: { ipAddress },
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
  } catch (error) {
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
export async function getPopularTickers(limit = 10, daysAgo = 30) {
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
  } catch (error) {
    console.error('[Database] Error fetching popular tickers:', error.message);
    return [];
  }
}

/**
 * Update company name for a ticker
 * 
 * @param {string} ticker - Stock ticker
 * @param {string} companyName - Company name
 * @returns {Promise<void>}
 */
export async function updateTickerCompanyName(ticker, companyName) {
  const db = getPrismaClient();
  
  try {
    await db.popularTicker.update({
      where: { ticker: ticker.toUpperCase() },
      data: { companyName }
    });
  } catch (error) {
    // Ignore if ticker doesn't exist yet
    if (!error.code || error.code !== 'P2025') {
      console.error('[Database] Error updating company name:', error.message);
    }
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
 * @returns {Promise<void>}
 */
export async function trackApiRequest(data) {
  const db = getPrismaClient();
  
  try {
    // Find user if IP provided
    let userId = null;
    if (data.ipAddress) {
      const user = await db.user.findUnique({
        where: { ipAddress: data.ipAddress },
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
  } catch (error) {
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
export async function getApiRequestStats(hours = 24) {
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
  } catch (error) {
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
export async function updateDailyAnalytics(date = new Date()) {
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
    const endpointCounts = {};
    requests.forEach(r => {
      endpointCounts[r.endpoint] = (endpointCounts[r.endpoint] || 0) + 1;
    });
    const topEndpoint = Object.entries(endpointCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    
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
    
    const tickerCounts = {};
    searches.forEach(s => {
      tickerCounts[s.ticker] = (tickerCounts[s.ticker] || 0) + 1;
    });
    const topTicker = Object.entries(tickerCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    
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
  } catch (error) {
    console.error('[Database] Error updating daily analytics:', error.message);
  }
}

/**
 * Get daily analytics for a date range
 * 
 * @param {number} days - Number of days (default 30)
 * @returns {Promise<Array>} Daily analytics
 */
export async function getDailyAnalytics(days = 30) {
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
  } catch (error) {
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
export async function logError(data) {
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
  } catch (error) {
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
export async function getRecentErrors(limit = 20, unresolvedOnly = true) {
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
  } catch (error) {
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
export async function resolveError(errorCode, endpoint = null, ticker = null) {
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
  } catch (error) {
    console.error('[Database] Error resolving error:', error.message);
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
export async function checkDatabaseHealth() {
  const db = getPrismaClient();
  
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('[Database] Health check failed:', error.message);
    return false;
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
export async function cleanupOldData(daysToKeep = 90) {
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
  } catch (error) {
    console.error('[Database] Error during cleanup:', error.message);
  }
}

// Export Prisma client for advanced queries
export { prisma as db };
