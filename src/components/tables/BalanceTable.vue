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
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../../stores/tickerStore'
import { getBalanceFromBatch } from '../../services/financials/batchTableService.js'
import BaseTable from '../common/BaseTable.vue'

// Use Pinia store
const tickerStore = useTickerStore()
const { batchData, loading, error } = storeToRefs(tickerStore)

// Process batch data into balance sheet metrics
const data = computed(() => getBalanceFromBatch(batchData.value))

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
    { 
      label: 'Altman Z-Score', 
      value: data.value.altmanZScore,
      color: colorMap[data.value.altmanZColor] || '#aaa'
    },
  ]
})
</script>
