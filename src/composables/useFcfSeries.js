import { ref, watch } from 'vue'
import { getFcfSeries } from '../services/financials'

export function useFcfSeries(tickerRef) {
  const period  = ref('annual')   // 'annual' | 'quarterly'
  const series  = ref([])
  const title   = ref('Free Cash Flow — Empty')
  const message = ref('')
  const loading = ref(false)

  async function refresh() {
    message.value = ''
    const t = (tickerRef?.value || '').toUpperCase()
    if (!t) {
      title.value = 'Free Cash Flow — Empty'
      series.value = []
      message.value = 'Enter a ticker'
      return
    }
    loading.value = true
    try {
      const data = await getFcfSeries(t, period.value)
      if (!data.length) {
        title.value = 'Free Cash Flow — No data'
        series.value = []
        message.value = `No FCF data for '${t}'.`
      } else {
        title.value = `Free Cash Flow (${period.value === 'annual' ? 'Annual' : 'Quarterly'})`
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
