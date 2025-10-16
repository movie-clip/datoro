<template>
  <BaseTable
    title="Balance"
    :rows="rows"
    :loading="loading"
    :error="error"
    aria-label="Balance sheet metrics"
  />
</template>

<script setup>
import { toRef, computed } from 'vue'
import { useTickerData } from '../composables/useTickerData.js'
import { getBalanceFromBatch } from '../services/financials/batchTableService.js'
import BaseTable from './BaseTable.vue'

const props = defineProps({ ticker: { type: String, required: true } })
const tRef = toRef(props, 'ticker')

// Use batch data composable (single API call for all data)
const { data: batchData, loading, error } = useTickerData(tRef)

// Process batch data into balance sheet metrics
const data = computed(() => getBalanceFromBatch(batchData.value))

const rows = computed(() => {
  const colorMap = {
    green: '#4caf50',
    red: '#f44336',
    grey: '#aaa'
  }
  
  return [
    { label: 'Cash', value: data.value.cash },
    { label: 'Debt', value: data.value.debt },
    { label: 'Ratio', value: data.value.net },
    { 
      label: 'Altman Z-Score', 
      value: data.value.altmanZScore,
      color: colorMap[data.value.altmanZColor] || '#aaa'
    },
  ]
})
</script>
