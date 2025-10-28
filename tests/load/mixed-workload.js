/**
 * k6 Load Test - Mixed Workload (Realistic User Simulation)
 * 
 * Simulates 20 concurrent users performing typical actions:
 * - Browse tickers (AAPL, MSFT, GOOGL, TSLA, NVDA)
 * - Add/remove watchlist items
 * - Run DCF calculations
 * - Use Deep Finder
 * - View charts and financial data
 * 
 * Run: k6 run tests/load/mixed-workload.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const apiCalls = new Counter('api_calls');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Ramp up to 5 users
    { duration: '1m', target: 10 },   // Ramp to 10 users
    { duration: '2m', target: 20 },   // Ramp to 20 users (peak load)
    { duration: '3m', target: 20 },   // Sustain 20 users for 3 minutes
    { duration: '1m', target: 10 },   // Ramp down to 10
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% of requests < 2s
    http_req_failed: ['rate<0.05'],     // Error rate < 5%
    errors: ['rate<0.05'],
  },
};

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_URL = __ENV.API_URL || 'http://localhost:3001';

// Sample tickers for testing
const TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'META', 'AMZN', 'JPM', 'V', 'MA'];

// Simulate user authentication (if needed)
let authToken = null;

export function setup() {
  console.log('Starting load test...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`API URL: ${API_URL}`);
  
  // Optionally authenticate if your app requires it
  // const loginRes = http.post(`${API_URL}/api/auth/login`, JSON.stringify({
  //   email: 'test@example.com',
  //   password: 'testpassword'
  // }), { headers: { 'Content-Type': 'application/json' } });
  // 
  // if (loginRes.status === 200) {
  //   authToken = loginRes.json('token');
  // }
  
  return { authToken };
}

export default function (data) {
  // Random ticker for this iteration
  const ticker = TICKERS[Math.floor(Math.random() * TICKERS.length)];
  
  // Prepare headers
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (data.authToken) {
    headers['Authorization'] = `Bearer ${data.authToken}`;
  }
  
  // ========================================
  // Scenario 1: Fetch Ticker Data (Batch Endpoint)
  // ========================================
  group('Ticker Data - Batch Fetch', () => {
    const res = http.get(`${API_URL}/api/ticker-data/${ticker}?mode=full`, { headers });
    
    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 2s': (r) => r.timings.duration < 2000,
      'has ticker data': (r) => r.json('data') !== undefined,
    });
    
    errorRate.add(!success);
    responseTime.add(res.timings.duration);
    apiCalls.add(1);
    
    if (!success) {
      console.log(`Failed to fetch ${ticker}: ${res.status}`);
    }
  });
  
  sleep(1); // Think time
  
  // ========================================
  // Scenario 2: Watchlist Operations
  // ========================================
  group('Watchlist - Add Item', () => {
    const payload = JSON.stringify({
      ticker: ticker,
      name: `Watchlist ${__VU}`, // Virtual user ID
    });
    
    const res = http.post(`${API_URL}/api/watchlists/items`, payload, { headers });
    
    const success = check(res, {
      'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'response time < 1s': (r) => r.timings.duration < 1000,
    });
    
    errorRate.add(!success);
    responseTime.add(res.timings.duration);
    apiCalls.add(1);
  });
  
  sleep(0.5);
  
  // ========================================
  // Scenario 3: DCF Calculator
  // ========================================
  group('DCF Calculator - Fetch Data', () => {
    const res = http.get(`${API_URL}/api/dcf/${ticker}`, { headers });
    
    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 1.5s': (r) => r.timings.duration < 1500,
      'has DCF data': (r) => r.json('fairValue') !== undefined || r.json('data') !== undefined,
    });
    
    errorRate.add(!success);
    responseTime.add(res.timings.duration);
    apiCalls.add(1);
  });
  
  sleep(1);
  
  // ========================================
  // Scenario 4: Deep Finder (Watchlist-based screening)
  // ========================================
  group('Deep Finder - Query', () => {
    const res = http.get(`${API_URL}/api/watchlists`, { headers });
    
    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 1s': (r) => r.timings.duration < 1000,
    });
    
    errorRate.add(!success);
    responseTime.add(res.timings.duration);
    apiCalls.add(1);
  });
  
  sleep(0.5);
  
  // ========================================
  // Scenario 5: Chart Data
  // ========================================
  group('Price History Chart', () => {
    const res = http.get(`${API_URL}/api/ticker-data/${ticker}?mode=full`, { headers });
    
    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 2s': (r) => r.timings.duration < 2000,
    });
    
    errorRate.add(!success);
    responseTime.add(res.timings.duration);
    apiCalls.add(1);
  });
  
  sleep(2); // User reads chart
  
  // ========================================
  // Scenario 6: Remove Watchlist Item
  // ========================================
  group('Watchlist - Remove Item', () => {
    // In real test, you'd delete the item you created earlier
    // For now, we'll just try to delete (may 404, which is OK)
    const res = http.del(`${API_URL}/api/watchlists/items/${ticker}`, { headers });
    
    const success = check(res, {
      'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });
    
    errorRate.add(!success && res.status !== 404);
    responseTime.add(res.timings.duration);
    apiCalls.add(1);
  });
  
  sleep(1);
}

export function teardown(data) {
  console.log('Load test completed!');
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'tests/load/results/summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  // Simple text summary
  const metrics = data.metrics;
  
  let summary = '\n=== Load Test Summary ===\n\n';
  summary += `Total Requests: ${metrics.http_reqs.values.count}\n`;
  summary += `Failed Requests: ${metrics.http_req_failed.values.rate * 100}%\n`;
  summary += `Avg Response Time: ${metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `p95 Response Time: ${metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `p99 Response Time: ${metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;
  
  return summary;
}
