// src/services/health/healthIndicatorService.js
// Health indicator calculations extracted from HeroSection
// Testable, reusable, and cacheable

import { getCachedGrowthRates } from '../financials/growthService.js'
import { getRevenueSeriesFromBatch, getNetIncomeSeriesFromBatch } from '../financials/batchChartService.js'

/**
 * Calculate valuation health score from P/E, P/S, and EV/EBITDA
 * 
 * @param {Object} valuation - Valuation metrics { pe, ps, evEbitda }
 * @returns {Object|null} Health indicator or null if no valid metrics
 */
export function calculateValuationHealth(valuation) {
  const { pe, ps, evEbitda } = valuation
  
  let valuationScore = 0
  let validMetrics = 0
  
  // Score P/E Ratio (lower is better)
  if (!isNaN(pe) && pe > 0) {
    validMetrics++
    if (pe < 20) valuationScore += 2      // Good
    else if (pe < 25) valuationScore += 1  // Neutral
    else valuationScore += 0               // Overvalued
  }
  
  // Score P/S Ratio (lower is better)
  if (!isNaN(ps) && ps > 0) {
    validMetrics++
    if (ps < 3) valuationScore += 2        // Good
    else if (ps < 5) valuationScore += 1   // Neutral
    else valuationScore += 0               // Overvalued
  }
  
  // Score EV/EBITDA (lower is better)
  if (!isNaN(evEbitda) && evEbitda > 0) {
    validMetrics++
    if (evEbitda < 10) valuationScore += 2    // Good
    else if (evEbitda < 15) valuationScore += 1  // Neutral
    else valuationScore += 0                  // Overvalued
  }
  
  // Need at least one valid metric
  if (validMetrics === 0) return null
  
  // Calculate average score (0-2 range)
  const avgScore = valuationScore / validMetrics
  
  // Determine status and tooltip
  if (avgScore >= 1.5) {
    return {
      label: 'Valuation',
      status: 'good',
      tooltip: `Attractive valuation (P/E: ${pe}, P/S: ${ps}, EV/EBITDA: ${evEbitda})`
    }
  } else if (avgScore >= 0.8) {
    return {
      label: 'Valuation',
      status: 'neutral',
      tooltip: `Fair valuation (P/E: ${pe}, P/S: ${ps}, EV/EBITDA: ${evEbitda})`
    }
  } else {
    return {
      label: 'Valuation',
      status: 'warning',
      tooltip: `Expensive valuation (P/E: ${pe}, P/S: ${ps}, EV/EBITDA: ${evEbitda})`
    }
  }
}

/**
 * Calculate performance health score from revenue growth, net income growth, and FCF yield
 * Uses cached growth calculations to prevent duplicate work
 * 
 * @param {Object} batchData - Batch API response
 * @param {string} ticker - Ticker symbol for caching
 * @param {number} fcfYield - FCF Yield percentage
 * @returns {Object|null} Health indicator or null if insufficient data
 */
