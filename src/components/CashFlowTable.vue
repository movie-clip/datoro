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
import { ref, watch, toRef, computed } from 'vue'
import { getCashFlowFacts } from '../services/financials/index.js'
import BaseTable from './BaseTable.vue'

const props = defineProps({ ticker: { type: String, required: true } })
const tRef = toRef(props, 'ticker')

const data = ref({ cfo: '—', capex: '—', fcf: '—', adjFcf: '—' })
const error = ref(null)
const loading = ref(false)

const rows = computed(() => [
  { label: 'Operating Cash Flow (TTM)', value: data.value.cfo ?? '—' },
  { label: 'Capital Expenditures (TTM)', value: data.value.capex ?? '—' },
  { label: 'Free Cash Flow (TTM)', value: data.value.fcf },
  { label: 'Adjusted FCF (TTM)', value: data.value.adjFcf },
])

async function refresh() {
  loading.value = true
  error.value = null
  const result = await getCashFlowFacts(tRef.value)
  if (result.error) {
    error.value = result.error
    data.value = { cfo: '—', capex: '—', fcf: '—', adjFcf: '—' }
  } else {
    data.value = result.data
  }
  loading.value = false
}
watch(() => tRef.value, () => refresh(), { immediate: true })
</script>
