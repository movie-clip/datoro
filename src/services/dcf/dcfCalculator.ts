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

interface DcfInputs {
  fcfGrowthRate?: number
  peRatio?: number
  discountRate?: number
  projectionYears?: number
}

interface CompanyData {
  eps?: number
  currentPrice?: number
  sharesOutstanding?: number
}

interface ProjectedPrice {
  year: number
  eps: number
  price: number
  futurePrice: number
}

interface IntrinsicValueResult {
  intrinsicValue: number | null
  projectedPrices: ProjectedPrice[]
  upside: number | null
  annualizedReturn: number | null
  futureValue: number | null
  futureEPS?: number
  error?: string | null
}

interface Recommendation {
  label: string
  color: string
}

/**
 * Calculate target price using PEG-based growth model
 * 
 * @param inputs - Valuation model inputs
 * @param inputs.fcfGrowthRate - Annual EPS growth rate (%) - Note: using fcfGrowthRate for compatibility
 * @param inputs.peRatio - Target P/E ratio for valuation
 * @param inputs.discountRate - Expected return rate (%) - used for comparison, not discounting
 * @param inputs.projectionYears - Number of years to project (default: 10)
 * @param companyData - Company financial data
 * @param companyData.eps - Current earnings per share
 * @param companyData.currentPrice - Current stock price
 * @param companyData.sharesOutstanding - Shares outstanding (for projections)
 * 
 * @returns Calculation results
 */
export function calculateIntrinsicValue(inputs: DcfInputs, companyData: CompanyData | null): IntrinsicValueResult {
  const {
    fcfGrowthRate = 10,      // Using as EPS growth rate
    peRatio = 20,
    discountRate: _discountRate = 10,       // Using as expected return benchmark
    projectionYears = 10
  } = inputs

  const {
    eps = 0,
    currentPrice = 100
  } = companyData || {}

  // Validate inputs
  if (eps <= 0) {
    // Only log in development - this is expected for unprofitable companies
    if (import.meta.env.DEV) {
      console.info('[PEG Valuation] Skipping - EPS not positive:', eps, '(Company may be unprofitable)')
    }
    return {
      intrinsicValue: null,
      projectedPrices: [],
      upside: null,
      annualizedReturn: null,
      futureValue: null,
      error: eps < 0 
        ? 'PEG model requires positive earnings. This company is currently unprofitable. Consider using FCF-based valuation or revenue multiples.'
        : 'Earnings data not available for this ticker.'
    }
  }

  // Convert percentages to decimals
  const growthRate = fcfGrowthRate / 100

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
  const projectedPrices: ProjectedPrice[] = []
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
 * @param upside - Upside/downside percentage
 * @returns Recommendation
 */
export function getRecommendation(upside: number | null): Recommendation {
  if (upside === null || isNaN(upside)) {
    return { label: 'N/A', color: '#95a5a6' }
  }
  
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
