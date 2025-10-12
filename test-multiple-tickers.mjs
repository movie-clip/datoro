// Test multiple popular tickers
import fetch from 'node-fetch';

const tickers = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'NVO'];
const BASE = 'http://localhost:7071/api/fmp';

console.log('🧪 Testing Multiple Tickers\n');
console.log('='.repeat(60));

for (const ticker of tickers) {
  console.log(`\n📊 ${ticker}`);
  
  // Test profile (most important for basic data)
  try {
    const res = await fetch(`${BASE}/api/v3/profile/${ticker}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const profile = data[0];
        console.log(`   ✅ Company: ${profile.companyName}`);
        console.log(`   ✅ Price: $${profile.price}`);
        console.log(`   ✅ Market Cap: $${(profile.mktCap / 1e9).toFixed(2)}B`);
      } else {
        console.log(`   ⚠️ No profile data`);
      }
    } else {
      console.log(`   ❌ HTTP ${res.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  // Test ratios for valuation metrics
  try {
    const res = await fetch(`${BASE}/api/v3/ratios/${ticker}?period=annual&limit=1`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const ratios = data[0];
        console.log(`   ✅ PE: ${ratios.priceEarningsRatio?.toFixed(2) || 'N/A'}`);
        console.log(`   ✅ EV/EBITDA: ${ratios.enterpriseValueMultiple?.toFixed(2) || 'N/A'}`);
      } else {
        console.log(`   ⚠️ No ratios data`);
      }
    } else {
      console.log(`   ❌ Ratios HTTP ${res.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Ratios error: ${error.message}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log('✅ Test complete!\n');
