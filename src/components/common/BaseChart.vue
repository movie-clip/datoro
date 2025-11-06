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
      <VChart
        ref="modalChartRef"
        v-if="isMounted && hasSeriesData(modalOption)"
        class="echart-modal"
        :option="modalOption"
        :class="{ 'loading-chart': loading }"
        autoresize
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
        autoresize 
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
        @close="closeModal"
      >
        <h2 class="modal-title">
          {{ title }}
        </h2>
        <!-- Show toggle buttons - support both single-select (viewMode) and multi-select (selectedSegments) -->
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
        <VChart
          class="echart-modal"
          :option="modalOption"
          autoresize
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
import { computed, ref, onBeforeUnmount, onMounted } from 'vue'
import VChart from 'vue-echarts'
import type { EChartsOption } from 'echarts'
import ChartModal from './ChartModal.vue'
import SkeletonLoader from './SkeletonLoader.vue'
import GrowthLabels from './GrowthLabels.vue'
import { calculateGrowthRates, formatGrowth as formatGrowthUtil, type GrowthRates } from '../../utils/growthCalculator.js'
import { getCachedGrowthRates } from '../../services/financials/growthService.js'
import { fmtShort, yFormatter } from '../../utils/chartFormatters.js'
import { convertToCategoryData, extractYearsFromSeries, getAllDataPoints } from '../../utils/chartDataTransformers.js'
import { isConfiguredSeries, isMultiSeriesFormat, isConfiguredSeriesArray } from '../../utils/chartTypeGuards.js'
import { getTooltipConfig } from '../../composables/useTooltipFormatter.js'
import { createSeriesConfig, type SeriesDataObject } from '../../utils/chartSeriesFactory.js'
import { createXAxisConfig, createYAxisConfig } from '../../utils/chartAxisFactory.js'
import { useIsMobile } from '../../composables/useIsMobile.js'
import { buildFiscalQuarterMap, formatFiscalQuarter, calculateCalendarQuarter } from '../../utils/fiscalQuarterUtils.js'

// Track if component is mounted AND ECharts is ready
const isMounted = ref(false)
const echartsReady = ref(false)

// Chart instance refs for proper cleanup
const chartRef = ref<InstanceType<typeof VChart> | null>(null)
const modalChartRef = ref<InstanceType<typeof VChart> | null>(null)

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
  if (props.error) return false // Has a real error, not just empty
  if (props.loading) return false // Still loading
  
  // Check if series is empty
  const isEmpty = !props.series || 
    (Array.isArray(props.series) && props.series.length === 0) ||
    (Array.isArray(props.series) && props.series.every((s: any) => 
      !s?.data || (Array.isArray(s.data) && s.data.length === 0)
    ))
  
  return isEmpty
})

