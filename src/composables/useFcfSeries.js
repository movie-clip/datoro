import { ref, watch, computed } from 'vue'
import { getFcfSeries } from '../services/financials'

export function useFcfSeries(tickerRef) {
  const period  = ref('annual');
  const viewMode = ref('fcfAndSbc'); // Default to showing both FCF & SBC
  const rawData = ref([]);
  const title   = ref('Free Cash Flow — Empty');
  const message = ref('');
  const loading = ref(false);
  const error   = ref(null);

  // Transform data based on view mode
  const series = computed(() => {
    if (!rawData.value.length) return []
    
    switch (viewMode.value) {
      case 'fcfPerShare':
        return rawData.value.map(d => [d.date, d.fcfPerShare])
      case 'fcfAndSbc':
        // Return array of series for multi-bar chart
        return [
          { name: 'FCF', data: rawData.value.map(d => [d.date, d.fcf]) },
          { name: 'SBC', data: rawData.value.map(d => [d.date, d.sbc]) }
        ]
      case 'fcf':
      default:
        return rawData.value.map(d => [d.date, d.fcf])
    }
  })
  
  // Compact series for default view - always show FCF & SBC
  const compactSeries = computed(() => {
    if (!rawData.value.length) return []
    
    return [
      { name: 'FCF', data: rawData.value.map(d => [d.date, d.fcf]) },
      { name: 'SBC', data: rawData.value.map(d => [d.date, d.sbc]) }
    ]
  })

  async function refresh() {
    message.value = '';
    error.value = null;
    const t = (tickerRef?.value || '').toUpperCase();
    if (!t) {
      title.value = 'Free Cash Flow — Empty';
      rawData.value = [];
      message.value = 'Enter a ticker';
      return;
    }
    loading.value = true;
    try {
      const result = await getFcfSeries(t, period.value);
      if (result.error) {
        title.value = 'Error';
        rawData.value = [];
        message.value = result.error;
        error.value = result.error;
      } else if (!result.data.length) {
        title.value = 'Free Cash Flow — No data';
        rawData.value = [];
        message.value = `No FCF data for '${t}'.`;
      } else {
        title.value = 'Free Cash Flow';
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

  return { period, viewMode, series, compactSeries, title, message, loading, error, refresh };
}
