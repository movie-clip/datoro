/**
 * Alternative Valuation Methods Service
 * Implements Warren Buffett's PEG-based formula and integrates FMP's DCF API
 */

import { API_BASE_URL } from '../../utils/apiConfig.js'

/**
 * Warren Buffett's Simplified Valuation Formula
 * Formula: Intrinsic Value = EPS × Fair P/E × (1 + Growth Rate)^Years
 * 
 * This is a simplified PEG-based approach:
 * 1. Start with current EPS
 * 2. Apply a "fair" P/E multiple based on growth expectations
 * 3. Project earnings growth over investment timeframe
 * 4. Calculate intrinsic value per share
 * 
 * @param {Object} companyData - Company financial data
 * @param {number} companyData.eps - Trailing 12-month EPS
 * @param {number} companyData.currentPrice - Current stock price
 * @param {number} companyData.currentPE - Current P/E ratio
 * @param {Object} inputs - User assumptions
 * @param {number} inputs.growthRate - Expected annual earnings growth rate (%)
 * @param {number} inputs.fairPE - Fair P/E multiple to apply
 * @param {number} inputs.years - Investment timeframe in years
 * @returns {Object} Valuation result
 */
export function calculateBuffettValue(companyData, inputs) {
  const {
    eps = 0,
    currentPrice = 0,
    currentPE = 0
  } = companyData || {}

  const {
    growthRate = 15, // Default 15% growth
    fairPE = 15,     // Default fair P/E of 15
    years = 10       // Default 10-year horizon
  } = inputs || {}

  // Validate inputs
  if (eps <= 0 || currentPrice <= 0) {
    return {
      intrinsicValue: null,
      futureEPS: null,
      impliedReturn: null,
      marginOfSafety: null,
      error: 'Invalid EPS or price data'
    }
  }

  // Calculate future EPS with compounding growth
  const growthMultiplier = Math.pow(1 + (growthRate / 100), years)
  const futureEPS = eps * growthMultiplier

  // Calculate intrinsic value using fair P/E
  const intrinsicValue = futureEPS * fairPE

  // Calculate implied annual return if bought at current price
  const impliedReturn = (Math.pow(intrinsicValue / currentPrice, 1 / years) - 1) * 100

  // Calculate margin of safety
  const marginOfSafety = ((intrinsicValue - currentPrice) / intrinsicValue) * 100

  return {
    intrinsicValue: Math.round(intrinsicValue * 100) / 100,
    futureEPS: Math.round(futureEPS * 100) / 100,
    impliedReturn: Math.round(impliedReturn * 10) / 10,
    marginOfSafety: Math.round(marginOfSafety * 10) / 10,
    currentPE: currentPE,
    fairPE: fairPE,
    years: years,
    growthRate: growthRate,
    currentPrice: currentPrice,
    upside: ((intrinsicValue - currentPrice) / currentPrice) * 100
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
