// Test NVO ticker to see what's failing
import fetch from 'node-fetch';

const ticker = 'NVO';
const BASE = 'http://localhost:7071/api/fmp';

console.log(`🧪 Testing ticker: ${ticker}\n`);
console.log('=' .repeat(60));

const endpoints = [
  { name: 'Profile', url: `${BASE}/api/v3/profile/${ticker}` },
  { name: 'Quote', url: `${BASE}/api/v3/quote/${ticker}` },
  { name: 'Income Statement', url: `${BASE}/api/v3/income-statement/${ticker}?period=annual&limit=1` },
  { name: 'Balance Sheet', url: `${BASE}/api/v3/balance-sheet-statement/${ticker}?period=annual&limit=1` },
  { name: 'Cash Flow', url: `${BASE}/api/v3/cash-flow-statement/${ticker}?period=quarter&limit=4` },
  { name: 'Ratios', url: `${BASE}/api/v3/ratios/${ticker}?period=annual&limit=1` },
  { name: 'Key Metrics', url: `${BASE}/api/v4/key-metrics/${ticker}?period=annual&limit=1` },
  { name: 'Financial Scores', url: `${BASE}/stable/financial-scores?symbol=${ticker}` },
  { name: 'Historical Price', url: `${BASE}/api/v3/historical-price-full/${ticker}?timeseries=30` }
];

for (const endpoint of endpoints) {
  console.log(`\n📡 ${endpoint.name}`);
  try {
    const res = await fetch(endpoint.url);
    console.log(`   Status: ${res.status} ${res.statusText}`);
    
    const text = await res.text();
    if (!text || text.trim() === '') {
      console.log(`   ❌ Empty response`);
      continue;
    }
    
    try {
      const data = JSON.parse(text);
      const hasData = Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0;
      console.log(`   ${hasData ? '✅' : '⚠️'} Data: ${Array.isArray(data) ? `${data.length} items` : 'object'}`);
      
      if (!hasData && Array.isArray(data)) {
        console.log(`   ⚠️ Empty array returned`);
      }
    } catch (e) {
      console.log(`   ❌ JSON parse error: ${e.message}`);
      console.log(`   Response (first 100 chars): ${text.substring(0, 100)}`);
    }
  } catch (error) {
    console.log(`   ❌ Request failed: ${error.message}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log('✅ Test complete!\n');
