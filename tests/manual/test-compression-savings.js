// Test compression bandwidth savings
import fetch from 'node-fetch';

const API_URL = 'http://localhost:7071';

async function testCompressionSavings() {
  console.log('🧪 Testing Compression Bandwidth Savings\n');
  
  // Fetch WITH compression
  console.log('Fetching AAPL data WITH compression...');
  const compressedRes = await fetch(`${API_URL}/api/ticker-data/AAPL?mode=full`, {
    headers: { 'Accept-Encoding': 'gzip, deflate, br' }
  });
  
  const compressedBuffer = Buffer.from(await compressedRes.arrayBuffer());
  const compressedSize = compressedBuffer.length;
  const contentEncoding = compressedRes.headers.get('content-encoding');
  
  console.log(`✓ Content-Encoding: ${contentEncoding}`);
  console.log(`✓ Compressed size: ${(compressedSize / 1024).toFixed(2)} KB\n`);
  
  // Fetch WITHOUT compression
  console.log('Fetching AAPL data WITHOUT compression...');
  const uncompressedRes = await fetch(`${API_URL}/api/ticker-data/AAPL?mode=full`, {
    headers: { 
      'Accept-Encoding': 'identity', // Request no compression
      'x-no-compression': '1'
    }
  });
  
  const uncompressedData = await uncompressedRes.text();
  const uncompressedSize = Buffer.byteLength(uncompressedData, 'utf8');
  
  console.log(`✓ Uncompressed size: ${(uncompressedSize / 1024).toFixed(2)} KB\n`);
  
  // Calculate savings
  const savings = ((1 - compressedSize / uncompressedSize) * 100).toFixed(1);
  const savedKB = ((uncompressedSize - compressedSize) / 1024).toFixed(2);
  
  console.log('='.repeat(60));
  console.log(`📊 COMPRESSION RESULTS:`);
  console.log(`   Before:  ${(uncompressedSize / 1024).toFixed(2)} KB`);
  console.log(`   After:   ${(compressedSize / 1024).toFixed(2)} KB`);
  console.log(`   Saved:   ${savedKB} KB (${savings}% reduction)`);
  console.log('='.repeat(60));
  
  if (savings >= 70) {
    console.log('🎉 EXCELLENT: 70%+ bandwidth reduction achieved!');
  } else if (savings >= 50) {
    console.log('✅ GOOD: 50%+ bandwidth reduction achieved!');
  } else {
    console.log('⚠️  SUBOPTIMAL: Less than 50% reduction');
  }
}

testCompressionSavings().catch(console.error);