export function calculatePerformanceHealth(batchData, ticker, fcfYield) {
  // Get revenue and net income data for growth calculation
  const revenueSeries = getRevenueSeriesFromBatch(batchData, 'annual')
  const netIncomeSeries = getNetIncomeSeriesFromBatch(batchData, 'annual')
  
  // Use CACHED growth calculations - prevents duplicate work
  const revenueGrowthRates = getCachedGrowthRates(revenueSeries, ticker, 'revenue')
  const netIncomeGrowthRates = getCachedGrowthRates(netIncomeSeries, ticker, 'netIncome')
  
  // Use 5-year if available, otherwise 2-year, otherwise 1-year
  const revenueGrowth = revenueGrowthRates.twoYear ?? revenueGrowthRates.oneYear
  const netIncomeGrowth = netIncomeGrowthRates.twoYear ?? netIncomeGrowthRates.oneYear
  
  // Score each component on 0-1-2 scale
  let revGrowthScore = 0
  let niGrowthScore = 0
  let fcfYieldScore = 0
  
  // Score revenue growth (0-2 scale)
  if (revenueGrowth !== null && !isNaN(revenueGrowth)) {
    if (revenueGrowth < 0) {
      revGrowthScore = 0  // Negative growth
    } else if (revenueGrowth < 10) {
      revGrowthScore = 1  // Positive but less than 10%
    } else {
      revGrowthScore = 2  // 10% or higher
    }
  }
  
  // Score net income growth (0-2 scale)
  if (netIncomeGrowth !== null && !isNaN(netIncomeGrowth)) {
    if (netIncomeGrowth < 0) {
      niGrowthScore = 0  // Negative growth
    } else if (netIncomeGrowth < 10) {
      niGrowthScore = 1  // Positive but less than 10%
    } else {
      niGrowthScore = 2  // 10% or higher
    }
  }
  
  // Score FCF Yield (0-2 scale)
  const fcfYieldNum = parseFloat(fcfYield)
  if (!isNaN(fcfYieldNum)) {
    if (fcfYieldNum < 0.5) {
      fcfYieldScore = 0  // Negative FCF
    } else if (fcfYieldNum <= 2) {
      fcfYieldScore = 1  // 0-2%
    } else {
      fcfYieldScore = 2  // > 2%
    }
  }
  
  // Calculate weighted final score
  // Revenue growth: 25% weight, Net Income growth: 25% weight, FCF Yield: 50% weight
  const totalScore = (revGrowthScore * 0.25) + (niGrowthScore * 0.25) + (fcfYieldScore * 0.5)
  
  // Format growth values for tooltip
  const revGrowthStr = revenueGrowth !== null ? `${revenueGrowth.toFixed(1)}%` : 'N/A'
  const niGrowthStr = netIncomeGrowth !== null ? `${netIncomeGrowth.toFixed(1)}%` : 'N/A'
  const fcfYieldStr = !isNaN(fcfYieldNum) ? `${fcfYieldNum.toFixed(1)}%` : 'N/A'
  
  // Determine status based on score
  // Score interpretation (max score = 2.0)
  // Strong: >= 1.5 (avg of 75%+ per metric)
  // Moderate: 0.75-1.5 (avg of 37.5%-75% per metric)
  // Weak: < 0.75
  if (totalScore >= 1.5) {
    return {
      label: 'Performance',
      status: 'good',
      tooltip: `Rev Growth: ${revGrowthStr} | NI Growth: ${niGrowthStr} | FCF Yield: ${fcfYieldStr}`
    }
  } else if (totalScore >= 0.75) {
    return {
      label: 'Performance',
      status: 'neutral',
      tooltip: `Rev Growth: ${revGrowthStr} | NI Growth: ${niGrowthStr} | FCF Yield: ${fcfYieldStr}`
    }
  } else {
    return {
      label: 'Performance',
      status: 'warning',
      tooltip: `Rev Growth: ${revGrowthStr} | NI Growth: ${niGrowthStr} | FCF Yield: ${fcfYieldStr}`
    }
  }
}

/**
 * Calculate balance sheet health from Altman Z-Score
 * 
 * @param {Object} balance - Balance sheet data with altmanZScore
 * @returns {Object|null} Health indicator or null if no Z-Score
 */
export function calculateBalanceHealth(balance) {
  const { altmanZScore } = balance
  const altmanZ = parseFloat(altmanZScore)
  
  if (isNaN(altmanZ)) return null
  
  // Altman Z-Score ranges: > 2.99 = Safe, 1.81-2.99 = Grey zone, < 1.81 = Distress
  if (altmanZ > 2.99) {
    return {
      label: 'Balance',
      status: 'good',
      tooltip: `Altman Z-Score: ${altmanZScore} - Safe zone (low bankruptcy risk)`
    }
  } else if (altmanZ >= 1.81) {
    return {
      label: 'Balance',
      status: 'neutral',
      tooltip: `Altman Z-Score: ${altmanZScore} - Grey zone (moderate risk)`
    }
  } else {
    return {
      label: 'Balance',
      status: 'warning',
      tooltip: `Altman Z-Score: ${altmanZScore} - Distress zone (higher bankruptcy risk)`
    }
  }
}

/**
 * Calculate all health indicators at once
 * 
 * @param {Object} params - All required data
 * @param {Object} params.valuation - Valuation metrics
 * @param {Object} params.batchData - Batch API data
 * @param {string} params.ticker - Ticker symbol
 * @param {string} params.fcfYield - FCF Yield percentage
 * @param {Object} params.balance - Balance sheet data
 * @returns {Array} Array of health indicators
 */
export function calculateAllHealthIndicators({ valuation, batchData, ticker, fcfYield, balance }) {
  const indicators = []
  
  // Calculate each health indicator
  const valuationHealth = calculateValuationHealth(valuation)
  const performanceHealth = calculatePerformanceHealth(batchData, ticker, fcfYield)
  const balanceHealth = calculateBalanceHealth(balance)
  
  // Add non-null indicators to array
  if (valuationHealth) indicators.push(valuationHealth)
  if (performanceHealth) indicators.push(performanceHealth)
  if (balanceHealth) indicators.push(balanceHealth)
  
  return indicators
}
