import { ref, watch } from 'vue'
import { getEbitdaSeries } from '../services/financials'

export function useEbitdaSeries(tickerRef) {
  const series  = ref([]);
  const title   = ref('EBITDA — Empty');
  const message = ref('');
  const loading = ref(false);
  const error   = ref(null);
  const viewMode = ref('annual');

  async function refresh() {
    message.value = '';
    error.value = null;
    const t = (tickerRef?.value || '').toUpperCase();
    if (!t) {
      title.value = 'EBITDA — Empty';
      series.value = [];
      message.value = 'Enter a ticker';
      return;
    }
    loading.value = true;
    try {
      const result = await getEbitdaSeries(t, viewMode.value);
      if (result.error) {
        title.value = 'Error';
        series.value = [];
        message.value = result.error;
        error.value = result.error;
      } else if (!result.data.length) {
        title.value = 'EBITDA — No data';
        series.value = [];
        message.value = `No EBITDA data for '${t}'.`;
      } else {
        title.value = `EBITDA`;
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
  watch(viewMode, () => refresh());

  return { series, title, message, loading, error, refresh, viewMode };
}
