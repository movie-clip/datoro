<template>
  <BaseTable
    title="Valuation"
    :rows="rows"
    :loading="loading"
    :error="error"
    :on-retry="retry"
    aria-label="Valuation metrics"
  />
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../stores/tickerStore'
import { getValuationFromBatch } from '../services/financials/batchTableService.js'
import BaseTable from './BaseTable.vue'

// Use Pinia store instead of prop
const tickerStore = useTickerStore()
const { batchData, loading, error } = storeToRefs(tickerStore)
const { refresh: retry } = tickerStore

// Process batch data into valuation metrics
const data = computed(() => getValuationFromBatch(batchData.value))

const rows = computed(() => [
  { label: 'Market Cap', value: data.value.marketCap },
  { label: 'PE / FPE', value: `${data.value.pe}/${data.value.fpe}` },
  { label: 'Price to Sales', value: data.value.ps },
  { label: 'Price to Book', value: data.value.pb },
  { label: 'EV To EBITDA', value: data.value.evEbitda },
])
</script>
