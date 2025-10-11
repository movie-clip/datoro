import { ref, watch } from 'vue'
import { getFcfSeries } from '../services/financials'

export function useFcfSeries(tickerRef) {
  const period  = ref('annual');   // 'annual' | 'quarterly'
  const series  = ref([]);
  const title   = ref('Free Cash Flow — Empty');
  const message = ref('');
  const loading = ref(false);
  const error   = ref(null);

  async function refresh() {
    message.value = '';
    error.value = null;
    const t = (tickerRef?.value || '').toUpperCase();
    if (!t) {
      title.value = 'Free Cash Flow — Empty';
      series.value = [];
      message.value = 'Enter a ticker';
      return;
    }
    loading.value = true;
    try {
      const result = await getFcfSeries(t, period.value);
      if (result.error) {
        title.value = 'Error';
        series.value = [];
        message.value = result.error;
        error.value = result.error;
      } else if (!result.data.length) {
        title.value = 'Free Cash Flow — No data';
        series.value = [];
        message.value = `No FCF data for '${t}'.`;
      } else {
        title.value = `Free Cash Flow (${period.value === 'annual' ? 'Annual' : 'Quarterly'})`;
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
