/**
 * Clear specific Redis cache keys
 * Usage: node scripts/clear-cache-key.mjs AAPL
 */

import Redis from 'ioredis'

const ticker = process.argv[2]?.toUpperCase()

if (!ticker) {
  console.error('❌ Usage: node scripts/clear-cache-key.mjs <TICKER>')
  console.error('   Example: node scripts/clear-cache-key.mjs AAPL')
  process.exit(1)
}

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

console.log(`🔍 Connecting to Redis: ${redisUrl}`)

const client = new Redis(redisUrl)

client.on('error', (err) => {
  console.error('❌ Redis Client Error:', err)
  process.exit(1)
})

try {
  console.log('✅ Connected to Redis')

  // Generate the same cache key pattern as server.mjs line 751
  // cache.generateKey('batch', ticker, mode)
  // From cacheService.js line 104: `${prefix}:${sanitized.join(':')}`
  // Pattern: batch:TICKER:MODE (e.g., batch:AAPL:FULL, batch:AAPL:PRIORITY)
  
  const patterns = [
    `batch:${ticker}:*`,  // Matches batch:AAPL:FULL, batch:AAPL:PRIORITY
  ]

  let deletedCount = 0

  for (const pattern of patterns) {
    console.log(`\n🔎 Scanning for pattern: ${pattern}`)
    
    // Scan for keys matching pattern (ioredis API)
    const keys = []
    let cursor = '0'
    do {
      const [newCursor, foundKeys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
      cursor = newCursor
      keys.push(...foundKeys)
    } while (cursor !== '0')

    if (keys.length > 0) {
      console.log(`📦 Found ${keys.length} keys:`)
      keys.forEach(key => console.log(`   - ${key}`))
      
      // Delete all found keys
      for (const key of keys) {
        await client.del(key)
        deletedCount++
        console.log(`   ✅ Deleted: ${key}`)
      }
    } else {
      console.log(`   ℹ️  No keys found`)
    }
  }

  console.log(`\n✅ Total keys deleted: ${deletedCount}`)
  
  if (deletedCount === 0) {
    console.log('\n⚠️  No cache keys found - cache may already be clear or using different pattern')
    console.log('    Server will fetch fresh data on next request')
  } else {
    console.log(`\n🎉 Cache cleared for ${ticker}! Next request will fetch fresh data from FMP.`)
  }

} catch (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
} finally {
  await client.quit()
  console.log('\n👋 Disconnected from Redis')
}
