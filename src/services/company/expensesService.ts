import { handleServiceError, type ServiceResponse } from '../shared'

const BASE = '/api/fmp/api/v3'

/**
 * Expense data by category
 */
export interface ExpenseData {
  date: number
  costOfRevenue: number
  researchAndDevelopment: number
  sellingGeneralAdmin: number
  total: number
}

/**
 * Get operating expenses series with segments
 * @param ticker - Stock ticker symbol
 * @param period - 'annual' or 'quarterly'
 * @returns Service response with expense series data
 */
export async function getExpensesSeries(
  ticker: string, 
  period: 'annual' | 'quarterly' = 'annual'
): Promise<ServiceResponse<ExpenseData[]>> {
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
    const data: ExpenseData[] = arr
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
      .sort((_a, _b) => a.date - b.date)
    
    return { data, error: null }
  } catch (_error) {
    return handleServiceError(error, 'getExpensesSeries', [])
  }
}
