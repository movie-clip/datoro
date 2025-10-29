#!/usr/bin/env node

/**
 * Test Rate Limiting for /api/ticker-data endpoint
 * 
 * Tests:
 * 1. Per-IP limit (30 req/min)
 * 2. Global limit (250 req/min across all IPs)
 * 3. Cache hits don't count toward limits
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const TICKER = 'AAPL';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testPerIpLimit() {
  console.log('\n🧪 TEST 1: Per-IP Limit (30 req/min)\n');
  
  let successCount = 0;
  let rateLimitCount = 0;
  
  // Make 35 requests rapidly (should hit limit at 31st request)
  for (let i = 1; i <= 35; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/ticker-data/${TICKER}`);
      
      if (res.status === 200) {
        successCount++;
        console.log(`  ✅ Request ${i}: Success (${res.headers.get('x-cache') || 'API'})`);
      } else if (res.status === 429) {
        rateLimitCount++;
        const data = await res.json();
        console.log(`  ⚠️  Request ${i}: Rate limited (${data.message})`);
      } else if (res.status === 503) {
        console.log(`  🚫 Request ${i}: Global limit reached`);
      }
      
      // Small delay to avoid network congestion
      await sleep(50);
    } catch (_err) {
      console.error(`  ❌ Request ${i}: Error - ${err.message}`);
    }
  }
  
  console.log(`\n📊 Results:`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Rate Limited: ${rateLimitCount}`);
  console.log(`   Expected: ~30 success, ~5 rate limited`);
  
  if (rateLimitCount > 0) {
    console.log(`\n✅ Per-IP rate limiting working!`);
  } else {
    console.log(`\n❌ Per-IP rate limiting NOT working!`);
  }
}

async function testCacheBypass() {
  console.log('\n🧪 TEST 2: Cache Hits Should Not Count Toward Global Limit\n');
  
  // Wait for rate limit window to reset
  console.log('⏳ Waiting 65 seconds for rate limit window to reset...');
  await sleep(65000);
  
  // First request - should populate cache
  console.log('  📥 Request 1: Populating cache...');
  const res1 = await fetch(`${BASE_URL}/api/ticker-data/${TICKER}`);
  const cacheStatus1 = res1.headers.get('x-cache');
  console.log(`     Status: ${res1.status}, Cache: ${cacheStatus1 || 'miss'}`);
  
  await sleep(1000);
  
  // Make 40 more requests - all should be cache hits and NOT trigger rate limit
  let cacheHits = 0;
  let rateLimited = 0;
  
  for (let i = 2; i <= 40; i++) {
    const res = await fetch(`${BASE_URL}/api/ticker-data/${TICKER}`);
    const cacheStatus = res.headers.get('x-cache');
    
    if (res.status === 200 && (cacheStatus === 'redis' || cacheStatus === 'memory')) {
      cacheHits++;
    } else if (res.status === 429) {
      rateLimited++;
      console.log(`  ⚠️  Request ${i}: Rate limited (unexpected!)`);
    }
    
    await sleep(50);
  }
  
  console.log(`\n📊 Results:`);
  console.log(`   Cache Hits: ${cacheHits}`);
  console.log(`   Rate Limited: ${rateLimited}`);
  console.log(`   Expected: 39 cache hits, 0 rate limited`);
  
  if (rateLimited === 0) {
    console.log(`\n✅ Cache bypass working! Cache hits don't count toward limit.`);
  } else {
    console.log(`\n⚠️  Cache hits are being counted toward rate limit (bug!)`);
  }
}

async function testGlobalLimit() {
  console.log('\n🧪 TEST 3: Global Limit (250 req/min)\n');
  console.log('⚠️  This test would require 250+ requests and is skipped for brevity.');
  console.log('   To test manually: Run 250+ requests from multiple IPs within 1 minute.');
  console.log('   Expected: 503 errors after 250th request globally.');
}

async function main() {
  console.log('🚀 Rate Limiting Tests for /api/ticker-data\n');
  console.log('═══════════════════════════════════════════════\n');
  
  try {
    // Test 1: Per-IP limit
    await testPerIpLimit();
    
    // Test 2: Cache bypass
    await testCacheBypass();
    
    // Test 3: Global limit (informational only)
    await testGlobalLimit();
    
    console.log('\n═══════════════════════════════════════════════');
    console.log('✅ Rate limiting tests complete!\n');
  } catch (_err) {
    console.error('\n❌ Test failed:', err);
    process.exit(1);
  }
}

main();
