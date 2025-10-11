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
import { ref, watch, toRef, computed } from 'vue'
import { getValuation } from '../services/financials/index.js'
import BaseTable from './BaseTable.vue'

const props = defineProps({ ticker: { type: String, required: true } })
const tRef = toRef(props, 'ticker')

const data = ref({
   marketCap: '—',
   pe: '—',
   fpe: '—',
   ps: '—',
   pb: '—',
   evEbitda: '—',
})
const error = ref(null)
const loading = ref(false)

const rows = computed(() => [
  { label: 'Market Cap', value: data.value.marketCap },
  { label: 'PE / FPE', value: `${data.value.pe}/${data.value.fpe}` },
  { label: 'Price to Sales', value: data.value.ps },
  { label: 'Price to Book', value: data.value.pb },
  { label: 'EV To EBITDA', value: data.value.evEbitda },
])

async function refresh() {
  loading.value = true
  error.value = null
  const result = await getValuation(tRef.value)
  if (result.error) {
    error.value = result.error
    data.value = { marketCap: '—', pe: '—', fpe: '—', ps: '—', pb: '—', evEbitda: '—' }
  } else {
    data.value = result.data
  }
  loading.value = false
}
watch(() => tRef.value, () => refresh(), { immediate: true })
</script>
