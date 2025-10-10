<template>
  <section class="card">
    <VChart class="chart" :option="chartOption" autoresize />
    <p v-if="message" class="msg">{{ message }}</p>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import VChart from 'vue-echarts'

const props = defineProps({
  series:  { type: Array, default: () => [] }, // [ [ms, value], ... ]
  title:   { type: String, default: 'Revenue' },
  message: { type: String, default: '' }
})

function fmtShort(n) {
  const a = Math.abs(n)
  if (a >= 1e12) return (n / 1e12).toFixed(2) + 'T'
  if (a >= 1e9)  return (n / 1e9 ).toFixed(2) + 'B'
  if (a >= 1e6)  return (n / 1e6 ).toFixed(2) + 'M'
  if (a >= 1e3)  return (n / 1e3 ).toFixed(0) + 'K'
  return String(n)
}

const chartOption = computed(() => ({
  backgroundColor: 'transparent',
  title: { text: props.title, left: 'center', textStyle: { color: '#fff', fontSize: 14 } },
  grid:  { left: 50, right: 20, top: 40, bottom: 50 },
  tooltip: {
    trigger: 'axis',
    valueFormatter: (v) => fmtShort(v),
  },
  legend: { show: false },
  xAxis: {
    type: 'time',
    axisLabel: { color: '#ddd' },
    axisLine:  { lineStyle: { color: '#aaa' } },
    splitLine: { show: false }
  },
  yAxis: {
    type: 'value',
    scale: true,
    axisLabel: { color: '#ddd', formatter: val => fmtShort(val) },
    axisLine:  { lineStyle: { color: '#aaa' } },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } }
  },
  series: [{
    type: 'bar',
    name: 'Revenue',
    data: props.series,
    barMaxWidth: 28,
    itemStyle: { opacity: 0.9 }
  }]
}))
</script>

<style scoped>
.card {
  background: #1f1f1f;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.25);
  display: grid;
  grid-template-rows: 1fr auto;
  gap: 10px;
  max-width: 600px;
  width: 100%;
}
.chart { width: 100%; height: 420px; }
.msg { margin: 0; opacity: 0.85; }
</style>
