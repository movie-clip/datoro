// src/services/financials/fmpProvider.js
// Financial Modeling Prep provider implementing the unified interface
// https://site.financialmodelingprep.com/developer/docs/

import { handleServiceError } from '../shared.js'

const BASE = '/api/fmp/api/v3'

async function getValuation(ticker) {
  const t = (ticker || '').trim().toUpperCase()
  const out = { marketCap: '—', pe: '—', fpe: '—', ps: '—', pb: '—', evEbitda: '—' }
  if (!t) return { data: out, error: 'No ticker provided' }
  try {
    // Fetch profile, key-metrics, and ratios in parallel
    const [profileRes, metricsRes, ratiosRes] = await Promise.all([
      fetch(`${BASE}/profile/${t}`),
      fetch(`/api/fmp/api/v4/key-metrics/${t}?period=annual&limit=1`),
      fetch(`/api/fmp/api/v3/ratios/${t}?period=annual&limit=1`)
    ])
    
    if (!profileRes.ok) return { data: out, error: `HTTP ${profileRes.status}` }
    
    const profileArr = await profileRes.json()
    const d = profileArr[0] || {}
    
    // Get Market Cap from profile
    if (d.mktCap) out.marketCap = fmtNumber(d.mktCap)
    
    // Get EV/EBITDA from key-metrics endpoint (v4 - may be empty)
    if (metricsRes.ok) {
      const metricsArr = await metricsRes.json()
      const metrics = metricsArr[0] || {}
      if (metrics.evToEBITDA) {
        out.evEbitda = metrics.evToEBITDA.toFixed(2)
      }
    }
    
    // Get PE, Price to Sales, and Price to Book from ratios endpoint (most accurate)
    if (ratiosRes.ok) {
      const ratiosArr = await ratiosRes.json()
      const ratios = ratiosArr[0] || {}
      // Note: FMP uses "priceEarningsRatio" not "priceToEarningsRatio"
      if (ratios.priceEarningsRatio) {
        out.pe = ratios.priceEarningsRatio.toFixed(2)
      }
      if (ratios.priceToSalesRatio) {
        out.ps = ratios.priceToSalesRatio.toFixed(2)
      }
      if (ratios.priceToBookRatio) {
        out.pb = ratios.priceToBookRatio.toFixed(2)
      }
      // Get EV/EBITDA from ratios (enterpriseValueMultiple is EV/EBITDA)
      if (ratios.enterpriseValueMultiple && out.evEbitda === '—') {
        out.evEbitda = ratios.enterpriseValueMultiple.toFixed(2)
      }
    }
    
    // Calculate Forward P/E from analyst estimates
    try {
      const [quoteRes, estimatesRes] = await Promise.all([
        fetch(`${BASE}/quote/${t}`),
        fetch(`${BASE}/analyst-estimates/${t}`)
      ])
      
      if (quoteRes.ok && estimatesRes.ok) {
        const quoteArr = await quoteRes.json()
        const estimatesArr = await estimatesRes.json()
        
        const currentPrice = quoteArr[0]?.price
        const currentYear = new Date().getFullYear()
        
        // Find next year's estimate
        const nextYearEstimate = estimatesArr.find(est => {
          const estYear = new Date(est.date).getFullYear()
          return estYear === currentYear + 1
        })
        
        if (currentPrice && nextYearEstimate?.estimatedEpsAvg && nextYearEstimate.estimatedEpsAvg > 0) {
          const forwardPE = currentPrice / nextYearEstimate.estimatedEpsAvg
          out.fpe = forwardPE.toFixed(2)
        }
      }
    } catch (error) {
      console.warn('Failed to fetch Forward P/E:', error)
    }
    
    return { data: out, error: null }
  } catch (error) {
    return handleServiceError(error, 'getValuation')
  }
}

