import { ref, watch } from 'vue'
import { getRevenueSeries } from '../services/financials'

export function useRevenueSeries(tickerRef) {
  const period  = ref('annual');   // 'annual' | 'quarterly'
  const series  = ref([]);
  const title   = ref('Revenue — Empty');
  const message = ref('');
  const loading = ref(false);
  const error   = ref(null);

  async function refresh() {
    message.value = '';
    error.value = null;
    const t = (tickerRef?.value || '').toUpperCase();
    if (!t) {
      title.value = 'Revenue — Empty';
      series.value = [];
      message.value = 'Enter a ticker';
      return;
    }
    loading.value = true;
    try {
      const result = await getRevenueSeries(t, period.value);
      if (result.error) {
        title.value = 'Error';
        series.value = [];
        message.value = result.error;
        error.value = result.error;
      } else if (!result.data.length) {
        title.value = 'Revenue — No data';
        series.value = [];
        message.value = `No revenue data for '${t}'.`;
      } else {
        title.value = `Revenue (${period.value === 'annual' ? 'Annual' : 'Quarterly'})`;
        series.value = result.data;
      }
    } catch (e) {
      title.value = 'Error';
      series.value = [];
      message.value = 'Failed to load data.';
      error.value = e?.message || 'Unknown error';
    } finally {
      loading.value = false;
    }
  }

  watch(() => tickerRef?.value, () => refresh(), { immediate: true });
  watch(period, () => refresh());

  return { period, series, title, message, loading, error, refresh };
}
