<template>
  <BaseTable
    title="Cash Flow"
    :rows="rows"
    :loading="loading"
    :error="error"
    audio-name="CashFlow"
    aria-label="Cash flow metrics"
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
import { getCashFlowFactsFromBatch } from '../../services/financials/batchTableService.js'
import { useIsMobile } from '../../composables/useIsMobile'
import BaseTable from '../common/BaseTable.vue'
import ChartModal from '../common/ChartModal.vue'
import { calculateGrowthRates } from '../../utils/growthCalculator.js'
import { COLORS, getFCFYieldColor } from '../../utils/colors.js'

// Import chart components
import RevenueChart from '../charts/RevenueChart.vue'
import NetIncomeChart from '../charts/NetIncomeChart.vue'
import EpsChart from '../charts/EpsChart.vue'
import FcfChart from '../charts/FcfChart.vue'

// Use Pinia store
const tickerStore = useTickerStore()
const { batchData, loading, error } = storeToRefs(tickerStore)

// Mobile detection for collapsible behavior
const { isMobile } = useIsMobile()

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
  if (latest?.revenue === undefined || latest?.revenue === null) return 'N/A'
  const revenue = latest.revenue
  // Handle negative values (rare for revenue, but consistent handling)
  const absRevenue = Math.abs(revenue)
  const sign = revenue < 0 ? '-' : ''
  if (absRevenue >= 1e9) return `${sign}$${(absRevenue / 1e9).toFixed(2)}B`
  if (absRevenue >= 1e6) return `${sign}$${(absRevenue / 1e6).toFixed(2)}M`
  return `${sign}$${(absRevenue / 1e3).toFixed(2)}K`
}

const getLatestNetIncome = (batchData) => {
  if (!batchData?.data?.incomeQuarter) return 'N/A'
  const latest = batchData.data.incomeQuarter[0]
  if (latest?.netIncome === undefined || latest?.netIncome === null) return 'N/A'
  const netIncome = latest.netIncome
  // Handle negative values
  const absNetIncome = Math.abs(netIncome)
  const sign = netIncome < 0 ? '-' : ''
  if (absNetIncome >= 1e9) return `${sign}$${(absNetIncome / 1e9).toFixed(2)}B`
  if (absNetIncome >= 1e6) return `${sign}$${(absNetIncome / 1e6).toFixed(2)}M`
  return `${sign}$${(absNetIncome / 1e3).toFixed(2)}K`
}

const getLatestEPS = (batchData) => {
  if (!batchData?.data?.incomeQuarter) return 'N/A'
  const latest = batchData.data.incomeQuarter[0]
  if (!latest?.eps) return 'N/A'
  return `$${latest.eps.toFixed(2)}`
}

const getLatestFCF = (batchData) => {
  // Use most recent annual FCF (same as chart default)
  if (batchData?.data?.cashflowAnnual && Array.isArray(batchData.data.cashflowAnnual) && batchData.data.cashflowAnnual.length > 0) {
    const latest = batchData.data.cashflowAnnual[0]
    if (latest?.freeCashFlow !== undefined && latest?.freeCashFlow !== null) {
      const fcf = latest.freeCashFlow
      const absFcf = Math.abs(fcf)
      const sign = fcf < 0 ? '-' : ''
      if (absFcf >= 1e9) return `${sign}$${(absFcf / 1e9).toFixed(2)}B`
      if (absFcf >= 1e6) return `${sign}$${(absFcf / 1e6).toFixed(2)}M`
      return `${sign}$${(absFcf / 1e3).toFixed(2)}K`
    }
  }
  
  return 'N/A'
}

// Calculate growth color based on 5-year growth rate
const getGrowthColor = (batchData, dataKey, dataSource = 'incomeAnnual') => {
  const statements = batchData?.data?.[dataSource]
  if (!statements || !Array.isArray(statements) || statements.length < 2) {
    return null
  }
  
  // Convert to [timestamp, value] format for growth calculator
  const seriesData = statements.map(row => [
    Date.parse(row.date),
    Number(row[dataKey]) || 0
  ])
  
  const growth = calculateGrowthRates(seriesData)
  
  // Apply color thresholds based on 5-year growth
  if (growth.fiveYear === null) return null
  
  if (growth.fiveYear > 10) return COLORS.growth.positive   // Green: >10% growth
  if (growth.fiveYear >= 0) return COLORS.growth.moderate   // Yellow: 0-10% growth
  return COLORS.growth.negative  // Red: negative growth
}

// Helper to get FCF growth color
const getFCFGrowthColor = (batchData) => {
  return getGrowthColor(batchData, 'freeCashFlow', 'cashflowAnnual')
}

const rows = computed(() => [
  { label: 'Revenue', value: getLatestRevenue(batchData.value), color: getGrowthColor(batchData.value, 'revenue', 'incomeAnnual') },
  { label: 'Net Income', value: getLatestNetIncome(batchData.value), color: getGrowthColor(batchData.value, 'netIncome', 'incomeAnnual') },
  { label: 'Free Cash Flow', value: getLatestFCF(batchData.value), color: getFCFGrowthColor(batchData.value) },
  { label: 'Free Cash Flow Yield', value: data.value.fcfYield ?? '—' },
  { label: 'FCF Yield (Adj. SBC)', value: data.value.fcfYieldAdjSBC ?? '—', color: getFCFYieldColor(data.value.fcfYieldAdjSBCRaw) },
  { label: 'EPS', value: getLatestEPS(batchData.value) },
  { label: 'SBC Impact', value: data.value.sbcImpact ?? '—' },
])
</script>
