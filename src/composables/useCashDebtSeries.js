import { ref, watch, computed } from 'vue'
import { getCashDebtSeries } from '../services/financials'

export function useCashDebtSeries(tickerRef) {
  const rawData = ref([]);
  const title   = ref('Cash & Debt — Empty');
  const message = ref('');
  const loading = ref(false);
  const error   = ref(null);

  // Transform raw data into multi-series format for dual-bar chart
  const series = computed(() => {
    if (!rawData.value.length) return []
    
    return [
      {
        name: 'Cash',
        data: rawData.value.map(d => [d.date, d.cash])
      },
      {
        name: 'Debt',
        data: rawData.value.map(d => [d.date, d.debt]),
        itemStyle: { color: '#ff6b6b' }
      }
    ]
  });

  async function refresh() {
    message.value = '';
    error.value = null;
    const t = (tickerRef?.value || '').toUpperCase();
    if (!t) {
      title.value = 'Cash & Debt — Empty';
      rawData.value = [];
      message.value = 'Enter a ticker';
      return;
    }
    loading.value = true;
    try {
      const result = await getCashDebtSeries(t, 'annual');
      if (result.error) {
        title.value = 'Error';
        rawData.value = [];
        message.value = result.error;
        error.value = result.error;
      } else if (!result.data.length) {
        title.value = 'Cash & Debt — No data';
        rawData.value = [];
        message.value = `No data for '${t}'.`;
      } else {
        title.value = `Cash & Debt`;
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

  return { series, title, message, loading, error, refresh };
}
