// Composable for Net Income chart data
import { ref, watch, computed } from 'vue'
import { getIncomeStatement } from '../services/financials'

export function useNetIncomeSeries(tickerRef) {
  const rawData = ref([])
  const loading = ref(false)
  const error = ref(null)
  const message = ref(null)
  const period = ref('annual')

  const viewModeOptions = computed(() => [
    { label: 'Annual', value: 'annual' },
    { label: 'Quarterly', value: 'quarter' }
  ])

  // Process net income data into chart series
  const series = computed(() => {
    if (!rawData.value || rawData.value.length === 0) return []
    
    const netIncomeData = rawData.value.map(item => {
      const date = new Date(item.date).getTime()
      const netIncome = Number(item.netIncome) || 0
      return [date, netIncome]
    })

    return [{
      name: 'Net Income',
      data: netIncomeData,
      color: '#4ade80' // green color for profit
    }]
  })

  const title = computed(() => 'Net Income')

  async function fetchData() {
    const t = (tickerRef.value || '').trim().toUpperCase()
    if (!t) {
      rawData.value = []
      message.value = null
      error.value = null
      return
    }

    loading.value = true
    error.value = null
    message.value = null

    try {
      const data = await getIncomeStatement(t, period.value, 20)
      
      if (!data || data.length === 0) {
        message.value = `No ${period.value} net income data found for ${t}.`
        rawData.value = []
      } else {
        rawData.value = data.reverse() // oldest to newest
        message.value = null
      }
    } catch (err) {
      console.error('[useNetIncomeSeries] Error:', err)
      error.value = `Failed to load net income data: ${err.message || err}`
      rawData.value = []
    } finally {
      loading.value = false
    }
  }

  // Watch ticker and period changes
  watch([tickerRef, period], () => fetchData(), { immediate: true })

  return {
    series,
    title,
    message,
    loading,
    error,
    period,
    viewModeOptions
  }
}
