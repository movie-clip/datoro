// Check exact field names in ratios response
import fetch from 'node-fetch';

const res = await fetch('http://localhost:7071/api/fmp/api/v3/ratios/AAPL?period=annual&limit=1');
const data = await res.json();
const ratio = data[0];

console.log('\n📊 Available fields in Ratios endpoint:\n');
console.log('Keys:', Object.keys(ratio).filter(k => k.toLowerCase().includes('price') || k.toLowerCase().includes('earnings') || k.toLowerCase().includes('ebitda') || k.toLowerCase().includes('book') || k.toLowerCase().includes('sales')));

console.log('\nPE-related values:');
console.log('priceEarningsRatio:', ratio.priceEarningsRatio);
console.log('priceToEarningsRatio:', ratio.priceToEarningsRatio);
console.log('priceToSalesRatio:', ratio.priceToSalesRatio);
console.log('priceToBookRatio:', ratio.priceToBookRatio);
console.log('enterpriseValueOverEBITDA:', ratio.enterpriseValueOverEBITDA);
