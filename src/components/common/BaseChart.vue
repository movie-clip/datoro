<template>
  <div class="chart-wrapper">
    <!-- Expand button - always visible on chart card (like macro charts) -->
    <button
      v-if="!isModal && !loading && !forceExpanded"
      class="expand-hint"
      title="Click to expand"
      @click="handleClick"
    >
      ⛶
    </button>
    
    <!-- Force Expanded Mode: Show modal content directly without compact view -->
    <template v-if="forceExpanded">
      <h2 class="modal-title">
        {{ title }}
      </h2>
      <!-- Show toggle buttons -->
      <div
        v-if="viewModeOptions.length > 0 && !useLegend"
        class="view-mode-buttons"
      >
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
      <!-- Custom controls slot for additional buttons -->
      <slot name="controls"></slot>
      <VChart
        ref="modalChartRef"
        :key="`forceExpanded-${props.dualAxis ? 'dual' : 'single'}`"
        v-if="isMounted && hasSeriesData(modalOption)"
        class="echart-modal"
        :option="modalOption"
        :update-options="{ lazyUpdate: true, notMerge: false }"
        :class="{ 'loading-chart': loading }"
        autoresize
        role="img"
        :aria-label="title"
      />
      <div
        v-if="loading && hasSeriesData(modalOption)"
        class="chart-loading-overlay"
      >
        <div class="loading-spinner">
          Updating...
        </div>
      </div>
      <!-- Growth Labels Section -->
      <GrowthLabels 
        v-if="showGrowthLabels"
        :growth-data="growthData"
        :invert-growth="invertGrowth"
      />
    </template>
    
    <!-- Normal Mode: Show compact view with expand button -->
    <template v-else>
      <SkeletonLoader
        v-if="loading && !hasSeriesData(option)"
        variant="chart"
      />
      <VChart 
        ref="chartRef"
        v-else-if="isMounted && (hasSeriesData(option) || hasEmptyData)"
        class="echart" 
        :class="{ 'clickable': !isModal, 'loading-chart': loading, 'empty-chart': hasEmptyData }" 
        :option="option"
        :update-options="{ lazyUpdate: true, notMerge: false }"
        autoresize 
        role="img"
        :aria-label="title"
        @click="handleClick"
      />
      <!-- Empty data overlay (similar to loading overlay) -->
      <div
        v-if="hasEmptyData && !isModal"
        class="empty-data-overlay"
      >
        <div class="empty-data-panel">
          <p class="empty-message">{{ emptyDataMessage }}</p>
        </div>
      </div>
      <div
        v-if="loading && hasSeriesData(option)"
        class="chart-loading-overlay"
      >
        <div class="loading-spinner">
          Updating...
        </div>
      </div>
      
      <!-- Error and message display (compact mode) -->
      <p
        v-if="error && !isModal"
        class="msg error"
        role="alert"
      >
        {{ error }}
      </p>
      <p
        v-else-if="message && !isModal"
        class="msg"
      >
        {{ message }}
      </p>
      
      <ChartModal
        :is-open="showModal"
        :title="title"
        :ticker="ticker || ''"
        :company-icon="companyIcon"
        @close="closeModal"
      >
        <!-- Toggle buttons -->
        <div
          v-if="viewModeOptions.length > 0 && !useLegend"
          class="view-mode-buttons"
        >
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
        <!-- Custom controls slot for additional buttons -->
        <slot name="controls"></slot>
        <!-- Chart -->
        <VChart
          :key="`chartModal-${props.dualAxis ? 'dual' : 'single'}`"
          class="echart-modal"
          :option="modalOption"
          :update-options="{ lazyUpdate: true, notMerge: false }"
          autoresize
          role="img"
          :aria-label="title"
        />
        
        <!-- Growth Labels Section -->
        <GrowthLabels 
          v-if="showGrowthLabels"
          :growth-data="growthData"
          :invert-growth="invertGrowth"
        />
      </ChartModal>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onBeforeUnmount, onMounted, markRaw, shallowRef, watchEffect } from 'vue'
import { storeToRefs } from 'pinia'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import ChartModal from './ChartModal.vue'
import SkeletonLoader from './SkeletonLoader.vue'
import GrowthLabels from './GrowthLabels.vue'
import { formatGrowth as formatGrowthUtil, type GrowthRates } from '../../utils/growthCalculator.js'
import { useIsMobile } from '../../composables/useIsMobile.js'
import { useTickerStore } from '../../stores/tickerStore'
import { 
  isChartDataEmpty, 
  calculateChartGrowth, 
  generateCategoryData,
  type CategoryData 
} from '../../services/charts/chartDataTransformer'
import { buildChartOption, type ChartOptionBuilderParams } from '../../services/charts/chartOptionBuilder'

