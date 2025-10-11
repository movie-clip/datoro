import { ref, watch } from 'vue'
import { getSharesSeries } from '../services/financials'

export function useSharesSeries(tickerRef, periodRef) {
  const series  = ref([]);
  const title   = ref('Shares Outstanding — Empty');
  const message = ref('');
  const loading = ref(false);
  const error   = ref(null);

  async function refresh() {
    message.value = '';
    error.value = null;
    const t = (tickerRef?.value || '').toUpperCase();
    if (!t) {
      title.value = 'Shares Outstanding — Empty';
      series.value = [];
      message.value = 'Enter a ticker';
      return;
    }
    loading.value = true;
    try {
      const period = periodRef?.value || 'annual';
      const result = await getSharesSeries(t, period);
      if (result.error) {
        title.value = 'Error';
        series.value = [];
        message.value = result.error;
        error.value = result.error;
      } else if (!result.data.length) {
        title.value = 'Shares Outstanding — No data';
        series.value = [];
        message.value = `No shares data for '${t}'.`;
      } else {
        title.value = `Shares Outstanding`;
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

  watch(() => [tickerRef?.value, periodRef?.value], () => refresh(), { immediate: true });

  return { series, title, message, loading, error, refresh };
}
