// src/services/financials/batchTableService.ts
// Optimized table data functions using batch endpoint data
// Instead of 12+ API calls, uses data from single batch endpoint

import type { BatchData } from '@/types'
import { formatNumber, formatPercent } from '@/utils/formatters'

interface ValuationMetrics {
  marketCap: string
  pe: string
  fpe: string
  ps: string
  pb: string
  evEbitda: string
}

interface CashFlowFacts {
  fcfYield: string
  fcfYieldAdjSBC: string
  fcfYieldAdjSBCRaw: number | null
  sbcImpact: string
}

interface MarginsGrowth {
  profitMargin: string
  operatingMargin: string
  earningsYoY: string
  revenueYoY: string
}

interface BalanceMetrics {
  cash: string
  debt: string
  net: string
  altmanZScore: string
  altmanZColor: 'green' | 'grey' | 'red'
}

/**
 * Get valuation metrics from batch data
 * Replaces 5-6 API calls with data from batch endpoint
 */
export function getValuationFromBatch(batchData: BatchData | null): ValuationMetrics {
  const out: ValuationMetrics = { marketCap: '—', pe: '—', fpe: '—', ps: '—', pb: '—', evEbitda: '—' }
  
  if (!batchData?.data) return out
  
  try {
    const { profile, quote, ratiosAnnual, keyMetrics } = batchData.data
    
    // Market Cap from profile
    if (profile && Array.isArray(profile) && profile[0]?.mktCap) {
      out.marketCap = formatNumber(profile[0].mktCap)
    }
    
    // Get most recent ratios
    if (ratiosAnnual && Array.isArray(ratiosAnnual) && ratiosAnnual.length > 0) {
      const ratios = (ratiosAnnual[0] ?? {}) as any
      
      if (ratios.priceEarningsRatio) {
        out.pe = Number(ratios.priceEarningsRatio).toFixed(2)
      }
      if (ratios.priceToSalesRatio) {
        out.ps = Number(ratios.priceToSalesRatio).toFixed(2)
      }
      if (ratios.priceToBookRatio) {
        out.pb = Number(ratios.priceToBookRatio).toFixed(2)
      }
      if (ratios.enterpriseValueMultiple) {
        out.evEbitda = Number(ratios.enterpriseValueMultiple).toFixed(2)
      }
    }
    
    // Try to get Forward P/E from keyMetrics
    if (keyMetrics && Array.isArray(keyMetrics) && keyMetrics.length > 0) {
      const metrics = (keyMetrics[0] ?? {}) as any
      
      // Check various possible field names for forward PE
      if (metrics.forwardPE) {
        out.fpe = Number(metrics.forwardPE).toFixed(2)
      } else if (metrics.peForward) {
        out.fpe = Number(metrics.peForward).toFixed(2)
      } else if (metrics.forwardPeRatio) {
        out.fpe = Number(metrics.forwardPeRatio).toFixed(2)
      }
      
      // Fallback to EV/EBITDA from keyMetrics if not in ratios
      if (out.evEbitda === '—' && metrics.evToEBITDA) {
        out.evEbitda = Number(metrics.evToEBITDA).toFixed(2)
      }
    }
    
    // Try to get Forward P/E from quote (some APIs include it here)
    if (out.fpe === '—' && quote && Array.isArray(quote) && quote.length > 0) {
      const q = (quote[0] ?? {}) as any
      if (q.forwardPE) {
        out.fpe = Number(q.forwardPE).toFixed(2)
      } else if (q.eps && q.price) {
        // Calculate trailing P/E as fallback if not available
        // (This is NOT forward PE, but better than nothing)
        const calculatedPE = (Number(q.price) / Number(q.eps)).toFixed(2)
        // Only use if we don't have regular PE
        if (out.pe === '—' && !isNaN(Number(calculatedPE)) && isFinite(Number(calculatedPE))) {
          out.pe = calculatedPE
        }
      }
    }
    
  } catch (_error) {
    console.error('[BatchTableService] getValuationFromBatch error:', _error)
  }
  
  return out
}

/**
 * Get cash flow facts from batch data
 * Replaces 3 API calls with data from batch endpoint
 */
