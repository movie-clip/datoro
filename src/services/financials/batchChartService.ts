// src/services/financials/batchChartService.ts
// Optimized chart data functions using batch endpoint data
// Eliminates 15-20 API calls by extracting data from single batch endpoint

import type { BatchData } from '@/types'

type SeriesPoint = [number, number]

interface FcfDataPoint {
  date: number
  fcf: number
  fcfPerShare: number
  sbc: number
}

interface EbitdaDataPoint {
  date: number
  revenue: number
  costOfRevenue: number
  grossProfit: number
  operatingExpenses: number
  operatingIncome: number
  depreciationAndAmortization: number
  ebitda: number
}

interface CashDebtDataPoint {
  date: number
  cash: number
  debt: number
}

interface CapitalReturnedDataPoint {
  date: number
  dividends: number
  buybacks: number
  total: number
}

interface ExpensesDataPoint {
  date: number
  costOfRevenue: number
  operatingExpenses: number
  researchAndDevelopment: number
  sellingGeneralAdmin: number
}

interface RevenueSegmentsResult {
  segments: string[]
  series: Record<string, SeriesPoint[]>
}

interface InsiderTradingResult {
  buys: SeriesPoint[]
  sells: SeriesPoint[]
  net: SeriesPoint[]
}

type Period = 'annual' | 'quarterly'

/**
 * Simple LRU memoization cache
 * Key insight: ticker + args is enough (NO timestamp needed - Redis ensures consistency)
 */
class LRUCache<T = any> {
  private cache: Map<string, T>
  private maxSize: number

  constructor(maxSize = 100) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  get(key: string): T | undefined {
    if (!this.cache.has(key)) return undefined
    const value = this.cache.get(key)!
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  set(key: string, value: T): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value as string | undefined
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(key, value)
  }

  clear(): void {
    this.cache.clear()
  }
}

const cache = new LRUCache(100)

// Memoize wrapper: ticker + args only (no timestamp = no cache misses on refetch)
const memoize = <T extends (...args: unknown[]) => any>(fn: T): T => {
  return function (this: any, ...args: unknown[]): ReturnType<T> {
    // Handle null/undefined batchData
    if (!args[0]) return fn.apply(this, args)

    const ticker = args[0]?.ticker
    if (!ticker) return fn.apply(this, args)

    const key = `${fn.name}:${ticker}:${args.slice(1).join(':')}`
    const cached = cache.get(key)
    if (cached !== undefined) return cached

    const result = fn.apply(this, args)
    cache.set(key, result)
    return result
  } as T
}

/**
 * Get revenue series from batch data
 * Used by: RevenueChart
 * Replaces: /api/v3/income-statement/:ticker (1 call)
 */
export function getRevenueSeriesFromBatch(batchData: BatchData | null, period: Period = 'annual'): SeriesPoint[] {
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
    ] as SeriesPoint)
  } catch (_error) {
    console.error('[BatchChartService] getRevenueSeriesFromBatch error:', _error)
    return []
  }
}

/**
 * Get revenue segments from batch data
 * Used by: RevenueChart (segment breakdown)
 * Replaces: /api/v4/revenue-product-segmentation (1 call)
 */
export function getRevenueSegmentsFromBatch(batchData: BatchData | null): RevenueSegmentsResult {
  try {
    const segmentData = batchData?.data?.revenueSegments

    if (!segmentData || !Array.isArray(segmentData) || segmentData.length === 0) {
      return { segments: [], series: {} }
    }

    const allSegments = new Set<string>()
    const segmentSeries: Record<string, SeriesPoint[]> = {}

    // Process only last 5 years to avoid old/deprecated segment names
    const recentData = segmentData.slice(0, 5)

    recentData.forEach(row => {
      const date = Date.parse(row.date)

      if (row.data && typeof row.data === 'object') {
        Object.keys(row.data).forEach(segmentName => {
          const value = Number(row.data![segmentName])
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
            const value = Number(row.data![segmentName])
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
      const series = segmentSeries[key]
      if (series) {
        series.sort((a, b) => a[0] - b[0])
      }
    })

    return {
      segments: Array.from(allSegments).sort(),
      series: segmentSeries
    }
  } catch (_error) {
    console.error('[BatchChartService] getRevenueSegmentsFromBatch error:', _error)
    return { segments: [], series: {} }
  }
}

/**
 * Get FCF series from batch data
 * Used by: FcfChart
 * Replaces: /api/v3/cash-flow-statement/:ticker + /api/v3/key-metrics/:ticker (2 calls)
 */
export function getFcfSeriesFromBatch(batchData: BatchData | null, period: Period = 'annual'): FcfDataPoint[] {
  try {
    const cashflow = period === 'quarterly'
      ? batchData?.data?.cashflowQuarter
      : batchData?.data?.cashflowAnnual

    // Use the correct key metrics based on period
    const keyMetrics = period === 'quarterly'
      ? batchData?.data?.keyMetricsQuarter
      : batchData?.data?.keyMetrics

    if (!cashflow || !Array.isArray(cashflow)) {
      return []
    }

    // Create key metrics map by date
    const kmMap = new Map<string, any>()
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
        fcfPerShare: Number(metrics?.freeCashFlowPerShare) || 0,
        sbc: Number(row.stockBasedCompensation) || 0
      }
    })
  } catch (_error) {
    console.error('[BatchChartService] getFcfSeriesFromBatch error:', _error)
    return []
  }
}