// Track if component is mounted AND ECharts is ready
const isMounted = ref(false)
const echartsReady = ref(false)

// Chart instance refs for proper cleanup
const chartRef = ref<InstanceType<typeof VChart> | null>(null)
const modalChartRef = ref<InstanceType<typeof VChart> | null>(null)

// Get company profile for modal header
const tickerStore = useTickerStore()
const { profile } = storeToRefs(tickerStore)

// Compute company icon URL
const companyIcon = computed(() => profile.value?.image || '')

// Ensure ECharts is registered before rendering
onMounted(async () => {
  // Wait for ECharts to be registered
  const module = await import('../../plugins/echarts')
  module.registerECharts()
  echartsReady.value = true
  isMounted.value = true
})

onBeforeUnmount(() => {
  isMounted.value = false
  
  // Note: Vue-echarts handles chart disposal automatically
  // Manually disposing can cause "Instance has been disposed" errors
  // The library's internal cleanup is sufficient for memory leak prevention
  chartRef.value = null
  modalChartRef.value = null
})

type ChartKind = 'line' | 'bar'
type YFormat = 'int' | 'currency' | 'percent' | 'short' | 'price' | 'decimal' | 'ratio'
type RightAxisType = 'symmetric' | 'percentage'

interface ViewModeOption {
  value: string
  label: string
}

interface SeriesDataPoint {
  data?: Array<[number, number] | [number, number, string, string]>  // [timestamp, value] or [timestamp, value, fiscalPeriod, fiscalYear]
  name?: string
  [key: string]: any
}

interface Props {
  title?: string
  series?: Array<[number, number] | [number, number, string, string]> | SeriesDataPoint[] | Record<string, any>
  compactSeries?: Array<[number, number] | [number, number, string, string]> | SeriesDataPoint[] | null
  kind?: ChartKind
  yFormat?: YFormat
  smooth?: number
  barMaxWidth?: number
  isModal?: boolean
  forceExpanded?: boolean
  viewMode?: string | null
  selectedSegments?: string[] | null
  viewModeOptions?: ViewModeOption[]
  loading?: boolean
  showLegend?: boolean
  stacked?: boolean
  useLegend?: boolean
  dualAxis?: boolean
  rightAxisType?: RightAxisType
  alignZero?: boolean
  showGrowthLabels?: boolean
  invertGrowth?: boolean
  ticker?: string | null
  dataType?: string
  customGrowthData?: GrowthRates | null
  error?: string | null
  message?: string | null
  emptyDataMessage?: string | null
  timeframe?: 'annual' | 'quarterly'
  enableZoom?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  series: () => [],
  compactSeries: null,
  kind: 'line',
  yFormat: 'int',
  smooth: 0.15,
  barMaxWidth: 28,
  isModal: false,
  forceExpanded: false,
  viewMode: null,
  selectedSegments: null,
  viewModeOptions: () => [],
  loading: false,
  showLegend: false,
  stacked: false,
  useLegend: false,
  dualAxis: false,
  rightAxisType: 'symmetric',
  alignZero: false,
  showGrowthLabels: false,
  invertGrowth: false,
  ticker: null,
  dataType: 'generic',
  customGrowthData: null,
  error: null,
  message: null,
  emptyDataMessage: null,
  timeframe: 'annual',
  enableZoom: false
})

const showModal = ref(false)

interface Emits {
  (e: 'update:viewMode', mode: string): void
  (e: 'update:selectedSegments', segments: string[]): void
  (e: 'modal-closed'): void
}

const emit = defineEmits<Emits>()

const handleClick = (): void => {
  if (!props.isModal) {
    showModal.value = true
  }
}

const closeModal = (): void => {
  showModal.value = false
  emit('modal-closed')
}

const updateViewMode = (mode: string): void => {
  emit('update:viewMode', mode)
}

