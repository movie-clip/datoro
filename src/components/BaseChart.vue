<template>
  <div class="chart-wrapper">
    <VChart 
      class="echart" 
      :class="{ 'clickable': !isModal, 'loading-chart': loading }" 
      :option="option" 
      autoresize 
      @click="handleClick"
    />
    <div v-if="loading" class="chart-loading-overlay">
      <div class="loading-spinner">Loading...</div>
    </div>
    <div v-if="!isModal" class="expand-hint" @click="handleClick" title="Click to expand">⛶</div>
    
    <ChartModal :is-open="showModal" @close="closeModal">
      <h2 class="modal-title">{{ title }}</h2>
      <div v-if="viewModeOptions.length > 0" class="view-mode-buttons">
        <button
          v-for="option in viewModeOptions"
          :key="option.value"
          :class="['view-mode-btn', { active: viewMode === option.value }]"
          @click.stop="updateViewMode(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
      <VChart class="echart-modal" :option="modalOption" autoresize />
    </ChartModal>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import VChart from 'vue-echarts'
import ChartModal from './ChartModal.vue'

const props = defineProps({
  title:      { type: String, default: '' },
  series:     { type: [Array, Object], default: () => [] },
  kind:       { type: String, default: 'line' },
  yFormat:    { type: String, default: 'int' },
  smooth:     { type: Number, default: 0.15 },
  barMaxWidth:{ type: Number, default: 28 },
  isModal:    { type: Boolean, default: false },
  viewMode:   { type: String, default: null },
  viewModeOptions: { type: Array, default: () => [] },
  loading:    { type: Boolean, default: false },
})

const showModal = ref(false)
const emit = defineEmits(['update:viewMode', 'modal-closed'])

const handleClick = () => {
  if (!props.isModal) {
    showModal.value = true
  }
}

const closeModal = () => {
  showModal.value = false
  emit('modal-closed')
}

const updateViewMode = (mode) => {
  emit('update:viewMode', mode)
}

function fmtShort(n){
  const a = Math.abs(n)
  if (a >= 1e12) return (n/1e12).toFixed(2)+'T'
  if (a >= 1e9 ) return (n/1e9 ).toFixed(2)+'B'
  if (a >= 1e6 ) return (n/1e6 ).toFixed(2)+'M'
  if (a >= 1e3 ) return (n/1e3 ).toFixed(0)+'K'
  return String(n)
}
const yFormatter = (v, mode) => mode === 'short' ? fmtShort(v) : Math.round(v).toString()

const createOption = (isLarge = false) => {
  // In modal view, reduce top padding since title is now outside the chart
  const topPadding = isLarge ? 30 : 44
  
  const base = {
    backgroundColor: 'transparent',
    // Only show title in non-modal view (in modal, it's shown as HTML element)
    title: isLarge ? undefined : { 
      text: props.title, 
      left: 'center', 
      textStyle: { color: '#fff', fontSize: 14 } 
    },
    legend: { show: false },
    grid: { 
      left: 24, 
      right: 24, 
      top: topPadding, 
      bottom: isLarge ? 60 : 50, 
      containLabel: true 
    },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'time', 
      boundaryGap: false,
      axisLabel: { color: '#ddd', fontSize: isLarge ? 14 : 12 },
      axisLine: { lineStyle: { color: '#aaa' } },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      scale: true,
      min: (v) => {
        const r = v.max - v.min
        if (r === 0) {
          const p = Math.abs(v.min) * 0.05 || 1
          return v.min - p
        }
        return v.min - r * 0.06
      },
      max: (v) => {
        const r = v.max - v.min
        if (r === 0) {
          const p = Math.abs(v.max) * 0.05 || 1
          return v.max + p
        }
        return v.max + r * 0.06
      },
      axisLabel: { 
        color: '#ddd', 
        fontSize: isLarge ? 14 : 12,
        formatter: (val) => yFormatter(val, props.yFormat) 
      },
      axisLine: { lineStyle: { color: '#aaa' } },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } }
    },
  }

  // Handle both single series array and multi-series array
  let series
  if (Array.isArray(props.series) && props.series.length > 0 && props.series[0]?.name) {
    // Multi-series format: [{ name: 'FCF', data: [...] }, { name: 'SBC', data: [...] }]
    series = props.series.map((s, idx) => ({
      type: props.kind,
      name: s.name,
      data: s.data,
      barMaxWidth: props.barMaxWidth,
      itemStyle: { opacity: 0.9, ...(s.itemStyle || {}) },
      smooth: props.kind === 'line' ? props.smooth : undefined,
      showSymbol: props.kind === 'line' ? false : undefined,
      emphasis: props.kind === 'line' ? { disabled: true } : undefined,
      lineStyle: props.kind === 'line' ? { width: isLarge ? 3 : 2 } : undefined,
    }))
  } else {
    // Single series format: [[timestamp, value], ...]
    series = props.kind === 'bar'
      ? [{ 
          type: 'bar', 
          name: props.title || 'Series', 
          data: props.series, 
          barMaxWidth: props.barMaxWidth, 
          itemStyle: { opacity: 0.9 } 
        }]
      : [{ 
          type: 'line', 
          name: props.title || 'Series', 
          data: props.series, 
          smooth: props.smooth, 
          showSymbol: false, 
          emphasis: { disabled: true }, 
          lineStyle: { width: isLarge ? 3 : 2 } 
        }]
  }

  // Don't show legend - we have view mode buttons for switching
  return { ...base, series }
}

const option = computed(() => createOption(false))
const modalOption = computed(() => createOption(true))
</script>

<style scoped>
.chart-wrapper {
  position: relative;
}

.echart { 
  width: 100%; 
  height: 440px; 
  display: block; 
  margin: 0; 
}

.echart.clickable {
  cursor: pointer;
  transition: opacity 0.2s;
}

.echart.clickable:hover {
  opacity: 0.85;
}

.expand-hint {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(4px);
  z-index: 10;
}

.expand-hint:hover {
  background: rgba(0, 0, 0, 0.7);
  color: rgba(255, 255, 255, 0.95);
  transform: scale(1.15);
}

.echart-modal {
  width: 100%;
  height: 70vh;
  min-height: 500px;
}

.modal-title {
  text-align: center;
  color: #fff;
  font-size: 22px;
  font-weight: 600;
  margin: 0 0 16px 0;
  padding: 0;
}

.view-mode-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  justify-content: center;
}

.view-mode-btn {
  padding: 8px 16px;
  background: #2a2a2a;
  color: #ddd;
  border: 1px solid #444;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.view-mode-btn:hover {
  background: #333;
  border-color: #555;
}

.view-mode-btn.active {
  background: #3a7bd5;
  border-color: #3a7bd5;
  color: #fff;
}

.chart-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  pointer-events: none;
}

.loading-spinner {
  padding: 12px 24px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
}

.loading-chart {
  opacity: 0.5;
}
</style>