/**
 * Get Net Income series from batch data
 * Used by: NetIncomeChart
 * Replaces: /api/v3/income-statement/:ticker (1 call)
 */
export function getNetIncomeSeriesFromBatch(batchData: BatchData | null, period: Period = 'annual'): SeriesPoint[] {
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
    ] as SeriesPoint)
  } catch (_error) {
    console.error('[BatchChartService] getNetIncomeSeriesFromBatch error:', _error)
    return []
  }
}

/**
 * Get EPS series from batch data
 * Used by: EpsChart
 * Replaces: /api/v3/income-statement/:ticker?period=quarter (1 call)
 */
export function getEpsSeriesFromBatch(batchData: BatchData | null, period: Period = 'annual'): SeriesPoint[] {
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
    ] as SeriesPoint)
  } catch (_error) {
    console.error('[BatchChartService] getEpsSeriesFromBatch error:', _error)
    return []
  }
}

/**
 * Get EBITDA series from batch data
 * Used by: EbitdaChart
 * Replaces: /api/v3/income-statement/:ticker (1 call)
 */
export function getEbitdaSeriesFromBatch(batchData: BatchData | null, period: Period = 'annual'): EbitdaDataPoint[] {
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
  } catch (_error) {
    console.error('[BatchChartService] getEbitdaSeriesFromBatch error:', _error)
    return []
  }
}

/**
 * Get Cash & Debt series from batch data
 * Used by: CashDebtChart
 * Replaces: /api/v3/balance-sheet-statement/:ticker (1 call)
 */
export function getCashDebtSeriesFromBatch(batchData: BatchData | null, period: Period = 'annual'): CashDebtDataPoint[] {
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
  } catch (_error) {
    console.error('[BatchChartService] getCashDebtSeriesFromBatch error:', _error)
    return []
  }
}

/**
 * Get Capital Returned series from batch data
 * Used by: CapitalReturnedChart
 * Replaces: /api/v3/cash-flow-statement/:ticker (1 call)
 */
export function getCapitalReturnedSeriesFromBatch(batchData: BatchData | null, period: Period = 'annual'): CapitalReturnedDataPoint[] {
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
  } catch (_error) {
    console.error('[BatchChartService] getCapitalReturnedSeriesFromBatch error:', _error)
    return []
  }
}

/**
 * Get Shares Outstanding series from batch data
 * Used by: SharesChart
 * Replaces: /api/v3/income-statement/:ticker (1 call)
 */
export function getSharesSeriesFromBatch(batchData: BatchData | null, period: Period = 'annual'): SeriesPoint[] {
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
    ] as SeriesPoint)
  } catch (_error) {
    console.error('[BatchChartService] getSharesSeriesFromBatch error:', _error)
    return []
  }
}

/**
 * Get Expenses series from batch data
 * Used by: ExpensesChart
 * Replaces: /api/v3/income-statement/:ticker (1 call)
 */
export function getExpensesSeriesFromBatch(batchData: BatchData | null, period: Period = 'annual'): ExpensesDataPoint[] {
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
  } catch (_error) {
    console.error('[BatchChartService] getExpensesSeriesFromBatch error:', _error)
    return []
  }
}

/**
 * Get Dividend Yield series from batch data
 * Used by: DividendYieldChart
 * Replaces: /api/v3/historical-price-full/:ticker/dividend (1 call from dividendHistory)
 */
