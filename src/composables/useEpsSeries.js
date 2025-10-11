import { ref, watch } from 'vue'
import { getEpsSeries } from '../services/financials'

export function useEpsSeries(tickerRef) {
  const series  = ref([]);
  const title   = ref('EPS — Empty');
  const message = ref('');
  const loading = ref(false);
  const error   = ref(null);

  async function refresh() {
    message.value = '';
    error.value = null;
    const t = (tickerRef?.value || '').toUpperCase();
    if (!t) {
      title.value = 'EPS — Empty';
      series.value = [];
      message.value = 'Enter a ticker';
      return;
    }
    loading.value = true;
    try {
      const result = await getEpsSeries(t);
      if (result.error) {
        title.value = 'Error';
        series.value = [];
        message.value = result.error;
        error.value = result.error;
      } else if (!result.data.length) {
        title.value = 'EPS — No data';
        series.value = [];
        message.value = `No EPS data for '${t}'.`;
      } else {
        title.value = `EPS`;
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

  return { series, title, message, loading, error, refresh };
}
