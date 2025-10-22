// src/services/financials/batchChartService.js
// Optimized chart data functions using batch endpoint data
// Eliminates 15-20 API calls by extracting data from single batch endpoint

/**
 * Get revenue series from batch data
 * Used by: RevenueChart
 * Replaces: /api/v3/income-statement/:ticker (1 call)
 */
export function getRevenueSeriesFromBatch(batchData, period = 'annual') {
  try {
    const statements = period === 'quarterly' 
      ? batchData?.data?.incomeQuarter 
      : batchData?.data?.incomeAnnual
    
    if (!statements || !Array.isArray(statements)) {
      return []
    }
    
    return statements.map(row => [
      Date.parse(row.date),
      Number(row.revenue) || 0
    ])
  } catch (error) {
    console.error('[BatchChartService] getRevenueSeriesFromBatch error:', error)
    return []
  }
}

/**
 * Get revenue segments from batch data
 * Used by: RevenueChart (segment breakdown)
 * Replaces: /api/v4/revenue-product-segmentation (1 call)
 */
export function getRevenueSegmentsFromBatch(batchData) {
  try {
    const segmentData = batchData?.data?.revenueSegments
    
    if (!segmentData || !Array.isArray(segmentData) || segmentData.length === 0) {
      return { segments: [], series: {} }
    }
    
    const allSegments = new Set()
    const segmentSeries = {}
    
    // Process only last 5 years to avoid old/deprecated segment names
    const recentData = segmentData.slice(0, 5)
    
    recentData.forEach(row => {
      const date = Date.parse(row.date)
      
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
    
    // Fetch full historical data for identified segments
    segmentData.forEach(row => {
      const date = Date.parse(row.date)
      
      if (row.data && typeof row.data === 'object') {
        Object.keys(row.data).forEach(segmentName => {
          if (allSegments.has(segmentName)) {
            const value = Number(row.data[segmentName])
            if (value > 0) {
              const existingIdx = segmentSeries[segmentName]?.findIndex(point => point[0] === date)
              if (existingIdx === -1 || existingIdx === undefined) {
                if (!segmentSeries[segmentName]) segmentSeries[segmentName] = []
                segmentSeries[segmentName].push([date, value])
              }
            }
          }
        })
      }
    })
    
    // Sort each segment by date
    Object.keys(segmentSeries).forEach(key => {
      segmentSeries[key].sort((a, b) => a[0] - b[0])
    })
    
    return {
      segments: Array.from(allSegments).sort(),
      series: segmentSeries
    }
  } catch (error) {
    console.error('[BatchChartService] getRevenueSegmentsFromBatch error:', error)
    return { segments: [], series: {} }
  }
}

/**
 * Get FCF series from batch data
 * Used by: FcfChart
 * Replaces: /api/v3/cash-flow-statement/:ticker + /api/v3/key-metrics/:ticker (2 calls)
 */
export function getFcfSeriesFromBatch(batchData, period = 'annual') {
  try {
    const cashflow = period === 'quarterly'
      ? batchData?.data?.cashflowQuarter
      : batchData?.data?.cashflowAnnual
    
    const keyMetrics = batchData?.data?.keyMetrics
    
    if (!cashflow || !Array.isArray(cashflow)) {
      return []
    }
    
    // Create key metrics map by date
    const kmMap = new Map()
    if (keyMetrics && Array.isArray(keyMetrics)) {
      keyMetrics.forEach(km => {
        if (km.date) kmMap.set(km.date, km)
      })
    }
    
    // Return enhanced data with FCF, FCF per share, and SBC
    return cashflow.map(row => {
      const metrics = kmMap.get(row.date)
      return {
        date: Date.parse(row.date),
        fcf: Number(row.freeCashFlow) || 0,
        fcfPerShare: metrics?.freeCashFlowPerShare || 0,
        sbc: Number(row.stockBasedCompensation) || 0
      }
    })
  } catch (error) {
    console.error('[BatchChartService] getFcfSeriesFromBatch error:', error)
    return []
  }
}

/**
 * Get Net Income series from batch data
 * Used by: NetIncomeChart
 * Replaces: /api/v3/income-statement/:ticker (1 call)
 */
export function getNetIncomeSeriesFromBatch(batchData, period = 'annual') {
  try {
    const statements = period === 'quarterly'
      ? batchData?.data?.incomeQuarter
      : batchData?.data?.incomeAnnual
    
    if (!statements || !Array.isArray(statements)) {
      return []
    }
    
    return statements.map(row => [
      Date.parse(row.date),
      Number(row.netIncome) || 0
    ])
  } catch (error) {
    console.error('[BatchChartService] getNetIncomeSeriesFromBatch error:', error)
    return []
  }
}

/**
 * Get EPS series from batch data
 * Used by: EpsChart
 * Replaces: /api/v3/income-statement/:ticker?period=quarter (1 call)
 */
export function getEpsSeriesFromBatch(batchData, period = 'annual') {
  try {
    const statements = period === 'quarterly' 
      ? batchData?.data?.incomeQuarter 
      : batchData?.data?.incomeAnnual
    
    if (!statements || !Array.isArray(statements) || statements.length === 0) {
      return []
    }
    
    return statements.map(row => [
      Date.parse(row.date),
      Number(row.eps) || 0
    ])
  } catch (error) {
    console.error('[BatchChartService] getEpsSeriesFromBatch error:', error)
    return []
  }
}

/**
 * Get EBITDA series from batch data
 * Used by: EbitdaChart
 * Replaces: /api/v3/income-statement/:ticker (1 call)
 */
export function getEbitdaSeriesFromBatch(batchData, period = 'annual') {
  try {
    const statements = period === 'quarterly'
      ? batchData?.data?.incomeQuarter
      : batchData?.data?.incomeAnnual
    
    if (!statements || !Array.isArray(statements) || statements.length === 0) {
      return []
    }
    
    // Return EBITDA data with bridge components
    return statements.map(row => ({
      date: Date.parse(row.date),
      revenue: Number(row.revenue) || 0,
      costOfRevenue: Number(row.costOfRevenue) || 0,
      grossProfit: Number(row.grossProfit) || 0,
      operatingExpenses: Number(row.operatingExpenses) || 0,
      operatingIncome: Number(row.operatingIncome) || 0,
      depreciationAndAmortization: Number(row.depreciationAndAmortization) || 0,
      ebitda: Number(row.ebitda) || 0
    }))
  } catch (error) {
    console.error('[BatchChartService] getEbitdaSeriesFromBatch error:', error)
    return []
  }
}

/**
 * Get Cash & Debt series from batch data
 * Used by: CashDebtChart
 * Replaces: /api/v3/balance-sheet-statement/:ticker (1 call)
 */
export function getCashDebtSeriesFromBatch(batchData, period = 'annual') {
  try {
    const balance = period === 'quarterly'
      ? batchData?.data?.balanceQuarter
      : batchData?.data?.balanceAnnual
    
    if (!balance || !Array.isArray(balance)) {
      return []
    }
    
    return balance.map(row => {
      const cashEquiv = Number(row.cashAndCashEquivalents) || 0
      const shortTermInv = Number(row.shortTermInvestments) || 0
      const totalCash = cashEquiv + shortTermInv
      const totalDebt = Number(row.totalDebt) || 0
      
      return {
        date: Date.parse(row.date),
        cash: totalCash,
        debt: totalDebt
      }
    })
  } catch (error) {
    console.error('[BatchChartService] getCashDebtSeriesFromBatch error:', error)
    return []
  }
}

/**
 * Get Capital Returned series from batch data
 * Used by: CapitalReturnedChart
 * Replaces: /api/v3/cash-flow-statement/:ticker (1 call)
 */
export function getCapitalReturnedSeriesFromBatch(batchData, period = 'annual') {
  try {
    const cashflow = period === 'quarterly'
      ? batchData?.data?.cashflowQuarter
      : batchData?.data?.cashflowAnnual
    
    if (!cashflow || !Array.isArray(cashflow) || cashflow.length === 0) {
      return []
    }
    
    // FMP returns these as negative numbers (cash outflows)
    return cashflow.map(row => {
      const dividends = Math.abs(Number(row.dividendsPaid) || 0)
      const buybacks = Math.abs(Number(row.commonStockRepurchased) || 0)
      const total = dividends + buybacks
      
      return {
        date: Date.parse(row.date),
        dividends,
        buybacks,
        total
      }
    })
  } catch (error) {
    console.error('[BatchChartService] getCapitalReturnedSeriesFromBatch error:', error)
    return []
  }
}

/**
 * Get Shares Outstanding series from batch data
 * Used by: SharesChart
 * Replaces: /api/v3/income-statement/:ticker (1 call)
 */
export function getSharesSeriesFromBatch(batchData, period = 'annual') {
  try {
    const statements = period === 'quarterly'
      ? batchData?.data?.incomeQuarter
      : batchData?.data?.incomeAnnual
    
    if (!statements || !Array.isArray(statements) || statements.length === 0) {
      return []
    }
    
    return statements.map(row => [
      Date.parse(row.date),
      Number(row.weightedAverageShsOut) || 0
    ])
  } catch (error) {
    console.error('[BatchChartService] getSharesSeriesFromBatch error:', error)
    return []
  }
}

/**
 * Get Expenses series from batch data
 * Used by: ExpensesChart
 * Replaces: /api/v3/income-statement/:ticker (1 call)
 */
export function getExpensesSeriesFromBatch(batchData, period = 'annual') {
  try {
    const statements = period === 'quarterly'
      ? batchData?.data?.incomeQuarter
      : batchData?.data?.incomeAnnual
    
    if (!statements || !Array.isArray(statements) || statements.length === 0) {
      return []
    }
    
    return statements.map(row => ({
      date: Date.parse(row.date),
      costOfRevenue: Number(row.costOfRevenue) || 0,
      operatingExpenses: Number(row.operatingExpenses) || 0,
      researchAndDevelopment: Number(row.researchAndDevelopmentExpenses) || 0,
      sellingGeneralAdmin: Number(row.sellingGeneralAndAdministrativeExpenses) || 0
    }))
  } catch (error) {
    console.error('[BatchChartService] getExpensesSeriesFromBatch error:', error)
    return []
  }
}

/**
 * Get Dividend Yield series from batch data
 * Used by: DividendYieldChart
 * Replaces: /api/v3/historical-price-full/:ticker/dividend (1 call from dividendHistory)
 */
export function getDividendYieldSeriesFromBatch(batchData, period = 'annual') {
  try {
    const dividendHistory = batchData?.data?.dividendHistory
    const profile = batchData?.data?.profile?.[0]
    
    if (!dividendHistory || !Array.isArray(dividendHistory.historical) || dividendHistory.historical.length === 0) {
      return []
    }
    
    // Get current price for yield calculation
    const currentPrice = profile?.price || 1
    
    // Group dividends by year or quarter
    const grouped = {}
    
    dividendHistory.historical.forEach(div => {
      const date = new Date(div.date)
      const year = date.getFullYear()
      const quarter = Math.floor(date.getMonth() / 3)
      
      const key = period === 'quarterly' 
        ? `${year}-Q${quarter + 1}`
        : year.toString()
      
      if (!grouped[key]) {
        grouped[key] = {
          date: period === 'quarterly' 
            ? new Date(year, quarter * 3, 1).getTime()
            : new Date(year, 0, 1).getTime(),
          totalDividend: 0,
          count: 0
        }
      }
      
      grouped[key].totalDividend += Number(div.dividend) || 0
      grouped[key].count++
    })
    
    // Calculate yield for each period
    return Object.values(grouped).map(item => {
      const yieldValue = (item.totalDividend / currentPrice) * 100
      return [item.date, yieldValue]
    }).sort((a, b) => a[0] - b[0])
    
  } catch (error) {
    console.error('[BatchChartService] getDividendYieldSeriesFromBatch error:', error)
    return []
  }
}

/**
 * Get Insider Trading aggregated data from batch data
 * Used by: InsiderTradingChart
 * Replaces: /api/v4/insider-trading (1 call from insiderTrading)
 */
export function getInsiderTradingFromBatch(batchData) {
  try {
    const insiderData = batchData?.data?.insiderTrading
    
    if (!insiderData || !Array.isArray(insiderData) || insiderData.length === 0) {
      return { buys: [], sells: [], net: [] }
    }
    
    // Group by month
    const grouped = {}
    
    insiderData.forEach(trade => {
      const date = new Date(trade.transactionDate)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          date: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
          buyValue: 0,
          sellValue: 0,
          netShares: 0
        }
      }
      
      const value = Math.abs(Number(trade.securitiesTransacted) * Number(trade.price))
      
      if (trade.acquisitionOrDisposition === 'A') {
        grouped[monthKey].buyValue += value
        grouped[monthKey].netShares += Number(trade.securitiesTransacted)
      } else if (trade.acquisitionOrDisposition === 'D') {
        grouped[monthKey].sellValue += value
        grouped[monthKey].netShares -= Number(trade.securitiesTransacted)
      }
    })
    
    // Convert to arrays sorted by date
    const sorted = Object.values(grouped).sort((a, b) => a.date - b.date)
    
    return {
      buys: sorted.map(item => [item.date, item.buyValue]),
      sells: sorted.map(item => [item.date, item.sellValue]),
      net: sorted.map(item => [item.date, item.netShares])
    }
  } catch (error) {
    console.error('[BatchChartService] getInsiderTradingFromBatch error:', error)
    return { buys: [], sells: [], net: [] }
  }
}