export function getDividendYieldSeriesFromBatch(batchData: BatchData | null, period: Period = 'annual'): SeriesPoint[] {
  try {
    const dividendHistory = batchData?.data?.dividendHistory
    const priceHistory = batchData?.data?.priceHistory

    if (!dividendHistory || !Array.isArray(dividendHistory.historical) || dividendHistory.historical.length === 0) {
      return []
    }

    if (!priceHistory || !Array.isArray(priceHistory.historical) || priceHistory.historical.length === 0) {
      return []
    }

    // Create a map of dates to prices for quick lookup
    const priceMap = new Map<string, number>()
    let earliestPrice = Number.MAX_VALUE
    let earliestPriceValue = 0
    
    priceHistory.historical.forEach(priceData => {
      const priceDate = new Date(priceData.date).getTime()
      priceMap.set(priceData.date, Number(priceData.close))
      
      // Track the earliest available price as fallback for old dividend data
      if (priceDate < earliestPrice) {
        earliestPrice = priceDate
        earliestPriceValue = Number(priceData.close)
      }
    })

    // Group dividends by year or quarter, tracking dates for price lookup
    const grouped: Record<string, { date: number; totalDividend: number; dividendDates: string[]; count: number }> = {}

    if (dividendHistory.historical) {
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
            dividendDates: [],
            count: 0
          }
        }

        grouped[key].totalDividend += Number(div.dividend) || Number(div.adjDividend) || 0
        grouped[key].dividendDates.push(div.date)
        grouped[key].count++
      })
    }

    // Calculate yield for each period using the average price during that period
    const allData = Object.values(grouped)
      .map(item => {
        // Find the average price during this period by looking up prices near dividend payment dates
        let totalPrice = 0
        let priceCount = 0
        
        item.dividendDates.forEach(divDate => {
          // Try to find the exact date or nearby dates
          const price = priceMap.get(divDate)
          if (price) {
            totalPrice += price
            priceCount++
          } else {
            // If exact date not found, look for nearby trading days (within 5 days)
            const divDateTime = new Date(divDate).getTime()
            for (let offset = 0; offset <= 5; offset++) {
              const checkDateStr = new Date(divDateTime - offset * 86400000).toISOString().split('T')[0]
              if (checkDateStr) {
                const nearbyPrice = priceMap.get(checkDateStr)
                if (nearbyPrice) {
                  totalPrice += nearbyPrice
                  priceCount++
                  break
                }
              }
            }
          }
        })

        if (priceCount === 0) {
          // Fallback: use earliest available price for old dividend data (pre-2020)
          // This happens when dividend history goes back further than price history
          if (earliestPriceValue > 0) {
            const annualizedDividend = period === 'quarterly' 
              ? item.totalDividend * 4 
              : item.totalDividend
            const yieldValue = (annualizedDividend / earliestPriceValue) * 100
            return [item.date, yieldValue] as SeriesPoint
          }
          return null // Skip if we have no price data at all
        }

        const avgPrice = totalPrice / priceCount

        // For quarterly: annualize by multiplying by 4 (assumes quarterly dividends)
        // For annual: use the sum as-is
        const annualizedDividend = period === 'quarterly' 
          ? item.totalDividend * 4 
          : item.totalDividend
        const yieldValue = (annualizedDividend / avgPrice) * 100
        return [item.date, yieldValue] as SeriesPoint
      })
      .filter((point): point is SeriesPoint => point !== null)
      .sort((a, b) => a[0] - b[0])

    // For quarterly, limit to last 20 quarters to match other charts
    // For annual, return all available data (FMP typically returns ~20 years)
    if (period === 'quarterly') {
      return allData.slice(-20)
    }
    return allData

  } catch (_error) {
    console.error('[BatchChartService] getDividendYieldSeriesFromBatch error:', _error)
    return []
  }
}

/**
 * Get P/E and P/S ratio series from batch data
 * Used by: ValuationRatiosChart
 * Replaces: /api/v3/ratios (uses ratiosAnnual or ratiosQuarter from batch)
 */
export interface ValuationRatiosDataPoint {
  date: number
  peRatio: number
  psRatio: number
}

