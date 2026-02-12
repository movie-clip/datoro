/**
 * DCF Data Extraction Service
 * Extracts DCF-relevant financial data from ticker batch data
 */

import type { BatchData } from '../../types'

/**
 * FCF history entry
 */
export interface FcfHistoryEntry {
  date: string
  fcf: number
  year: number
}

/**
 * Company data for DCF calculation
 */
export interface CompanyDataForDcf {
  currentFcf: number
  sharesOutstanding: number
  cashAndEquivalents: number
  totalDebt: number
  currentPrice: number
  historicalGrowthRate: number
  eps: number
  currentPE: number
  epsGrowth: number
  companyName: string
  ticker: string
  image: string | null
  lastUpdated: string
  fcfHistory: FcfHistoryEntry[]
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean
  missingFields: string[]
  details: Record<string, string>
}

/**
 * Calculate CAGR (Compound Annual Growth Rate)
 * @param startValue - Starting value
 * @param endValue - Ending value
 * @param years - Number of years
 * @returns CAGR as percentage
 */
function calculateCAGR(startValue: number, endValue: number, years: number): number {
  if (startValue <= 0 || endValue <= 0 || years <= 0) {
    return 0
  }
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100
}

/**
 * Extract company data needed for DCF calculation from batch data
 * 
 * Uses TTM (Trailing Twelve Months) data for most current metrics:
 * - EPS: From quote endpoint (TTM)
 * - P/E Ratio: From ratiosTTM endpoint, fallback to annual
 * - EPS Growth: Calculated from quarterly data (TTM vs previous TTM)
 * 
 * @param batchData - Batch data from ticker store
 * @returns DCF-ready company data or null if insufficient data
 */
