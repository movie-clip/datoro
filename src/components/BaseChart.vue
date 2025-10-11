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
      <!-- Show toggle buttons - support both single-select (viewMode) and multi-select (selectedSegments) -->
      <div v-if="viewModeOptions.length > 0 && !useLegend" class="view-mode-buttons">
        <button
          v-for="option in viewModeOptions"
          :key="option.value"
          :class="[
            'view-mode-btn', 
            { 
              active: selectedSegments 
                ? selectedSegments.includes(option.value) 
                : viewMode === option.value 
            }
          ]"
          @click.stop="selectedSegments ? toggleSegment(option.value) : updateViewMode(option.value)"
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
  compactSeries: { type: [Array, Object], default: null },
  kind:       { type: String, default: 'line' },
  yFormat:    { type: String, default: 'int' },
  smooth:     { type: Number, default: 0.15 },
  barMaxWidth:{ type: Number, default: 28 },
  isModal:    { type: Boolean, default: false },
  viewMode:   { type: String, default: null },
  selectedSegments: { type: Array, default: null },
  viewModeOptions: { type: Array, default: () => [] },
  loading:    { type: Boolean, default: false },
  showLegend: { type: Boolean, default: false },
  stacked:    { type: Boolean, default: false },
  useLegend:  { type: Boolean, default: false },
  dualAxis:   { type: Boolean, default: false },
})

const showModal = ref(false)
const emit = defineEmits(['update:viewMode', 'update:selectedSegments', 'modal-closed'])

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

const toggleSegment = (segmentValue) => {
  if (!props.selectedSegments) return
  
  const current = [...props.selectedSegments]
  const idx = current.indexOf(segmentValue)
  
  if (idx >= 0) {
    // Remove if already selected (but keep at least one)
    if (current.length > 1) {
      current.splice(idx, 1)
    }
  } else {
    // Add if not selected
    current.push(segmentValue)
  }
  
  emit('update:selectedSegments', current)
}

function fmtShort(n){
  const a = Math.abs(n)
  if (a >= 1e12) return (n/1e12).toFixed(2)+'T'
  if (a >= 1e9 ) return (n/1e9 ).toFixed(2)+'B'
  if (a >= 1e6 ) return (n/1e6 ).toFixed(2)+'M'
  if (a >= 1e3 ) return (n/1e3 ).toFixed(0)+'K'
  return String(n)
}

const yFormatter = (v, mode) => {
  if (mode === 'short') return fmtShort(v)
  if (mode === 'currency') return '$' + fmtShort(v)
  if (mode === 'percent') return v.toFixed(2) + '%'
  if (mode === 'int') return Math.round(v).toLocaleString()
  return Math.round(v).toString()
}

