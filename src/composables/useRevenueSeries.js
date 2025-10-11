import { ref, watch, computed } from 'vue'
import { getRevenueSeries, getRevenueSegments } from '../services/financials'

export function useRevenueSeries(tickerRef) {
  const period  = ref('annual');   // 'annual' | 'quarterly'
  const viewMode = ref('total');   // 'total' | segment name
  const totalRevenue = ref([]);
  const segmentData = ref({ segments: [], series: {} });
  const title   = ref('Revenue');
  const message = ref('');
  const loading = ref(false);
  const error   = ref(null);

  // Computed series - filter based on selected viewMode (like FCF chart)
  const series = computed(() => {
    if (segmentData.value.segments.length === 0) {
      // No segments available, return total revenue as simple array
      return totalRevenue.value || [];
    }
    
    // Filter based on viewMode
    if (viewMode.value === 'total') {
      return totalRevenue.value || [];
    } else {
      // Return the selected segment's data
      return segmentData.value.series[viewMode.value] || [];
    }
  });

  // Computed view mode options for the chart (used by BaseChart to show legend)
  const viewModeOptions = computed(() => {
    if (segmentData.value.segments.length === 0) {
      return []; // No segments = no legend
    }
    
    const options = [{ label: 'Total Revenue', value: 'total' }];
    segmentData.value.segments.forEach(segment => {
      options.push({ 
        label: formatSegmentLabel(segment), 
        value: segment 
      });
    });
    return options;
  });

  function formatSegmentLabel(segment) {
    // Clean up segment names for display
    return segment
      .replace(/([A-Z])/g, ' $1')  // Add space before capital letters
      .replace(/^./, str => str.toUpperCase())  // Capitalize first letter
      .trim();
  }

  async function refresh() {
    message.value = '';
    error.value = null;
    // Reset to total revenue when refreshing
    viewMode.value = 'total';
    const t = (tickerRef?.value || '').toUpperCase();
    if (!t) {
      title.value = 'Revenue — Empty';
      totalRevenue.value = [];
      segmentData.value = { segments: [], series: {} };
      message.value = 'Enter a ticker';
      return;
    }
    loading.value = true;
    try {
      // Fetch both total revenue and segment data in parallel
      const [totalResult, segmentResult] = await Promise.all([
        getRevenueSeries(t, period.value),
        getRevenueSegments(t, period.value)
      ]);

      console.log('[Revenue] Segment data for', t, ':', segmentResult.data);

      if (totalResult.error) {
        title.value = 'Error';
        totalRevenue.value = [];
        segmentData.value = { segments: [], series: {} };
        message.value = totalResult.error;
        error.value = totalResult.error;
      } else if (!totalResult.data.length) {
        title.value = 'Revenue — No data';
        totalRevenue.value = [];
        segmentData.value = { segments: [], series: {} };
        message.value = `No revenue data for '${t}'.`;
      } else {
        totalRevenue.value = totalResult.data;
        segmentData.value = segmentResult.data || { segments: [], series: {} };
        title.value = 'Revenue';
      }
    } catch (e) {
      title.value = 'Error';
      totalRevenue.value = [];
      segmentData.value = { segments: [], series: {} };
      message.value = 'Failed to load data.';
      error.value = e?.message || 'Unknown error';
    } finally {
      loading.value = false;
    }
  }

  watch(() => tickerRef?.value, () => refresh(), { immediate: true });
  watch(period, () => refresh());

  return { period, viewMode, viewModeOptions, series, title, message, loading, error, refresh };
}
