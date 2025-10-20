import { handleServiceError } from '../shared.js'

const BASE = '/api/fmp/api/v4'

// Aggregate insider trades by month: net shares (buys - sells)
export async function getInsiderTradingAggregated(ticker) {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) return { data: [], error: 'No ticker provided' }
  
  try {
    // Fetch recent insider trades (last 2 years worth)
    const res = await fetch(`${BASE}/insider-trading?symbol=${encodeURIComponent(t)}&limit=500`)
    if (!res.ok) return { data: [], error: `HTTP ${res.status}` }
    
    const trades = await res.json()
    if (!Array.isArray(trades) || !trades.length) {
      return { data: [], error: 'No insider trading data' }
    }
    
    // Aggregate by month using acquistionOrDisposition field
    // A = Acquisition (buy), D = Disposition (sell)
    const monthlyData = new Map()
    
    trades.forEach(trade => {
      // Skip if no valid acquisition/disposition
      if (!trade.acquistionOrDisposition || !trade.transactionDate) {
        return
      }
      
      const date = new Date(trade.transactionDate)
      // Create month key (YYYY-MM-01)
      const monthKey = new Date(date.getFullYear(), date.getMonth(), 1).getTime()
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { buys: 0, sells: 0 })
      }
      
      const shares = Number(trade.securitiesTransacted) || 0
      const data = monthlyData.get(monthKey)
      
      if (trade.acquistionOrDisposition === 'A') {
        data.buys += shares
      } else if (trade.acquistionOrDisposition === 'D') {
        data.sells += shares
      }
    })
    
    // Convert to array and calculate net (buys - sells)
    const aggregated = Array.from(monthlyData.entries())
      .map(([timestamp, data]) => ({
        date: timestamp,
        buys: data.buys,
        sells: data.sells,
        net: data.buys - data.sells
      }))
      .sort((a, b) => a.date - b.date)
    
    return { data: aggregated, error: null }
  } catch (error) {
    return handleServiceError(error, 'getInsiderTradingAggregated')
  }
}
