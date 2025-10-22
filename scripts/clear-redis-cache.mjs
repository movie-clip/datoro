#!/usr/bin/env node
/**
 * Clear Redis Cache - Production Fix Script
 * 
 * Use this script when data structure changes require cache invalidation.
 * 
 * Usage:
 *   node scripts/clear-redis-cache.mjs
 * 
 * This will clear:
 *   - All ticker batch data (batch:*)
 *   - All memoization caches (client-side will auto-clear on reload)
 */


import Redis from 'ioredis'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
config({ path: join(__dirname, '..', '.env') })
config({ path: join(__dirname, '..', '.env.local'), override: true })

const REDIS_URL = process.env.REDIS_URL

async function clearRedisCache() {
  if (!REDIS_URL) {
    console.error('❌ Error: REDIS_URL not found in environment variables')
    console.log('Make sure .env or .env.local contains REDIS_URL')
    process.exit(1)
  }

  console.log('🔌 Connecting to Redis...')
  console.log(`   URL: ${REDIS_URL.replace(/:[^:]*@/, ':***@')}`) // Hide password
  
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    lazyConnect: true
  })

  client.on('error', (err) => {
    console.error('❌ Redis connection error:', err.message)
  })

  try {
    await client.connect()
    console.log('✅ Connected to Redis\n')

    // Get all keys matching batch data pattern
    console.log('🔍 Finding cached batch data keys...')
    const batchKeys = await client.keys('batch:*')
    console.log(`   Found ${batchKeys.length} batch data keys\n`)

    if (batchKeys.length === 0) {
      console.log('ℹ️  No cached data found (cache already empty)')
      await client.quit()
      return
    }

    // Show sample of keys to be deleted
    console.log('📋 Sample keys to be deleted:')
    batchKeys.slice(0, 5).forEach(key => console.log(`   - ${key}`))
    if (batchKeys.length > 5) {
      console.log(`   ... and ${batchKeys.length - 5} more\n`)
    } else {
      console.log('')
    }

    // Delete all batch keys
    console.log('🗑️  Deleting cached data...')
    if (batchKeys.length > 0) {
      await client.del(...batchKeys)
    }

    console.log(`✅ Successfully deleted ${batchKeys.length} cache entries\n`)

    // Verify deletion
    const remainingKeys = await client.keys('batch:*')
    if (remainingKeys.length === 0) {
      console.log('✅ Cache cleared successfully!')
      console.log('   All batch data has been removed from Redis')
    } else {
      console.warn(`⚠️  Warning: ${remainingKeys.length} keys still remain`)
    }

    await client.quit()
    console.log('\n✅ Done! Redis cache has been cleared.')
    console.log('   New data will be fetched from FMP API on next request.')
    
  } catch (error) {
    console.error('\n❌ Error clearing cache:', error.message)
    console.error('   Stack:', error.stack)
    process.exit(1)
  }
}

// Run the script
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  Clear Redis Cache - Production Fix')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

clearRedisCache()