export function getDcfDataFromBatch(batchData: BatchData | null): CompanyDataForDcf | null {
  if (!batchData || !batchData.data) {
    console.warn('[DCF Data] No batch data available')
    return null
  }

  try {
    const data = batchData.data
    
    // Extract profile data
    const profile = Array.isArray(data.profile) && data.profile.length > 0 
      ? data.profile[0] 
      : null
    
    // Extract quote data
    const quote = Array.isArray(data.quote) && data.quote.length > 0 
      ? data.quote[0] 
      : null
    
    // Extract cash flow statements (annual)
    const cashflowAnnual = data.cashflowAnnual || []
    
    // Extract balance sheet (for cash and debt)
    const balanceAnnual = data.balanceAnnual || []
    
    // Extract key metrics (has marketCap and other useful data)
    const keyMetrics = data.keyMetrics || []
    const latestKeyMetrics = keyMetrics.length > 0 ? keyMetrics[0] : null
    
    // Get most recent FCF from cash flow statement
    const latestCashflow = cashflowAnnual[0] // Most recent year
    const currentFcf = latestCashflow 
      ? Number(latestCashflow.freeCashFlow) || 0 
      : 0
    
    // Get shares outstanding  
    // Try multiple sources with defensive checks
    // Priority: quote > cashflow > calculated from marketCap and price
    let sharesOutstanding = 0
    let sharesSource = 'none'
    
    // Try all available sources
    if (quote?.sharesOutstanding && Number(quote.sharesOutstanding) > 0) {
      sharesOutstanding = Number(quote.sharesOutstanding)
      sharesSource = 'quote.sharesOutstanding'
    } else if (quote?.marketCap && quote?.price && quote.price > 0) {
      // Calculate from quote's marketCap and price
      sharesOutstanding = Number(quote.marketCap) / quote.price
      sharesSource = 'calculated (quote.marketCap / quote.price)'
    } else if (latestCashflow?.weightedAverageShsOut && Number(latestCashflow.weightedAverageShsOut) > 0) {
      sharesOutstanding = Number(latestCashflow.weightedAverageShsOut)
      sharesSource = 'cashflow.weightedAverageShsOut'
    } else if (latestCashflow?.weightedAverageShsOutDil && Number(latestCashflow.weightedAverageShsOutDil) > 0) {
      sharesOutstanding = Number(latestCashflow.weightedAverageShsOutDil)
      sharesSource = 'cashflow.weightedAverageShsOutDil'
    } else if (latestKeyMetrics?.marketCap && quote?.price && quote.price > 0) {
      // Calculate shares from market cap and current price
      sharesOutstanding = Number(latestKeyMetrics.marketCap) / quote.price
      sharesSource = 'calculated (keyMetrics.marketCap / quote.price)'
    } else if (latestKeyMetrics?.marketCap && profile?.price && profile.price > 0) {
      // Use profile price if quote price not available
      sharesOutstanding = Number(latestKeyMetrics.marketCap) / profile.price
      sharesSource = 'calculated (keyMetrics.marketCap / profile.price)'
    } else if (profile?.mktCap && profile?.price && profile.price > 0) {
      // Last resort: use profile market cap and price
      sharesOutstanding = Number(profile.mktCap) / profile.price
      sharesSource = 'calculated (profile.mktCap / profile.price)'
    }
    
    // Validation: Shares should be reasonable (> 1 million for any public company)
    if (sharesOutstanding < 1_000_000) {
      // Continue anyway - some small companies or special cases might have low share counts
    }
    
    // Get current price (from quote or profile)
    const currentPrice = quote?.price 
      || profile?.price 
      || (latestKeyMetrics?.marketCap && sharesOutstanding > 0 
        ? Number(latestKeyMetrics.marketCap) / sharesOutstanding 
        : 0)
    
    if (!currentPrice || currentPrice <= 0) {
      return null
    }

    
    // Get cash and debt from balance sheet
    const latestBalance = balanceAnnual[0]
    const cashAndEquivalents = latestBalance 
      ? Number(latestBalance.cashAndCashEquivalents) || 0 
      : 0
    const totalDebt = latestBalance 
      ? Number(latestBalance.totalDebt) || 0 
      : 0
    
    // Calculate historical FCF growth rate (3-year CAGR)
    let historicalGrowthRate = 10 // Default 10% if can't calculate
    if (cashflowAnnual.length >= 4 && cashflowAnnual[3]) {
      const oldestFcf = Number(cashflowAnnual[3].freeCashFlow) || 0
      if (currentFcf > 0 && oldestFcf > 0) {
        historicalGrowthRate = calculateCAGR(oldestFcf, currentFcf, 3)
      }
    }
    
    // Get company info
    const companyName = profile?.companyName || 'Unknown Company'
    const ticker = profile?.symbol || batchData.ticker || 'N/A'
    const image = profile?.image || null
    
    // Get TTM EPS, P/E ratio, and EPS growth
    // Priority 1: Use TTM data (most current)
    // Priority 2: Fall back to quote/annual data
    const ratiosTTM = (data as any).ratiosTTM?.[0] || null
    
    // EPS from quote (already TTM)
    // Ensure we extract a number value, not an object
    const eps = Number(quote?.eps) || 0
    
    // P/E Ratio - prefer TTM, fallback to annual
    let currentPE = 0
    if (ratiosTTM?.peRatioTTM) {
      currentPE = Number(ratiosTTM.peRatioTTM) || 0
    } else if (ratiosTTM?.priceEarningsRatioTTM) {
      currentPE = Number(ratiosTTM.priceEarningsRatioTTM) || 0
    } else {
      // Fallback to annual data if TTM not available
      const ratiosAnnual = data.ratiosAnnual?.[0]
      currentPE = Number(ratiosAnnual?.priceEarningsRatio) || 0
    }
    
    // EPS Growth - calculate from quarterly data for TTM comparison
    const incomeQuarter = data.incomeQuarter || []
    let epsGrowth = 0
    
    if (incomeQuarter.length >= 8) {
      // Compare TTM (last 4 quarters) vs previous TTM (quarters 5-8)
      const ttmEps = incomeQuarter.slice(0, 4).reduce((sum, q) => sum + (Number(q.eps) || 0), 0)
      const prevTtmEps = incomeQuarter.slice(4, 8).reduce((sum, q) => sum + (Number(q.eps) || 0), 0)
      
      if (ttmEps !== 0 && prevTtmEps !== 0) {
        epsGrowth = ((ttmEps - prevTtmEps) / Math.abs(prevTtmEps)) * 100
      }
    } else if (incomeQuarter.length >= 4) {
      // If we don't have 8 quarters, compare latest quarter to year-ago quarter
      const latestEps = Number(incomeQuarter[0]?.eps) || 0
      const yearAgoEps = Number(incomeQuarter[3]?.eps) || 0
      
      if (latestEps !== 0 && yearAgoEps !== 0) {
        epsGrowth = ((latestEps - yearAgoEps) / Math.abs(yearAgoEps)) * 100
      }
    } else {
      // Final fallback to annual data
      const incomeAnnual = data.incomeAnnual || []
      if (incomeAnnual.length >= 2) {
        const latestEps = Number(incomeAnnual[0]?.eps) || 0
        const previousEps = Number(incomeAnnual[1]?.eps) || 0
        if (latestEps > 0 && previousEps > 0) {
          epsGrowth = ((latestEps - previousEps) / Math.abs(previousEps)) * 100
        }
      }
    }
    
    return {
      currentFcf,
      sharesOutstanding,
      cashAndEquivalents,
      totalDebt,
      currentPrice,
      historicalGrowthRate: Math.round(historicalGrowthRate * 10) / 10,
      eps,
      currentPE,
      epsGrowth: Math.round(epsGrowth * 10) / 10,
      companyName,
      ticker,
      image,
      lastUpdated: batchData.timestamp || new Date().toISOString(),
      // Additional context
      fcfHistory: cashflowAnnual.slice(0, 4).map(cf => ({
        date: cf.date,
        fcf: Number(cf.freeCashFlow) || 0,
        year: new Date(cf.date).getFullYear()
      }))
    }
  } catch (_error) {
    console.error('[DCF Data] Error extracting data from batch:', _error)
    return null
  }
}

