/**
 * Alternative Valuation Methods Service
 * Integrates FMP's Advanced DCF model and other professional valuation methods
 */

import { API_BASE_URL } from '../../utils/apiConfig'
import type { BatchData } from '../../types'

/**
 * Projection data for a single year
 */
export interface ProjectionYear {
  year: number
  revenue: number
  freeCashFlow: number
  ebitda: number
}

/**
 * Recommendation based on valuation
 */
export interface Recommendation {
  label: string
  color: string
}

/**
 * Advanced DCF valuation result
 */
export interface AdvancedDcfResult {
  intrinsicValue: number
  currentPrice: number
  marginOfSafety: number | null
  upside: number
  
  // Model assumptions
  wacc: number | null
  terminalGrowthRate: number | null
  beta: number | null
  costOfEquity: number | null
  costOfDebt: number | null
  
  // Enterprise value components
  enterpriseValue: number
  terminalValue: number
  presentTerminalValue: number
  
  // Projections summary
  projections: ProjectionYear[]
  
  // Metadata
  methodology: string
  note: string
  symbol: string
  calculatedBy: string
  warning?: string
}

/**
 * FMP DCF value (simple)
 */
export interface FmpDcfValue {
  intrinsicValue: number | null
  date: string | null
  symbol: string
}

/**
 * FMP DCF value with extended info (for batch data with advancedDcf)
 */
export interface FmpDcfValueExtended {
  intrinsicValue: number | null
  error?: string
}

/**
 * API response wrapper
 */
interface ApiResponse<T> {
  data: T | null
  error: string | null
}

/**
 * Get FMP's Advanced DCF Valuation
 * 
 * FMP's Advanced DCF provides a complete 10-year projection model with:
 * - Revenue, EBITDA, EBIT projections
 * - Free cash flow (UFCF) calculations
 * - WACC calculation (cost of equity, cost of debt, weights)
 * - Terminal value and enterprise value
 * - Equity value per share (intrinsic value)
 * 
 * This is a professional-grade DCF model with full transparency of all assumptions.
 * 
 * @param batchData - Batch data containing advancedDcf
 * @param inputs - Optional user inputs (not used, FMP model is pre-calculated)
 * @returns Valuation result with intrinsic value and model details
 */
export function calculateAdvancedDcfValue(
  batchData: any, 
  inputs: Record<string, any> = {}
): AdvancedDcfResult | FmpDcfValueExtended {
  const advancedDcf = batchData?.advancedDcf
  const quote = batchData?.quote?.[0]
  
  if (!advancedDcf || !Array.isArray(advancedDcf) || advancedDcf.length === 0) {
    return {
      intrinsicValue: null,
      error: 'DCF valuation not available for this ticker. This typically occurs for companies with negative or unstable cash flows.'
    }
  }

  if (!quote || !quote.price) {
    return {
      intrinsicValue: null,
      error: 'Current price data not available'
    }
  }

  // Get the most recent projection (last item has summary values)
  const latestProjection = advancedDcf[advancedDcf.length - 1]
  
  const intrinsicValue = latestProjection.equityValuePerShare
  const currentPrice = quote.price
  
  // Check if intrinsicValue is missing or invalid (but allow negative values)
  if (intrinsicValue === null || intrinsicValue === undefined || isNaN(intrinsicValue)) {
    return {
      intrinsicValue: null,
      error: 'DCF valuation data is incomplete or invalid for this ticker.'
    }
  }

  // Calculate margin of safety and upside (works with negative values too)
  const marginOfSafety = intrinsicValue !== 0 
    ? ((intrinsicValue - currentPrice) / Math.abs(intrinsicValue)) * 100
    : null
  const upside = ((intrinsicValue - currentPrice) / currentPrice) * 100
  
  // Add warning for negative valuations
  const warning = intrinsicValue <= 0 
    ? 'Negative DCF valuation indicates the company burns more cash than it generates. This suggests fundamental challenges with the business model.'
    : null

  // Get key model assumptions from the projection
  const wacc = latestProjection.wacc || null
  const terminalGrowthRate = latestProjection.longTermGrowthRate || null
  const beta = latestProjection.beta || null
  const costOfEquity = latestProjection.costOfEquity || null
  const costOfDebt = latestProjection.costofDebt || null

  // Get projections (first 5 years for summary)
  const projections: ProjectionYear[] = advancedDcf.slice(0, 5).reverse().map((year: any) => ({
    year: year.year,
    revenue: year.revenue,
    freeCashFlow: year.ufcf,
    ebitda: year.ebitda
  }))

  return {
    intrinsicValue: Math.round(intrinsicValue * 100) / 100,
    currentPrice: currentPrice,
    marginOfSafety: marginOfSafety !== null ? Math.round(marginOfSafety * 10) / 10 : null,
    upside: Math.round(upside * 10) / 10,
    
    // Model assumptions
    wacc: wacc ? Math.round(wacc * 100) / 100 : null,
    terminalGrowthRate: terminalGrowthRate || null,
    beta: beta ? Math.round(beta * 1000) / 1000 : null,
    costOfEquity: costOfEquity ? Math.round(costOfEquity * 100) / 100 : null,
    costOfDebt: costOfDebt ? Math.round(costOfDebt * 100) / 100 : null,
    
    // Enterprise value components
    enterpriseValue: latestProjection.enterpriseValue,
    terminalValue: latestProjection.terminalValue,
    presentTerminalValue: latestProjection.presentTerminalValue,
    
    // Projections summary
    projections: projections,
    
    // Metadata
    methodology: 'Advanced DCF (FMP)',
    note: 'Professional 10-year DCF model from Financial Modeling Prep',
    symbol: latestProjection.symbol,
    calculatedBy: 'FMP',
    warning: warning || undefined
  }
}

