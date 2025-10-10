import { ref, watch } from 'vue'
import { getRevenueSeries } from '../services/financials'

export function useRevenueSeries(tickerRef) {
  const period  = ref('annual')   // 'annual' | 'quarterly'
  const series  = ref([])
  const title   = ref('Revenue — Empty')
  const message = ref('')
  const loading = ref(false)

  async function refresh() {
    message.value = ''
    const t = (tickerRef?.value || '').toUpperCase()
    if (!t) {
      title.value = 'Revenue — Empty'
      series.value = []
      message.value = 'Enter a ticker'
      return
    }
    loading.value = true
    try {
      const data = await getRevenueSeries(t, period.value)
      if (!data.length) {
        title.value = 'Revenue — No data'
        series.value = []
        message.value = `No revenue data for '${t}'.`
      } else {
        title.value = `${t} — Revenue (${period.value === 'annual' ? 'Annual' : 'Quarterly'})`
        series.value = data
      }
    } finally {
      loading.value = false
    }
  }

  watch(() => tickerRef?.value, () => refresh(), { immediate: true })
  watch(period, () => refresh())

  return { period, series, title, message, loading, refresh }
}
