<template>
  <BaseTable
    title="Cash Flow"
    :rows="rows"
    :loading="loading"
    :error="error"
    audio-name="CashFlow"
    aria-label="Cash flow metrics"
    :clickable="true"
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
import { getCashFlowFactsFromBatch } from '../../services/financials/batchTableService.js'
import BaseTable from '../common/BaseTable.vue'
import ChartModal from '../common/ChartModal.vue'

// Import chart components
import RevenueChart from '../charts/RevenueChart.vue'
import NetIncomeChart from '../charts/NetIncomeChart.vue'
import EpsChart from '../charts/EpsChart.vue'
import FcfChart from '../charts/FcfChart.vue'

// Use Pinia store
const tickerStore = useTickerStore()
const { batchData, loading, error } = storeToRefs(tickerStore)

// Process batch data into cash flow metrics
const data = computed(() => getCashFlowFactsFromBatch(batchData.value))

// Modal state
const showChartModal = ref(false)
const selectedMetric = shallowRef(null)

// Metric to chart component mapping
const metricChartMap = {
  'Revenue': RevenueChart,
  'Net Income': NetIncomeChart,
  'Free Cash Flow': FcfChart,
  'Free Cash Flow Yield': FcfChart,
  'FCF Yield (Adj. SBC)': FcfChart,
  'EPS': EpsChart,
  'SBC Impact': FcfChart,
}

// Handle row click
const handleRowClick = (row) => {
  const component = metricChartMap[row.label]
  if (component) {
    selectedMetric.value = { label: row.label, component }
    showChartModal.value = true
  }
}

// Helper functions to get latest values from batch data
const getLatestRevenue = (batchData) => {
  if (!batchData?.data?.incomeQuarter) return 'N/A'
  const latest = batchData.data.incomeQuarter[0]
  if (!latest?.revenue) return 'N/A'
  const revenue = latest.revenue
  if (revenue >= 1e9) return `$${(revenue / 1e9).toFixed(2)}B`
  if (revenue >= 1e6) return `$${(revenue / 1e6).toFixed(2)}M`
  return `$${(revenue / 1e3).toFixed(2)}K`
}

const getLatestNetIncome = (batchData) => {
  if (!batchData?.data?.incomeQuarter) return 'N/A'
  const latest = batchData.data.incomeQuarter[0]
  if (!latest?.netIncome) return 'N/A'
  const netIncome = latest.netIncome
  if (netIncome >= 1e9) return `$${(netIncome / 1e9).toFixed(2)}B`
  if (netIncome >= 1e6) return `$${(netIncome / 1e6).toFixed(2)}M`
  return `$${(netIncome / 1e3).toFixed(2)}K`
}

const getLatestEPS = (batchData) => {
  if (!batchData?.data?.incomeQuarter) return 'N/A'
  const latest = batchData.data.incomeQuarter[0]
  if (!latest?.eps) return 'N/A'
  return `$${latest.eps.toFixed(2)}`
}

const getLatestFCF = (batchData) => {
  if (!batchData?.data?.cashFlowQuarter) return 'N/A'
  const latest = batchData.data.cashFlowQuarter[0]
  if (!latest?.freeCashFlow) return 'N/A'
  const fcf = latest.freeCashFlow
  if (fcf >= 1e9) return `$${(fcf / 1e9).toFixed(2)}B`
  if (fcf >= 1e6) return `$${(fcf / 1e6).toFixed(2)}M`
  return `$${(fcf / 1e3).toFixed(2)}K`
}

const rows = computed(() => [
  { label: 'Revenue', value: getLatestRevenue(batchData.value) },
  { label: 'Net Income', value: getLatestNetIncome(batchData.value) },
  { label: 'Free Cash Flow', value: getLatestFCF(batchData.value) },
  { label: 'Free Cash Flow Yield', value: data.value.fcfYield ?? '—' },
  { label: 'FCF Yield (Adj. SBC)', value: data.value.fcfYieldAdjSBC ?? '—' },
  { label: 'EPS', value: getLatestEPS(batchData.value) },
  { label: 'SBC Impact', value: data.value.sbcImpact ?? '—' },
])
</script>