async function getCashFlowFacts(ticker) {
  const t = (ticker || '').trim().toUpperCase()
  const out = { fcfYield: '—', fcfYieldAdjSBC: '—', sbcImpact: '—' }
  if (!t) return { data: out, error: 'No ticker provided' }
  try {
    // Fetch cash flow statement, key metrics, and profile in parallel
    const [cfRes, metricsRes, profileRes] = await Promise.all([
      fetch(`/api/fmp/api/v3/cash-flow-statement/${t}?period=quarter&limit=4`),
      fetch(`/api/fmp/api/v4/key-metrics/${t}?period=annual&limit=1`),
      fetch(`/api/fmp/api/v3/profile/${t}`)
    ])
    
    if (!cfRes.ok) return { data: out, error: `HTTP ${cfRes.status}` }
    
    const arr = await cfRes.json()
    if (!Array.isArray(arr) || arr.length < 4) return { data: out, error: 'Not enough cash flow data' }
    
    // Calculate TTM metrics from quarterly data
    let sbcTTM = 0, fcfTTM = 0
    for (let i = 0; i < 4; ++i) {
      const row = arr[i]
      sbcTTM += Number(row.stockBasedCompensation) || 0
      fcfTTM += Number(row.freeCashFlow) || 0
    }
    
    // Get market cap from profile
    let marketCap = 0
    if (profileRes.ok) {
      const profileArr = await profileRes.json()
      const profile = profileArr[0] || {}
      marketCap = Number(profile.mktCap) || 0
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
    } else {
      // Fallback: try to get FCF Yield from key-metrics
      if (metricsRes.ok) {
        const metricsArr = await metricsRes.json()
        const metrics = metricsArr[0] || {}
        if (metrics.freeCashFlowYield) {
          out.fcfYield = (metrics.freeCashFlowYield * 100).toFixed(2) + '%'
        }
      }
    }
    
    return { data: out, error: null }
  } catch (error) {
    return handleServiceError(error, 'getCashFlowFacts')
  }
}

async function getMarginsGrowth(ticker) {
  const t = (ticker || '').trim().toUpperCase()
  const out = { profitMargin: '—', operatingMargin: '—', earningsYoY: '—', revenueYoY: '—' }
  if (!t) return { data: out, error: 'No ticker provided' }
  try {
    // Fetch both ratios and quarterly income statements in parallel
    const [ratiosRes, incomeRes] = await Promise.all([
      fetch(`${BASE}/ratios/${t}?period=quarter&limit=1`),
      fetch(`${BASE}/income-statement/${t}?period=quarter&limit=8`)
    ])
    
    // Get margins from most recent quarter
    if (ratiosRes.ok) {
      const ratiosArr = await ratiosRes.json()
      const ratios = ratiosArr[0] || {}
      if (ratios.netProfitMargin) {
        out.profitMargin = (ratios.netProfitMargin * 100).toFixed(2) + '%'
      }
      if (ratios.operatingProfitMargin) {
        out.operatingMargin = (ratios.operatingProfitMargin * 100).toFixed(2) + '%'
      }
    }
    
    // Calculate YoY growth for earnings and revenue
    if (incomeRes.ok) {
      const incomeArr = await incomeRes.json()
      if (Array.isArray(incomeArr) && incomeArr.length >= 5) {
        // Compare most recent quarter (index 0) with same quarter last year (index 4)
        const currentQ = incomeArr[0]
        const yearAgoQ = incomeArr[4]
        
        // Calculate Quarterly Earnings YoY growth
        const currentEarnings = Number(currentQ.netIncome) || 0
        const yearAgoEarnings = Number(yearAgoQ.netIncome) || 0
        if (yearAgoEarnings !== 0) {
          const earningsGrowth = ((currentEarnings - yearAgoEarnings) / Math.abs(yearAgoEarnings)) * 100
          out.earningsYoY = earningsGrowth.toFixed(2) + '%'
        }
        
        // Calculate Quarterly Revenue YoY growth
        const currentRevenue = Number(currentQ.revenue) || 0
        const yearAgoRevenue = Number(yearAgoQ.revenue) || 0
        if (yearAgoRevenue !== 0) {
          const revenueGrowth = ((currentRevenue - yearAgoRevenue) / yearAgoRevenue) * 100
          out.revenueYoY = revenueGrowth.toFixed(2) + '%'
        }
      }
    }
    
    return { data: out, error: null }
  } catch (error) {
    return handleServiceError(error, 'getMarginsGrowth')
  }
}