export function getValuationRatiosSeriesFromBatch(batchData: BatchData | null, period: Period = 'annual'): ValuationRatiosDataPoint[] {
  try {
    // Try requested period first
    let ratios = period === 'annual' 
      ? batchData?.data?.ratiosAnnual 
      : batchData?.data?.ratiosQuarter

    // Fallback to annual if quarterly is unavailable
    if ((!ratios || !Array.isArray(ratios) || ratios.length === 0) && period === 'quarterly') {
      ratios = batchData?.data?.ratiosAnnual
    }

    if (!ratios || !Array.isArray(ratios)) {
      return []
    }

    return ratios
      .map((r: any) => {
        if (!r.date) return null
        
        const peRatio = Number(r.priceEarningsRatioTTM || r.priceEarningsRatio || 0)
        const psRatio = Number(r.priceToSalesRatioTTM || r.priceToSalesRatio || 0)
        
        // Skip invalid data points
        if (peRatio === 0 && psRatio === 0) return null
        
        return {
          date: new Date(r.date).getTime(),
          peRatio,
          psRatio
        }
      })
      .filter((point): point is ValuationRatiosDataPoint => point !== null)
      .sort((a, b) => a.date - b.date)
  } catch (_error) {
    console.error('[BatchChartService] getValuationRatiosSeriesFromBatch error:', _error)
    return []
  }
}

/**
 * Get Insider Trading aggregated data from batch data (MEMOIZED - expensive)
 * Used by: InsiderTradingChart
 * Replaces: /api/v4/insider-trading (1 call from insiderTrading)
 */
export const getInsiderTradingFromBatch = memoize(function getInsiderTradingFromBatch(batchData: BatchData | null): InsiderTradingResult {
  try {
    const insiderData = batchData?.data?.insiderTrading

    if (!insiderData || !Array.isArray(insiderData) || insiderData.length === 0) {
      return { buys: [], sells: [], net: [] }
    }

    // Group by month
    const grouped: Record<string, { date: number; buyValue: number; sellValue: number; netShares: number }> = {}

    insiderData.forEach(trade => {
      if (!trade.transactionDate) return
      
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
        grouped[monthKey].netShares += Number(trade.securitiesTransacted) || 0
      } else if (trade.acquisitionOrDisposition === 'D') {
        grouped[monthKey].sellValue += value
        grouped[monthKey].netShares -= Number(trade.securitiesTransacted) || 0
      }
    })

    // Convert to arrays sorted by date
    const sorted = Object.values(grouped).sort((a, b) => a.date - b.date)

    return {
      buys: sorted.map(item => [item.date, item.buyValue] as SeriesPoint),
      sells: sorted.map(item => [item.date, item.sellValue] as SeriesPoint),
      net: sorted.map(item => [item.date, item.netShares] as SeriesPoint)
    }
  } catch (_error) {
    console.error('[BatchChartService] getInsiderTradingFromBatch error:', _error)
    return { buys: [], sells: [], net: [] }
  }
})

// Export cache for testing
export { cache as memoCache }

/**
 * Get price history series from batch data
 * Used by: PriceChart, InsiderTradingChart
 * Replaces: Direct /api/fmp/api/v3/historical-price-full call (1 call eliminated)
 */
export function getPriceSeriesFromBatch(batchData: BatchData | null, maxDays: number | null = null): SeriesPoint[] {
  try {
    const priceHistory = batchData?.data?.priceHistory

    if (!priceHistory || !Array.isArray(priceHistory.historical) || priceHistory.historical.length === 0) {
      return []
    }

    // Convert FMP format to chart format: [timestamp, adjClose]
    let series: SeriesPoint[] = priceHistory.historical.map(row => {
      const ts = row?.date ? Date.parse(row.date) : NaN
      const price = row?.adjClose ?? row?.close
      return Number.isFinite(ts) && Number.isFinite(price) ? [ts, Number(price)] as SeriesPoint : null
    }).filter((point): point is SeriesPoint => point !== null)

    // Sort ascending by timestamp (FMP returns most recent first)
    series.sort((a: SeriesPoint, b: SeriesPoint) => a[0] - b[0])

    // Optionally limit to last N days
    if (maxDays && series.length > 0) {
      const cutoffTime = Date.now() - (maxDays * 24 * 60 * 60 * 1000)
      series = series.filter((point: SeriesPoint) => point[0] >= cutoffTime)
    }

    return series
  } catch (_error) {
    console.error('[BatchChartService] getPriceSeriesFromBatch error:', _error)
    return []
  }
}

