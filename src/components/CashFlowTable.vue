<template>
  <BaseTable
    title="Cash Flow"
    :rows="rows"
    :loading="loading"
    :error="error"
    aria-label="Cash flow metrics"
  />
</template>

<script setup>
import { toRef, computed } from 'vue'
import { useTickerData } from '../composables/useTickerData.js'
import { getCashFlowFactsFromBatch } from '../services/financials/batchTableService.js'
import BaseTable from './BaseTable.vue'

const props = defineProps({ ticker: { type: String, required: true } })
const tRef = toRef(props, 'ticker')

// Use batch data composable (single API call for all data)
const { data: batchData, loading, error } = useTickerData(tRef)

// Process batch data into cash flow metrics
const data = computed(() => getCashFlowFactsFromBatch(batchData.value))

const rows = computed(() => [
  { label: 'Free Cash Flow Yield', value: data.value.fcfYield ?? '—' },
  { label: 'FCF Yield (Adj. SBC)', value: data.value.fcfYieldAdjSBC ?? '—' },
  { label: 'SBC Impact', value: data.value.sbcImpact ?? '—' },
])
</script>
