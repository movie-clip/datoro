/**
 * DCF Data Extraction Service
 * Extracts DCF-relevant financial data from ticker batch data
 */

/**
 * Calculate CAGR (Compound Annual Growth Rate)
 * @param {number} startValue - Starting value
 * @param {number} endValue - Ending value
 * @param {number} years - Number of years
 * @returns {number} CAGR as percentage
 */
function calculateCAGR(startValue, endValue, years) {
  if (startValue <= 0 || endValue <= 0 || years <= 0) {
    return 0
  }
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100
}

/**
 * Extract company data needed for DCF calculation from batch data
 * 
 * @param {Object} batchData - Batch data from ticker store
 * @returns {Object} DCF-ready company data
 * @returns {number} return.currentFcf - Most recent free cash flow
 * @returns {number} return.sharesOutstanding - Shares outstanding (in millions)
 * @returns {number} return.cashAndEquivalents - Current cash position
 * @returns {number} return.totalDebt - Current total debt
 * @returns {number} return.currentPrice - Current stock price
 * @returns {number} return.historicalGrowthRate - 3-year FCF CAGR (%)
 * @returns {string} return.companyName - Company name
 * @returns {string} return.ticker - Stock ticker
 * @returns {string} return.lastUpdated - Last data update timestamp
 */
export function getDcfDataFromBatch(batchData) {
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
    
    // Get most recent FCF from cash flow statement
    const latestCashflow = cashflowAnnual[0] // Most recent year
    const currentFcf = latestCashflow 
      ? Number(latestCashflow.freeCashFlow) || 0 
      : 0
    
    // Get shares outstanding  
    // Try multiple sources with defensive checks
    // FMP returns shares in actual count (e.g., 15,204,000,000 for AAPL)
    let sharesOutstanding = 0
    
    if (quote?.sharesOutstanding && Number(quote.sharesOutstanding) > 0) {
      sharesOutstanding = Number(quote.sharesOutstanding)
    } else if (latestCashflow?.weightedAverageShsOut && Number(latestCashflow.weightedAverageShsOut) > 0) {
      sharesOutstanding = Number(latestCashflow.weightedAverageShsOut)
    } else if (latestCashflow?.weightedAverageShsOutDil && Number(latestCashflow.weightedAverageShsOutDil) > 0) {
      sharesOutstanding = Number(latestCashflow.weightedAverageShsOutDil)
    }
    
    // Validation: Shares should be reasonable (> 1 million for any public company)
    if (sharesOutstanding < 1_000_000) {
      console.warn('[DCF Data] Suspicious shares outstanding:', sharesOutstanding, 'for ticker:', batchData.ticker)
    }
    
    // Get current price
    const currentPrice = quote?.price || 0
    
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
    if (cashflowAnnual.length >= 4) {
      const oldestFcf = Number(cashflowAnnual[3].freeCashFlow) || 0
      if (currentFcf > 0 && oldestFcf > 0) {
        historicalGrowthRate = calculateCAGR(oldestFcf, currentFcf, 3)
      }
    }
    
    // Get company info
    const companyName = profile?.companyName || 'Unknown Company'
    const ticker = profile?.symbol || batchData.ticker || 'N/A'
    const image = profile?.image || null
    
    // Get EPS, P/E ratio from quote and ratios
    const eps = quote?.eps || 0
    const ratios = data.ratiosAnnual?.[0]
    const currentPE = ratios?.priceEarningsRatio || 0
    
    // Calculate EPS growth rate (using income statements if available)
    const incomeAnnual = data.incomeAnnual || []
    let epsGrowth = 0
    if (incomeAnnual.length >= 2) {
      const latestEps = incomeAnnual[0]?.eps || 0
      const previousEps = incomeAnnual[1]?.eps || 0
      if (latestEps > 0 && previousEps > 0) {
        epsGrowth = ((latestEps - previousEps) / Math.abs(previousEps)) * 100
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
  } catch (error) {
    console.error('[DCF Data] Error extracting data from batch:', error)
    return null
  }
}

/**
 * Validate if batch data has sufficient information for DCF calculation
 * 
 * @param {Object} batchData - Batch data from ticker store
 * @returns {Object} Validation result
 * @returns {boolean} return.valid - Whether data is valid for DCF
 * @returns {Array<string>} return.missingFields - List of missing required fields
 * @returns {Object} return.details - Detailed validation info for debugging
 */
export function validateDcfData(batchData) {
  const missingFields = []
  const details = {}
  
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
    if (!latestCashflow.freeCashFlow || Number(latestCashflow.freeCashFlow) === 0) {
      missingFields.push('Free cash flow values')
      details.fcf = 'FCF is zero or missing'
    }
  }
  
  if (!data.quote || data.quote.length === 0) {
    missingFields.push('Stock quote')
    details.quote = 'No quote data'
  } else {
    const quote = data.quote[0]
    if (!quote.price || Number(quote.price) <= 0) {
      missingFields.push('Current stock price')
      details.price = 'Price is zero or missing'
    }
    if (!quote.sharesOutstanding || Number(quote.sharesOutstanding) <= 0) {
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