/**
 * Get product revenue categories from batch data (MEMOIZED)
 * New structure: FMP returns { "date": { "Category": value, ... } }
 * Used by: RevenueByCategoryChart (product segmentation)
 */
export const getProductCategoriesFromBatch = memoize(function getProductCategoriesFromBatch(batchData: BatchData | null): RevenueSegmentsResult {
  try {
    const segmentData = batchData?.data?.revenueSegments

    if (!segmentData || !Array.isArray(segmentData) || segmentData.length === 0) {
      return { segments: [], series: {} }
    }

    const allCategories = new Set<string>()
    const categorySeries: Record<string, SeriesPoint[]> = {}
    let skippedEntries = 0

    // FMP structure: each entry is { "date": { "CategoryName": value, ... } }
    segmentData.forEach(entry => {
      if (!entry || typeof entry !== 'object') {
        skippedEntries++
        return
      }
      
      const entryObj = entry as Record<string, unknown>
      const dateKey = Object.keys(entryObj)[0] // First key is the date
      if (!dateKey) {
        skippedEntries++
        return
      }

      const date = Date.parse(dateKey)
      const categories = entryObj[dateKey]

      if (categories && typeof categories === 'object') {
        Object.entries(categories).forEach(([categoryName, value]) => {
          const numValue = Number(value)
          if (!isNaN(numValue) && numValue > 0) {
            allCategories.add(categoryName)
            if (!categorySeries[categoryName]) {
              categorySeries[categoryName] = []
            }
            categorySeries[categoryName].push([date, numValue])
          }
        })
      } else {
        skippedEntries++
      }
    })

    // Sort each category series by date
    Object.values(categorySeries).forEach(series => {
      series.sort((a, b) => a[0] - b[0])
    })

    if (skippedEntries > 0) {
      console.warn(`[BatchChartService] Skipped ${skippedEntries} invalid product segment entries`)
    }

    return {
      segments: Array.from(allCategories).sort(),
      series: categorySeries
    }
  } catch (error) {
    console.error('[BatchChartService] getProductCategoriesFromBatch error:', error)
    return { segments: [], series: {} }
  }
}) as (batchData: BatchData | null) => RevenueSegmentsResult

/**
 * Get geographic revenue categories from batch data (MEMOIZED)
 * Structure: { "date": { "Region Name": value, ... } }
 * Used by: RevenueByCategoryChart (geographic segmentation)
 */
export const getGeographicCategoriesFromBatch = memoize(function getGeographicCategoriesFromBatch(batchData: BatchData | null): RevenueSegmentsResult {
  try {
    const segmentData = batchData?.data?.revenueGeographicSegments

    if (!segmentData || !Array.isArray(segmentData) || segmentData.length === 0) {
      return { segments: [], series: {} }
    }

    const allRegions = new Set<string>()
    const regionSeries: Record<string, SeriesPoint[]> = {}
    let skippedEntries = 0

    // Same structure as product segmentation
    segmentData.forEach(entry => {
      if (!entry || typeof entry !== 'object') {
        skippedEntries++
        return
      }
      
      const entryObj = entry as Record<string, unknown>
      const dateKey = Object.keys(entryObj)[0]
      if (!dateKey) {
        skippedEntries++
        return
      }

      const date = Date.parse(dateKey)
      const regions = entryObj[dateKey]

      if (regions && typeof regions === 'object') {
        Object.entries(regions).forEach(([regionName, value]) => {
          const numValue = Number(value)
          if (!isNaN(numValue) && numValue > 0) {
            // Normalize region names (remove "Segment" suffix)
            const normalizedName = regionName.replace(/ Segment$/i, '').trim()
            allRegions.add(normalizedName)
            if (!regionSeries[normalizedName]) {
              regionSeries[normalizedName] = []
            }
            regionSeries[normalizedName].push([date, numValue])
          }
        })
      } else {
        skippedEntries++
      }
    })

    // Sort each region series by date
    Object.values(regionSeries).forEach(series => {
      series.sort((a, b) => a[0] - b[0])
    })

    if (skippedEntries > 0) {
      console.warn(`[BatchChartService] Skipped ${skippedEntries} invalid geographic segment entries`)
    }

    return {
      segments: Array.from(allRegions).sort(),
      series: regionSeries
    }
  } catch (error) {
    console.error('[BatchChartService] getGeographicCategoriesFromBatch error:', error)
    return { segments: [], series: {} }
  }
}) as (batchData: BatchData | null) => RevenueSegmentsResult