/**
 * Get FMP's DCF valuation from batch data
 * FMP calculates DCF using their proprietary models and assumptions
 * 
 * FMP's DCF is labeled as "Stock Price" in their API
 * It represents their calculated fair value using DCF methodology
 * 
 * @param batchData - Batch data from ticker store
 * @returns FMP's DCF valuation or null
 */
export function getFmpDcfFromBatch(batchData: BatchData | any): FmpDcfValue | null {
  if (!batchData?.data?.fmpDcf) {
    return null
  }

  const dcfData = batchData.data.fmpDcf
  
  // FMP returns array with single object: [{ symbol, dcf, date }]
  if (!Array.isArray(dcfData) || dcfData.length === 0) {
    return null
  }

  const dcf = dcfData[0]

  return {
    intrinsicValue: dcf.dcf || null,
    date: dcf.date || null,
    symbol: dcf.symbol || batchData.ticker
  }
}

/**
 * Fetch FMP's DCF valuation (fallback if not in batch)
 * FMP calculates DCF using their proprietary models and assumptions
 * Endpoint: /api/v3/discounted-cash-flow
 * 
 * FMP's DCF is labeled as "Stock Price" in their API
 * It represents their calculated fair value using DCF methodology
 * 
 * @param ticker - Stock ticker symbol
 * @returns FMP's DCF valuation
 */
export async function fetchFmpDcf(ticker: string): Promise<ApiResponse<FmpDcfValue>> {
  const t = ticker.toUpperCase().trim()
  
  if (!t) {
    return { data: null, error: 'No ticker provided' }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/fmp/api/v3/discounted-cash-flow/${t}`)
    
    if (!response.ok) {
      return { data: null, error: `HTTP ${response.status}` }
    }

    const data = await response.json()
    
    // FMP returns array with single object: [{ symbol, dcf, date }]
    if (!Array.isArray(data) || data.length === 0) {
      return { data: null, error: 'No DCF data available' }
    }

    const dcfData = data[0]

    return {
      data: {
        intrinsicValue: dcfData.dcf || null,
        date: dcfData.date || null,
        symbol: dcfData.symbol || t
      },
      error: null
    }
  } catch (_error) {
    const err = _error as Error
    console.error('[FMP DCF] Error fetching:', err)
    return { data: null, error: err.message }
  }
}

/**
 * Fetch FMP's Levered DCF valuation
 * This version accounts for the company's debt structure
 * 
 * @param ticker - Stock ticker symbol
 * @returns FMP's levered DCF valuation
 */
export async function fetchFmpLeveredDcf(ticker: string): Promise<ApiResponse<FmpDcfValue>> {
  const t = ticker.toUpperCase().trim()
  
  if (!t) {
    return { data: null, error: 'No ticker provided' }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/fmp/api/v3/levered-discounted-cash-flow/${t}`)
    
    if (!response.ok) {
      return { data: null, error: `HTTP ${response.status}` }
    }

    const data = await response.json()
    
    if (!Array.isArray(data) || data.length === 0) {
      return { data: null, error: 'No levered DCF data available' }
    }

    const dcfData = data[0]

    return {
      data: {
        intrinsicValue: dcfData.dcf || null,
        date: dcfData.date || null,
        symbol: dcfData.symbol || t
      },
      error: null
    }
  } catch (_error) {
    const err = _error as Error
    console.error('[FMP Levered DCF] Error fetching:', err)
    return { data: null, error: err.message }
  }
}

