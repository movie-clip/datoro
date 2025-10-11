import { ref, watch, computed } from 'vue'
import { getExpensesSeries } from '../services/company/expensesService'

export function useExpensesSeries(tickerRef) {
  const period = ref('annual')
  const selectedSegments = ref(['total'])
  const rawData = ref([])
  const title = ref('Operating Expenses — Empty')
  const message = ref('')
  const loading = ref(false)
  const error = ref(null)

  const segmentLabels = {
    total: 'Total Expenses',
    costOfRevenue: 'Cost of Revenue',
    researchAndDevelopment: 'R&D',
    sellingGeneralAdmin: 'SG&A'
  }

  // Compute series based on selected segments
  const series = computed(() => {
    if (!rawData.value.length) return []
    
    // If only total is selected, return single series
    if (selectedSegments.value.length === 1 && selectedSegments.value[0] === 'total') {
      return rawData.value.map(d => [d.date, d.total])
    }
    
    // Filter out 'total' when other segments are selected
    const segments = selectedSegments.value.filter(s => s !== 'total')
    if (!segments.length) return []
    
    // Collect all dates
    const allDates = [...new Set(rawData.value.map(d => d.date))].sort((a, b) => a - b)
    
    // Create multi-series with stacking
    return segments.map(segment => {
      // Align all data to common dates
      const alignedData = allDates.map(date => {
        const dataPoint = rawData.value.find(d => d.date === date)
        return [date, dataPoint ? dataPoint[segment] : 0]
      })
      
      return {
        name: segmentLabels[segment],
        data: alignedData,
        stack: 'expenses'
      }
    })
  })

  // Compact series always shows total
  const compactSeries = computed(() => {
    if (!rawData.value.length) return []
    return rawData.value.map(d => [d.date, d.total])
  })

  const viewModeOptions = computed(() => [
    { label: 'Total', value: 'total' },
    { label: 'Cost of Revenue', value: 'costOfRevenue' },
    { label: 'R&D', value: 'researchAndDevelopment' },
    { label: 'SG&A', value: 'sellingGeneralAdmin' }
  ])

  function resetSelection() {
    selectedSegments.value = ['total']
  }

  async function refresh() {
    message.value = ''
    error.value = null
    const t = (tickerRef?.value || '').toUpperCase()
    if (!t) {
      title.value = 'Operating Expenses — Empty'
      rawData.value = []
      message.value = 'Enter a ticker'
      return
    }
    
    loading.value = true
    try {
      const result = await getExpensesSeries(t, period.value)
      if (result.error) {
        title.value = 'Error'
        rawData.value = []
        message.value = result.error
        error.value = result.error
      } else if (!result.data.length) {
        title.value = 'Operating Expenses — No data'
        rawData.value = []
        message.value = `No expense data for '${t}'`
      } else {
        title.value = 'Operating Expenses'
        rawData.value = result.data
      }
    } catch (e) {
      title.value = 'Error'
      rawData.value = []
      message.value = 'Failed to load data'
      error.value = e?.message || 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  watch(() => tickerRef?.value, () => {
    resetSelection()
    refresh()
  }, { immediate: true })
  watch(period, () => refresh())

  return { 
    period, 
    selectedSegments, 
    series, 
    compactSeries,
    viewModeOptions,
    title, 
    message, 
    loading, 
    error, 
    refresh,
    resetSelection
  }
}
