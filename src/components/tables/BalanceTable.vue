<template>
  <BaseTable
    title="Balance"
    :rows="rows"
    :loading="loading"
    :error="error"
    audio-name="Balance"
    aria-label="Balance sheet metrics"
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
import { getBalanceFromBatch } from '../../services/financials/batchTableService.js'
import { useIsMobile } from '../../composables/useIsMobile'
import BaseTable from '../common/BaseTable.vue'
import ChartModal from '../common/ChartModal.vue'

// Import chart components
import CashDebtChart from '../charts/CashDebtChart.vue'

// Use Pinia store
const tickerStore = useTickerStore()
const { batchData, loading, error } = storeToRefs(tickerStore)

// Mobile detection for collapsible behavior
const { isMobile } = useIsMobile()

// Process batch data into balance sheet metrics
const data = computed(() => getBalanceFromBatch(batchData.value))

// Modal state
const showChartModal = ref(false)
const selectedMetric = shallowRef(null)

// Metric to chart component mapping
const metricChartMap = {
  'Cash': CashDebtChart,
  'Debt': CashDebtChart,
  'Net': CashDebtChart,
  'Cash & Debt': CashDebtChart,
  'Altman Z-Score': null, // No chart available for Altman Z-Score
}

// Handle row click
const handleRowClick = (row) => {
  const component = metricChartMap[row.label]
  if (component) {
    selectedMetric.value = { label: row.label, component }
    showChartModal.value = true
  }
}

// Get Cash & Debt combined value
const getCashAndDebt = (batchData) => {
  if (!batchData?.data?.balanceQuarter) return 'N/A'
  const latest = batchData.data.balanceQuarter[0]
  if (!latest) return 'N/A'
  
  const cash = latest.cashAndCashEquivalents || 0
  const debt = latest.totalDebt || 0
  const net = cash - debt
  
  const formatValue = (val) => {
    const abs = Math.abs(val)
    if (abs >= 1e9) return `$${(val / 1e9).toFixed(2)}B`
    if (abs >= 1e6) return `$${(val / 1e6).toFixed(2)}M`
    return `$${(val / 1e3).toFixed(2)}K`
  }
  
  return `${formatValue(cash)} / ${formatValue(debt)} (Net: ${formatValue(net)})`
}

const rows = computed(() => {
  const colorMap = {
    green: '#00A88E',
    red: '#ef4444',
    grey: '#aaa'
  }
  
  return [
    { label: 'Cash', value: data.value.cash },
    { label: 'Debt', value: data.value.debt },
    { label: 'Net', value: data.value.net },
    { label: 'Cash & Debt', value: getCashAndDebt(batchData.value) },
    { 
      label: 'Altman Z-Score', 
      value: data.value.altmanZScore,
      color: colorMap[data.value.altmanZColor] || '#aaa'
    },
  ]
})
</script>
