/**
 * Alternative Valuation Methods Service
 * Integrates FMP's Advanced DCF model and other professional valuation methods
 */

import { API_BASE_URL } from '../../utils/apiConfig.js'

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
 * @param {Object} batchData - Batch data containing advancedDcf
 * @param {Object} inputs - Optional user inputs (not used, FMP model is pre-calculated)
 * @returns {Object} Valuation result with intrinsic value and model details
 */
export function calculateAdvancedDcfValue(batchData, inputs = {}) {
  const advancedDcf = batchData?.advancedDcf
  const quote = batchData?.quote?.[0]
  
  if (!advancedDcf || !Array.isArray(advancedDcf) || advancedDcf.length === 0) {
    return {
      intrinsicValue: null,
      error: 'Advanced DCF data not available'
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
  
  if (!intrinsicValue || intrinsicValue <= 0) {
    return {
      intrinsicValue: null,
      error: 'Invalid Advanced DCF calculation'
    }
  }

  // Calculate margin of safety and upside
  const marginOfSafety = ((intrinsicValue - currentPrice) / intrinsicValue) * 100
  const upside = ((intrinsicValue - currentPrice) / currentPrice) * 100

  // Get key model assumptions from the projection
  const wacc = latestProjection.wacc || null
  const terminalGrowthRate = latestProjection.longTermGrowthRate || null
  const beta = latestProjection.beta || null
  const costOfEquity = latestProjection.costOfEquity || null
  const costOfDebt = latestProjection.costofDebt || null

  // Get projections (first 5 years for summary)
  const projections = advancedDcf.slice(0, 5).reverse().map(year => ({
    year: year.year,
    revenue: year.revenue,
    freeCashFlow: year.ufcf,
    ebitda: year.ebitda
  }))

  return {
    intrinsicValue: Math.round(intrinsicValue * 100) / 100,
    currentPrice: currentPrice,
    marginOfSafety: Math.round(marginOfSafety * 10) / 10,
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
    calculatedBy: 'FMP'
  }
}

/**
 * Get FMP's DCF valuation from batch data
 * FMP calculates DCF using their proprietary models and assumptions
 * 
 * FMP's DCF is labeled as "Stock Price" in their API
 * It represents their calculated fair value using DCF methodology
 * 
 * @param {Object} batchData - Batch data from ticker store
 * @returns {Object} FMP's DCF valuation or null
 */
export function getFmpDcfFromBatch(batchData) {
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
 * @param {string} ticker - Stock ticker symbol
 * @returns {Promise<Object>} FMP's DCF valuation
 */
export async function fetchFmpDcf(ticker) {
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
  } catch (error) {
    console.error('[FMP DCF] Error fetching:', error)
    return { data: null, error: error.message }
  }
}

/**
 * Fetch FMP's Levered DCF valuation
 * This version accounts for the company's debt structure
 * 
 * @param {string} ticker - Stock ticker symbol
 * @returns {Promise<Object>} FMP's levered DCF valuation
 */
export async function fetchFmpLeveredDcf(ticker) {
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
  } catch (error) {
    console.error('[FMP Levered DCF] Error fetching:', error)
    return { data: null, error: error.message }
  }
}

/**
 * Get recommendation based on upside percentage
 * 
 * @param {number} upside - Upside/downside percentage
 * @returns {Object} Recommendation with label and color
 */
export function getValuationRecommendation(upside) {
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
