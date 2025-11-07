import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import { storeToRefs } from 'pinia'
import { TIMEFRAMES, DEFAULT_TF, type TimeframeKey } from '../models/timeframe'
import { useTickerStore } from '../stores/tickerStore'
import { getPriceSeriesFromBatch } from '../services/financials/batchChartService'

interface GrowthDataShortTerm {
  oneDay: number | null
  oneWeek: number | null
  oneMonth: number | null
}

interface GrowthDataLongTerm {
  oneYear: number | null
  twoYear: number | null
  fiveYear: number | null
}

type GrowthData = GrowthDataShortTerm | GrowthDataLongTerm

interface PriceSeries {
  type: string
  name: string
  data: [number, number][]
  smooth: number
  showSymbol: boolean
  emphasis: { disabled: boolean }
  sampling: string
  large: boolean
  largeThreshold: number
  progressive: number
  progressiveThreshold: number
  lineStyle: { width: number; color: string }
  areaStyle: {
    origin: string
    color: {
      type: string
      x: number
      y: number
      x2: number
      y2: number
      colorStops: Array<{ offset: number; color: string }>
    }
  }
}

export interface UsePriceSeriesReturn {
  tfKey: Ref<TimeframeKey>
  series: ComputedRef<[number, number][] | PriceSeries>
  title: Ref<string>
  message: Ref<string>
  loading: Ref<boolean>
  error: Ref<string | null>
  retry: () => void
  growthData: ComputedRef<GrowthData | null>
}