const createOption = (isLarge = false) => {
  // In modal view with useLegend, show legend at top
  const showLegendAtTop = isLarge && props.useLegend
  const topPadding = showLegendAtTop ? 60 : (isLarge ? 30 : 44)
  const bottomPadding = isLarge ? 60 : 50
  
  // Build legend selection: only first series (typically 'Total Revenue') selected by default
  // Apply this whenever useLegend is true, not just in modal view
  const legendSelected = {}
  if (props.useLegend && Array.isArray(props.series) && props.series.length > 0 && props.series[0]?.name) {
    props.series.forEach((s, idx) => {
      legendSelected[s.name] = idx === 0 // Only first item selected
    })
  }
  
  const base = {
    backgroundColor: 'transparent',
    // Only show title in non-modal view (in modal, it's shown as HTML element)
    title: isLarge ? undefined : { 
      text: props.title, 
      left: 'center', 
      textStyle: { color: '#fff', fontSize: 14 } 
    },
    // Show legend at top in modal if using legend mode
    legend: showLegendAtTop ? {
      show: true,
      type: 'plain', // Use plain instead of scroll for multi-line wrapping
      orient: 'horizontal',
      top: 10,
      left: 'center',
      textStyle: { color: '#ddd', fontSize: 12 },
      selectedMode: 'single', // Only one item can be selected at a time (radio button style)
      selected: legendSelected // Set default selection
    } : props.useLegend ? {
      show: false, // Hide legend in compact view, but still apply selection
      selected: legendSelected
    } : { show: false },
    grid: { 
      left: 24, 
      right: 24, 
      top: topPadding, 
      bottom: bottomPadding, 
      containLabel: true 
    },
    tooltip: { 
      trigger: 'axis',
      formatter: props.dualAxis ? (params) => {
        if (!params || params.length === 0) return ''
        const date = new Date(params[0].value[0]).toLocaleDateString()
        let html = `<div style="font-size: 14px; font-weight: 600; margin-bottom: 4px;">${date}</div>`
        params.forEach(item => {
          const marker = item.marker
          const name = item.seriesName
          const value = item.value[1]
          const formatted = name === 'Price' 
            ? `$${value.toFixed(2)}` 
            : `${value >= 0 ? '+' : ''}${(value / 1000).toFixed(1)}K shares`
          html += `<div>${marker} ${name}: ${formatted}</div>`
        })
        return html
      } : undefined
    },
    xAxis: {
      type: 'time', 
      boundaryGap: props.kind === 'bar' || props.dualAxis ? true : false,
      axisLabel: { color: '#ddd', fontSize: isLarge ? 14 : 12 },
      axisLine: { lineStyle: { color: '#aaa' } },
      splitLine: { show: false }
    },
    yAxis: props.dualAxis ? [
      // Left axis (for price/primary data)
      {
        type: 'value',
        scale: true,
        position: 'left',
        axisLabel: { 
          color: '#ddd', 
          fontSize: isLarge ? 14 : 12,
          formatter: (val) => yFormatter(val, props.yFormat) 
        },
        axisLine: { lineStyle: { color: '#aaa' } },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } }
      },
      // Right axis (for insider trading/secondary data)
      {
        type: 'value',
        scale: true,
        position: 'right',
        axisLabel: { 
          color: '#ddd', 
          fontSize: isLarge ? 14 : 12,
          formatter: (val) => {
            if (Math.abs(val) >= 1000) {
              return (val / 1000).toFixed(1) + 'K'
            }
            return val.toFixed(0)
          }
        },
        axisLine: { lineStyle: { color: '#aaa' } },
        splitLine: { show: false }
      }
    ] : {
      type: 'value',
      scale: true,
      min: (v) => {
        const r = v.max - v.min
        if (r === 0) {
          const p = Math.abs(v.min) * 0.05 || 1
          return v.min - p
        }
        const calculated = v.min - r * 0.06
        // If all data is positive, don't let axis go negative
        if (v.min >= 0 && calculated < 0) {
          return 0
        }
        return calculated
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

  // Use compactSeries for compact view if provided, otherwise use series
  const dataSource = !isLarge && props.compactSeries ? props.compactSeries : props.series
  
  // Handle both single series array and multi-series array
  let series
  if (Array.isArray(dataSource) && dataSource.length > 0 && dataSource[0]?.name) {
    // Multi-series format: [{ name: 'FCF', data: [...] }, { name: 'SBC', data: [...] }]
    // If series already has 'type' property, it's a fully configured series - use as-is
    if (dataSource[0].type) {
      series = dataSource
    } else {
      // Otherwise, apply default configuration
      series = dataSource.map((s, idx) => ({
        type: props.kind,
        name: s.name,
        data: s.data,
        // Use stack property from series object if provided
        stack: s.stack || undefined,
        barMaxWidth: props.barMaxWidth,
        itemStyle: { opacity: 0.9, ...(s.itemStyle || {}) },
        smooth: props.kind === 'line' ? props.smooth : undefined,
        showSymbol: props.kind === 'line' ? false : undefined,
        emphasis: props.kind === 'line' ? { disabled: true } : undefined,
        lineStyle: props.kind === 'line' ? { width: isLarge ? 3 : 2 } : undefined,
      }))
    }
  } else {
    // Single series format: [[timestamp, value], ...]
    series = props.kind === 'bar'
      ? [{ 
          type: 'bar', 
          name: props.title || 'Series', 
          data: dataSource, 
          barMaxWidth: props.barMaxWidth, 
          itemStyle: { opacity: 0.9 } 
        }]
      : [{ 
          type: 'line', 
          name: props.title || 'Series', 
          data: dataSource, 
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
