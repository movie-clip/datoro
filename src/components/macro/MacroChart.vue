<template>
  <div class="macro-card">
    <h2>{{ title }}</h2>
    
    <!-- Reset Zoom Button -->
    <button
      v-if="chart.isZoomed.value"
      class="reset-zoom-btn"
      @click="chart.resetZoom"
      title="Reset zoom"
    >
      ↺
    </button>
    
    <!-- Sync Toggle Button -->
    <button
      class="chart-sync-btn"
      :class="{ active: chart.isSynced.value }"
      @click="chart.toggleSync"
      :title="chart.isSynced.value ? 'Synced with other charts' : 'Click to sync with other charts'"
    >
      <img src="/icons/sync.png" alt="Sync" class="sync-icon" />
    </button>
    
    <!-- Chart Container -->
    <div class="chart-container">
      <SkeletonLoader v-if="loading && !hasChartData" variant="chart" height="250px" />
      <v-chart 
        v-else-if="hasChartData"
        :ref="(el: any) => chart.chartRef.value = el"
        :option="chartOption"
        :class="{ 'loading-chart': loading }"
        autoresize
      />
      <!-- Loading overlay (when updating existing data) -->
      <div
        v-if="loading && hasChartData"
        class="chart-loading-overlay"
      >
        <div class="loading-spinner">
          Updating...
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import SkeletonLoader from '../common/SkeletonLoader.vue'
import type { UseMacroChartReturn } from '../../composables/useMacroChart'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  chart: {
    type: Object as PropType<UseMacroChartReturn>,
    required: true
  },
  chartOption: {
    type: Object as PropType<EChartsOption>,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
})

/**
 * Check if chart has data to display
 */
const hasChartData = computed(() => {
  const series = props.chartOption?.series
  if (!series || !Array.isArray(series)) return false
  return series.some((s: any) => s.data && Array.isArray(s.data) && s.data.length > 0)
})
</script>

<style scoped>
/* ============================================
   CHART CARD CONTAINER
   ============================================ */
.macro-card {
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border: 1px solid #2A2A2E;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  padding: 20px;
  position: relative;
  transition: all 0.3s ease;
  overflow: hidden;
  min-width: 0;
}

.macro-card:hover {
  border-color: rgba(56, 189, 248, 0.5);
  box-shadow: 0 4px 20px rgba(56, 189, 248, 0.3);
}

.macro-card h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 15px 0;
  color: #999;
}

/* ============================================
   CHART CONTAINER
   ============================================ */
.chart-container {
  height: 280px;
  position: relative;
  pointer-events: none;
  overflow: hidden;
  max-width: 100%;
}

.chart-container :deep(canvas) {
  pointer-events: auto;
}

.chart-container :deep(.echarts-container) {
  pointer-events: auto;
}

/* ============================================
   LOADING STATES
   ============================================ */
.loading-chart {
  opacity: 0.5;
  pointer-events: none;
}

.chart-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.1);
  pointer-events: none;
  z-index: 5;
}

.loading-spinner {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 12px 24px;
  color: #999;
  font-size: 14px;
  font-weight: 500;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* ============================================
   RESET ZOOM BUTTON
   ============================================ */
.reset-zoom-btn {
  position: absolute;
  top: 12px;
  right: 55px;
  width: 32px;
  height: 32px;
  background: rgba(120, 120, 120, 0.15);
  border: 1px solid rgba(150, 150, 150, 0.3);
  border-radius: 6px;
  color: #999;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 10;
  padding: 0;
  line-height: 1;
  pointer-events: auto;
}

.reset-zoom-btn:hover {
  background: rgba(120, 120, 120, 0.25);
  border-color: rgba(150, 150, 150, 0.5);
  color: #CCC;
  transform: scale(1.05);
}

.reset-zoom-btn:active {
  transform: scale(0.95);
}

/* ============================================
   SYNC TOGGLE BUTTON
   ============================================ */
.chart-sync-btn {
  position: absolute;
  top: 12px;
  right: 15px;
  width: 32px;
  height: 32px;
  background: rgba(15, 15, 16, 0.6);
  border: 1px solid rgba(150, 150, 150, 0.3);
  border-radius: 6px;
  color: #999;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 10;
  padding: 0;
  line-height: 1;
  pointer-events: auto;
}

.sync-icon {
  width: 18px;
  height: 18px;
  opacity: 0.7;
  transition: all 0.2s ease;
  filter: brightness(0) saturate(100%) invert(66%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(95%) contrast(90%);
}

.chart-sync-btn:hover .sync-icon {
  opacity: 1;
  filter: brightness(0) saturate(100%) invert(86%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(105%) contrast(90%);
}

.chart-sync-btn.active .sync-icon {
  opacity: 1;
  filter: brightness(0) saturate(100%) invert(68%) sepia(48%) saturate(707%) hue-rotate(121deg) brightness(96%) contrast(101%);
}

.chart-sync-btn.active:hover .sync-icon {
  filter: brightness(0) saturate(100%) invert(73%) sepia(34%) saturate(1028%) hue-rotate(121deg) brightness(99%) contrast(101%);
}

.chart-sync-btn:hover {
  background: rgba(15, 15, 16, 0.9);
  border-color: #00594C;
  color: #E5E5E5;
  transform: scale(1.1);
  box-shadow: 0 0 12px rgba(0, 89, 76, 0.4);
}

.chart-sync-btn.active {
  border-color: rgba(0, 181, 154, 0.4);
  box-shadow: 0 0 15px rgba(0, 89, 76, 0.4);
}

.chart-sync-btn.active:hover {
  background: rgba(0, 181, 154, 0.25);
  border-color: rgba(0, 181, 154, 0.6);
}

.chart-sync-btn:active {
  transform: scale(0.95);
}
</style>
