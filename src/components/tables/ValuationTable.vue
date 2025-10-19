<template>
  <BaseTable
    title="Valuation"
    :rows="rows"
    :loading="loading"
    :error="error"
    :on-retry="retry"
    audio-name="Valuation"
    aria-label="Valuation metrics"
  />
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../../stores/tickerStore'
import { getValuationFromBatch } from '../../services/financials/batchTableService.js'
import BaseTable from '../common/BaseTable.vue'

// Use Pinia store instead of prop
const tickerStore = useTickerStore()
const { batchData, loading, error } = storeToRefs(tickerStore)
const { refresh: retry } = tickerStore

// Get current ticker
const currentTicker = computed(() => tickerStore.currentTicker)

// Process batch data into valuation metrics
const data = computed(() => getValuationFromBatch(batchData.value))

const rows = computed(() => [
  { label: 'Market Cap', value: data.value.marketCap },
  { label: 'P/E Ratio', value: data.value.pe },
  { label: 'Price to Sales', value: data.value.ps },
  { label: 'Price to Book', value: data.value.pb },
  { label: 'EV To EBITDA', value: data.value.evEbitda },
])
</script>
