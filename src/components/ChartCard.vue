<template>
  <div>
    <VChart
      class="chart"
      :option="chartOption"
      autoresize
    />
    <p
      v-if="message"
      class="msg"
    >
      {{ message }}
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import VChart from 'vue-echarts'

const props = defineProps({
  series:  { type: Array, default: () => [] },
  title:   { type: String, default: 'Empty Chart' },
  message: { type: String, default: '' }
})

const chartOption = computed(() => ({
  backgroundColor: 'transparent',
  title: { text: props.title, left: 'center', textStyle: { color: '#fff', fontSize: 14 } },
  grid:  { left: 24, right: 24, top: 44, bottom: 50, containLabel: true },
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'time', boundaryGap: false,
    axisLabel: { color: '#ddd' },
    axisLine:  { lineStyle: { color: '#aaa' } },
    splitLine: { show: false }
  },
  yAxis: {
    type: 'value',
    scale: true,
    min: (v)=>{const r=v.max-v.min; if(r===0){const p=Math.abs(v.min)*.05||1; return v.min-p} return v.min-r*.06},
    max: (v)=>{const r=v.max-v.min; if(r===0){const p=Math.abs(v.max)*.05||1; return v.max+p} return v.max+r*.06},
    axisLabel: { color: '#ddd', formatter: (val)=> Math.round(val).toString() }, // ⬅ rounded labels
    axisLine:  { lineStyle: { color: '#aaa' } },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } } // ⬅ unified splits
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
.chart { width: 100%; height: 440px; display: block; margin: 0; }
.msg { margin: 6px 0 0; opacity: 0.85; }
</style>
