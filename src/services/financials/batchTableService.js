// src/services/financials/batchTableService.js
// Optimized table data functions using batch endpoint data
// Instead of 12+ API calls, uses data from single batch endpoint

/**
 * Format number with B/M/K suffix
 */
function fmtNumber(num) {
  if (!num || isNaN(num)) return '—'
  const n = Number(num)
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(2)}K`
  return `$${n.toFixed(2)}`
}

/**
 * Get valuation metrics from batch data
 * Replaces 5-6 API calls with data from batch endpoint
 */
export function getValuationFromBatch(batchData) {
  const out = { marketCap: '—', pe: '—', fpe: '—', ps: '—', pb: '—', evEbitda: '—' }
  
  if (!batchData?.data) return out
  
  try {
    const { profile, ratiosAnnual, keyMetrics } = batchData.data
    
    // Market Cap from profile
    if (profile && Array.isArray(profile) && profile[0]?.mktCap) {
      out.marketCap = fmtNumber(profile[0].mktCap)
    }
    
    // Get most recent ratios
    if (ratiosAnnual && Array.isArray(ratiosAnnual) && ratiosAnnual.length > 0) {
      const ratios = ratiosAnnual[0]
      
      if (ratios.priceEarningsRatio) {
        out.pe = ratios.priceEarningsRatio.toFixed(2)
      }
      if (ratios.priceToSalesRatio) {
        out.ps = ratios.priceToSalesRatio.toFixed(2)
      }
      if (ratios.priceToBookRatio) {
        out.pb = ratios.priceToBookRatio.toFixed(2)
      }
      if (ratios.enterpriseValueMultiple) {
        out.evEbitda = ratios.enterpriseValueMultiple.toFixed(2)
      }
    }
    
    // Fallback to key metrics for EV/EBITDA
    if (out.evEbitda === '—' && keyMetrics && Array.isArray(keyMetrics) && keyMetrics[0]?.evToEBITDA) {
      out.evEbitda = keyMetrics[0].evToEBITDA.toFixed(2)
    }
    
    // Calculate Forward P/E if we have analyst estimates (from batch)
    // Note: Batch endpoint includes earningsCalendar, not analyst-estimates
    // This is a limitation - FPE calculation requires separate endpoint
    // For now, leave as '—' or fetch separately if needed
    
  } catch (error) {
    console.error('[BatchTableService] getValuationFromBatch error:', error)
  }
  
  return out
}

/**
 * Get cash flow facts from batch data
 * Replaces 3 API calls with data from batch endpoint
 */
export function getCashFlowFactsFromBatch(batchData) {
  const out = { fcfYield: '—', fcfYieldAdjSBC: '—', sbcImpact: '—' }
  
  if (!batchData?.data) return out
  
  try {
    const { cashflowQuarter, profile, keyMetrics } = batchData.data
    
    if (!cashflowQuarter || !Array.isArray(cashflowQuarter) || cashflowQuarter.length < 4) {
      return out
    }
    
    // Calculate TTM (Trailing Twelve Months) from last 4 quarters
    let sbcTTM = 0, fcfTTM = 0
    for (let i = 0; i < 4; i++) {
      const row = cashflowQuarter[i]
      sbcTTM += Number(row.stockBasedCompensation) || 0
      fcfTTM += Number(row.freeCashFlow) || 0
    }
    
    // Get market cap from profile
    let marketCap = 0
    if (profile && Array.isArray(profile) && profile[0]?.mktCap) {
      marketCap = Number(profile[0].mktCap) || 0
    }
    
    // Calculate FCF yields
    if (marketCap > 0) {
      const fcfYieldValue = (fcfTTM / marketCap) * 100
      const adjFcfTTM = fcfTTM - sbcTTM
      const fcfYieldAdjSBCValue = (adjFcfTTM / marketCap) * 100
      
      out.fcfYield = fcfYieldValue.toFixed(2) + '%'
      out.fcfYieldAdjSBC = fcfYieldAdjSBCValue.toFixed(2) + '%'
      
      // Calculate SBC Impact as percentage difference
      if (fcfYieldValue !== 0) {
        const sbcImpactValue = ((fcfYieldValue - fcfYieldAdjSBCValue) / Math.abs(fcfYieldValue)) * 100
        out.sbcImpact = sbcImpactValue.toFixed(2) + '%'
      }
    } else if (keyMetrics && Array.isArray(keyMetrics) && keyMetrics[0]?.freeCashFlowYield) {
      // Fallback to key metrics
      out.fcfYield = (keyMetrics[0].freeCashFlowYield * 100).toFixed(2) + '%'
    }
    
  } catch (error) {
    console.error('[BatchTableService] getCashFlowFactsFromBatch error:', error)
  }
  
  return out
}

/**
 * Get margins and growth from batch data
 * Replaces 2 API calls with data from batch endpoint
 */
export function getMarginsGrowthFromBatch(batchData) {
  const out = { profitMargin: '—', operatingMargin: '—', earningsYoY: '—', revenueYoY: '—' }
  
  if (!batchData?.data) return out
  
  try {
    const { ratiosAnnual, incomeQuarter } = batchData.data
    
    // Get margins from most recent quarter ratios
    // Note: Batch fetches annual ratios, but we need quarterly for latest margins
    // This is a limitation - for now use annual data
    if (ratiosAnnual && Array.isArray(ratiosAnnual) && ratiosAnnual.length > 0) {
      const ratios = ratiosAnnual[0]
      
      if (ratios.netProfitMargin) {
        out.profitMargin = (ratios.netProfitMargin * 100).toFixed(2) + '%'
      }
      if (ratios.operatingProfitMargin) {
        out.operatingMargin = (ratios.operatingProfitMargin * 100).toFixed(2) + '%'
      }
    }
    
    // Calculate YoY growth from quarterly income statements
    if (incomeQuarter && Array.isArray(incomeQuarter) && incomeQuarter.length >= 5) {
      // Compare most recent quarter (index 0) with same quarter last year (index 4)
      const currentQ = incomeQuarter[0]
      const yearAgoQ = incomeQuarter[4]
      
      // Quarterly Earnings YoY growth
      const currentEarnings = Number(currentQ.netIncome) || 0
      const yearAgoEarnings = Number(yearAgoQ.netIncome) || 0
      if (yearAgoEarnings !== 0) {
        const earningsGrowth = ((currentEarnings - yearAgoEarnings) / Math.abs(yearAgoEarnings)) * 100
        out.earningsYoY = earningsGrowth.toFixed(2) + '%'
      }
      
      // Quarterly Revenue YoY growth
      const currentRevenue = Number(currentQ.revenue) || 0
      const yearAgoRevenue = Number(yearAgoQ.revenue) || 0
      if (yearAgoRevenue !== 0) {
        const revenueGrowth = ((currentRevenue - yearAgoRevenue) / yearAgoRevenue) * 100
        out.revenueYoY = revenueGrowth.toFixed(2) + '%'
      }
    }
    
  } catch (error) {
    console.error('[BatchTableService] getMarginsGrowthFromBatch error:', error)
  }
  
  return out
}

/**
 * Get balance sheet data from batch data
 * Replaces 2 API calls with data from batch endpoint
 */
export function getBalanceFromBatch(batchData) {
  const out = { cash: '—', debt: '—', net: '—', altmanZScore: '—', altmanZColor: 'grey' }
  
  if (!batchData?.data) return out
  
  try {
    const { balanceAnnual, financialScores } = batchData.data
    
    if (!balanceAnnual || !Array.isArray(balanceAnnual) || balanceAnnual.length === 0) {
      return out
    }
    
    const balance = balanceAnnual[0]
    
    // Cash = Cash and Cash Equivalents + Short Term Investments
    const cashEquiv = Number(balance.cashAndCashEquivalents) || 0
    const shortTermInv = Number(balance.shortTermInvestments) || 0
    const totalCash = cashEquiv + shortTermInv
    
    const totalDebt = Number(balance.totalDebt) || 0
    const netDebt = totalCash - totalDebt
    
    out.cash = fmtNumber(totalCash)
    out.debt = fmtNumber(totalDebt)
    out.net = fmtNumber(netDebt)
    
    // Process Altman Z-Score
    if (financialScores && Array.isArray(financialScores) && financialScores.length > 0) {
      const zScoreData = financialScores[0]
      if (zScoreData.altmanZScore) {
        const zScore = Number(zScoreData.altmanZScore)
        if (!isNaN(zScore)) {
          out.altmanZScore = zScore.toFixed(2)
          // Determine color based on Z-Score ranges
          // > 2.99: Safe (green), 1.81-2.99: Grey zone (grey), < 1.81: Distress (red)
          if (zScore > 2.99) {
            out.altmanZColor = 'green'
          } else if (zScore < 1.81) {
            out.altmanZColor = 'red'
          } else {
            out.altmanZColor = 'grey'
          }
        }
      }
    }
    
  } catch (error) {
    console.error('[BatchTableService] getBalanceFromBatch error:', error)
  }
  
  return out
}
