// Proper compression test - measure actual wire transfer
import http from 'http';

const API_URL = 'localhost';
const PORT = 7071;
const PATH = '/api/ticker-data/AAPL?mode=full';

function testCompression() {
  console.log('🧪 Testing Actual Wire Transfer Compression\n');
  
  // Test 1: WITH compression
  return new Promise((resolve) => {
    console.log('1️⃣  Fetching WITH compression (Accept-Encoding: br, gzip)...');
    
    const options = {
      hostname: API_URL,
      port: PORT,
      path: PATH,
      method: 'GET',
      headers: {
        'Accept-Encoding': 'br, gzip, deflate'
      }
    };
    
    let compressedSize = 0;
    const req = http.request(options, (res) => {
      res.on('data', (chunk) => {
        compressedSize += chunk.length;
      });
      
      res.on('end', () => {
        const encoding = res.headers['content-encoding'];
        console.log(`   ✓ Content-Encoding: ${encoding || 'none'}`);
        console.log(`   ✓ Wire transfer size: ${(compressedSize / 1024).toFixed(2)} KB\n`);
        
        // Test 2: WITHOUT compression
        console.log('2️⃣  Fetching WITHOUT compression (Accept-Encoding: identity)...');
        
        const options2 = {
          hostname: API_URL,
          port: PORT,
          path: PATH,
          method: 'GET',
          headers: {
            'Accept-Encoding': 'identity',
            'x-no-compression': '1'
          }
        };
        
        let uncompressedSize = 0;
        const req2 = http.request(options2, (res2) => {
          res2.on('data', (chunk) => {
            uncompressedSize += chunk.length;
          });
          
          res2.on('end', () => {
            console.log(`   ✓ Content-Encoding: ${res2.headers['content-encoding'] || 'none'}`);
            console.log(`   ✓ Wire transfer size: ${(uncompressedSize / 1024).toFixed(2)} KB\n`);
            
            // Calculate results
            const savedBytes = uncompressedSize - compressedSize;
            const savedKB = savedBytes / 1024;
            const savedPercent = ((savedBytes / uncompressedSize) * 100).toFixed(1);
            
            console.log('='.repeat(65));
            console.log('📊 COMPRESSION BANDWIDTH SAVINGS:');
            console.log(`   Without compression: ${(uncompressedSize / 1024).toFixed(2)} KB`);
            console.log(`   With compression:    ${(compressedSize / 1024).toFixed(2)} KB`);
            console.log(`   Bandwidth saved:     ${savedKB.toFixed(2)} KB (${savedPercent}%)`);
            console.log('='.repeat(65));
            
            if (savedPercent >= 70) {
              console.log('🎉 EXCELLENT! 70%+ bandwidth reduction achieved!');
            } else if (savedPercent >= 50) {
              console.log('✅ GOOD! 50%+ bandwidth reduction achieved!');
            } else if (savedPercent >= 30) {
              console.log('👍 DECENT! 30%+ bandwidth reduction achieved!');
            } else {
              console.log('⚠️  Low compression - check if data is already compressed');
            }
            
            resolve();
          });
        });
        
        req2.end();
      });
    });
    
    req.end();
  });
}

testCompression().catch(console.error);