/**
 * Validate if batch data has sufficient information for DCF calculation
 * 
 * @param batchData - Batch data from ticker store
 * @returns Validation result
 */
export function validateDcfData(batchData: BatchData | null): ValidationResult {
  const missingFields: string[] = []
  const details: Record<string, string> = {}
  
  if (!batchData || !batchData.data) {
    return { 
      valid: false, 
      missingFields: ['Batch data'], 
      details: { error: 'No batch data available' }
    }
  }
  
  const data = batchData.data
  
  // Check for required data arrays
  if (!data.cashflowAnnual || data.cashflowAnnual.length === 0) {
    missingFields.push('Cash flow statements')
    details.cashflow = 'No cash flow data'
  } else {
    const latestCashflow = data.cashflowAnnual[0]
    if (latestCashflow && (!latestCashflow.freeCashFlow || Number(latestCashflow.freeCashFlow) === 0)) {
      missingFields.push('Free cash flow values')
      details.fcf = 'FCF is zero or missing'
    }
  }
  
  if (!data.quote || data.quote.length === 0) {
    missingFields.push('Stock quote')
    details.quote = 'No quote data'
  } else {
    const quote = data.quote[0]
    if (quote && (!quote.price || Number(quote.price) <= 0)) {
      missingFields.push('Current stock price')
      details.price = 'Price is zero or missing'
    }
    if (quote && (!quote.sharesOutstanding || Number(quote.sharesOutstanding) <= 0)) {
      // Check alternate source
      const latestCashflow = data.cashflowAnnual?.[0]
      if (!latestCashflow?.weightedAverageShsOut || Number(latestCashflow.weightedAverageShsOut) <= 0) {
        missingFields.push('Shares outstanding')
        details.shares = 'No shares data in quote or cashflow'
      }
    }
  }
  
  if (!data.balanceAnnual || data.balanceAnnual.length === 0) {
    missingFields.push('Balance sheet')
    details.balance = 'No balance sheet data'
  }
  
  return {
    valid: missingFields.length === 0,
    missingFields,
    details
  }
}
