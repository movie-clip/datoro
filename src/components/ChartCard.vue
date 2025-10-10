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
  title:   { type: String, default: 'Empty Chart' },
  message: { type: String, default: '' }
})

const chartOption = computed(() => ({
  backgroundColor: 'transparent',
  title: { text: props.title, left: 'center', textStyle: { color: '#fff', fontSize: 14 } },
  grid:  { left: 40, right: 20, top: 40, bottom: 40 },
  tooltip: { trigger: 'axis' },
  legend: { show: false },
  xAxis: {
    type: 'time', boundaryGap: false,
    axisLabel: { color: '#ddd' },
    axisLine:  { lineStyle: { color: '#aaa' } },
    splitLine: { show: false }
  },
  yAxis: {
    type: 'value',
    scale: true,
    min: (val) => {
      const range = val.max - val.min
      if (range === 0) { const pad = Math.abs(val.min) * 0.05 || 1; return val.min - pad }
      return val.min - range * 0.06
    },
    max: (val) => {
      const range = val.max - val.min
      if (range === 0) { const pad = Math.abs(val.max) * 0.05 || 1; return val.max + pad }
      return val.max + range * 0.06
    },
    axisLabel: { color: '#ddd' },
    axisLabel: { color: '#ddd',formatter: (v) => Math.round(v).toString(), },
    axisLine:  { lineStyle: { color: '#aaa' } },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } }
  },
  series: [{
    type: 'line',
    name: 'Close',
    data: props.series,
    smooth: 0.15,
    showSymbol: false,
    emphasis: { disabled: true },
    lineStyle: { width: 2 }
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
.chart { width: 100%; height: 440px; }
.msg { margin: 0; opacity: 0.85; }
</style>
