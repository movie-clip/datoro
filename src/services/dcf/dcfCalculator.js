/**
 * DCF (Discounted Cash Flow) Calculator Service
 * 
 * Implements discounted cash flow valuation methodology:
 * 1. Project future free cash flows based on growth rate
 * 2. Calculate terminal value using perpetuity growth model
 * 3. Discount all cash flows to present value
 * 4. Sum to get enterprise value
 * 5. Convert to equity value per share
 */

/**
 * Calculate intrinsic value using DCF model
 * 
 * @param {Object} inputs - DCF model inputs
 * @param {number} inputs.fcfGrowthRate - Annual FCF growth rate (%)
 * @param {number} inputs.terminalGrowthRate - Terminal/perpetual growth rate (%)
 * @param {number} inputs.discountRate - Discount rate / WACC (%)
 * @param {number} inputs.projectionYears - Number of years to project
 * @param {Object} companyData - Company financial data
 * @param {number} companyData.currentFcf - Most recent free cash flow
 * @param {number} companyData.sharesOutstanding - Shares outstanding (in millions)
 * @param {number} companyData.cashAndEquivalents - Current cash position
 * @param {number} companyData.totalDebt - Current total debt
 * @param {number} companyData.currentPrice - Current stock price
 * 
 * @returns {Object} Calculation results
 * @returns {number} return.intrinsicValue - Calculated intrinsic value per share
 * @returns {Array<{year: number, price: number, fcf: number, pv: number}>} return.projectedPrices - Year-by-year projections
 * @returns {number} return.upside - Upside/downside percentage vs current price
 * @returns {number} return.enterpriseValue - Total enterprise value
 * @returns {number} return.terminalValue - Terminal value (undiscounted)
 */
export function calculateIntrinsicValue(inputs, companyData) {
  const {
    fcfGrowthRate = 10,
    terminalGrowthRate = 2.5,
    discountRate = 10,
    projectionYears = 10
  } = inputs

  const {
    currentFcf = 0,
    sharesOutstanding = 1,
    cashAndEquivalents = 0,
    totalDebt = 0,
    currentPrice = 100
  } = companyData || {}

  // Validate inputs
  if (currentFcf <= 0 || sharesOutstanding <= 0) {
    console.warn('[DCF] Invalid company data:', { currentFcf, sharesOutstanding })
    return {
      intrinsicValue: null,
      projectedPrices: [],
      upside: null,
      enterpriseValue: null,
      terminalValue: null
    }
  }

  // Convert percentages to decimals
  const g = fcfGrowthRate / 100
  const tg = terminalGrowthRate / 100
  const r = discountRate / 100

  // Project future FCFs and calculate present values
  const fcfProjections = []
  let fcf = currentFcf
  let totalPV = 0
  const currentYear = new Date().getFullYear()

  for (let year = 1; year <= projectionYears; year++) {
    // Project FCF with growth rate
    fcf = fcf * (1 + g)
    
    // Calculate present value of this year's FCF
    const discountFactor = Math.pow(1 + r, year)
    const pv = fcf / discountFactor
    
    totalPV += pv
    
    fcfProjections.push({
      year: currentYear + year,
      fcf: Math.round(fcf),
      pv: Math.round(pv)
    })
  }

  // Calculate terminal value using perpetuity growth model
  // TV = FCF(final year) * (1 + terminal growth) / (discount rate - terminal growth)
  const finalYearFcf = fcf
  const terminalValue = (finalYearFcf * (1 + tg)) / (r - tg)
  
  // Discount terminal value to present
  const terminalPV = terminalValue / Math.pow(1 + r, projectionYears)
  
  // Enterprise value = sum of discounted FCFs + discounted terminal value
  const enterpriseValue = totalPV + terminalPV
  
  // Equity value = enterprise value + cash - debt
  const equityValue = enterpriseValue + cashAndEquivalents - totalDebt
  
  // Intrinsic value per share
  const intrinsicValue = equityValue / sharesOutstanding

  // Calculate future stock prices based on FCF growth
  // Assumption: If the company grows FCF at the projected rate, 
  // the stock price should grow proportionally (maintaining same FCF yield)
  const projectedPrices = []
  
  // Current FCF yield = Current FCF / Market Cap
  const currentMarketCap = currentPrice * sharesOutstanding
  const currentFcfYield = currentFcf / currentMarketCap
  
  fcf = currentFcf // Reset FCF counter
  for (let i = 0; i < fcfProjections.length; i++) {
    const yearData = fcfProjections[i]
    fcf = fcfProjections[i].fcf // Use projected FCF
    
    // If FCF grows, and we maintain the same FCF yield, market cap should grow proportionally
    // Market Cap = FCF / FCF Yield
    const projectedMarketCap = fcf / currentFcfYield
    const projectedPrice = projectedMarketCap / sharesOutstanding
    
    projectedPrices.push({
      year: yearData.year,
      fcf: yearData.fcf,
      pv: yearData.pv,
      price: Math.round(projectedPrice * 100) / 100
    })
  }

  // Calculate upside/downside
  const upside = ((intrinsicValue - currentPrice) / currentPrice) * 100

  return {
    intrinsicValue: Math.round(intrinsicValue * 100) / 100,
    projectedPrices,
    upside: Math.round(upside * 10) / 10,
    enterpriseValue: Math.round(enterpriseValue),
    terminalValue: Math.round(terminalValue),
    equityValue: Math.round(equityValue)
  }
}

/**
 * Get recommendation based on upside percentage
 * 
 * @param {number} upside - Upside/downside percentage
 * @returns {Object} Recommendation
 * @returns {string} return.label - Recommendation label (e.g., "Strong Buy")
 * @returns {string} return.color - Color code for UI display
 */
export function getRecommendation(upside) {
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
