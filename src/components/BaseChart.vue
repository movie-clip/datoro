<template>
  <VChart class="echart" :option="option" autoresize />
</template>

<script setup>
import { computed } from 'vue'
import VChart from 'vue-echarts'

const props = defineProps({
  title:      { type: String, default: '' },
  series:     { type: Array,  default: () => [] },   // [ [ms, value], ... ]
  kind:       { type: String, default: 'line' },     // 'line' | 'bar'
  yFormat:    { type: String, default: 'int' },      // 'int' | 'short'
  smooth:     { type: Number, default: 0.15 },       // for line
  barMaxWidth:{ type: Number, default: 28 },         // for bar
})

function fmtShort(n){
  const a = Math.abs(n)
  if (a >= 1e12) return (n/1e12).toFixed(2)+'T'
  if (a >= 1e9 ) return (n/1e9 ).toFixed(2)+'B'
  if (a >= 1e6 ) return (n/1e6 ).toFixed(2)+'M'
  if (a >= 1e3 ) return (n/1e3 ).toFixed(0)+'K'
  return String(n)
}
const yFormatter = (v, mode) => mode === 'short' ? fmtShort(v) : Math.round(v).toString()

const option = computed(() => {
  const base = {
    backgroundColor: 'transparent',
    title: { text: props.title, left: 'center', textStyle: { color: '#fff', fontSize: 14 } },
    // Symmetric grid + containLabel so axes don't shove the plot to the right
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
      min: (v)=>{const r=v.max-v.min; if(r===0){const p=Math.abs(v.min)*.05||1;return v.min-p} return v.min-r*.06},
      max: (v)=>{const r=v.max-v.min; if(r===0){const p=Math.abs(v.max)*.05||1;return v.max+p} return v.max+r*.06},
      axisLabel: { color: '#ddd', formatter:(val)=> yFormatter(val, props.yFormat) },
      axisLine:  { lineStyle: { color: '#aaa' } },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } }
    },
  }

  const series =
    props.kind === 'bar'
      ? [{ type:'bar', name: props.title || 'Series', data: props.series, barMaxWidth: props.barMaxWidth, itemStyle:{ opacity:.9 } }]
      : [{ type:'line', name: props.title || 'Series', data: props.series, smooth: props.smooth, showSymbol:false, emphasis:{ disabled:true }, lineStyle:{ width:2 } }]

  return { ...base, series }
})
</script>

<style scoped>
.echart { width: 100%; height: 440px; display: block; margin: 0; }
</style>
