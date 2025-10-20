<template>
  <BaseTable
    title="Capital Returned"
    :rows="rows"
    :loading="loading"
    :error="error"
    audio-name="CapitalReturned"
    aria-label="Capital returned metrics"
    :clickable="true"
    :collapsible="isMobile"
    @row-click="handleRowClick"
  />
  
  <ChartModal :is-open="showChartModal" @close="showChartModal = false">
    <component 
      v-if="selectedMetric" 
      :is="selectedMetric.component"
      force-expanded
    />
  </ChartModal>
</template>

<script setup>
import { computed, ref, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../../stores/tickerStore'
import { useIsMobile } from '../../composables/useIsMobile'
import BaseTable from '../common/BaseTable.vue'
import ChartModal from '../common/ChartModal.vue'

// Import chart components
import CapitalReturnedChart from '../charts/CapitalReturnedChart.vue'
import DividendYieldChart from '../charts/DividendYieldChart.vue'
import SharesChart from '../charts/SharesChart.vue'

// Use Pinia store
const tickerStore = useTickerStore()
const { batchData, loading, error } = storeToRefs(tickerStore)

// Mobile detection for collapsible behavior
const { isMobile } = useIsMobile()

// Modal state
const showChartModal = ref(false)
const selectedMetric = shallowRef(null)

// Metric to chart component mapping
const metricChartMap = {
  'Capital Returned': CapitalReturnedChart,
  'Dividend Yield': DividendYieldChart,
  'Shares Outstanding': SharesChart,
}

// Handle row click
const handleRowClick = (row) => {
  const component = metricChartMap[row.label]
  if (component) {
    selectedMetric.value = { label: row.label, component }
    showChartModal.value = true
  }
}

// Get latest capital returned (dividends + buybacks)
const getLatestCapitalReturned = (batchData) => {
  if (!batchData?.data?.cashflowQuarter) return 'N/A'
  const latest = batchData.data.cashflowQuarter[0]
  if (!latest) return 'N/A'
  
  const dividends = Math.abs(latest.dividendsPaid || 0)
  const buybacks = Math.abs(latest.commonStockRepurchased || 0)
  const total = dividends + buybacks
  
  if (total === 0) return '$0'
  if (total >= 1e9) return `$${(total / 1e9).toFixed(2)}B`
  if (total >= 1e6) return `$${(total / 1e6).toFixed(2)}M`
  return `$${(total / 1e3).toFixed(2)}K`
}

// Get latest dividend yield
const getLatestDividendYield = (batchData) => {
  if (!batchData?.data?.ratiosQuarter) return 'N/A'
  const latest = batchData.data.ratiosQuarter[0]
  if (!latest?.dividendYield) return '0.00%'
  return `${(latest.dividendYield * 100).toFixed(2)}%`
}

// Get latest shares outstanding
const getLatestSharesOutstanding = (batchData) => {
  if (!batchData?.data?.incomeQuarter) return 'N/A'
  const latest = batchData.data.incomeQuarter[0]
  if (!latest?.weightedAverageShsOutDil) return 'N/A'
  const shares = latest.weightedAverageShsOutDil
  
  if (shares >= 1e9) return `${(shares / 1e9).toFixed(2)}B`
  if (shares >= 1e6) return `${(shares / 1e6).toFixed(2)}M`
  return `${(shares / 1e3).toFixed(2)}K`
}

const rows = computed(() => [
  { label: 'Capital Returned', value: getLatestCapitalReturned(batchData.value) },
  { label: 'Dividend Yield', value: getLatestDividendYield(batchData.value) },
  { label: 'Shares Outstanding', value: getLatestSharesOutstanding(batchData.value) },
])
</script>
