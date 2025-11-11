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

<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../../stores/tickerStore'
import { getMarginsGrowthFromBatch } from '../../services/financials/batchTableService'
import { useIsMobile } from '../../composables/useIsMobile'
import BaseTable, { type TableRow } from '../common/BaseTable.vue'
import ChartModal from '../common/ChartModal.vue'
import type { Component } from 'vue'
import type { BatchData } from '../../stores/tickerStore'
import { formatNumber } from '@/utils/formatters'

// Import chart components
import NetIncomeChart from '../charts/NetIncomeChart.vue'
import RevenueChart from '../charts/RevenueByCategoryChart.vue'
import ExpensesChart from '../charts/ExpensesChart.vue'

// Use Pinia store
const tickerStore = useTickerStore()
const { _batchData, _loading, _error } = storeToRefs(tickerStore)

// Mobile detection for collapsible behavior
const { isMobile } = useIsMobile()

// Process batch data into margins and growth metrics
const data = computed(() => getMarginsGrowthFromBatch(batchData.value))

// Modal state
const showChartModal = ref(false)

interface SelectedMetric {
  label: string
  component: Component
}

const selectedMetric = shallowRef<SelectedMetric | null>(null)

// Metric to chart component mapping
const metricChartMap: Record<string, Component> = {
  'Profit Margin': NetIncomeChart,
  'Operating Margin': NetIncomeChart,
  'Operating Expenses': ExpensesChart,
  'Quarterly Earnings (YoY)': NetIncomeChart,
  'Quarterly Revenue (YoY)': RevenueChart,
}

// Handle row click
const handleRowClick = (row: TableRow): void => {
  const component = metricChartMap[row.label]
  if (component) {
    selectedMetric.value = { label: row.label, component }
    showChartModal.value = true
  }
}

// Get latest operating expenses
const getLatestOperatingExpenses = (batchData: BatchData | null): string => {
  if (!batchData?.data?.incomeQuarter) return 'N/A'
  const latest = batchData.data.incomeQuarter[0]
  if (!latest?.operatingExpenses) return 'N/A'
  return formatNumber(latest.operatingExpenses, { currency: true, decimals: 2 })
}

const rows = computed<TableRow[]>(() => [
  { label: 'Profit Margin', value: data.value.profitMargin },
  { label: 'Operating Margin', value: data.value.operatingMargin },
  { label: 'Operating Expenses', value: getLatestOperatingExpenses(batchData.value) },
  { label: 'Quarterly Earnings (YoY)', value: data.value.earningsYoY },
  { label: 'Quarterly Revenue (YoY)', value: data.value.revenueYoY },
])
</script>
