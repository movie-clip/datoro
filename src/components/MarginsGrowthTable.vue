<template>
  <BaseTable
    title="Margins & Growth"
    :rows="rows"
    :loading="loading"
    :error="error"
    aria-label="Margins and growth metrics"
  />
</template>

<script setup>
import { ref, watch, toRef, computed } from 'vue'
import { getMarginsGrowth } from '../services/financials/index.js'
import BaseTable from './BaseTable.vue'

const props = defineProps({ ticker: { type: String, required: true } })
const tRef = toRef(props, 'ticker')

const data = ref({
  profitMargin: '—', operatingMargin: '—', earningsYoY: '—', revenueYoY: '—'
})
const error = ref(null)
const loading = ref(false)

const rows = computed(() => [
  { label: 'Profit Margin', value: data.value.profitMargin },
  { label: 'Operating Margin', value: data.value.operatingMargin },
  { label: 'Quarterly Earnings (YoY)', value: data.value.earningsYoY },
  { label: 'Quarterly Revenue (YoY)', value: data.value.revenueYoY },
])

async function refresh() {
  loading.value = true
  error.value = null
  const result = await getMarginsGrowth(tRef.value)
  if (result.error) {
    error.value = result.error
    data.value = { profitMargin: '—', operatingMargin: '—', earningsYoY: '—', revenueYoY: '—' }
  } else {
    data.value = result.data
  }
  loading.value = false
}
watch(() => tRef.value, () => refresh(), { immediate: true })
</script>