// Growth calculation and formatting
// Calculate growth data for the chart
const growthData = computed((): GrowthRates | null => {
  if (!props.showGrowthLabels) return null
  
  // Use custom growth data if provided (e.g., for price chart with 1D/1W/1M)
  if (props.customGrowthData) return props.customGrowthData
  
  // Handle both simple array and multi-series object
  let dataToAnalyze: Array<[number, number]> = []
  
  if (Array.isArray(props.series)) {
    if (props.series.length > 0 && Array.isArray(props.series[0])) {
      // Simple array of [timestamp, value] pairs
      dataToAnalyze = props.series as Array<[number, number]>
    } else if (props.series.length > 0 && (props.series[0] as any)?.data) {
      // Multi-series: use the first series or sum all series
      // For stacked charts, we should sum all series values at each timestamp
      if (props.stacked && props.series.length > 1) {
        // Sum all series values at each timestamp
        const dateMap = new Map<number, number>()
        props.series.forEach((s: any) => {
          if (s.data && Array.isArray(s.data)) {
            s.data.forEach(([date, value]: [number, number]) => {
              dateMap.set(date, (dateMap.get(date) || 0) + value)
            })
          }
        })
        dataToAnalyze = Array.from(dateMap.entries()).sort((a, b) => a[0] - b[0])
      } else {
        // Use first series
        dataToAnalyze = (props.series[0] as any).data || []
      }
    }
  }
  
  if (dataToAnalyze.length < 2) return null
  
  // Use cached calculations when ticker is available (prevents duplicate work with HeroSection)
  if (props.ticker) {
    return getCachedGrowthRates(dataToAnalyze, props.ticker, props.dataType)
  }
  
  // Fallback to direct calculation (backwards compatibility)
  return calculateGrowthRates(dataToAnalyze)
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

// Memoized category data calculation (computed once, used by both compact & modal)
interface CategoryDataCache {
  uniqueYears: number | null
  yearsList: number[]
  categoryData: string[]
  timestamps: number[]
}

const categoryDataCache = computed<CategoryDataCache>(() => {
  let uniqueYears: number | null = null
  let yearsList: number[] = []
  let categoryData: string[] = []
  let timestamps: number[] = []
  
  if (props.kind === 'bar') {
    // Always use full series for category calculation (consistent for both views)
    const dataSource = props.series
    
    if (Array.isArray(dataSource)) {
      const allDataPoints = getAllDataPoints(dataSource as any)
      
      if (allDataPoints.length > 0) {
        if (props.timeframe === 'quarterly') {
          const uniqueTimestamps = [...new Set(allDataPoints.map(point => point[0]))].sort((a, b) => a - b)
          
          const firstPoint = allDataPoints.find(p => p && p.length > 0)
          const hasFiscalQuarters = firstPoint && firstPoint.length === 4
          
          if (hasFiscalQuarters) {
            // O(1) Map lookup instead of O(n) find() - OPTIMIZED!
            // Use fiscal quarter utilities for consistent handling
            const fiscalQuarterMap = buildFiscalQuarterMap(allDataPoints)
            
            const timestampQuarterPairs = uniqueTimestamps.map(ts => {
              const fiscalInfo = fiscalQuarterMap.get(ts)
              const label = fiscalInfo 
                ? formatFiscalQuarter(fiscalInfo.period, fiscalInfo.year)
                : ''
              return { ts, label }
            })
            
            timestamps = timestampQuarterPairs.map(item => item.ts)
            categoryData = timestampQuarterPairs.map(item => item.label)
            uniqueYears = timestamps.length
          } else {
            // Fallback to calendar quarter calculation using utility
            const timestampQuarterPairs = uniqueTimestamps.map(ts => {
              const label = calculateCalendarQuarter(ts)
              return { ts, label }
            })
            
            timestamps = timestampQuarterPairs.map(item => item.ts)
            categoryData = timestampQuarterPairs.map(item => item.label)
            uniqueYears = timestamps.length
          }
        } else {
          yearsList = extractYearsFromSeries(allDataPoints)
          uniqueYears = yearsList.length
          categoryData = yearsList.map(y => String(y))
        }
      }
    }
  }
  
  return { uniqueYears, yearsList, categoryData, timestamps }
})

const createOption = (isLarge = false): EChartsOption => {
  // Use compactSeries for compact view if provided, otherwise use series
  const dataSource = !isLarge && props.compactSeries ? props.compactSeries : props.series
  
  // Get cached category data (computed once for both compact & modal)
  const { uniqueYears, yearsList, categoryData, timestamps } = categoryDataCache.value
  
  // In modal view with useLegend, show legend at top
  const showLegendAtTop = isLarge && props.useLegend
  // Increased top padding on mobile modal (50 instead of 30) for toggle buttons
  const topPadding = showLegendAtTop ? 60 : (isLarge ? (isMobile.value ? 50 : 30) : 45)
  // Add extra bottom padding if showLegend is enabled (for multi-series charts)
  const bottomPadding = isLarge ? 60 : props.showLegend ? (isMobile.value ? 15 : 55) : (isMobile.value ? 15 : 50)
  
  // Build legend selection: only first series (typically 'Total Revenue') selected by default
  // Apply this whenever useLegend is true, not just in modal view
  const legendSelected: Record<string, boolean> = {}
  if (props.useLegend && Array.isArray(props.series) && props.series.length > 0 && (props.series[0] as any)?.name) {
    props.series.forEach((s: any, idx: number) => {
      legendSelected[s.name] = idx === 0 // Only first item selected
    })
  }
  
  const base: unknown = {
    backgroundColor: 'transparent',
    // Performance optimizations for smooth interactions
    useUTC: false, // Use local time for faster date processing
    animation: props.enableZoom ? { // Conditional animation for zoom-enabled charts
      duration: 300, // Quick animations
      easing: 'cubicOut'
    } : true, // Default animations for other charts
    // Smooth animations when data updates (Y-axis scale changes)
    animationDuration: 400,
    animationEasing: 'cubicOut',
    animationDurationUpdate: 400, // Animate Y-axis scale changes when data updates
    animationEasingUpdate: 'cubicInOut',
    // Only show title in non-modal view (in modal, it's shown as HTML element)
    title: isLarge ? undefined : {
      text: props.title, 
      left: 'center',
      top: 0,
      textStyle: { color: '#fff', fontSize: 14 } 
    },
    // Add dataZoom for interactive zooming and panning (for line charts when enabled or in modal view)
    // Only use 'inside' type (mouse wheel + drag) without visible slider
    // Optimized for smooth performance with large datasets
    dataZoom: props.kind === 'line' && (isLarge || props.enableZoom) ? [
      {
        type: 'inside', // Mouse wheel zoom + drag to pan
        start: 0,
        end: 100,
        zoomOnMouseWheel: true, // Zoom with mouse wheel
        moveOnMouseMove: true, // Pan by dragging
        moveOnMouseWheel: false, // Don't pan with wheel (only zoom)
        preventDefaultMouseMove: false, // Allow default mouse behavior
        throttle: 50, // Throttle updates for smoother interaction (50ms is optimal)
        zoomLock: false, // Allow zooming
        minSpan: 1, // Minimum zoom span (1% = can zoom in very close)
        maxSpan: 100 // Maximum zoom span (100% = can see all data)
      }
    ] : undefined,
    // Toolbox removed - cleaner UI without top-right buttons
    // Legend configuration
    legend: showLegendAtTop ? {
      // Modal view with useLegend (single-select)
      show: true,
      type: 'plain',
      orient: 'horizontal',
      top: 10,
      left: 'center',
      textStyle: { color: '#ddd', fontSize: 12 },
      selectedMode: 'single',
      selected: legendSelected
    } : props.showLegend ? {
      // Multi-series legend (all items shown at once, e.g., EPS chart)
      show: true,
      type: 'plain',
      orient: 'horizontal',
      bottom: 5,
      left: 'center',
      textStyle: { color: '#ddd', fontSize: isMobile.value ? 11 : 12 },
      selectedMode: 'multiple', // Allow toggling individual series
      itemGap: isMobile.value ? 8 : 12
    } : props.useLegend ? {
      // Compact view with useLegend - hide legend but apply selection
      show: false,
      selected: legendSelected
    } : { 
      // No legend
      show: false 
    },
    grid: { 
      left: isMobile.value ? 12 : 24, 
      right: isMobile.value ? 12 : 24, 
      top: topPadding, 
      bottom: bottomPadding
    },
    tooltip: getTooltipConfig({
      isLarge,
      isMobile: isMobile.value,
      kind: props.kind,
      dualAxis: props.dualAxis,
      yFormat: props.yFormat
    }),
    xAxis: createXAxisConfig(props.kind, {
      categoryData,
      isLarge,
      isMobile: isMobile.value,
      isQuarterly: props.timeframe === 'quarterly'
    }),
    yAxis: createYAxisConfig({
      dualAxis: props.dualAxis,
      yFormat: props.yFormat,
      rightAxisType: props.rightAxisType as any,
      isLarge,
      isMobile: isMobile.value,
      chartTitle: props.title
    }),
  }

  // Handle both single series array and multi-series array
  const series = createSeriesConfig(
    dataSource as [number, number][] | [number, number, string, string][] | SeriesDataObject[] | Record<string, unknown>, 
    props.kind, 
    {
      title: props.title,
      yearsList: props.timeframe === 'quarterly' ? timestamps : yearsList,
      barMaxWidth: props.barMaxWidth,
      smooth: props.smooth as any,
      isLarge
    }
  )

  // Don't show legend - we have view mode buttons for switching
  if (!base || !series) {
    return {} as EChartsOption
  }
  return { ...base, series } as EChartsOption
}

// Optimized: Compute compact option (always needed for initial render)
const option = computed(() => createOption(false))

// Optimized: Only compute modal option when actually needed (modal open or forceExpanded)
const modalOption = computed(() => {
  if (props.forceExpanded || showModal.value) {
    return createOption(true)
  }
  // Return compact option as fallback (avoids unnecessary computation)
  return option.value
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
  background: rgba(15, 15, 16, 0.6);
  border: 1px solid #2A2A2E;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
  color: rgba(229, 229, 229, 0.6);
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(4px);
  z-index: 10;
  padding: 0;
}

.expand-hint:hover {
  background: rgba(15, 15, 16, 0.9);
  border-color: #00594C;
  color: #E5E5E5;
  transform: scale(1.1);
  box-shadow: 0 0 12px rgba(0, 89, 76, 0.4);
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
  height: 70vh;
  min-height: 500px;
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
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border: 1px solid #2A2A2E;
  border-radius: 6px;
  color: #E5E5E5;
  font-size: 14px;
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
  background: linear-gradient(135deg, #151518 0%, #1E1E22 100%);
  border: 1px solid #2A2A2E;
  border-radius: 8px;
  color: #E5E5E5;
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
   MODAL ELEMENTS
   ============================================ */
.modal-title {
  text-align: center;
  color: #E5E5E5;
  font-size: 22px;
  font-weight: 600;
  margin: 0 0 8px 0;
  padding: 0;
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
  transform: translateY(-1px);
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
    height: 55vh;
    min-height: 300px;
    max-height: 500px;
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
    height: 50vh;
    max-height: 450px;
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
    height: 65vh;
    max-height: none;
  }

  .modal-title {
    font-size: 15px;
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


