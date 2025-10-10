<template>
  <div style="display:grid; grid-template-rows:auto 1fr auto; gap:10px;">
    <TimeframeButtons v-model="tfKey" :order="tfOrder" />
    <BaseChart :title="title" :series="series" kind="line" yFormat="int" />
    <p v-if="message" class="msg">{{ message }}</p>
  </div>
</template>

<script setup>
import { toRef } from 'vue'
import { TF_ORDER } from '../models/timeframe'
import { usePriceSeries } from '../composables/usePriceSeries'
import TimeframeButtons from './TimeframeButtons.vue'
import BaseChart from './BaseChart.vue'

const props = defineProps({ ticker: { type: String, required: true } })
const { tfKey, series, title, message } = usePriceSeries(toRef(props, 'ticker'))
const tfOrder = TF_ORDER
</script>

<style scoped>
.msg { margin: 6px 0 0; opacity: 0.85; }
</style>
