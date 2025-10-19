<template>
  <BaseTable
    title="Margins & Growth"
    :rows="rows"
    :loading="loading"
    :error="error"
    audio-name="MarginsGrowth"
    aria-label="Margins and growth metrics"
  />
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTickerStore } from '../../stores/tickerStore'
import { getMarginsGrowthFromBatch } from '../../services/financials/batchTableService.js'
import BaseTable from '../common/BaseTable.vue'

// Use Pinia store
const tickerStore = useTickerStore()
const { batchData, loading, error } = storeToRefs(tickerStore)

// Process batch data into margins and growth metrics
const data = computed(() => getMarginsGrowthFromBatch(batchData.value))

const rows = computed(() => [
  { label: 'Profit Margin', value: data.value.profitMargin },
  { label: 'Operating Margin', value: data.value.operatingMargin },
  { label: 'Quarterly Earnings (YoY)', value: data.value.earningsYoY },
  { label: 'Quarterly Revenue (YoY)', value: data.value.revenueYoY },
])
</script>
