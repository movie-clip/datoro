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
      🔗
    </button>
    
    <!-- Chart Container -->
    <div class="chart-container">
      <SkeletonLoader v-if="loading" variant="chart" height="250px" />
      <v-chart 
        v-else
        :ref="(el: any) => chart.chartRef.value = el"
        :option="chartOption" 
        autoresize
      />
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
</script>

<style scoped>
/* ============================================
   CHART CARD CONTAINER
   ============================================ */
.macro-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 20px;
  position: relative;
  transition: all 0.3s ease;
  overflow: hidden;
  min-width: 0;
}

.macro-card:hover {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
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
  background: rgba(120, 120, 120, 0.15);
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

.chart-sync-btn:hover {
  background: rgba(120, 120, 120, 0.25);
  border-color: rgba(150, 150, 150, 0.5);
  color: #CCC;
  transform: scale(1.05);
}

.chart-sync-btn.active {
  background: rgba(0, 181, 154, 0.15);
  border-color: rgba(0, 181, 154, 0.4);
  color: #00B59A;
}

.chart-sync-btn.active:hover {
  background: rgba(0, 181, 154, 0.25);
  border-color: rgba(0, 181, 154, 0.6);
}

.chart-sync-btn:active {
  transform: scale(0.95);
}
</style>
