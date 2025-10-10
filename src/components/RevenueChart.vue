<template>
  <section class="card">
    <div class="seg">
      <button :class="['segbtn', period === 'annual' ? 'active' : '']" @click="period = 'annual'">Annual</button>
      <button :class="['segbtn', period === 'quarterly' ? 'active' : '']" @click="period = 'quarterly'">Quarterly</button>
    </div>
    <RevenueChartCard :series="series" :title="title" :message="message" />
  </section>
</template>

<script setup>
import { toRef } from 'vue'
import { useRevenueSeries } from '../composables/useRevenueSeries'
import RevenueChartCard from './RevenueChartCard.vue'

const props = defineProps({ ticker: { type: String, required: true } })
const { period, series, title, message } = useRevenueSeries(toRef(props, 'ticker'))
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
.seg { display: inline-flex; border: 1px solid #444; border-radius: 10px; overflow: hidden; }
.segbtn {
  padding: 8px 12px; background: #2a2a2a; color: #fff; border: 0; cursor: pointer;
}
.segbtn.active { background: #3a3a3a; border-left: 1px solid #555; border-right: 1px solid #555; }
</style>
