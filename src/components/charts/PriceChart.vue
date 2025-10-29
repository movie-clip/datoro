
<template>
  <BaseChart
    v-model:view-mode="tfKey"
    :title="title"
    :series="series"
    kind="line"
    y-format="price"
    :view-mode-options="timeframeOptions"
    :loading="loading"
    :error="error ?? undefined"
    :message="message ?? undefined"
    aria-label="Price chart"
    :force-expanded="forceExpanded"
    :show-growth-labels="true"
    :custom-growth-data="growthData ?? undefined"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TF_ORDER } from '../../models/timeframe'
import { usePriceSeries } from '../../composables/usePriceSeries'
import BaseChart from '../common/BaseChart.vue'

interface Props {
  forceExpanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  forceExpanded: false
})

// No ticker prop needed - using Pinia store
const { _tfKey, _series, _title, _message, _loading, _error, _retry, _growthData } = usePriceSeries()

const timeframeOptions = computed(() => 
  TF_ORDER.map(key => ({ label: key, value: key }))
)
</script>

<style scoped>
.spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  font-size: 1.2em;
  color: #888;
}
</style>
