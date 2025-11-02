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

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore, type BatchData } from '../../stores/tickerStore'
import { getBalanceFromBatch } from '../../services/financials/batchTableService'
import { useIsMobile } from '../../composables/useIsMobile'
import BaseTable, { type TableRow } from '../common/BaseTable.vue'
import ChartModal from '../common/ChartModal.vue'
import { COLORS } from '../../utils/colors'
import type { Component } from 'vue'
import { formatNumber } from '@/utils/formatters'

// Import chart components
import CashDebtChart from '../charts/CashDebtChart.vue'

// Use Pinia store
const tickerStore = useTickerStore()
const { _batchData, _loading, _error } = storeToRefs(tickerStore)

// Mobile detection for collapsible behavior
const { isMobile } = useIsMobile()

// Process batch data into balance sheet metrics
const data = computed(() => getBalanceFromBatch(batchData.value))

// Modal state
const showChartModal = ref(false)

interface SelectedMetric {
  label: string
  component: Component
}

const selectedMetric = shallowRef<SelectedMetric | null>(null)

// Metric to chart component mapping
const metricChartMap: Record<string, Component | null> = {
  'Cash': CashDebtChart,
  'Debt': CashDebtChart,
  'Net': CashDebtChart,
  'Cash & Debt': CashDebtChart,
  'Altman Z-Score': null, // No chart available for Altman Z-Score
}

// Handle row click
const handleRowClick = (row: TableRow): void => {
  const component = metricChartMap[row.label]
  if (component) {
    selectedMetric.value = { label: row.label, component }
    showChartModal.value = true
  }
}

// Get Cash & Debt combined value
const getCashAndDebt = (batchData: BatchData | null): string => {
  if (!batchData?.data?.balanceQuarter) return 'N/A'
  const latest = batchData.data.balanceQuarter[0]
  if (!latest) return 'N/A'
  
  const cash = latest.cashAndCashEquivalents || 0
  const debt = latest.totalDebt || 0
  const net = cash - debt
  
  return `${formatNumber(cash)} / ${formatNumber(debt)} (Net: ${formatNumber(net)})`
}

const rows = computed<TableRow[]>(() => {
  const colorMap: Record<string, string> = {
    green: COLORS.status.success,
    red: COLORS.status.danger,
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
