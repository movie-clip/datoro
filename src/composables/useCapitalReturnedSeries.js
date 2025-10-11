import { ref, computed, watch } from 'vue'
import { getCapitalReturnedSeries } from '../services/financials'

export function useCapitalReturnedSeries(tickerRef) {
  const rawData = ref([]);
  const title = ref('Capital Returned to Shareholders — Empty');
  const message = ref('');
  const loading = ref(false);
  const error = ref(null);
  const selectedSegments = ref(['dividends', 'buybacks']); // Default: show both

  // Transform raw data into chart series based on selected segments
  const series = computed(() => {
    if (!rawData.value.length) return []
    
    const chartSeries = []
    
    // Add dividends series if selected
    if (selectedSegments.value.includes('dividends')) {
      chartSeries.push({
        name: 'Dividends',
        data: rawData.value.map(row => [row.date, row.dividends]),
        itemStyle: { color: '#60a5fa' }, // Blue
        stack: 'total'
      })
    }
    
    // Add buybacks series if selected
    if (selectedSegments.value.includes('buybacks')) {
      chartSeries.push({
        name: 'Share Buybacks',
        data: rawData.value.map(row => [row.date, row.buybacks]),
        itemStyle: { color: '#34d399' }, // Green
        stack: 'total'
      })
    }
    
    return chartSeries
  })

  async function refresh() {
    message.value = '';
    error.value = null;
    const t = (tickerRef?.value || '').toUpperCase();
    if (!t) {
      title.value = 'Capital Returned to Shareholders — Empty';
      rawData.value = [];
      message.value = 'Enter a ticker';
      return;
    }
    loading.value = true;
    try {
      const result = await getCapitalReturnedSeries(t, 'annual'); // Always use annual data
      if (result.error) {
        title.value = 'Error';
        rawData.value = [];
        message.value = result.error;
        error.value = result.error;
      } else if (!result.data.length) {
        title.value = 'Capital Returned — No data';
        rawData.value = [];
        message.value = `No capital return data for '${t}'.`;
      } else {
        title.value = `Capital Returned to Shareholders`;
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

  return { series, title, message, loading, error, refresh, selectedSegments };
}