const toggleSegment = (segmentValue: string): void => {
  if (!props.selectedSegments) return
  
  const current = [...props.selectedSegments]
  
  // Special handling for 'total' - replace all segments with just 'total'
  if (segmentValue === 'total') {
    // If already showing total, do nothing
    if (current.length === 1 && current[0] === 'total') return
    // Otherwise switch to total mode
    emit('update:selectedSegments', ['total'])
    return
  }
  
  // If switching from 'total' to individual segments, clear total first
  if (current.includes('total')) {
    emit('update:selectedSegments', [segmentValue])
    return
  }
  
  // Toggle individual segment
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

// Computed property to check if data is empty (but valid, not an error)
const hasEmptyData = computed((): boolean => {
  if (!props.emptyDataMessage) return false
  return isChartDataEmpty(props.series, props.loading, props.error)
})

// Growth calculation and formatting
const growthData = computed((): GrowthRates | null => {
  if (!props.showGrowthLabels) return null
  return calculateChartGrowth(props.series, props.ticker, props.customGrowthData, props.stacked)
})

// Format growth for display
const formatGrowth = (growth: number | undefined): string => {
  // Don't invert the actual number - show the real growth percentage
  // The inversion only affects the CSS class (color)
  return formatGrowthUtil(growth)
}

// Use reactive mobile detection composable
const { isMobile } = useIsMobile()

// Helper to check if option has series data
const hasSeriesData = (opt: EChartsOption): boolean => {
  if (!opt.series) return false
  return Array.isArray(opt.series) ? opt.series.length > 0 : true
}

// Deep memoized category data calculation (prevents expensive recalculations)
const lastCategoryKey = ref('')
const lastCategoryData = ref<CategoryData>({ yearsList: [], categoryData: [], timestamps: [] })
const categoryDataCache = computed<CategoryData>(() => {
  const seriesLength = Array.isArray(props.series) ? props.series.length : 0
  const key = `${seriesLength}-${props.kind}-${props.timeframe}`
  if (lastCategoryKey.value === key) {
    return lastCategoryData.value
  }
  lastCategoryKey.value = key
  lastCategoryData.value = generateCategoryData(props.series, props.kind, props.timeframe)
  return lastCategoryData.value
})

// Prepare params for builder
const getBuilderParams = (isLarge: boolean): ChartOptionBuilderParams => ({
  title: props.title,
  series: props.series,
  compactSeries: props.compactSeries,
  kind: props.kind,
  yFormat: props.yFormat,
  smooth: props.smooth,
  barMaxWidth: props.barMaxWidth,
  isModal: props.isModal,
  forceExpanded: props.forceExpanded,
  viewMode: props.viewMode,
  selectedSegments: props.selectedSegments,
  loading: props.loading,
  showLegend: props.showLegend,
  stacked: props.stacked,
  useLegend: props.useLegend,
  dualAxis: props.dualAxis,
  rightAxisType: props.rightAxisType,
  alignZero: props.alignZero,
  ticker: props.ticker,
  timeframe: props.timeframe,
  enableZoom: props.enableZoom,
  isMobile: isMobile.value,
  categoryData: categoryDataCache.value
})

// Performance: Use shallowRef + watchEffect instead of computed
// Only rebuild chart options when VISUAL props change (not loading/error)
const option = shallowRef<EChartsOption>({ series: [] })
const modalOption = shallowRef<EChartsOption>({ series: [] })

// Update compact chart option when visual props change
watchEffect(() => {
  if (props.series && isMounted.value && echartsReady.value) {
    const opt = buildChartOption(getBuilderParams(false), false)
    option.value = markRaw(opt)
  }
})

// Update modal chart option when needed (modal open or forceExpanded)
watchEffect(() => {
  if ((props.forceExpanded || showModal.value) && props.series && isMounted.value && echartsReady.value) {
    const opt = buildChartOption(getBuilderParams(true), true)
    modalOption.value = markRaw(opt)
  } else if (option.value && option.value.series) {
    // Use compact option as fallback
    modalOption.value = option.value
  }
})
</script>

<style scoped>
/* ============================================
   CHART WRAPPER CONTAINER
   ============================================ */
.chart-wrapper {
  position: relative;
}

/* ============================================
   EXPAND BUTTON (Top-right corner, part of card)
   ============================================ */
.expand-hint {
  position: absolute;
  top: 1px;
  right: 1px;
  width: 30px;
  height: 30px;
  background: var(--chart-bg-overlay);
  border: 1px solid var(--chart-border-base);
  border-radius: var(--chart-border-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--chart-font-base);
  line-height: 1;
  color: var(--chart-text-secondary);
  cursor: pointer;
  transition: all var(--chart-transition-fast);
  backdrop-filter: var(--chart-backdrop-blur);
  z-index: 10;
  padding: 0;
}

.expand-hint:hover {
  background: var(--chart-bg-overlay-solid);
  border-color: var(--chart-border-active);
  color: var(--chart-text-primary);
  transform: scale(1.1);
  box-shadow: var(--chart-shadow-glow);
}

/* ============================================
   CHART ELEMENTS
   ============================================ */
.echart {
  width: 100%; 
  height: 340px; /* Default height for all charts */
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

.echart-modal {
  width: 100%;
  height: 63vh;
  min-height: 475px;
  overflow: hidden; /* Disable chart scrolling */
}

/* ============================================
   LOADING STATES
   ============================================ */
.loading-chart {
  opacity: 0.5;
}

.chart-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 15, 16, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  pointer-events: none;
}

.loading-spinner {
  padding: 12px 24px;
  background: var(--chart-bg-primary);
  border: 1px solid var(--chart-border-base);
  border-radius: var(--chart-border-radius);
  color: var(--chart-text-primary);
  font-size: var(--chart-font-base);
  box-shadow: 0 0 20px rgba(56, 189, 248, 0.2);
}

/* ============================================
   EMPTY DATA STATE
   ============================================ */
.empty-chart {
  opacity: 0.3;
  filter: blur(2px);
}

.empty-data-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 15, 16, 0.85);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  pointer-events: none;
}

