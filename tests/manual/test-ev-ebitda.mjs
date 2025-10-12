// Check if EV/EBITDA is in the ratios response
import fetch from 'node-fetch';

const res = await fetch('http://localhost:7071/api/fmp/api/v3/ratios/AAPL?period=annual&limit=1');
const data = await res.json();
const ratio = data[0];

console.log('\n📊 EV/EBITDA related fields:\n');
const evFields = Object.keys(ratio).filter(k => 
  k.toLowerCase().includes('ebitda') || 
  k.toLowerCase().includes('enterprise') ||
  k.toLowerCase().includes('ev')
);

console.log('Available fields:', evFields);
evFields.forEach(field => {
  console.log(`${field}:`, ratio[field]);
});

console.log('\n📊 All numeric fields (sample):');
Object.keys(ratio).slice(0, 30).forEach(k => {
  if (typeof ratio[k] === 'number') {
    console.log(`${k}:`, ratio[k]);
  }
});
