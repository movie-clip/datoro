// src/services/marketData/fmpProvider.ts
// FMP historical price data provider

import { handleServiceError, type ServiceResponse } from '../shared'

/**
 * Price data point: [timestamp, price]
 */
export type PriceDataPoint = [number, number]

/**
 * Timeframe range options
 */
export type TimeframeRange = '5d' | '1mo' | '6mo' | 'ytd' | '5y' | 'max'

/**
 * Fetch FMP historical price series
 * @param ticker - Stock ticker symbol
 * @param options - Query options with range
 * @returns Array of [timestamp, close price] tuples
 */
export async function fetchFmpSeries(
  ticker: string,
  { range }: { range: TimeframeRange }
): Promise<ServiceResponse<PriceDataPoint[]>> {
  try {
    const t = (ticker || '').trim().toUpperCase()
    if (!t) {
      return { data: [], error: 'No ticker provided' }
    }

    // Map timeframe to approximate number of days
    const days = mapRangeToDays(range)
    const base = `/api/fmp/api/v3/historical-price-full/${encodeURIComponent(t)}`
    const url = days ? `${base}?timeseries=${days}` : base // omit timeseries for full history

    const res = await fetch(url)
    if (!res.ok) {
      const msg = `HTTP ${res.status} for ${url}`
      return handleServiceError(new Error(msg), 'fetchFmpSeries', [])
    }

    const j = await res.json()
    const hist = Array.isArray(j.historical) ? j.historical : []
    if (!hist.length) {
      return { data: [], error: 'No price data' }
    }

    const out: PriceDataPoint[] = []
    for (const row of hist) {
      const ts = row?.date ? Date.parse(row.date) : NaN
      const y = row?.adjClose ?? row?.close
      if (Number.isFinite(ts) && Number.isFinite(y)) {
        out.push([ts, y])
      }
    }

    // FMP returns most-recent first; sort ascending by timestamp
    out.sort((_a, _b) => a[0] - b[0])

    return { data: out, error: null }
  } catch (_error) {
    return handleServiceError(error, 'fetchFmpSeries', [])
  }
}

/**
 * Map timeframe range to days
 */
function mapRangeToDays(range: TimeframeRange): number | null {
  switch (range) {
    case '5d':
      return 7
    case '1mo':
      return 31
    case '6mo':
      return 200
    case 'ytd':
      return daysSinceStartOfYear()
    case '5y':
      return 1850
    case 'max':
    default:
      return null // full history
  }
}

/**
 * Calculate days since start of current year
 */
function daysSinceStartOfYear(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
}