export function getCashFlowFactsFromBatch(batchData: BatchData | null): CashFlowFacts {
  const out: CashFlowFacts = { fcfYield: '—', fcfYieldAdjSBC: '—', fcfYieldAdjSBCRaw: null, sbcImpact: '—' }
  
  if (!batchData?.data) return out
  
  try {
    const { cashflowQuarter, profile, keyMetrics } = batchData.data
    
    if (!cashflowQuarter || !Array.isArray(cashflowQuarter) || cashflowQuarter.length < 4) {
      return out
    }
    
    // Calculate TTM (Trailing Twelve Months) from last 4 quarters
    let sbcTTM = 0
    let fcfTTM = 0
    for (let i = 0; i < 4; i++) {
      const row = cashflowQuarter[i]
      if (!row) continue
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
      
      out.fcfYield = formatPercent(fcfYieldValue / 100, 2)
      out.fcfYieldAdjSBC = formatPercent(fcfYieldAdjSBCValue / 100, 2)
      out.fcfYieldAdjSBCRaw = fcfYieldAdjSBCValue  // Store raw numeric value for color coding
      
      // Calculate SBC Impact as percentage difference
      if (fcfYieldValue !== 0) {
        const sbcImpactValue = ((fcfYieldValue - fcfYieldAdjSBCValue) / Math.abs(fcfYieldValue)) * 100
        out.sbcImpact = formatPercent(sbcImpactValue / 100, 2)
      }
    } else if (keyMetrics && Array.isArray(keyMetrics) && keyMetrics.length > 0) {
      const metrics = (keyMetrics[0] ?? {}) as any
      if (metrics.freeCashFlowYield) {
        // Fallback to key metrics
        out.fcfYield = formatPercent(Number(metrics.freeCashFlowYield), 2)
      }
    }
    
  } catch (_error) {
    console.error('[BatchTableService] getCashFlowFactsFromBatch error:', _error)
  }
  
  return out
}

/**
 * Get margins and growth from batch data
 * Replaces 2 API calls with data from batch endpoint
 */
export function getMarginsGrowthFromBatch(batchData: BatchData | null): MarginsGrowth {
  const out: MarginsGrowth = { profitMargin: '—', operatingMargin: '—', earningsYoY: '—', revenueYoY: '—' }
  
  if (!batchData?.data) return out
  
  try {
    const { ratiosAnnual, incomeQuarter } = batchData.data
    
    // Get margins from most recent quarter ratios
    // Note: Batch fetches annual ratios, but we need quarterly for latest margins
    // This is a limitation - for now use annual data
    if (ratiosAnnual && Array.isArray(ratiosAnnual) && ratiosAnnual.length > 0) {
      const ratios = (ratiosAnnual[0] ?? {}) as any
      
      if (ratios.netProfitMargin) {
        out.profitMargin = formatPercent(Number(ratios.netProfitMargin), 2)
      }
      if (ratios.operatingProfitMargin) {
        out.operatingMargin = formatPercent(Number(ratios.operatingProfitMargin), 2)
      }
    }
    
    // Calculate YoY growth from quarterly income statements
    if (incomeQuarter && Array.isArray(incomeQuarter) && incomeQuarter.length >= 5) {
      // Compare most recent quarter (index 0) with same quarter last year (index 4)
      const currentQ = incomeQuarter[0]
      const yearAgoQ = incomeQuarter[4]
      
      if (currentQ && yearAgoQ) {
        // Quarterly Earnings YoY growth
        const currentEarnings = Number(currentQ.netIncome) || 0
        const yearAgoEarnings = Number(yearAgoQ.netIncome) || 0
        if (yearAgoEarnings !== 0) {
          const earningsGrowth = (currentEarnings - yearAgoEarnings) / Math.abs(yearAgoEarnings)
          out.earningsYoY = formatPercent(earningsGrowth, 2)
        }
        
        // Quarterly Revenue YoY growth
        const currentRevenue = Number(currentQ.revenue) || 0
        const yearAgoRevenue = Number(yearAgoQ.revenue) || 0
        if (yearAgoRevenue !== 0) {
          const revenueGrowth = (currentRevenue - yearAgoRevenue) / yearAgoRevenue
          out.revenueYoY = formatPercent(revenueGrowth, 2)
        }
      }
    }
    
  } catch (_error) {
    console.error('[BatchTableService] getMarginsGrowthFromBatch error:', _error)
  }
  
  return out
}

