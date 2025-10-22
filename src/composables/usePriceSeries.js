import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { TIMEFRAMES, DEFAULT_TF } from '../models/timeframe'
import { useTickerStore } from '../stores/tickerStore'
import { getPriceSeriesFromBatch } from '../services/financials/batchChartService.js'

export function usePriceSeries() {
  const tfKey   = ref(DEFAULT_TF);
  const title   = ref('Empty Chart');
  const message = ref('');
  const error   = ref(null);

  // Use Pinia store with storeToRefs to maintain reactivity
  const tickerStore = useTickerStore()
  const { batchData, loading, currentTicker, error: batchError } = storeToRefs(tickerStore)
  const { refresh } = tickerStore

  // Extract and filter price series based on timeframe
  const series = computed(() => {
    const t = currentTicker.value
    if (!t) return []
    
    const cfg = TIMEFRAMES[tfKey.value] || TIMEFRAMES['YTD']
    const rawPrices = getPriceSeriesFromBatch(batchData.value)
    
    if (!rawPrices.length) return []
    
    // Filter by timeframe
    const maxDays = mapTimeframeToMaxDays(cfg.range)
    if (maxDays) {
      const cutoffTime = Date.now() - (maxDays * 24 * 60 * 60 * 1000)
      const filtered = rawPrices.filter(point => point[0] >= cutoffTime)
      
      // Calculate if price is up or down from start
      if (filtered.length >= 2) {
        const startPrice = filtered[0][1]
        const endPrice = filtered[filtered.length - 1][1]
        const isUp = endPrice >= startPrice
        
        // Return as ECharts series with dynamic color and gradient
        return {
          type: 'line',
          name: 'Price',
          data: filtered,
          smooth: 0.15,
          showSymbol: false,
          emphasis: { disabled: true },
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
    
    // For 'ALL' timeframe - show full history
    if (rawPrices.length >= 2) {
      const startPrice = rawPrices[0][1]
      const endPrice = rawPrices[rawPrices.length - 1][1]
      const isUp = endPrice >= startPrice
      
      return {
        type: 'line',
        name: 'Price',
        data: rawPrices,
        smooth: 0.15,
        showSymbol: false,
        emphasis: { disabled: true },
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
  const growthData = computed(() => {
    const rawPrices = getPriceSeriesFromBatch(batchData.value)
    if (!rawPrices || rawPrices.length < 2) return null
    
    const sortedData = [...rawPrices].sort((a, b) => a[0] - b[0])
    const latestValue = sortedData[sortedData.length - 1][1]
    const latestDate = sortedData[sortedData.length - 1][0]
    
    const isShortTerm = tfKey.value === '5D' || tfKey.value === '1M'
    
    const findClosestValue = (targetDate, maxDiffDays = 3) => {
      let closest = null
      let minDiff = Infinity
      
      for (const [date, value] of sortedData) {
        const diff = Math.abs(date - targetDate)
        if (diff < minDiff) {
          minDiff = diff
          closest = value
        }
      }
      
      if (minDiff < maxDiffDays * 24 * 60 * 60 * 1000) {
        return closest
      }
      return null
    }
    
    const calculateGrowth = (oldValue, newValue) => {
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
      
      const findLongTermValue = (targetDate) => {
        let closest = null
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

  return { tfKey, series, title, message, loading, error, retry: refresh, growthData };
}

// Map timeframe range to max days for filtering
function mapTimeframeToMaxDays(range) {
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

function daysSinceStartOfYear() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  return Math.max(1, Math.ceil((now - start) / (1000 * 60 * 60 * 24)) + 1)
}
