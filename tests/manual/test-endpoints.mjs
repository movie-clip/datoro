// Test FMP endpoints to debug PE and Altman Z-Score issues
import fetch from 'node-fetch';

const ticker = 'AAPL';
const BASE_URL = 'http://localhost:7071/api/fmp/api/v3';
const BASE_URL_V4 = 'http://localhost:7071/api/fmp/api/v4';

async function testEndpoint(name, url) {
  console.log(`\n📡 Testing: ${name}`);
  console.log(`URL: ${url}`);
  try {
    const res = await fetch(url);
    console.log(`Status: ${res.status} ${res.statusText}`);
    if (res.ok) {
      const data = await res.json();
      console.log(`✅ Success! Data length: ${Array.isArray(data) ? data.length : 'object'}`);
      if (Array.isArray(_data) && data.length > 0) {
        console.log('Sample:', JSON.stringify(data[0], null, 2).substring(0, 200) + '...');
      } else {
        console.log('Sample:', JSON.stringify(data, null, 2).substring(0, 200) + '...');
      }
    } else {
      const text = await res.text();
      console.log(`❌ Error response: ${text.substring(0, 200)}`);
    }
  } catch (_error) {
    console.log(`❌ Failed: ${error.message}`);
  }
}

console.log('🧪 Testing FMP Endpoints for PE and Altman Z-Score\n');
console.log('=' .repeat(60));

await testEndpoint('Profile', `${BASE_URL}/profile/${ticker}`);
await testEndpoint('Ratios (PE source)', `${BASE_URL}/ratios/${ticker}?period=annual&limit=1`);
await testEndpoint('Quote', `${BASE_URL}/quote/${ticker}`);
await testEndpoint('Analyst Estimates', `${BASE_URL}/analyst-estimates/${ticker}`);
await testEndpoint('Key Metrics', `${BASE_URL_V4}/key-metrics/${ticker}?period=annual&limit=1`);
await testEndpoint('Altman Z-Score', `${BASE_URL_V4}/score/${ticker}`);
await testEndpoint('Balance Sheet', `${BASE_URL}/balance-sheet-statement/${ticker}?period=annual&limit=1`);

console.log('\n' + '='.repeat(60));
console.log('✅ Test complete!\n');
