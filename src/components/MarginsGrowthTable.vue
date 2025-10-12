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
import { toRef, computed } from 'vue'
import { useTickerData } from '../composables/useTickerData.js'
import { getMarginsGrowthFromBatch } from '../services/financials/batchTableService.js'
import BaseTable from './BaseTable.vue'

const props = defineProps({ ticker: { type: String, required: true } })
const tRef = toRef(props, 'ticker')

// Use batch data composable (single API call for all data)
const { data: batchData, loading, error } = useTickerData(tRef)

// Process batch data into margins and growth metrics
const data = computed(() => getMarginsGrowthFromBatch(batchData.value))

const rows = computed(() => [
  { label: 'Profit Margin', value: data.value.profitMargin },
  { label: 'Operating Margin', value: data.value.operatingMargin },
  { label: 'Quarterly Earnings (YoY)', value: data.value.earningsYoY },
  { label: 'Quarterly Revenue (YoY)', value: data.value.revenueYoY },
])
</script>