/**
 * Get balance sheet data from batch data
 * Replaces 2 API calls with data from batch endpoint
 */
export function getBalanceFromBatch(batchData: BatchData | null): BalanceMetrics {
  const out: BalanceMetrics = { cash: '—', debt: '—', net: '—', altmanZScore: '—', altmanZColor: 'grey' }
  
  if (!batchData?.data) return out
  
  try {
    const { balanceAnnual, financialScores } = batchData.data
    
    if (!balanceAnnual || !Array.isArray(balanceAnnual) || balanceAnnual.length === 0) {
      return out
    }
    
    const balance = balanceAnnual[0]
    if (!balance) {
      return out
    }
    
    // Cash = Cash and Cash Equivalents + Short Term Investments
    const cashEquiv = Number(balance.cashAndCashEquivalents) || 0
    const shortTermInv = Number(balance.shortTermInvestments) || 0
    const totalCash = cashEquiv + shortTermInv
    
    const totalDebt = Number(balance.totalDebt) || 0
    const netDebt = totalCash - totalDebt
    
    out.cash = formatNumber(totalCash)
    out.debt = formatNumber(totalDebt)
    out.net = formatNumber(netDebt)
    
    // Process Altman Z-Score from financialScores
    if (financialScores && Array.isArray(financialScores) && financialScores.length > 0) {
      const zScoreData = (financialScores[0] ?? {}) as any
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
    
  } catch (_error) {
    console.error('[BatchTableService] getBalanceFromBatch error:', _error)
  }
  
  return out
}

/**
 * Earnings report data for display
 */
export interface EarningsReport {
  fiscalQuarter: string // e.g., "Q4 2024"
  reportDate: string // e.g., "Jan 30, 2025"
  epsActual: number | null
  epsEstimate: number | null
  epsBeat: boolean | null // True if beat, false if miss, null if no data
  revenueActual: number | null // In billions
  revenueEstimate: number | null // In billions
  revenueBeat: boolean | null
  fiscalDateEnding: string // Original date for sorting
}

/**
 * Get earnings reports from batch data
 * Filters to current year and formats for display
 */
export function getEarningsFromBatch(batchData: BatchData | null): EarningsReport[] {
  if (!batchData?.data?.earningsCalendar) return []
  
  try {
    const currentYear = new Date().getFullYear()
    
    return batchData.data.earningsCalendar
      // Filter to current year and only entries with actual data (eps not null)
      .filter(e => {
        if (!e.fiscalDateEnding || e.eps === null) return false
        const fiscalYear = new Date(e.fiscalDateEnding).getFullYear()
        return fiscalYear === currentYear
      })
      // Sort by fiscal date (oldest first)
      .sort((a, b) => new Date(a.fiscalDateEnding).getTime() - new Date(b.fiscalDateEnding).getTime())
      // Transform to display format
      .map(e => {
        const fiscalDate = new Date(e.fiscalDateEnding)
        const reportDate = new Date(e.date)
        
        // Calculate quarter from fiscal date
        const month = fiscalDate.getMonth() + 1
        const quarter = Math.ceil(month / 3)
        const fiscalQuarter = `Q${quarter} ${fiscalDate.getFullYear()}`
        
        // Format report date
        const reportDateStr = reportDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        })
        
        // Calculate beats/misses
        const epsBeat = (e.eps !== null && e.epsEstimated !== null) 
          ? e.eps > e.epsEstimated 
          : null
        
        const revenueBeat = (e.revenue !== null && e.revenueEstimated !== null)
          ? e.revenue > e.revenueEstimated
          : null
        
        // Convert revenue to billions
        const revenueActual = e.revenue !== null ? e.revenue / 1_000_000_000 : null
        const revenueEstimate = e.revenueEstimated !== null ? e.revenueEstimated / 1_000_000_000 : null
        
        return {
          fiscalQuarter,
          reportDate: reportDateStr,
          epsActual: e.eps,
          epsEstimate: e.epsEstimated,
          epsBeat,
          revenueActual,
          revenueEstimate,
          revenueBeat,
          fiscalDateEnding: e.fiscalDateEnding
        }
      })
  } catch (error) {
    console.error('[BatchTableService] getEarningsFromBatch error:', error)
    return []
  }
}

