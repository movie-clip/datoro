import { handleServiceError } from '../shared.js'

const BASE = '/api/fmp/api/v3'

// Get operating expenses series with segments
export async function getExpensesSeries(ticker, period = 'annual') {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) return { data: [], error: 'No ticker provided' }
  
  try {
    const periodParam = period === 'quarterly' ? 'quarter' : 'annual'
    const limit = period === 'quarterly' ? 40 : 20
    const url = `${BASE}/income-statement/${t}?period=${periodParam}&limit=${limit}`
    const res = await fetch(url)
    
    if (!res.ok) return { data: [], error: `HTTP ${res.status}` }
    
    const arr = await res.json()
    if (!Array.isArray(arr) || !arr.length) {
      return { data: [], error: 'No expense data' }
    }
    
    // Map to expense segments
    const data = arr
      .filter(row => row.date)
      .map(row => ({
        date: Date.parse(row.date),
        costOfRevenue: Number(row.costOfRevenue) || 0,
        researchAndDevelopment: Number(row.researchAndDevelopmentExpenses) || 0,
        sellingGeneralAdmin: Number(row.sellingGeneralAndAdministrativeExpenses) || 0,
        total: (Number(row.costOfRevenue) || 0) + 
               (Number(row.researchAndDevelopmentExpenses) || 0) + 
               (Number(row.sellingGeneralAndAdministrativeExpenses) || 0)
      }))
      .sort((a, b) => a.date - b.date)
    
    return { data, error: null }
  } catch (error) {
    return handleServiceError(error, 'getExpensesSeries')
  }
}
