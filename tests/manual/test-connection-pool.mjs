#!/usr/bin/env node
/**
 * Connection Pool Load Test
 * 
 * Tests database connection pool under concurrent load
 * to verify optimization is working correctly.
 * 
 * Usage: node tests/manual/test-connection-pool.mjs
 */

import { getPrismaClient } from '../../server/services/databaseService.js'

const prisma = getPrismaClient()

/**
 * Test connection pool with concurrent queries
 */
async function testConnectionPool(concurrency = 50) {
  console.log('🧪 Testing Connection Pool')
  console.log('━'.repeat(60))
  console.log(`Worker PID: ${process.pid}`)
  console.log(`Concurrency: ${concurrency} simultaneous queries`)
  console.log('━'.repeat(60))
  
  const startTime = Date.now()
  
  // Simulate concurrent database queries
  const promises = Array.from({ length: concurrency }, async (_, i) => {
    const queryStart = Date.now()
    try {
      // Lightweight query to test connection pool
      await prisma.user.findMany({ take: 1 })
      return { 
        id: i,
        success: true, 
        duration: Date.now() - queryStart 
      }
    } catch (err) {
      return { 
        id: i,
        success: false, 
        error: err.message, 
        duration: Date.now() - queryStart 
      }
    }
  })
  
  console.log(`\n⏳ Running ${concurrency} concurrent queries...\n`)
  
  const results = await Promise.all(promises)
  const totalTime = Date.now() - startTime
  
  // Analyze results
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  const durations = successful.map(r => r.duration)
  
  const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length
  const minDuration = Math.min(...durations)
  const maxDuration = Math.max(...durations)
  const medianDuration = durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)]
  
  // Print results
  console.log('📊 Results')
  console.log('━'.repeat(60))
  console.log(`✅ Successful: ${successful.length}/${concurrency}`)
  console.log(`❌ Failed: ${failed.length}/${concurrency}`)
  console.log(`⏱️  Total Time: ${totalTime}ms`)
  console.log(`📈 Throughput: ${(concurrency / (totalTime / 1000)).toFixed(2)} queries/sec`)
  console.log('━'.repeat(60))
  
  if (successful.length > 0) {
    console.log('\n⏱️  Query Duration Stats')
    console.log('━'.repeat(60))
    console.log(`Average: ${avgDuration.toFixed(2)}ms`)
    console.log(`Median:  ${medianDuration.toFixed(2)}ms`)
    console.log(`Min:     ${minDuration}ms`)
    console.log(`Max:     ${maxDuration}ms`)
    console.log('━'.repeat(60))
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Errors')
    console.log('━'.repeat(60))
    failed.forEach(r => {
      console.log(`Query ${r.id}: ${r.error}`)
    })
    console.log('━'.repeat(60))
  }
  
  // Performance assessment
  console.log('\n🎯 Assessment')
  console.log('━'.repeat(60))
  
  const successRate = (successful.length / concurrency) * 100
  if (successRate === 100) {
    console.log('✅ EXCELLENT: All queries succeeded')
  } else if (successRate >= 95) {
    console.log('✅ GOOD: >95% success rate')
  } else if (successRate >= 90) {
    console.log('⚠️  WARNING: Success rate below 95%')
  } else {
    console.log('❌ CRITICAL: Success rate below 90% - check connection pool config')
  }
  
  if (avgDuration < 50) {
    console.log('✅ EXCELLENT: Average query time <50ms')
  } else if (avgDuration < 100) {
    console.log('✅ GOOD: Average query time <100ms')
  } else if (avgDuration < 200) {
    console.log('⚠️  WARNING: Average query time >100ms')
  } else {
    console.log('❌ CRITICAL: Average query time >200ms - check database performance')
  }
  
  console.log('━'.repeat(60))
  
  // Connection pool health
  console.log('\n🔍 Connection Pool Health')
  console.log('━'.repeat(60))
  
  try {
    const poolStats = await prisma.$queryRaw`
      SELECT 
        count(*) FILTER (WHERE state = 'active') as active,
        count(*) FILTER (WHERE state = 'idle') as idle,
        count(*) as total
      FROM pg_stat_activity
      WHERE datname = current_database()
    `
    
    const stats = poolStats[0]
    console.log(`Active connections: ${stats.active}`)
    console.log(`Idle connections:   ${stats.idle}`)
    console.log(`Total connections:  ${stats.total}`)
    
    if (Number(stats.total) > 50) {
      console.log('⚠️  WARNING: High connection count (>50)')
      console.log('   Consider reducing connection_limit per worker')
    } else {
      console.log('✅ Connection count is healthy')
    }
    
  } catch (err) {
    console.log('⚠️  Could not fetch pool stats:', err.message)
  }
  
  console.log('━'.repeat(60))
  
  await prisma.$disconnect()
  
  // Exit with appropriate code
  process.exit(failed.length > 0 ? 1 : 0)
}

// Run test with optional concurrency argument
const concurrency = parseInt(process.argv[2]) || 50
testConnectionPool(concurrency).catch(err => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