.empty-data-panel {
  padding: 20px 28px;
  background: var(--chart-bg-primary);
  border: 1px solid var(--chart-border-base);
  border-radius: 8px;
  color: var(--chart-text-primary);
  text-align: center;
  max-width: 400px;
  box-shadow: 0 0 30px rgba(56, 189, 248, 0.15);
}

.empty-message {
  font-size: 13px;
  color: #B8B8B8;
  line-height: 1.6;
  margin: 0;
}

/* ============================================
   VIEW MODE TOGGLE BUTTONS
   ============================================ */
.view-mode-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.view-mode-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(135deg, rgba(30, 30, 34, 0.8) 0%, rgba(25, 25, 28, 0.8) 100%);
  color: rgba(229, 229, 229, 0.65);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: fit-content;
  white-space: nowrap;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.view-mode-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  opacity: 0;
  transition: opacity 0.2s;
}

.view-mode-btn:hover {
  background: linear-gradient(135deg, rgba(35, 35, 39, 0.9) 0%, rgba(30, 30, 34, 0.9) 100%);
  color: rgba(229, 229, 229, 0.85);
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.view-mode-btn:hover::before {
  opacity: 1;
}

.view-mode-btn.active {
  border-color: rgba(16, 185, 129, 0.4);
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(5, 150, 105, 0.15) 100%);
  color: #10B981;
  font-weight: 600;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1), 0 4px 12px rgba(16, 185, 129, 0.2);
  transform: translateY(0);
}

.view-mode-btn.active::before {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%);
  opacity: 1;
}

.view-mode-btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

/* ============================================
   ERROR & MESSAGE DISPLAY
   ============================================ */
.msg { 
  margin: 6px 0 0; 
  opacity: 0.85; 
}

.msg.error { 
  color: #ff6b6b !important; 
  font-weight: bold; 
}

/* ============================================
   MOBILE RESPONSIVE (MAX-WIDTH: 768PX)
   ============================================ */
@media (max-width: 768px) {
  .echart {
    height: 230px; /* More square-shaped on mobile (2-column layout ~175px wide each) */
  }

  .expand-hint {
    width: 20px;
    height: 20px;
    font-size: 12px;
    top: 4px;
    right: 4px;
  }

  .echart-modal {
    height: 52vh;
    min-height: 285px;
    max-height: 475px;
  }

  .modal-title {
    font-size: 18px;
    margin: 0 0 1px 0;
  }

  .view-mode-buttons {
    gap: 6px;
    margin-bottom: 12px;
  }

  .view-mode-btn {
    padding: 7px 14px;
    font-size: 12px;
    border-radius: 6px;
  }
}

/* ============================================
   IPHONE 12-16 PORTRAIT (390PX-430PX WIDTH)
   ============================================ */
@media (max-width: 430px) {
  .echart {
    height: 240px; /* Optimized for single column layout on iPhone 12-16 */
  }

  .echart-modal {
    height: 47vh;
    max-height: 428px;
    padding: 16px;
  }
  
  .growth-labels {
    margin-top: 8px !important;
    gap: 6px;
  }
  
  .growth-label {
    padding: 4px 8px !important;
    min-width: 50px !important;
  }

  .view-mode-btn {
    /* Ensure touch targets are at least 44px */
    min-height: 44px;
    padding: 8px 16px;
    font-size: 13px;
  }

  .modal-title {
    font-size: 17px;
  }
}

/* ============================================
   IPHONE 12-16 LANDSCAPE
   ============================================ */
@media (max-height: 430px) and (orientation: landscape) {
  .echart {
    height: 200px; /* Shorter for landscape with 2-column grid */
  }

  .echart-modal {
    height: 62vh;
    max-height: none;
  }

  .view-mode-buttons {
    gap: 4px;
    margin-bottom: 8px;
  }

  .view-mode-btn {
    padding: 6px 12px;
    font-size: 12px;
  }
}
</style>


