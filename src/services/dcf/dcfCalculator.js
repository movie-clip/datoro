/**
 * PEG Ratio-Based Valuation Calculator Service
 * 
 * Implements simplified growth-based valuation methodology:
 * Formula: Target Price = Current EPS × (1 + Growth Rate)^Years × Target P/E
 * 
 * This projects future earnings based on expected growth and applies
 * a target P/E multiple to determine fair value at the end of the projection period.
 * 
 * The "Expected Return" is used to calculate what annual return you'd need
 * from current price to reach the target price, NOT to discount the target back.
 */

/**
 * Calculate target price using PEG-based growth model
 * 
 * @param {Object} inputs - Valuation model inputs
 * @param {number} inputs.fcfGrowthRate - Annual EPS growth rate (%) - Note: using fcfGrowthRate for compatibility
 * @param {number} inputs.peRatio - Target P/E ratio for valuation
 * @param {number} inputs.discountRate - Expected return rate (%) - used for comparison, not discounting
 * @param {number} inputs.projectionYears - Number of years to project (default: 10)
 * @param {Object} companyData - Company financial data
 * @param {number} companyData.eps - Current earnings per share
 * @param {number} companyData.currentPrice - Current stock price
 * @param {number} companyData.sharesOutstanding - Shares outstanding (for projections)
 * 
 * @returns {Object} Calculation results
 * @returns {number} return.intrinsicValue - Target price at end of projection period
 * @returns {Array<{year: number, price: number, eps: number}>} return.projectedPrices - Year-by-year projections
 * @returns {number} return.upside - Total upside/downside percentage vs current price
 * @returns {number} return.annualizedReturn - Implied annual return from current price to target
 * @returns {number} return.futureValue - Same as intrinsicValue (target price)
 * @returns {number} return.futureEPS - Projected EPS at end of period
 */
export function calculateIntrinsicValue(inputs, companyData) {
  const {
    fcfGrowthRate = 10,      // Using as EPS growth rate
    peRatio = 20,
    discountRate = 10,       // Using as expected return benchmark
    projectionYears = 10
  } = inputs

  const {
    eps = 0,
    currentPrice = 100
  } = companyData || {}

  // Validate inputs
  if (eps <= 0) {
    console.warn('[PEG Valuation] Invalid EPS:', { eps })
    return {
      intrinsicValue: null,
      projectedPrices: [],
      upside: null,
      annualizedReturn: null,
      futureValue: null
    }
  }

  // Convert percentages to decimals
  const growthRate = fcfGrowthRate / 100
  const expectedReturn = discountRate / 100

  // Step 1: Project future EPS based on growth rate
  // Future EPS = Current EPS × (1 + Growth Rate)^Years
  const futureEPS = eps * Math.pow(1 + growthRate, projectionYears)
  
  // Step 2: Apply target P/E ratio to get target price
  // Target Price = Future EPS × Target P/E
  const targetPrice = futureEPS * peRatio

  // Step 3: Calculate implied annual return from current price to target
  // Annualized Return = (Target Price / Current Price)^(1/Years) - 1
  const impliedReturn = Math.pow(targetPrice / currentPrice, 1 / projectionYears) - 1

  // Calculate year-by-year projections
  const projectedPrices = []
  const currentYear = new Date().getFullYear()
  
  for (let year = 1; year <= projectionYears; year++) {
    // Project EPS for this year
    const projectedEPS = eps * Math.pow(1 + growthRate, year)
    
    // Apply P/E to get price target for this year
    const yearTargetPrice = projectedEPS * peRatio
    
    projectedPrices.push({
      year: currentYear + year,
      eps: Math.round(projectedEPS * 100) / 100,
      price: Math.round(yearTargetPrice * 100) / 100,
      futurePrice: Math.round(yearTargetPrice * 100) / 100
    })
  }

  // Calculate total upside/downside
  const upside = ((targetPrice - currentPrice) / currentPrice) * 100

  return {
    intrinsicValue: Math.round(targetPrice * 100) / 100,
    projectedPrices,
    upside: Math.round(upside * 10) / 10,
    annualizedReturn: Math.round(impliedReturn * 1000) / 10, // Convert to percentage
    futureValue: Math.round(targetPrice * 100) / 100,
    futureEPS: Math.round(futureEPS * 100) / 100
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
