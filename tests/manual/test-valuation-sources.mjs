// Check profile for EV and market data
import fetch from 'node-fetch';

console.log('📊 Checking Profile endpoint for valuation metrics\n');
const profileRes = await fetch('http://localhost:7071/api/fmp/api/v3/profile/AAPL');
const profileData = await profileRes.json();
const profile = profileData[0];

console.log('Market Cap:', profile.mktCap);
console.log('Price:', profile.price);
console.log('Beta:', profile.beta);
console.log('Volume:', profile.volAvg);

// Check for any EV or EBITDA fields
const valuationFields = Object.keys(profile).filter(k => 
  k.toLowerCase().includes('ev') || 
  k.toLowerCase().includes('enterprise') ||
  k.toLowerCase().includes('ebitda') ||
  k.toLowerCase().includes('valuation')
);
console.log('\nValuation-related fields in profile:', valuationFields);
valuationFields.forEach(f => console.log(`  ${f}:`, profile[f]));

// Try financial-growth endpoint which might have EBITDA growth
console.log('\n📊 Checking financial-growth endpoint\n');
try {
  const growthRes = await fetch('http://localhost:7071/api/fmp/api/v3/financial-growth/AAPL?period=annual&limit=1');
  if (growthRes.ok) {
    const growthData = await growthRes.json();
    console.log('Growth data available:', growthData.length > 0);
    if (growthData.length > 0) {
      const ebitdaFields = Object.keys(growthData[0]).filter(k => k.toLowerCase().includes('ebitda'));
      console.log('EBITDA fields:', ebitdaFields);
      ebitdaFields.forEach(f => console.log(`  ${f}:`, growthData[0][f]));
    }
  }
} catch (_e) {
  console.log('Financial-growth not available:', e.message);
}

// Try income statement for EBITDA
console.log('\n📊 Checking income statement for EBITDA\n');
const incomeRes = await fetch('http://localhost:7071/api/fmp/api/v3/income-statement/AAPL?period=annual&limit=1');
const incomeData = await incomeRes.json();
const income = incomeData[0];
const ebitdaFields = Object.keys(income).filter(k => k.toLowerCase().includes('ebitda') || k.toLowerCase().includes('ebit'));
console.log('EBITDA fields in income statement:', ebitdaFields);
ebitdaFields.forEach(f => console.log(`  ${f}:`, income[f]));