async function getBalance(ticker) {
  const t = (ticker || '').trim().toUpperCase()
  const out = { cash: '—', debt: '—', net: '—', altmanZScore: '—', altmanZColor: 'grey' }
  if (!t) return { data: out, error: 'No ticker provided' }
  try {
    // Fetch balance sheet and Altman Z-Score in parallel
    const [balanceRes, zScoreRes] = await Promise.all([
      fetch(`${BASE}/balance-sheet-statement/${t}?period=annual&limit=1`),
      fetch(`/api/fmp/stable/financial-scores?symbol=${t}`)
    ])
    
    if (!balanceRes.ok) return { data: out, error: `HTTP ${balanceRes.status}` }
    const arr = await balanceRes.json()
    if (!Array.isArray(arr) || arr.length === 0) return { data: out, error: 'No balance sheet data' }
    const d = arr[0] || {}
    
    // Cash = Cash and Cash Equivalents + Short Term Investments
    const cashEquiv = Number(d.cashAndCashEquivalents) || 0
    const shortTermInv = Number(d.shortTermInvestments) || 0
    const totalCash = cashEquiv + shortTermInv
    
    const totalDebt = Number(d.totalDebt) || 0
    const netDebt = totalCash - totalDebt
    
    out.cash = fmtNumber(totalCash)
    out.debt = fmtNumber(totalDebt)
    out.net = fmtNumber(netDebt)
    
    // Process Altman Z-Score
    if (zScoreRes.ok) {
      const zScoreData = await zScoreRes.json()
      if (Array.isArray(zScoreData) && zScoreData.length > 0 && zScoreData[0]?.altmanZScore) {
        const zScore = Number(zScoreData[0].altmanZScore)
        if (!isNaN(zScore)) {
          out.altmanZScore = zScore.toFixed(2)
          // Determine color based on Z-Score ranges
          // > 2.99: Safe (green), 1.81-2.99: Grey zone (grey), < 1.81: Distress (red)
          if (zScore > 2.99) {
            out.altmanZColor = 'green'
          } else if (zScore >= 1.81) {
            out.altmanZColor = 'grey'
          } else {
            out.altmanZColor = 'red'
          }
        }
      } else {
        // V4 score endpoint may not have data for all tickers
        // Keep default "—" value
        console.warn(`[FMP] Altman Z-Score not available for ${t}`)
      }
    }
    
    return { data: out, error: null }
  } catch (error) {
    return handleServiceError(error, 'getBalance')
  }
}

async function getRevenueSeries(ticker, period = 'annual') {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) return { data: [], error: 'No ticker provided' }
  try {
    const url = `${BASE}/income-statement/${t}?period=${period === 'quarterly' ? 'quarter' : 'annual'}&limit=20`
    const res = await fetch(url)
    if (!res.ok) return { data: [], error: `HTTP ${res.status}` }
    const arr = await res.json()
    const out = arr.map(row => [Date.parse(row.date), Number(row.revenue)])
    return { data: out, error: null }
  } catch (error) {
    return handleServiceError(error, 'getRevenueSeries')
  }
}

async function getRevenueSegments(ticker, period = 'annual') {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) return { data: { segments: [], series: {} }, error: 'No ticker provided' }
  
  try {
    // Fetch product/business segments from v4 endpoint
    const url = `/api/fmp/api/v4/revenue-product-segmentation?symbol=${t}&structure=flat`
    const res = await fetch(url)
    
    if (!res.ok) {
      // Return empty segments if endpoint fails (not all companies have segment data)
      return { data: { segments: [], series: {} }, error: null }
    }
    
    const productData = await res.json()
    
    const allSegments = new Set()
    const segmentSeries = {}
    
    // Process product/business segments
    // New structure: each row has a 'data' object with segment names as keys
    // Only use data from the last 5 years to avoid old/deprecated segment names
    if (Array.isArray(productData) && productData.length > 0) {
      // Take only the 5 most recent records
      const recentData = productData.slice(0, 5)
      
      recentData.forEach(row => {
        const date = Date.parse(row.date)
        
        // The segments are inside the 'data' object
        if (row.data && typeof row.data === 'object') {
          Object.keys(row.data).forEach(segmentName => {
            const value = Number(row.data[segmentName])
            if (value > 0) {
              allSegments.add(segmentName)
              if (!segmentSeries[segmentName]) segmentSeries[segmentName] = []
              segmentSeries[segmentName].push([date, value])
            }
          })
        }
      })
      
      // Now fetch full historical data ONLY for the segments we identified from recent years
      productData.forEach(row => {
        const date = Date.parse(row.date)
        
        if (row.data && typeof row.data === 'object') {
          Object.keys(row.data).forEach(segmentName => {
            // Only include if this segment exists in our recent segments
            if (allSegments.has(segmentName)) {
              const value = Number(row.data[segmentName])
              if (value > 0) {
                // Check if we already added this date point
                const existingIdx = segmentSeries[segmentName].findIndex(point => point[0] === date)
                if (existingIdx === -1) {
                  segmentSeries[segmentName].push([date, value])
                }
              }
            }
          })
        }
      })
    }
    
    // Sort each segment's data by date (oldest to newest)
    Object.keys(segmentSeries).forEach(key => {
      segmentSeries[key].sort((a, b) => a[0] - b[0])
    })
    
    return { 
      data: { 
        segments: Array.from(allSegments).sort(), 
        series: segmentSeries 
      }, 
      error: null 
    }
  } catch (error) {
    return handleServiceError(error, 'getRevenueSegments')
  }
}

