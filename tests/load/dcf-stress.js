/**
 * k6 Load Test - DCF Calculator Stress Test
 * 
 * Simulates multiple users running DCF calculations:
 * - Fetch DCF data for various stocks
 * - Test with different growth assumptions
 * - Verify calculation performance
 * 
 * Run: k6 run tests/load/dcf-stress.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 20 },
    { duration: '2m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // DCF can be slower
    http_req_failed: ['rate<0.05'],
  },
};

const API_URL = __ENV.API_URL || 'http://localhost:3001';
const TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'META', 'AMZN'];

export default function () {
  const ticker = TICKERS[Math.floor(Math.random() * TICKERS.length)];
  const headers = { 'Content-Type': 'application/json' };
  
  // ========================================
  // 1. Fetch DCF Data
  // ========================================
  group('Fetch DCF Data', () => {
    const res = http.get(`${API_URL}/api/dcf/${ticker}`, { headers });
    
    const success = check(res, {
      'status 200': (r) => r.status === 200,
      'has data': (r) => {
        const body = r.json();
        return body && (body.fairValue !== undefined || body.data !== undefined);
      },
      'response time < 2s': (r) => r.timings.duration < 2000,
    });
    
    errorRate.add(!success);
    responseTime.add(res.timings.duration);
    
    if (!success) {
      console.log(`DCF fetch failed for ${ticker}: ${res.status}`);
    }
  });
  
  sleep(1);
  
  // ========================================
  // 2. Run DCF Calculation (if endpoint exists)
  // ========================================
  group('Run DCF Calculation', () => {
    const payload = JSON.stringify({
      ticker: ticker,
      growthRate: 0.15,  // 15% growth assumption
      terminalGrowth: 0.03,
      discountRate: 0.10,
      years: 5,
    });
    
    const res = http.post(`${API_URL}/api/dcf/calculate`, payload, { headers });
    
    const success = check(res, {
      'status 200 or 201': (r) => r.status === 200 || r.status === 201,
      'response time < 1.5s': (r) => r.timings.duration < 1500,
    });
    
    errorRate.add(!success);
    responseTime.add(res.timings.duration);
  });
  
  sleep(2);
}
