import { handleServiceError } from '../shared.js'

const BASE = '/api/fmp/api/v3'

// Get dividend yield time series
export async function getDividendYieldSeries(ticker, period = 'annual') {
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
    const data = arr
      .filter(row => row.date && row.dividendYield != null)
      .map(row => [
        Date.parse(row.date),
        Number(row.dividendYield) * 100 // Convert to percentage
      ])
      .sort((a, b) => a[0] - b[0])
    
    return { data, error: null }
  } catch (error) {
    return handleServiceError(error, 'getDividendYieldSeries')
  }
}
