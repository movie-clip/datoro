<template>
  <div class="chart-wrapper">
    <VChart 
      class="echart clickable" 
      :class="{ 'loading-chart': loading }" 
      :option="compactOption" 
      autoresize 
      @click="openModal"
    />
    <div v-if="loading" class="chart-loading-overlay">
      <div class="loading-spinner">Loading...</div>
    </div>
    <div class="expand-hint" @click="openModal" title="Click to expand">⛶</div>
    
    <ChartModal :is-open="showModal" @close="closeModal">
      <h2 class="modal-title">{{ title }}</h2>
      <!-- Segment checkboxes -->
      <div v-if="viewModeOptions.length > 0" class="segment-checkboxes">
        <label
          v-for="option in viewModeOptions"
          :key="option.value"
          class="checkbox-label"
        >
          <input
            type="checkbox"
            :value="option.value"
            :checked="selectedSegments.includes(option.value)"
            @change="toggleSegment(option.value)"
          />
          <span>{{ option.label }}</span>
        </label>
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
  title: { type: String, required: true },
  series: { type: Array, required: true },
  compactSeries: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  viewModeOptions: { type: Array, default: () => [] },
  selectedSegments: { type: Array, required: true }
})

const emit = defineEmits(['update:selectedSegments', 'modal-closed'])

const showModal = ref(false)

const openModal = () => {
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  emit('modal-closed')
}

const toggleSegment = (segmentValue) => {
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

const createOption = (isLarge = false, dataSource) => {
  // Match BaseChart padding exactly
  const topPadding = isLarge ? 30 : 44
  const bottomPadding = isLarge ? 60 : 50
  
  const base = {
    backgroundColor: 'transparent',
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
      bottom: bottomPadding, 
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
        const calculated = v.min - r * 0.06
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
        formatter: (val) => fmtShort(val) 
      },
      axisLine: { lineStyle: { color: '#aaa' } },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } }
    },
  }

  // Handle both single series array and multi-series array
  let series
  if (Array.isArray(dataSource) && dataSource.length > 0 && dataSource[0]?.name) {
    // Multi-series format with stacking
    series = dataSource.map((s) => ({
      type: 'bar',
      name: s.name,
      data: s.data,
      stack: s.stack || undefined,
      barMaxWidth: 28,
      itemStyle: { opacity: 0.9 },
    }))
  } else {
    // Single series format
    series = [{ 
      type: 'bar', 
      name: props.title, 
      data: dataSource, 
      barMaxWidth: 28, 
      itemStyle: { opacity: 0.9 } 
    }]
  }

  return { ...base, series }
}

const compactOption = computed(() => createOption(false, props.compactSeries))
const modalOption = computed(() => createOption(true, props.series))
</script>

<style scoped>
.chart-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.echart {
  width: 100%;
  min-height: 240px;
  height: 240px;
}

.echart.clickable {
  cursor: pointer;
}

.echart-modal {
  width: 100%;
  height: 600px;
}

.chart-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.loading-spinner {
  color: #fff;
  font-size: 14px;
}

.expand-hint {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
  backdrop-filter: blur(4px);
  z-index: 10;
  padding: 0;
}

.expand-hint:hover {
  background: rgba(0, 0, 0, 0.8);
  color: rgba(255, 255, 255, 1);
  transform: scale(1.1);
}

.modal-title {
  margin: 0 0 16px;
  font-size: 24px;
  font-weight: 600;
  color: #fff;
  text-align: center;
}

.segment-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  justify-content: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: #ddd;
  font-size: 14px;
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  cursor: pointer;
  width: 16px;
  height: 16px;
}

.checkbox-label:hover {
  color: #fff;
}
</style>
