<template>
  <div>
    <VChart class="chart" :option="chartOption" autoresize />
    <p v-if="message" class="msg">{{ message }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import VChart from 'vue-echarts'

const props = defineProps({
  series:  { type: Array, default: () => [] },
  title:   { type: String, default: 'Revenue' },
  message: { type: String, default: '' }
})

function fmtShort(n){const a=Math.abs(n); if(a>=1e12)return(n/1e12).toFixed(2)+'T'; if(a>=1e9)return(n/1e9).toFixed(2)+'B'; if(a>=1e6)return(n/1e6).toFixed(2)+'M'; if(a>=1e3)return(n/1e3).toFixed(0)+'K'; return String(n)}

const chartOption = computed(() => ({
  backgroundColor: 'transparent',
  title: { text: props.title, left: 'center', textStyle: { color: '#fff', fontSize: 14 } }, // ⬅ same title style
  grid:  { left: 2, right: 2, top: 44, bottom: 50, containLabel: true },
  tooltip: { trigger: 'axis', valueFormatter: (v)=> fmtShort(v) },
  xAxis: {
    type: 'time',
    axisLabel: { color: '#ddd' },
    axisLine:  { lineStyle: { color: '#aaa' } },
    splitLine: { show: false }
  },
  yAxis: {
    type: 'value',
    scale: true,
    axisLabel: { color: '#ddd', formatter: (v)=> fmtShort(v) }, // ⬅ same color
    axisLine:  { lineStyle: { color: '#aaa' } },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } } // ⬅ unified splits
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
.chart { width: 100%; height: 440px; display: block; margin: 0; }
.msg { margin: 6px 0 0; opacity: 0.85; }
</style>