async function getFcfSeries(ticker, period = 'annual') {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) return { data: [], error: 'No ticker provided' }
  try {
    // Fetch both cash flow statement and key metrics in parallel
    const periodParam = period === 'quarterly' ? 'quarter' : 'annual'
    const [cfRes, kmRes] = await Promise.all([
      fetch(`${BASE}/cash-flow-statement/${t}?period=${periodParam}&limit=20`),
      fetch(`${BASE}/key-metrics/${t}?period=${periodParam}&limit=20`)
    ])
    
    if (!cfRes.ok) return { data: [], error: `HTTP ${cfRes.status}` }
    
    const cfArr = await cfRes.json()
    const kmArr = kmRes.ok ? await kmRes.json() : []
    
    // Create a map of key metrics by date for quick lookup
    const kmMap = new Map()
    kmArr.forEach(km => {
      if (km.date) {
        kmMap.set(km.date, km)
      }
    })
    
    // Return enhanced data with FCF, FCF per share (from key metrics), and SBC
    const enhanced = cfArr.map(row => {
      const keyMetrics = kmMap.get(row.date)
      return {
        date: Date.parse(row.date),
        fcf: Number(row.freeCashFlow) || 0,
        fcfPerShare: keyMetrics?.freeCashFlowPerShare || 0,
        sbc: Number(row.stockBasedCompensation) || 0,
      }
    })
    
    return { data: enhanced, error: null }
  } catch (error) {
    return handleServiceError(error, 'getFcfSeries')
  }
}

async function getEpsSeries(ticker) {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) return { data: [], error: 'No ticker provided' }
  try {
    // Fetch quarterly EPS data
    const url = `/api/fmp/api/v3/income-statement/${t}?period=quarter&limit=20`
    const res = await fetch(url)
    if (!res.ok) return { data: [], error: `HTTP ${res.status}` }
    const arr = await res.json()
    
    if (!Array.isArray(arr) || arr.length === 0) {
      return { data: [], error: 'Not enough data' }
    }
    
    // Return quarterly EPS data
    const epsData = arr.map(row => [Date.parse(row.date), Number(row.eps) || 0])
    
    return { data: epsData, error: null }
  } catch (error) {
    return handleServiceError(error, 'getEpsSeries')
  }
}

async function getEbitdaSeries(ticker, period = 'annual') {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) return { data: [], error: 'No ticker provided' }
  try {
    const url = `${BASE}/income-statement/${t}?period=${period === 'quarterly' ? 'quarter' : 'annual'}&limit=20`
    const res = await fetch(url)
    if (!res.ok) return { data: [], error: `HTTP ${res.status}` }
    const arr = await res.json()
    
    if (!Array.isArray(arr) || arr.length === 0) {
      return { data: [], error: 'Not enough data' }
    }
    
    // Return EBITDA data with bridge components
    const ebitdaData = arr.map(row => ({
      date: Date.parse(row.date),
      revenue: Number(row.revenue) || 0,
      costOfRevenue: Number(row.costOfRevenue) || 0,
      grossProfit: Number(row.grossProfit) || 0,
      operatingExpenses: Number(row.operatingExpenses) || 0,
      operatingIncome: Number(row.operatingIncome) || 0,
      depreciationAndAmortization: Number(row.depreciationAndAmortization) || 0,
      ebitda: Number(row.ebitda) || 0
    }))
    
    return { data: ebitdaData, error: null }
  } catch (error) {
    return handleServiceError(error, 'getEbitdaSeries')
  }
}

