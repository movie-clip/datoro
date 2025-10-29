// Test the correct Altman Z-Score endpoint
import fetch from 'node-fetch';

console.log('📊 Testing /stable/financial-scores endpoint\n');

const res = await fetch('http://localhost:7071/api/fmp/stable/financial-scores?symbol=AAPL');
console.log('Status:', res.status, res.statusText);

if (res.ok) {
  const data = await res.json();
  console.log('Data type:', Array.isArray(data) ? 'Array' : 'Object');
  console.log('Data length:', Array.isArray(data) ? data.length : 'N/A');
  console.log('\nFull response:');
  console.log(JSON.stringify(data, null, 2));
  
  if (Array.isArray(_data) && data.length > 0) {
    console.log('\nAltman Z-Score:', data[0]?.altmanZScore);
    console.log('Piotroski Score:', data[0]?.piotroskiScore);
  }
} else {
  const text = await res.text();
  console.log('Error:', text);
}
