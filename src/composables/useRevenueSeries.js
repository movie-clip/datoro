import { ref, watch, computed } from 'vue'
import { getRevenueSeries, getRevenueSegments } from '../services/financials'

export function useRevenueSeries(tickerRef) {
  const period  = ref('annual');   // 'annual' | 'quarterly'
  const selectedSegments = ref(['total']);   // Array of selected segment names
  const totalRevenue = ref([]);
  const segmentData = ref({ segments: [], series: {} });
  const title   = ref('Revenue');
  const message = ref('');
  const loading = ref(false);
  const error   = ref(null);

  // Computed series - return stacked multi-series based on selectedSegments
  const series = computed(() => {
    if (segmentData.value.segments.length === 0) {
      // No segments available, return total revenue as simple array
      return totalRevenue.value || [];
    }
    
    // If only 'total' is selected, return simple array
    if (selectedSegments.value.length === 1 && selectedSegments.value[0] === 'total') {
      return totalRevenue.value || [];
    }
    
    // Filter out 'total' if other segments are selected (since total = sum of segments)
    const segmentsToShow = selectedSegments.value.filter(s => s !== 'total');
    
    // If no segments after filtering, show total
    if (segmentsToShow.length === 0) {
      return totalRevenue.value || [];
    }
    
    // Get all unique dates from ALL segment data (not just total revenue)
    const allDates = new Set();
    
    // Add dates from all selected segments
    segmentsToShow.forEach(segment => {
      if (segmentData.value.series[segment]) {
        segmentData.value.series[segment].forEach(([date]) => {
          allDates.add(date);
        });
      }
    });
    
    const sortedDates = Array.from(allDates).sort((a, b) => a - b);
    
    console.log('[Revenue] Total dates found:', sortedDates.length, 'Segments to show:', segmentsToShow);
    
    // Create a map for quick lookup: date -> value for each segment
    const segmentMaps = {};
    segmentsToShow.forEach(segment => {
      const map = new Map();
      if (segmentData.value.series[segment]) {
        segmentData.value.series[segment].forEach(([date, value]) => {
          map.set(date, value);
        });
      }
      segmentMaps[segment] = map;
    });
    
    // Build aligned series: for each date, fill in 0 if segment doesn't have data
    const multiSeries = [];
    segmentsToShow.forEach(segment => {
      const alignedData = sortedDates.map(date => {
        const value = segmentMaps[segment].get(date) || 0;
        return [date, value];
      });
      
      multiSeries.push({
        name: formatSegmentLabel(segment),
        data: alignedData,
        stack: 'revenue'
      });
    });
    
    console.log('[Revenue] Aligned multi-series for stacking:', multiSeries);
    return multiSeries;
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
    selectedSegments.value = ['total'];
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

  // Computed series for compact view - always show Total Revenue only
  const compactSeries = computed(() => {
    return totalRevenue.value || [];
  });

  watch(() => tickerRef?.value, () => refresh(), { immediate: true });
  watch(period, () => refresh());

  return { period, selectedSegments, viewModeOptions, series, compactSeries, title, message, loading, error, refresh };
}