/**
 * Generate chart scenarios from Advanced DCF intrinsic value (FCF-based fallback)
 * Used as fallback when PEG model fails (e.g., negative earnings)
 * 
 * Creates linear price projections from current price to intrinsic value
 * This provides visual representation when earnings-based projection is unavailable
 * 
 * @param advancedDcfResult - Advanced DCF calculation result  
 * @param currentPrice - Current stock price
 * @param years - Number of years to project (default: 5)
 * @returns Chart scenarios with projected prices converging to intrinsic value
 */
export function generateScenariosFromAdvancedDcf(
  advancedDcfResult: AdvancedDcfResult | FmpDcfValueExtended,
  currentPrice: number,
  years: number = 5
): { best: any; average: any; worst: any } | null {
  // Check if it's a valid result with intrinsic value
  if (!advancedDcfResult || 'error' in advancedDcfResult || !advancedDcfResult.intrinsicValue) {
    return null
  }

  const intrinsicValue = advancedDcfResult.intrinsicValue
  
  // Can't generate scenarios if intrinsic value is invalid
  if (intrinsicValue <= 0) {
    return null
  }

  const currentYear = new Date().getFullYear()
  
  // Calculate annual growth rate needed to reach intrinsic value
  // Formula: FinalValue = InitialValue × (1 + r)^years
  // Solving for r: r = (FinalValue / InitialValue)^(1/years) - 1
  const averageGrowthRate = Math.pow(intrinsicValue / currentPrice, 1 / years) - 1
  const bestGrowthRate = averageGrowthRate * 1.2  // 20% more optimistic
  const worstGrowthRate = averageGrowthRate * 0.8  // 20% more conservative
  
  // Generate price projections using compound growth
  const averagePrices = Array.from({ length: years }, (__, i) => {
    const price = currentPrice * Math.pow(1 + averageGrowthRate, i + 1)
    return {
      year: currentYear + i + 1,
      price: Math.round(price * 100) / 100
    }
  })

  const bestPrices = Array.from({ length: years }, (__, i) => {
    const price = currentPrice * Math.pow(1 + bestGrowthRate, i + 1)
    return {
      year: currentYear + i + 1,
      price: Math.round(price * 100) / 100
    }
  })

  const worstPrices = Array.from({ length: years }, (__, i) => {
    const price = currentPrice * Math.pow(1 + worstGrowthRate, i + 1)
    return {
      year: currentYear + i + 1,
      price: Math.round(price * 100) / 100
    }
  })

  const upside = ((intrinsicValue - currentPrice) / currentPrice) * 100
  const targetBest = intrinsicValue * 1.2
  const targetWorst = intrinsicValue * 0.8

  return {
    best: {
      projectedPrices: bestPrices,
      intrinsicValue: targetBest,
      upside: ((targetBest - currentPrice) / currentPrice) * 100
    },
    average: {
      projectedPrices: averagePrices,
      intrinsicValue: intrinsicValue,
      upside: upside
    },
    worst: {
      projectedPrices: worstPrices,
      intrinsicValue: targetWorst,
      upside: ((targetWorst - currentPrice) / currentPrice) * 100
    }
  }
}

/**
 * Get recommendation based on upside percentage
 * 
 * @param upside - Upside/downside percentage
 * @returns Recommendation with label and color
 */
export function getValuationRecommendation(upside: number): Recommendation {
  if (upside >= 30) {
    return { label: 'Strong Buy', color: '#00b894' }
  } else if (upside >= 15) {
    return { label: 'Buy', color: '#00cec9' }
  } else if (upside >= -15) {
    return { label: 'Hold', color: '#fdcb6e' }
  } else if (upside >= -30) {
    return { label: 'Sell', color: '#ff7675' }
  } else {
    return { label: 'Strong Sell', color: '#d63031' }
  }
}
