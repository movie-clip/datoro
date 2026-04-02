import logger from '../services/logger.js'
/**
 * Database Configuration
 * 
 * Manages database connection pooling configuration for PM2 cluster mode.
 * This configuration is applied programmatically, so you don't need to manually
 * set complex connection strings in .env files on each deployment.
 * 
 * Usage in .env:
 *   DATABASE_URL="postgresql://user:pass@host:5432/db"
 *   (No need to add connection parameters manually!)
 */

/**
 * Connection pool configuration based on provider and cluster mode
 */
export const CONNECTION_POOL_CONFIG = {
  // Number of PM2 workers (from ecosystem.config.cjs)
  workers: 4,
  
  // Connection limits per worker for different providers
  providers: {
    'render-postgres': {
      maxConnections: 97,
      connectionsPerWorker: 20,  // (97 - 17 buffer) / 4 workers - increased buffer from 9 to 17
      buffer: 17
    },
    'local-postgres': {
      maxConnections: 100,
      connectionsPerWorker: 20,  // (100 - 20 buffer) / 4 workers - increased buffer from 8 to 20
      buffer: 20
    }
  },
  
  // Default provider (auto-detected or set via DATABASE_PROVIDER env var)
  defaultProvider: 'local-postgres',
  
  // Connection pool parameters (applied to all connections)
  poolParams: {
    connection_limit: null,      // Set dynamically based on provider
    pool_timeout: 10,            // Seconds to wait for available connection
    connect_timeout: 5,          // Seconds for initial connection
    statement_timeout: 10000,    // Milliseconds for query timeout (prevents hung connections)
    statement_cache: true,       // Cache prepared statements for performance
  },
  
  // Query timeout strategies (milliseconds)
  queryTimeouts: {
    standard: 5000,    // User operations, real-time data
    analytics: 10000,  // Popular tickers, search history
    batch: 30000       // Migrations, data processing
  }
}

type ProviderConfig = typeof CONNECTION_POOL_CONFIG.providers[keyof typeof CONNECTION_POOL_CONFIG.providers]

function getProviderConfig(providerKey: string): ProviderConfig | null {
  return CONNECTION_POOL_CONFIG.providers[providerKey as keyof typeof CONNECTION_POOL_CONFIG.providers] || null
}

/**
 * Detect database provider from connection URL
 */
export function detectProvider(databaseUrl: string | undefined): string {
  if (!databaseUrl) return CONNECTION_POOL_CONFIG.defaultProvider
  
  if (databaseUrl.includes('render.com') || /@dpg-[a-z0-9-]+(?::\d+)?\//i.test(databaseUrl)) {
    return 'render-postgres'
  }
  if (databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')) {
    return 'local-postgres'
  }
  
  return CONNECTION_POOL_CONFIG.defaultProvider
}

/**
 * Build optimized database URL with connection pooling parameters
 * 
 * @param {string} baseUrl - Base DATABASE_URL from .env
 * @param {string} [providerOverride] - Force specific provider config
 * @returns {string} - Optimized URL with connection parameters
 */
export function buildDatabaseUrl(baseUrl: string, providerOverride: string | null = null): string {
  if (!baseUrl) {
    throw new Error('DATABASE_URL is required')
  }
  
  // Detect provider
  const providerKey = providerOverride || process.env.DATABASE_PROVIDER || detectProvider(baseUrl)
  const provider = getProviderConfig(providerKey)
  
  if (!provider) {
    logger.warn(`[Database] Unknown provider: ${providerKey}, using defaults`)
    return baseUrl
  }
  
  // Parse URL to check if it already has parameters
  const url = new URL(baseUrl)
  
  // Get pooling configuration
  const config = { ...CONNECTION_POOL_CONFIG.poolParams } as {
    connection_limit?: number | null
    pool_timeout?: number
    connect_timeout?: number
    statement_timeout?: number
    statement_cache?: boolean
    sslmode?: string
  }
  config.connection_limit = provider.connectionsPerWorker

  // Render Postgres internal connections require TLS. Add sslmode if missing.
  if (providerKey === 'render-postgres' && !url.searchParams.has('sslmode')) {
    config.sslmode = 'require'
  }
  
  // Build parameter string
  const params: string[] = []
  
  // Connection pool parameters
  params.push(`connection_limit=${config.connection_limit}`)
  params.push(`pool_timeout=${config.pool_timeout}`)
  params.push(`connect_timeout=${config.connect_timeout}`)
  
  // Query timeout to prevent hung connections
  if (config.statement_timeout) {
    params.push(`statement_timeout=${config.statement_timeout}`)
  }
  
  // Performance optimizations
  if (config.statement_cache) {
    params.push('statement_cache_size=500')
  }

  if (config.sslmode) {
    params.push(`sslmode=${config.sslmode}`)
  }
  
  // Add to URL query string (preserve existing parameters)
  const existingParams = url.search.slice(1) // Remove '?'
  const allParams = existingParams 
    ? `${existingParams}&${params.join('&')}` 
    : params.join('&')
  
  url.search = `?${allParams}`
  
  const finalUrl = url.toString()
  
  // Log configuration (but not the password!)
  const safeUrl = finalUrl.replace(/:[^:@]+@/, ':****@')
  logger.info('[Database] Connection pool configured:')
  logger.info(`  Provider: ${providerKey}`)
  logger.info(`  Connections per worker: ${config.connection_limit}`)
  logger.info(`  Total connections: ${(config.connection_limit || 0) * CONNECTION_POOL_CONFIG.workers}`)
  logger.info(`  URL: ${safeUrl}`)
  
  return finalUrl
}

/**
 * Get connection pool configuration for current environment
 * 
 * @returns {Object} - Current pool configuration
 */
export function getPoolConfig() {
  const baseUrl = process.env.DATABASE_URL
  const providerKey = process.env.DATABASE_PROVIDER || detectProvider(baseUrl)
  const provider = getProviderConfig(providerKey) || getProviderConfig(CONNECTION_POOL_CONFIG.defaultProvider)

  if (!provider) {
    throw new Error('Default database provider configuration is missing')
  }
  
  return {
    provider: providerKey,
    workers: CONNECTION_POOL_CONFIG.workers,
    connectionsPerWorker: provider.connectionsPerWorker,
    totalConnections: provider.connectionsPerWorker * CONNECTION_POOL_CONFIG.workers,
    maxConnections: provider.maxConnections,
    buffer: provider.buffer,
    utilization: ((provider.connectionsPerWorker * CONNECTION_POOL_CONFIG.workers) / provider.maxConnections * 100).toFixed(1) + '%'
  }
}

/**
 * Validate database URL has required parameters
 */
export function validateDatabaseUrl(url: string): boolean {
  const requiredParams = ['connection_limit', 'pool_timeout', 'connect_timeout']
  const missingParams = []
  
  for (const param of requiredParams) {
    if (!url.includes(param)) {
      missingParams.push(param)
    }
  }
  
  if (missingParams.length > 0) {
    logger.warn('[Database] Missing connection pool parameters:', missingParams.join(', '))
    logger.warn('[Database] Run buildDatabaseUrl() to add optimal parameters')
    return false
  }
  
  return true
}
