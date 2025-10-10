<template>
  <section class="card">
    <TimeframeButtons v-model="tfKey" :order="tfOrder" />
    <ChartCard :series="series" :title="title" :message="message" />
  </section>
</template>

<script setup>
import { toRef } from 'vue'
import { TF_ORDER } from '../models/timeframe'
import { usePriceSeries } from '../composables/usePriceSeries'
import TimeframeButtons from './TimeframeButtons.vue'
import ChartCard from './ChartCard.vue'

const props = defineProps({ ticker: { type: String, required: true } })
const { tfKey, series, title, message } = usePriceSeries(toRef(props, 'ticker'))
const tfOrder = TF_ORDER
</script>

<style scoped>
.card {
  background: #1f1f1f;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.25);
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 10px;
  max-width: 600px;
  width: 100%;
}
</style>
