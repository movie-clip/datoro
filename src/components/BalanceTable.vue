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
import { ref, watch, toRef, computed } from 'vue'
import { getBalance } from '../services/financials/index.js'
import BaseTable from './BaseTable.vue'

const props = defineProps({ ticker: { type: String, required: true } })
const tRef = toRef(props, 'ticker')

const data = ref({ cash: '—', debt: '—', net: '—', altmanZScore: '—', altmanZColor: 'grey' })
const error = ref(null)
const loading = ref(false)

const rows = computed(() => {
  const colorMap = {
    green: '#4caf50',
    red: '#f44336',
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

async function refresh() {
  loading.value = true
  error.value = null
  const result = await getBalance(tRef.value)
  if (result.error) {
    error.value = result.error
    data.value = { cash: '—', debt: '—', net: '—', altmanZScore: '—', altmanZColor: 'grey' }
  } else {
    data.value = result.data
  }
  loading.value = false
}
watch(() => tRef.value, () => refresh(), { immediate: true })
</script>
