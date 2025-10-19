<template>
  <BaseTable
    title="Cash Flow"
    :rows="rows"
    :loading="loading"
    :error="error"
    audio-name="CashFlow"
    aria-label="Cash flow metrics"
  />
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../../stores/tickerStore'
import { getCashFlowFactsFromBatch } from '../../services/financials/batchTableService.js'
import BaseTable from '../common/BaseTable.vue'

// Use Pinia store
const tickerStore = useTickerStore()
const { batchData, loading, error } = storeToRefs(tickerStore)

// Process batch data into cash flow metrics
const data = computed(() => getCashFlowFactsFromBatch(batchData.value))

const rows = computed(() => [
  { label: 'Free Cash Flow Yield', value: data.value.fcfYield ?? '—' },
  { label: 'FCF Yield (Adj. SBC)', value: data.value.fcfYieldAdjSBC ?? '—' },
  { label: 'SBC Impact', value: data.value.sbcImpact ?? '—' },
])
</script>