export function usePriceSeries(): UsePriceSeriesReturn {
  const tfKey = ref<TimeframeKey>(DEFAULT_TF)
  const title = ref('Empty Chart')
  const message = ref('')
  const error = ref<string | null>(null)

  // Use Pinia store with storeToRefs to maintain reactivity
  const tickerStore = useTickerStore()
  const { batchData, loading, currentTicker, error: batchError } = storeToRefs(tickerStore)
  const { refresh } = tickerStore

  // Extract and filter price series based on timeframe
  const series = computed<[number, number][] | PriceSeries>(() => {
    const t = currentTicker.value
    if (!t) return []
    
    const cfg = TIMEFRAMES[tfKey.value] || TIMEFRAMES['YTD']
    const rawPrices = getPriceSeriesFromBatch(batchData.value)
    
    // Debug logging
    if (!rawPrices.length) {
      console.log('[usePriceSeries] No price data:', {
        ticker: t,
        hasBatchData: !!batchData.value,
        priceHistory: batchData.value?.data?.priceHistory,
        historicalLength: batchData.value?.data?.priceHistory?.historical?.length
      })
      return []
    }
    
    // Filter by timeframe
    const maxDays = mapTimeframeToMaxDays(cfg.range)
    if (maxDays) {
      const cutoffTime = Date.now() - (maxDays * 24 * 60 * 60 * 1000)
      let filtered = rawPrices.filter(point => point[0] >= cutoffTime)
      
      // Handle edge case: if filtered data is empty (e.g., weekend with 5D timeframe)
      // Fall back to last available data points
      if (filtered.length === 0 && rawPrices.length > 0) {
        // Take the last N points based on timeframe
        const fallbackCount = Math.min(maxDays, rawPrices.length)
        filtered = rawPrices.slice(-fallbackCount)
      }
      
      // Ensure we have at least 2 data points for meaningful display
      if (filtered.length < 2 && rawPrices.length >= 2) {
        filtered = rawPrices.slice(-Math.min(10, rawPrices.length))
      }
      
      // Calculate if price is up or down from start
      if (filtered.length >= 2) {
        const firstPoint = filtered[0]
        const lastPoint = filtered[filtered.length - 1]
        if (!firstPoint || !lastPoint) return filtered
        
        const startPrice = firstPoint[1]
        const endPrice = lastPoint[1]
        const isUp = endPrice >= startPrice
        
        // Return as ECharts series with dynamic color and gradient
        // Best practices for smooth zoom/pan with large datasets:
        // 1. Use progressive rendering for datasets > 1000 points
        // 2. LTTB sampling reduces points while maintaining visual accuracy
        // 3. Optimized line rendering with reduced smooth value
        return {
          type: 'line',
          name: 'Price',
          data: filtered,
          smooth: 0.2, // Moderate smoothing for better visual appeal
          showSymbol: false,
          emphasis: { disabled: true },
          sampling: 'lttb', // Largest-Triangle-Three-Buckets algorithm
          large: filtered.length > 1000, // Enable large mode for big datasets
          largeThreshold: 1000, // Threshold for switching to large mode
          progressive: 400, // Render 400 points per frame for smooth loading
          progressiveThreshold: 1000, // Enable progressive when > 1000 points
          lineStyle: { 
            width: 2,
            color: isUp ? '#00A88E' : '#ef4444'
          },
          // Gradient area fill from line to bottom, using origin to make it relative to line
          areaStyle: {
            origin: 'auto', // Makes gradient follow the line
            color: {
              type: 'linear',
              x: 0,
              y: 0, // Start at the line
              x2: 0,
              y2: 1, // End at bottom
              colorStops: [
                {
                  offset: 0, // At the line
                  color: isUp ? 'rgba(0, 168, 142, 0.4)' : 'rgba(239, 68, 68, 0.4)'
                },
                {
                  offset: 0.5, // Halfway to bottom
                  color: isUp ? 'rgba(0, 168, 142, 0.1)' : 'rgba(239, 68, 68, 0.1)'
                },
                {
                  offset: 1, // At bottom
                  color: 'rgba(0, 0, 0, 0)'
                }
              ]
            }
          }
        }
      }
      
      return filtered
    }
    
    // For 'ALL' timeframe - show full history (potentially 30 years of daily data)
    if (rawPrices.length >= 2) {
      const firstPoint = rawPrices[0]
      const lastPoint = rawPrices[rawPrices.length - 1]
      if (!firstPoint || !lastPoint) return rawPrices
      
      const startPrice = firstPoint[1]
      const endPrice = lastPoint[1]
      const isUp = endPrice >= startPrice
      
      // Best practices for smooth handling of very large datasets (10k+ points):
      // 1. Progressive rendering (chunks of 400 points per frame)
      // 2. Large mode optimization for datasets > 1000 points
      // 3. LTTB sampling maintains visual accuracy while reducing render load
      return {
        type: 'line',
        name: 'Price',
        data: rawPrices,
        smooth: 0.2, // Moderate smoothing for better visual appeal
        showSymbol: false,
        emphasis: { disabled: true },
        sampling: 'lttb', // Largest-Triangle-Three-Buckets algorithm
        large: rawPrices.length > 1000, // Enable large mode for big datasets
        largeThreshold: 1000, // Threshold for switching to large mode
        progressive: 400, // Render 400 points per frame for smooth loading
        progressiveThreshold: 1000, // Enable progressive when > 1000 points
        lineStyle: { 
          width: 2,
          color: isUp ? '#00A88E' : '#ef4444'
        },
        areaStyle: {
          origin: 'auto', // Makes gradient follow the line
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: isUp ? 'rgba(0, 168, 142, 0.4)' : 'rgba(239, 68, 68, 0.4)'
              },
              {
                offset: 0.5,
                color: isUp ? 'rgba(0, 168, 142, 0.1)' : 'rgba(239, 68, 68, 0.1)'
              },
              {
                offset: 1,
                color: 'rgba(0, 0, 0, 0)'
              }
            ]
          }
        }
      }
    }
    
    return rawPrices
  })

  // Calculate growth based on timeframe
  const growthData = computed<GrowthData | null>(() => {
    const rawPrices = getPriceSeriesFromBatch(batchData.value)
    if (!rawPrices || rawPrices.length < 2) return null
    
    const sortedData = [...rawPrices].sort((a, b) => a[0] - b[0])
    const lastPoint = sortedData[sortedData.length - 1]
    if (!lastPoint) return null
    
    const latestValue = lastPoint[1]
    const latestDate = lastPoint[0]
    
    const isShortTerm = tfKey.value === '5D' || tfKey.value === '1M'
    
    /**
     * Find the closest value to a target date, accounting for market closures
     * Markets are closed on weekends and holidays
     */
    const findClosestValue = (targetDate: number, maxDiffDays = 3): number | null => {
      // Adjust target date if it falls on a weekend
      const targetDateObj = new Date(targetDate)
      const dayOfWeek = targetDateObj.getDay()
      
      // If Saturday (6), go back to Friday
      if (dayOfWeek === 6) {
        targetDate -= 1 * 24 * 60 * 60 * 1000
      }
      // If Sunday (0), go back to Friday
      else if (dayOfWeek === 0) {
        targetDate -= 2 * 24 * 60 * 60 * 1000
      }
      
      let closest: number | null = null
      let minDiff = Infinity
      
      for (const [date, value] of sortedData) {
        const diff = Math.abs(date - targetDate)
        if (diff < minDiff) {
          minDiff = diff
          closest = value
        }
      }
      
      // For short-term (1D), be more lenient - allow up to 4 days back (handles long weekends)
      // For other periods, use the specified maxDiffDays
      const effectiveMaxDiff = maxDiffDays === 2 ? 4 : maxDiffDays
      const maxAllowedDiff = effectiveMaxDiff * 24 * 60 * 60 * 1000
      
      if (minDiff < maxAllowedDiff) {
        return closest
      }
      
      // If still no data found, try to find the most recent data point before target
      // This handles cases where there's a market holiday
      for (let i = sortedData.length - 1; i >= 0; i--) {
        const dataPoint = sortedData[i]
        if (!dataPoint) continue
        
        const [date, value] = dataPoint
        if (date <= targetDate) {
          const diff = targetDate - date
          if (diff < maxAllowedDiff) {
            return value
          }
          break
        }
      }
      
      return null
    }
    
    const calculateGrowth = (oldValue: number | null, newValue: number): number | null => {
      if (oldValue === null || oldValue === 0 || newValue === null) return null
      return ((newValue - oldValue) / Math.abs(oldValue)) * 100
    }
    
    if (isShortTerm) {
      // Calculate short-term growth: 1D, 1W, 1M
      const oneDayAgo = latestDate - (1 * 24 * 60 * 60 * 1000)
      const oneWeekAgo = latestDate - (7 * 24 * 60 * 60 * 1000)
      const oneMonthAgo = latestDate - (30 * 24 * 60 * 60 * 1000)
      
      const oneDayValue = findClosestValue(oneDayAgo, 2)
      const oneWeekValue = findClosestValue(oneWeekAgo, 3)
      const oneMonthValue = findClosestValue(oneMonthAgo, 5)
      
      return {
        oneDay: calculateGrowth(oneDayValue, latestValue),
        oneWeek: calculateGrowth(oneWeekValue, latestValue),
        oneMonth: calculateGrowth(oneMonthValue, latestValue)
      }
    } else {
      // Calculate long-term growth: 1Y, 2Y, 5Y
      const oneYearAgo = latestDate - (365 * 24 * 60 * 60 * 1000)
      const twoYearsAgo = latestDate - (2 * 365 * 24 * 60 * 60 * 1000)
      const fiveYearsAgo = latestDate - (5 * 365 * 24 * 60 * 60 * 1000)
      
      const findLongTermValue = (targetDate: number): number | null => {
        let closest: number | null = null
        let minDiff = Infinity
        
        for (const [date, value] of sortedData) {
          const diff = Math.abs(date - targetDate)
          if (diff < minDiff) {
            minDiff = diff
            closest = value
          }
        }
        
        // Only return if within 6 months of target
        if (minDiff < 180 * 24 * 60 * 60 * 1000) {
          return closest
        }
        return null
      }
      
      const oneYearValue = findLongTermValue(oneYearAgo)
      const twoYearValue = findLongTermValue(twoYearsAgo)
      const fiveYearValue = findLongTermValue(fiveYearsAgo)
      
      return {
        oneYear: calculateGrowth(oneYearValue, latestValue),
        twoYear: calculateGrowth(twoYearValue, latestValue),
        fiveYear: calculateGrowth(fiveYearValue, latestValue)
      }
    }
  })

  // Update title when ticker or timeframe changes
  watch([() => currentTicker.value, tfKey, () => batchData.value], () => {
    const t = currentTicker.value
    const cfg = TIMEFRAMES[tfKey.value] || TIMEFRAMES['YTD']
    
    title.value = 'Price'
    if (!t) {
      message.value = 'Enter a ticker'
      error.value = null
    } else {
      const rawPrices = getPriceSeriesFromBatch(batchData.value)
      const hasData = rawPrices && rawPrices.length > 0
      
      if (hasData) {
        // Have data - show it (ignore any old errors)
        message.value = ''
        error.value = null
      } else if (batchError.value && !loading.value) {
        // Error and not loading - keep original title, show error in message
        message.value = batchError.value
        error.value = batchError.value
      } else if (!loading.value) {
        // No data and not loading - show no data
        message.value = `No data for '${t}'.`
        error.value = null
      } else {
        // Loading - keep previous title or show loading state
        if (!title.value || title.value === 'Empty Chart') {
          title.value = `${t} ${cfg.title}`
        }
        message.value = ''
        error.value = null
      }
    }
  }, { immediate: true })

  return { tfKey, series, title, message, loading, error, retry: refresh, growthData }
}

// Map timeframe range to max days for filtering
function mapTimeframeToMaxDays(range: string): number | null {
  switch (range) {
    case '5d': return 7
    case '1mo': return 31
    case '6mo': return 200
    case 'ytd': return daysSinceStartOfYear()
    case '5y': return 1850
    case 'max':
    default:
      return null // full history
  }
}

function daysSinceStartOfYear(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
}
