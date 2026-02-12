/**
 * k6 Load Test - Warm Cache Efficiency
 *
 * Validates split static/dynamic endpoints with emphasis on cache-hit behavior.
 *
 * Run:
 *   k6 run --env API_URL=http://localhost:7071 tests/load/warm-efficiency-workload.js
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Counter, Rate } from 'k6/metrics'

const API_URL = __ENV.API_URL || 'http://localhost:7071'
const TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA']
const STATIC_P95_THRESHOLD_MS = Number(__ENV.STATIC_P95_THRESHOLD_MS || 5500)
const DYNAMIC_P95_THRESHOLD_MS = Number(__ENV.DYNAMIC_P95_THRESHOLD_MS || 5500)

const staticHitRate = new Rate('static_cache_hit_rate')
const dynamicHitRate = new Rate('dynamic_cache_hit_rate')
const staticMisses = new Counter('static_cache_misses')
const dynamicMisses = new Counter('dynamic_cache_misses')

export const options = {
  stages: [
    { duration: '15s', target: 5 },
    { duration: '45s', target: 20 },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    'http_req_duration{route:static}': [`p(95)<${STATIC_P95_THRESHOLD_MS}`],
    'http_req_duration{route:dynamic}': [`p(95)<${DYNAMIC_P95_THRESHOLD_MS}`],
    static_cache_hit_rate: ['rate>0.90'],
    dynamic_cache_hit_rate: ['rate>0.70'],
  },
}

function reqParams(route) {
  return {
    tags: { route },
    headers: { 'Content-Type': 'application/json' },
  }
}

function isHit(response) {
  const xCache = String(response.headers['X-Cache'] || '').toLowerCase()
  return xCache.includes('memory') || xCache.includes('redis') || xCache.includes('hit')
}

export function setup() {
  console.log('Warming static and dynamic cache keys...')

  for (const ticker of TICKERS) {
    http.get(`${API_URL}/api/ticker-data/${ticker}/static?mode=full`, reqParams('static'))
    http.get(`${API_URL}/api/ticker-data/${ticker}/dynamic`, reqParams('dynamic'))
    sleep(0.4)
  }

  console.log('Warmup complete.')
}

export default function () {
  const ticker = TICKERS[Math.floor(Math.random() * TICKERS.length)]

  const s = http.get(`${API_URL}/api/ticker-data/${ticker}/static?mode=full`, reqParams('static'))
  const sHit = isHit(s)
  staticHitRate.add(sHit)
  if (!sHit) staticMisses.add(1)

  check(s, {
    'static status 200': (r) => r.status === 200,
    'static has data': (r) => r.json('data') !== undefined,
  })

  const d = http.get(`${API_URL}/api/ticker-data/${ticker}/dynamic`, reqParams('dynamic'))
  const dHit = isHit(d)
  dynamicHitRate.add(dHit)
  if (!dHit) dynamicMisses.add(1)

  check(d, {
    'dynamic status 200': (r) => r.status === 200,
    'dynamic has quote array': (r) => Array.isArray(r.json('quote')),
  })

  sleep(0.3)
}
