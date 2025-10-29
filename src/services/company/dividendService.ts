import { handleServiceError, type ServiceResponse } from '../shared'

const BASE = '/api/fmp/api/v3'

/**
 * Dividend yield data point [timestamp, yield%]
 */
export type DividendYieldDataPoint = [number, number]

/**
 * Get dividend yield time series
 * @param ticker - Stock ticker symbol
 * @param period - 'annual' or 'quarterly'
 * @returns Service response with dividend yield series data
 */
export async function getDividendYieldSeries(
  ticker: string, 
  period: 'annual' | 'quarterly' = 'annual'
): Promise<ServiceResponse<DividendYieldDataPoint[]>> {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) return { data: [], error: 'No ticker provided' }
  
  try {
    const periodParam = period === 'quarterly' ? 'quarter' : 'annual'
    const limit = period === 'quarterly' ? 40 : 20
    const url = `${BASE}/key-metrics/${t}?period=${periodParam}&limit=${limit}`
    const res = await fetch(url)
    
    if (!res.ok) return { data: [], error: `HTTP ${res.status}` }
    
    const arr = await res.json()
    if (!Array.isArray(arr) || !arr.length) {
      return { data: [], error: 'No dividend yield data' }
    }
    
    // Map to [timestamp, dividendYield%] format
    const data: DividendYieldDataPoint[] = arr
      .filter(row => row.date && row.dividendYield != null)
      .map(row => [
        Date.parse(row.date),
        Number(row.dividendYield) * 100 // Convert to percentage
      ] as DividendYieldDataPoint)
      .sort((_a, _b) => a[0] - b[0])
    
    return { data, error: null }
  } catch (_error) {
    return handleServiceError(error, 'getDividendYieldSeries', [])
  }
}
