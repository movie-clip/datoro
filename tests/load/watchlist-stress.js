/**
 * k6 Load Test - Watchlist Stress Test
 * 
 * Simulates intensive watchlist operations:
 * - Create multiple watchlists
 * - Add 10-20 items per watchlist
 * - Reorder items (simulates drag & drop)
 * - Remove items
 * - Delete watchlists
 * 
 * Run: k6 run tests/load/watchlist-stress.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp to 10 users
    { duration: '2m', target: 20 },   // Peak: 20 users
    { duration: '2m', target: 20 },   // Sustain
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],  // 95% under 1s
    http_req_failed: ['rate<0.05'],
  },
};

const API_URL = __ENV.API_URL || 'http://localhost:3001';
const TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'META', 'AMZN', 'JPM', 'V', 'MA'];

export default function () {
  const headers = { 'Content-Type': 'application/json' };
  const watchlistName = `Test Watchlist ${__VU}-${__ITER}`;
  let watchlistId = null;
  
  // ========================================
  // 1. Create Watchlist
  // ========================================
  group('Create Watchlist', () => {
    const payload = JSON.stringify({ name: watchlistName });
    const res = http.post(`${API_URL}/api/watchlists`, payload, { headers });
    
    const success = check(res, {
      'created': (r) => r.status === 201,
      'fast': (r) => r.timings.duration < 500,
    });
    
    if (success && res.json('id')) {
      watchlistId = res.json('id');
    }
    
    errorRate.add(!success);
    responseTime.add(res.timings.duration);
  });
  
  sleep(0.5);
  
  if (!watchlistId) {
    console.log('Failed to create watchlist, skipping rest');
    return;
  }
  
  // ========================================
  // 2. Add Multiple Items (10 stocks)
  // ========================================
  group('Add 10 Items', () => {
    for (let i = 0; i < 10; i++) {
      const ticker = TICKERS[i % TICKERS.length];
      const payload = JSON.stringify({
        watchlistId: watchlistId,
        ticker: ticker,
        position: i,
      });
      
      const res = http.post(`${API_URL}/api/watchlists/items`, payload, { headers });
      
      const success = check(res, {
        'added': (r) => r.status === 200 || r.status === 201,
        'fast': (r) => r.timings.duration < 300,
      });
      
      errorRate.add(!success);
      responseTime.add(res.timings.duration);
      
      sleep(0.1); // Small delay between adds
    }
  });
  
  sleep(1);
  
  // ========================================
  // 3. Reorder Items (Simulate Drag & Drop)
  // ========================================
  group('Reorder Items', () => {
    // Move item from position 0 to position 5
    const payload = JSON.stringify({
      watchlistId: watchlistId,
      fromIndex: 0,
      toIndex: 5,
    });
    
    const res = http.put(`${API_URL}/api/watchlists/reorder`, payload, { headers });
    
    const success = check(res, {
      'reordered': (r) => r.status === 200,
      'fast': (r) => r.timings.duration < 500,
    });
    
    errorRate.add(!success);
    responseTime.add(res.timings.duration);
  });
  
  sleep(0.5);
  
  // ========================================
  // 4. Fetch Watchlist (verify items)
  // ========================================
  group('Fetch Watchlist', () => {
    const res = http.get(`${API_URL}/api/watchlists/${watchlistId}`, { headers });
    
    const success = check(res, {
      'fetched': (r) => r.status === 200,
      'has items': (r) => r.json('items') && r.json('items').length > 0,
      'fast': (r) => r.timings.duration < 300,
    });
    
    errorRate.add(!success);
    responseTime.add(res.timings.duration);
  });
  
  sleep(1);
  
  // ========================================
  // 5. Remove Some Items
  // ========================================
  group('Remove 3 Items', () => {
    for (let i = 0; i < 3; i++) {
      const ticker = TICKERS[i];
      const res = http.del(`${API_URL}/api/watchlists/${watchlistId}/items/${ticker}`, { headers });
      
      const success = check(res, {
        'removed': (r) => r.status === 200 || r.status === 404,
        'fast': (r) => r.timings.duration < 300,
      });
      
      errorRate.add(!success && res.status !== 404);
      responseTime.add(res.timings.duration);
      
      sleep(0.1);
    }
  });
  
  sleep(0.5);
  
  // ========================================
  // 6. Delete Watchlist (cleanup)
  // ========================================
  group('Delete Watchlist', () => {
    const res = http.del(`${API_URL}/api/watchlists/${watchlistId}`, { headers });
    
    const success = check(res, {
      'deleted': (r) => r.status === 200 || r.status === 204,
      'fast': (r) => r.timings.duration < 500,
    });
    
    errorRate.add(!success);
    responseTime.add(res.timings.duration);
  });
  
  sleep(2); // Think time before next iteration
}
