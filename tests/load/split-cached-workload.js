/**
 * k6 Load Test - Split Endpoint Cache Workload
 *
 * Validates static + dynamic ticker flow used by frontend store.
 *
 * Run:
 *   k6 run tests/load/split-cached-workload.js
 */

import http from 'k6/http'
import { check, sleep } from 'k6'

const API_URL = __ENV.API_URL || 'http://localhost:7071'
const TICKERS = ['AAPL', 'MSFT', 'GOOGL']

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '30s', target: 15 },
    { duration: '2m', target: 25 },
    { duration: '2m', target: 25 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<900'],
    'http_req_duration{route:static}': ['p(95)<250'],
    'http_req_duration{route:dynamic}': ['p(95)<400'],
    http_req_failed: ['rate<0.10'],
  },
}

function headersWithTag(route) {
  return {
    headers: { 'Content-Type': 'application/json' },
    tags: { route },
  }
}

export function setup() {
  console.log('Warming split endpoint cache...')

  for (const ticker of TICKERS) {
    const staticRes = http.get(`${API_URL}/api/ticker-data/${ticker}/static?mode=full`, headersWithTag('static'))
    if (staticRes.status === 200) {
      console.log(`✓ Warmed static ${ticker}`)
    }

    const dynamicRes = http.get(`${API_URL}/api/ticker-data/${ticker}/dynamic`, headersWithTag('dynamic'))
    if (dynamicRes.status === 200) {
      console.log(`✓ Warmed dynamic ${ticker}`)
    }

    sleep(0.8)
  }

  console.log('Split cache warmup complete. Starting workload...')
  return {}
}

export default function () {
  const ticker = TICKERS[Math.floor(Math.random() * TICKERS.length)]

  const staticRes = http.get(`${API_URL}/api/ticker-data/${ticker}/static?mode=full`, headersWithTag('static'))
  check(staticRes, {
    'static status is 200': (r) => r.status === 200,
    'static p95 target candidate': (r) => r.timings.duration < 350,
    'static has data': (r) => r.json('data') !== undefined,
  })

  const dynamicRes = http.get(`${API_URL}/api/ticker-data/${ticker}/dynamic`, headersWithTag('dynamic'))
  check(dynamicRes, {
    'dynamic status is 200': (r) => r.status === 200,
    'dynamic p95 target candidate': (r) => r.timings.duration < 500,
    'dynamic has quote': (r) => Array.isArray(r.json('quote')),
  })

  sleep(0.4)
}

export function teardown(_data) {
  console.log('Split cached workload test completed.')
}