/**
 * Get price history series from batch data
 * Used by: PriceChart, InsiderTradingChart
 * Replaces: Direct /api/fmp/api/v3/historical-price-full call (1 call eliminated)
 */
export function getPriceSeriesFromBatch(batchData, maxDays = null) {
  try {
    const priceHistory = batchData?.data?.priceHistory
    
    if (!priceHistory || !Array.isArray(priceHistory.historical) || priceHistory.historical.length === 0) {
      return []
    }
    
    // Convert FMP format to chart format: [timestamp, adjClose]
    let series = priceHistory.historical.map(row => {
      const ts = row?.date ? Date.parse(row.date) : NaN
      const price = row?.adjClose ?? row?.close
      return Number.isFinite(ts) && Number.isFinite(price) ? [ts, price] : null
    }).filter(Boolean)
    
    // Sort ascending by timestamp (FMP returns most recent first)
    series.sort((a, b) => a[0] - b[0])
    
    // Optionally limit to last N days
    if (maxDays && series.length > 0) {
      const cutoffTime = Date.now() - (maxDays * 24 * 60 * 60 * 1000)
      series = series.filter(point => point[0] >= cutoffTime)
    }
    
    return series
  } catch (error) {
    console.error('[BatchChartService] getPriceSeriesFromBatch error:', error)
    return []
  }
}
