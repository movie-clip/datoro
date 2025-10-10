<template>
  <div style="display:grid; grid-template-rows:auto 1fr auto; gap:10px;">
    <div class="seg">
      <button :class="['segbtn', period === 'annual' ? 'active' : '']" @click="period = 'annual'">Annual</button>
      <button :class="['segbtn', period === 'quarterly' ? 'active' : '']" @click="period = 'quarterly'">Quarterly</button>
    </div>
    <BaseChart :title="title" :series="series" kind="bar" yFormat="short" />
    <p v-if="message" class="msg">{{ message }}</p>
  </div>
</template>

<script setup>
import { toRef } from 'vue'
import { useFcfSeries } from '../composables/useFcfSeries'
import BaseChart from './BaseChart.vue'

const props = defineProps({ ticker: { type: String, required: true } })
const { period, series, title, message } = useFcfSeries(toRef(props, 'ticker'))
</script>

<style scoped>
.seg { display: inline-flex; border: 1px solid #444; border-radius: 10px; overflow: hidden; }
.segbtn { padding: 8px 12px; background: #2a2a2a; color: #fff; border: 0; cursor: pointer; }
.segbtn.active { background: #3a3a3a; border-left: 1px solid #555; border-right: 1px solid #555; }
.msg { margin: 6px 0 0; opacity: 0.85; }
</style>
