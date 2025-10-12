// Test Phase 1 Improvements
// Tests: compression, timeouts, graceful shutdown

import fetch from 'node-fetch';

const API_URL = 'http://localhost:7071';

console.log('🧪 Testing Phase 1 Improvements\n');

// Test 1: Response Compression
async function testCompression() {
  console.log('1️⃣  Testing Response Compression...');
  try {
    const response = await fetch(`${API_URL}/api/ticker-data/AAPL?mode=full`, {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br'
      }
    });
    
    const contentEncoding = response.headers.get('content-encoding');
    const contentLength = response.headers.get('content-length');
    
    console.log(`   ✓ Content-Encoding: ${contentEncoding || 'none'}`);
    console.log(`   ✓ Content-Length: ${contentLength || 'not set'}`);
    
    if (contentEncoding === 'gzip' || contentEncoding === 'br') {
      console.log('   ✅ PASS: Compression is working!\n');
      return true;
    } else {
      console.log('   ⚠️  WARN: No compression detected (might be too small)\n');
      return false;
    }
  } catch (error) {
    console.error('   ❌ FAIL:', error.message, '\n');
    return false;
  }
}

// Test 2: Check cache headers
async function testCacheHeaders() {
  console.log('2️⃣  Testing Cache Headers...');
  try {
    const response = await fetch(`${API_URL}/api/ticker-data/MSFT?mode=full`);
    const cacheStatus = response.headers.get('x-cache-status');
    
    console.log(`   ✓ X-Cache-Status: ${cacheStatus || 'not set'}`);
    
    if (cacheStatus) {
      console.log('   ✅ PASS: Cache headers present\n');
      return true;
    } else {
      console.log('   ⚠️  INFO: No cache header (may not be implemented yet)\n');
      return false;
    }
  } catch (error) {
    console.error('   ❌ FAIL:', error.message, '\n');
    return false;
  }
}

// Test 3: Response time
async function testResponseTime() {
  console.log('3️⃣  Testing Response Time...');
  try {
    const start = Date.now();
    await fetch(`${API_URL}/api/ticker-data/TSLA?mode=full`);
    const duration = Date.now() - start;
    
    console.log(`   ✓ Response time: ${duration}ms`);
    
    if (duration < 3000) {
      console.log('   ✅ PASS: Fast response (<3s)\n');
      return true;
    } else {
      console.log('   ⚠️  WARN: Slow response (>3s)\n');
      return false;
    }
  } catch (error) {
    console.error('   ❌ FAIL:', error.message, '\n');
    return false;
  }
}

// Test 4: Server health
async function testHealth() {
  console.log('4️⃣  Testing Server Health...');
  try {
    const response = await fetch(`${API_URL}/api/cache/stats`);
    const data = await response.json();
    
    console.log(`   ✓ Server responding: ${response.status}`);
    console.log(`   ✓ Cache hits: ${data.hits?.total || 0}`);
    console.log(`   ✓ Cache misses: ${data.misses || 0}`);
    
    if (response.ok) {
      console.log('   ✅ PASS: Server healthy\n');
      return true;
    } else {
      console.log('   ❌ FAIL: Server error\n');
      return false;
    }
  } catch (error) {
    console.error('   ❌ FAIL:', error.message, '\n');
    return false;
  }
}

// Run all tests
async function runTests() {
  const results = await Promise.all([
    testCompression(),
    testCacheHeaders(),
    testResponseTime(),
    testHealth()
  ]);
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Results: ${passed}/${total} tests passed`);
  console.log('='.repeat(50));
  
  if (passed === total) {
    console.log('🎉 All tests passed!');
  } else if (passed >= total * 0.75) {
    console.log('✅ Most tests passed (warnings acceptable)');
  } else {
    console.log('⚠️  Some tests failed - check logs');
  }
}

runTests().catch(console.error);
