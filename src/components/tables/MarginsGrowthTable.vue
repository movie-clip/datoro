<template>
  <BaseTable
    title="Margins & Growth"
    :rows="rows"
    :loading="loading"
    :error="error"
    audio-name="MarginsGrowth"
    aria-label="Margins and growth metrics"
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
import { getMarginsGrowthFromBatch } from '../../services/financials/batchTableService.js'
import { useIsMobile } from '../../composables/useIsMobile'
import BaseTable from '../common/BaseTable.vue'
import ChartModal from '../common/ChartModal.vue'

// Import chart components
import NetIncomeChart from '../charts/NetIncomeChart.vue'
import RevenueChart from '../charts/RevenueChart.vue'
import ExpensesChart from '../charts/ExpensesChart.vue'

// Use Pinia store
const tickerStore = useTickerStore()
const { batchData, loading, error } = storeToRefs(tickerStore)

// Mobile detection for collapsible behavior
const { isMobile } = useIsMobile()

// Process batch data into margins and growth metrics
const data = computed(() => getMarginsGrowthFromBatch(batchData.value))

// Modal state
const showChartModal = ref(false)
const selectedMetric = shallowRef(null)

// Metric to chart component mapping
const metricChartMap = {
  'Profit Margin': NetIncomeChart,
  'Operating Margin': NetIncomeChart,
  'Operating Expenses': ExpensesChart,
  'Quarterly Earnings (YoY)': NetIncomeChart,
  'Quarterly Revenue (YoY)': RevenueChart,
}

// Handle row click
const handleRowClick = (row) => {
  const component = metricChartMap[row.label]
  if (component) {
    selectedMetric.value = { label: row.label, component }
    showChartModal.value = true
  }
}

// Get latest operating expenses
const getLatestOperatingExpenses = (batchData) => {
  if (!batchData?.data?.incomeQuarter) return 'N/A'
  const latest = batchData.data.incomeQuarter[0]
  if (!latest?.operatingExpenses) return 'N/A'
  const expenses = latest.operatingExpenses
  if (expenses >= 1e9) return `$${(expenses / 1e9).toFixed(2)}B`
  if (expenses >= 1e6) return `$${(expenses / 1e6).toFixed(2)}M`
  return `$${(expenses / 1e3).toFixed(2)}K`
}

const rows = computed(() => [
  { label: 'Profit Margin', value: data.value.profitMargin },
  { label: 'Operating Margin', value: data.value.operatingMargin },
  { label: 'Operating Expenses', value: getLatestOperatingExpenses(batchData.value) },
  { label: 'Quarterly Earnings (YoY)', value: data.value.earningsYoY },
  { label: 'Quarterly Revenue (YoY)', value: data.value.revenueYoY },
])
</script>
