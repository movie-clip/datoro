<template>
  <BaseTable
    title="Valuation"
    :rows="rows"
    :loading="loading"
    :error="error"
    aria-label="Valuation metrics"
  />
</template>

<script setup>
import { toRef, computed, watch } from 'vue'
import { useTickerData } from '../composables/useTickerData.js'
import { getValuationFromBatch } from '../services/financials/batchTableService.js'
import BaseTable from './BaseTable.vue'

const props = defineProps({ ticker: { type: String, required: true } })
const tRef = toRef(props, 'ticker')

// Use batch data composable (single API call for all data)
const { data: batchData, loading, error } = useTickerData(tRef)

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
