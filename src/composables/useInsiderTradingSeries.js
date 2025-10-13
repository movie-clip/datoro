import { ref, watch, computed } from 'vue'
import { useTickerData } from './useTickerData.js'
import { getInsiderTradingFromBatch, getPriceSeriesFromBatch } from '../services/financials/batchChartService.js'

export function useInsiderTradingSeries(tickerRef) {
  const title = ref('Price & Insider Trading — Empty')
  const message = ref('')
  const error = ref(null)

  // Use batch data composable for both insider trading AND price
  const { data: batchData, loading, error: batchError } = useTickerData(tickerRef)

  // Extract insider trading data from batch
  const insiderData = computed(() => getInsiderTradingFromBatch(batchData.value))
  
  // Extract price data from batch
  const priceData = computed(() => getPriceSeriesFromBatch(batchData.value))

  // Compute series for ECharts (price line + insider bars)
  const series = computed(() => {
    if (!priceData.value.length && !insiderData.value.net?.length) return []
    
    const result = []
    
    // Price series (line)
    if (priceData.value.length) {
      result.push({
        name: 'Price',
        type: 'line',
        data: priceData.value,
        yAxisIndex: 0,
        smooth: true,
        lineStyle: { width: 2 },
        showSymbol: false
      })
    }
    
    // Insider net shares (bar)
    if (insiderData.value.net?.length) {
      result.push({
        name: 'Net Insider Shares',
        type: 'bar',
        data: insiderData.value.net,
        yAxisIndex: 1,
        itemStyle: {
          color: (params) => params.value[1] >= 0 ? '#4caf50' : '#f44336'
        }
      })
    }
    
    return result
  })

  // Update title and messages when data changes
  watch([() => tickerRef?.value, batchData, batchError], () => {
    const t = (tickerRef?.value || '').toUpperCase()
    
    if (!t) {
      title.value = 'Price & Insider Trading — Empty'
      message.value = 'Enter a ticker'
      error.value = null
    } else if (batchError.value) {
      // Keep original title, show error in message
      title.value = 'Price & Insider Trading'
      message.value = 'Failed to load data'
      error.value = batchError.value
    } else if (!priceData.value.length && !insiderData.value.net?.length && !loading.value) {
      title.value = 'Price & Insider Trading — No data'
      message.value = `No data for '${t}'`
      error.value = null
    } else {
      title.value = 'Price & Insider Trading'
      message.value = ''
      error.value = null
    }
  }, { immediate: true })

  return { series, title, message, loading, error }
}
