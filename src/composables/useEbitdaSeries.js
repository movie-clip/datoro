import { ref, watch, computed } from 'vue'
import { getEbitdaSeries } from '../services/financials'

export function useEbitdaSeries(tickerRef) {
  const rawData = ref([]);
  const title   = ref('EBITDA — Empty');
  const message = ref('');
  const loading = ref(false);
  const error   = ref(null);
  const period = ref('annual');
  
  // Selected segments (components) to display
  const selectedSegments = ref(['revenue', 'costOfRevenue', 'operatingExpenses', 'depreciationAndAmortization']);
  
  // All available segments
  const segmentData = ref({
    segments: ['revenue', 'costOfRevenue', 'operatingExpenses', 'depreciationAndAmortization'],
    series: {}
  });

  // Map segment keys to display names and data
  const segmentConfig = {
    revenue: { label: 'Revenue', sign: 1 },
    costOfRevenue: { label: 'Cost of Revenue', sign: -1 },
    operatingExpenses: { label: 'Operating Expenses', sign: -1 },
    depreciationAndAmortization: { label: 'D&A', sign: 1 }
  };

  // Computed series based on selected segments
  const series = computed(() => {
    if (!rawData.value.length) return []
    
    const result = []
    selectedSegments.value.forEach(segmentKey => {
      if (segmentConfig[segmentKey]) {
        const config = segmentConfig[segmentKey]
        result.push({
          name: config.label,
          data: rawData.value.map(d => [d.date, d[segmentKey] * config.sign])
        })
      }
    })
    return result
  })
  
  // Compact series for default view - show all components
  const compactSeries = computed(() => {
    if (!rawData.value.length) return []
    
    return [
      { name: 'Revenue', data: rawData.value.map(d => [d.date, d.revenue]) },
      { name: 'Cost of Revenue', data: rawData.value.map(d => [d.date, -d.costOfRevenue]) },
      { name: 'Operating Expenses', data: rawData.value.map(d => [d.date, -d.operatingExpenses]) },
      { name: 'D&A', data: rawData.value.map(d => [d.date, d.depreciationAndAmortization]) }
    ]
  })
  
  // View mode options for segment selection
  const viewModeOptions = computed(() => {
    return [
      { label: 'Revenue', value: 'revenue' },
      { label: 'Cost of Revenue', value: 'costOfRevenue' },
      { label: 'Operating Expenses', value: 'operatingExpenses' },
      { label: 'D&A', value: 'depreciationAndAmortization' }
    ]
  })

  async function refresh() {
    message.value = '';
    error.value = null;
    const t = (tickerRef?.value || '').toUpperCase();
    if (!t) {
      title.value = 'EBITDA — Empty';
      rawData.value = [];
      message.value = 'Enter a ticker';
      return;
    }
    loading.value = true;
    try {
      const result = await getEbitdaSeries(t, period.value);
      if (result.error) {
        title.value = 'Error';
        rawData.value = [];
        message.value = result.error;
        error.value = result.error;
      } else if (!result.data.length) {
        title.value = 'EBITDA — No data';
        rawData.value = [];
        message.value = `No EBITDA data for '${t}'.`;
      } else {
        title.value = `EBITDA`;
        rawData.value = result.data;
      }
    } catch (e) {
      title.value = 'Error';
      rawData.value = [];
      message.value = 'Failed to load data.';
      error.value = e?.message || 'Unknown error';
    } finally {
      loading.value = false;
    }
  }

  watch(() => tickerRef?.value, () => refresh(), { immediate: true });
  watch(period, () => refresh());

  return { 
    series, 
    compactSeries, 
    title, 
    message, 
    loading, 
    error, 
    refresh, 
    period,
    selectedSegments,
    viewModeOptions,
    segmentData
  };
}
