// Final verification test for all fixed endpoints
import fetch from 'node-fetch';

const ticker = 'AAPL';
const BASE = 'http://localhost:7071/api/fmp';

console.log('🧪 Final Verification Test\n');
console.log('=' .repeat(60));

// Test 1: PE Ratio from ratios endpoint
console.log('\n1️⃣  Testing PE Ratio (priceEarningsRatio)');
const ratiosRes = await fetch(`${BASE}/api/v3/ratios/${ticker}?period=annual&limit=1`);
if (ratiosRes.ok) {
  const ratios = await ratiosRes.json();
  const pe = ratios[0]?.priceEarningsRatio;
  console.log(`   ✅ PE Ratio: ${pe?.toFixed(2)} ${pe ? '(FOUND)' : '(MISSING)'}`);
} else {
  console.log(`   ❌ Failed: ${ratiosRes.status}`);
}

// Test 2: EV/EBITDA from ratios endpoint
console.log('\n2️⃣  Testing EV/EBITDA (enterpriseValueMultiple)');
const ratios2Res = await fetch(`${BASE}/api/v3/ratios/${ticker}?period=annual&limit=1`);
if (ratios2Res.ok) {
  const ratios = await ratios2Res.json();
  const evEbitda = ratios[0]?.enterpriseValueMultiple;
  console.log(`   ✅ EV/EBITDA: ${evEbitda?.toFixed(2)} ${evEbitda ? '(FOUND)' : '(MISSING)'}`);
} else {
  console.log(`   ❌ Failed: ${ratios2Res.status}`);
}

// Test 3: Altman Z-Score from financial-scores endpoint
console.log('\n3️⃣  Testing Altman Z-Score (/stable/financial-scores)');
const zScoreRes = await fetch(`${BASE}/stable/financial-scores?symbol=${ticker}`);
if (zScoreRes.ok) {
  const zScore = await zScoreRes.json();
  const altman = zScore[0]?.altmanZScore;
  console.log(`   ✅ Altman Z-Score: ${altman?.toFixed(2)} ${altman ? '(FOUND)' : '(MISSING)'}`);
  if (altman) {
    const color = altman > 2.99 ? 'GREEN (Safe)' : altman >= 1.81 ? 'GREY (Warning)' : 'RED (Distress)';
    console.log(`   📊 Status: ${color}`);
  }
} else {
  console.log(`   ❌ Failed: ${zScoreRes.status}`);
  const errorText = await zScoreRes.text();
  console.log(`   Error: ${errorText.substring(0, 100)}`);
}

console.log('\n' + '='.repeat(60));
console.log('✅ All tests complete!\n');