async function getCashDebtSeries(ticker, period = 'annual') {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) return { data: [], error: 'No ticker provided' }
  try {
    const url = `${BASE}/balance-sheet-statement/${t}?period=${period === 'quarterly' ? 'quarter' : 'annual'}&limit=20`
    const res = await fetch(url)
    if (!res.ok) return { data: [], error: `HTTP ${res.status}` }
    const arr = await res.json()
    
    // Return enhanced data with cash and debt
    const enhanced = arr.map(row => {
      const cashEquiv = Number(row.cashAndCashEquivalents) || 0
      const shortTermInv = Number(row.shortTermInvestments) || 0
      const totalCash = cashEquiv + shortTermInv
      const totalDebt = Number(row.totalDebt) || 0
      
      return {
        date: Date.parse(row.date),
        cash: totalCash,
        debt: totalDebt,
      }
    })
    
    return { data: enhanced, error: null }
  } catch (error) {
    return handleServiceError(error, 'getCashDebtSeries')
  }
}

async function getCapitalReturnedSeries(ticker, period = 'annual') {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) return { data: [], error: 'No ticker provided' }
  try {
    const url = `${BASE}/cash-flow-statement/${t}?period=${period === 'quarterly' ? 'quarter' : 'annual'}&limit=20`
    const res = await fetch(url)
    if (!res.ok) return { data: [], error: `HTTP ${res.status}` }
    const arr = await res.json()
    
    if (!Array.isArray(arr) || arr.length === 0) {
      return { data: [], error: 'Not enough data' }
    }
    
    // Return data with dividends, buybacks, and total
    // Note: FMP returns these as negative numbers (cash outflows)
    const enhanced = arr.map(row => {
      const dividends = Math.abs(Number(row.dividendsPaid) || 0)
      const buybacks = Math.abs(Number(row.commonStockRepurchased) || 0)
      const total = dividends + buybacks
      
      return {
        date: Date.parse(row.date),
        dividends,
        buybacks,
        total,
      }
    })
    
    return { data: enhanced, error: null }
  } catch (error) {
    return handleServiceError(error, 'getCapitalReturnedSeries')
  }
}

async function getSharesSeries(ticker, period = 'annual') {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) return { data: [], error: 'No ticker provided' }
  try {
    const url = `${BASE}/income-statement/${t}?period=${period === 'quarterly' ? 'quarter' : 'annual'}&limit=20`
    const res = await fetch(url)
    if (!res.ok) return { data: [], error: `HTTP ${res.status}` }
    const arr = await res.json()
    
    if (!Array.isArray(arr) || arr.length === 0) {
      return { data: [], error: 'Not enough data' }
    }
    
    // Return shares outstanding data
    const sharesData = arr.map(row => [Date.parse(row.date), Number(row.weightedAverageShsOut) || 0])
    
    return { data: sharesData, error: null }
  } catch (error) {
    return handleServiceError(error, 'getSharesSeries')
  }
}

function fmtNumber(n) {
  if (!Number.isFinite(n)) return '—'
  const s = Math.sign(n) < 0 ? '-' : ''
  const a = Math.abs(n)
  if (a >= 1e12) return s + (a / 1e12).toFixed(2) + 'T'
  if (a >= 1e9 ) return s + (a / 1e9 ).toFixed(2) + 'B'
  if (a >= 1e6 ) return s + (a / 1e6 ).toFixed(2) + 'M'
  if (a >= 1e3 ) return s + (a / 1e3 ).toFixed(0) + 'K'
  return s + a.toFixed(0)
}

/**
 * Get income statement data
 * @param {string} ticker - Stock ticker symbol
 * @param {string} period - 'annual' or 'quarterly'
 * @param {number} limit - Number of periods to fetch
 * @returns {Promise<Array>} Income statement data
 */
async function getIncomeStatement(ticker, period = 'annual', limit = 20) {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) return []

  try {
    const periodParam = period === 'quarterly' ? 'quarter' : 'annual'
    const url = `${BASE}/income-statement/${t}?period=${periodParam}&limit=${limit}`
    const res = await fetch(url)
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    
    const data = await res.json()
    
    if (!Array.isArray(data) || data.length === 0) {
      return []
    }

    return data
  } catch (err) {
    console.error('[fmpProvider] getIncomeStatement error:', err)
    return []
  }
}

export default {
  getValuation,
  getCashFlowFacts,
  getMarginsGrowth,
  getBalance,
  getRevenueSeries,
  getRevenueSegments,
  getFcfSeries,
  getEpsSeries,
  getEbitdaSeries,
  getCashDebtSeries,
  getSharesSeries,
  getCapitalReturnedSeries,
  getIncomeStatement,
}
