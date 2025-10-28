/**
 * k6 Load Test - Cache-Aware Test
 * 
 * This test warms up the cache first, then runs the real load test.
 * This simulates real-world usage where most data is already cached.
 * 
 * Run: k6 run tests/load/cached-workload.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const API_URL = __ENV.API_URL || 'http://localhost:7071';

// Use a smaller, fixed set of tickers to maximize cache hits
const TICKERS = ['AAPL', 'MSFT', 'GOOGL'];

export const options = {
  stages: [
    { duration: '10s', target: 5 },   // Warm up cache
    { duration: '30s', target: 10 },  // Ramp to 10
    { duration: '2m', target: 20 },   // Peak load: 20 users
    { duration: '2m', target: 20 },   // Sustain
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],  // Cached responses should be fast
    http_req_failed: ['rate<0.10'],     // Allow 10% errors (some may still hit FMP)
  },
};

export function setup() {
  console.log('Warming up cache...');
  
  const headers = { 'Content-Type': 'application/json' };
  
  // Pre-fetch all tickers to warm cache
  for (const ticker of TICKERS) {
    const res = http.get(`${API_URL}/api/ticker-data/${ticker}?mode=full`, { headers });
    if (res.status === 200) {
      console.log(`✓ Cached ${ticker}`);
    }
    sleep(1);
  }
  
  console.log('Cache warmed up! Starting load test...');
  return {};
}

export default function () {
  const ticker = TICKERS[Math.floor(Math.random() * TICKERS.length)];
  const headers = { 'Content-Type': 'application/json' };
  
  // Fetch ticker data (should be cached!)
  const res = http.get(`${API_URL}/api/ticker-data/${ticker}?mode=full`, { headers });
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,  // Cached should be fast!
    'has data': (r) => r.json('data') !== undefined,
  });
  
  sleep(0.5); // User think time
}

export function teardown(data) {
  console.log('Test completed!');
}
