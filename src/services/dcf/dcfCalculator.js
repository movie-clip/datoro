/**
 * DCF (Discounted Cash Flow) Calculator Service
 * 
 * This is a PLACEHOLDER implementation returning mock data.
 * The actual DCF calculation formula will be implemented later.
 */

/**
 * Calculate intrinsic value using DCF model
 * 
 * @param {Object} inputs - DCF model inputs
 * @param {number} inputs.fcfGrowthRate - Annual FCF growth rate (%)
 * @param {number} inputs.terminalGrowthRate - Terminal/perpetual growth rate (%)
 * @param {number} inputs.discountRate - Discount rate / WACC (%)
 * @param {number} inputs.peRatio - Target P/E ratio
 * @param {number} inputs.projectionYears - Number of years to project
 * @param {number} currentPrice - Current stock price
 * 
 * @returns {Object} Calculation results
 * @returns {number} return.intrinsicValue - Calculated intrinsic value per share
 * @returns {Array<{year: number, price: number}>} return.projectedPrices - Year-by-year price projections
 * @returns {number} return.upside - Upside/downside percentage vs current price
 */
export function calculateIntrinsicValue(inputs, currentPrice = 100) {
  const {
    fcfGrowthRate = 10,
    terminalGrowthRate = 2.5,
    discountRate = 10,
    peRatio = 20,
    projectionYears = 10
  } = inputs

  // PLACEHOLDER: Generate mock projected prices based on growth rate
  // Real implementation will use actual DCF formula
  const currentYear = new Date().getFullYear()
  const projectedPrices = []
  
  let price = currentPrice
  
  for (let i = 1; i <= projectionYears; i++) {
    // Simple compound growth for demonstration
    // Real formula will discount future cash flows
    price = price * (1 + fcfGrowthRate / 100)
    
    projectedPrices.push({
      year: currentYear + i,
      price: Math.round(price * 100) / 100
    })
  }

  // PLACEHOLDER: Calculate terminal value with P/E approach
  const terminalPrice = price * (1 + terminalGrowthRate / 100)
  
  // PLACEHOLDER: Mock intrinsic value
  // Real implementation will sum discounted cash flows + terminal value
  const intrinsicValue = Math.round(terminalPrice * 0.85 * 100) / 100

  // Calculate upside/downside
  const upside = ((intrinsicValue - currentPrice) / currentPrice) * 100

  return {
    intrinsicValue,
    projectedPrices,
    upside: Math.round(upside * 10) / 10
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
