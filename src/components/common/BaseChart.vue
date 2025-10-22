<template>
  <div class="chart-wrapper">
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
        v-if="isMounted && modalOption.series?.length"
        class="echart-modal"
        :option="modalOption"
        :class="{ 'loading-chart': loading }"
        autoresize
      />
      <div
        v-if="loading && modalOption.series?.length"
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
        v-if="loading && !option.series?.length"
        variant="chart"
      />
      <VChart 
        v-else-if="isMounted && (option.series?.length || hasEmptyData)"
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
        v-if="loading && option.series?.length"
        class="chart-loading-overlay"
      >
        <div class="loading-spinner">
          Updating...
        </div>
      </div>
      <div
        v-if="!isModal && !loading"
        class="expand-hint"
        title="Click to expand"
        @click="handleClick"
      >
        ⛶
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

<script setup>
import { computed, ref, onBeforeUnmount, onMounted } from 'vue'
import VChart from 'vue-echarts'
import ChartModal from './ChartModal.vue'
import SkeletonLoader from './SkeletonLoader.vue'
import GrowthLabels from './GrowthLabels.vue'
import { calculateGrowthRates, formatGrowth as formatGrowthUtil } from '../../utils/growthCalculator.js'
import { getCachedGrowthRates } from '../../services/financials/growthService.js'
import { fmtShort, yFormatter } from '../../utils/chartFormatters.js'
import { convertToCategoryData, extractYearsFromSeries, getAllDataPoints } from '../../utils/chartDataTransformers.js'
import { isConfiguredSeries, isMultiSeriesFormat, isConfiguredSeriesArray } from '../../utils/chartTypeGuards.js'
import { getTooltipConfig } from '../../composables/useTooltipFormatter.js'
import { createSeriesConfig } from '../../utils/chartSeriesFactory.js'
import { createXAxisConfig, createYAxisConfig } from '../../utils/chartAxisFactory.js'
import { useIsMobile } from '../../composables/useIsMobile.js'

// Track if component is mounted AND ECharts is ready
const isMounted = ref(false)
const echartsReady = ref(false)

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
})

const props = defineProps({
  title:      { type: String, default: '' },
  series:     { type: [Array, Object], default: () => [] },
  compactSeries: { type: [Array, Object], default: null },
  kind:       { type: String, default: 'line' },
  yFormat:    { type: String, default: 'int' },
  smooth:     { type: Number, default: 0.15 },
  barMaxWidth:{ type: Number, default: 28 },
  isModal:    { type: Boolean, default: false },
  forceExpanded: { type: Boolean, default: false }, // Show expanded version directly (for table modals)
  viewMode:   { type: String, default: null },
  selectedSegments: { type: Array, default: null },
  viewModeOptions: { type: Array, default: () => [] },
  loading:    { type: Boolean, default: false },
  showLegend: { type: Boolean, default: false },
  stacked:    { type: Boolean, default: false },
  useLegend:  { type: Boolean, default: false },
  dualAxis:   { type: Boolean, default: false },
  rightAxisType: { type: String, default: 'symmetric' }, // 'symmetric' (for insider trading) or 'percentage' (for margins)
  showGrowthLabels: { type: Boolean, default: false },
  invertGrowth: { type: Boolean, default: false }, // For expenses: decreases are positive
  ticker: { type: String, default: null }, // For cached growth calculations
  dataType: { type: String, default: 'generic' }, // Data type for cache key (e.g., 'revenue', 'netIncome')
  error:      { type: String, default: null },
  message:    { type: String, default: null },
  emptyDataMessage: { type: String, default: null }, // Friendly message when data is legitimately empty (not an error)
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

// Computed property to check if data is empty (but valid, not an error)
const hasEmptyData = computed(() => {
  if (!props.emptyDataMessage) return false
  if (props.error) return false // Has a real error, not just empty
  if (props.loading) return false // Still loading
  
  // Check if series is empty
  const isEmpty = !props.series || 
    (Array.isArray(props.series) && props.series.length === 0) ||
    (Array.isArray(props.series) && props.series.every(s => 
      !s?.data || (Array.isArray(s.data) && s.data.length === 0)
    ))
  
  return isEmpty
})

// Growth calculation and formatting
// Calculate growth data for the chart
const growthData = computed(() => {
  if (!props.showGrowthLabels) return null
  
  // Handle both simple array and multi-series object
  let dataToAnalyze = []
  
  if (Array.isArray(props.series)) {
    if (props.series.length > 0 && Array.isArray(props.series[0])) {
      // Simple array of [timestamp, value] pairs
      dataToAnalyze = props.series
    } else if (props.series.length > 0 && props.series[0]?.data) {
      // Multi-series: use the first series or sum all series
      // For stacked charts, we should sum all series values at each timestamp
      if (props.stacked && props.series.length > 1) {
        // Sum all series values at each timestamp
        const dateMap = new Map()
        props.series.forEach(s => {
          if (s.data && Array.isArray(s.data)) {
            s.data.forEach(([date, value]) => {
              dateMap.set(date, (dateMap.get(date) || 0) + value)
            })
          }
        })
        dataToAnalyze = Array.from(dateMap.entries()).sort((a, b) => a[0] - b[0])
      } else {
        // Use first series
        dataToAnalyze = props.series[0].data || []
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
const formatGrowth = (growth) => {
  // Don't invert the actual number - show the real growth percentage
  // The inversion only affects the CSS class (color)
  return formatGrowthUtil(growth)
}

// Use reactive mobile detection composable
const { isMobile } = useIsMobile()

const createOption = (isLarge = false) => {
  // For bar charts, extract years and create category axis
  // For line charts, use time axis
  let uniqueYears = null
  let yearsList = []
  let categoryData = []
  
  // Use compactSeries for compact view if provided, otherwise use series
  const dataSource = !isLarge && props.compactSeries ? props.compactSeries : props.series
  
  if (props.kind === 'bar') {
    // Get all data points from series using utility function
    const allDataPoints = getAllDataPoints(dataSource)
    
    // Extract unique years and sort using utility function
    if (allDataPoints.length > 0) {
      yearsList = extractYearsFromSeries(allDataPoints)
      uniqueYears = yearsList.length
      
      // For bar charts, create category data (year strings)
      categoryData = yearsList.map(y => String(y))
    }
  }
  
  // In modal view with useLegend, show legend at top
  const showLegendAtTop = isLarge && props.useLegend
  // Increased top padding on mobile modal (50 instead of 30) for toggle buttons
  const topPadding = showLegendAtTop ? 60 : (isLarge ? (isMobile.value ? 50 : 30) : 45)
  // Add extra bottom padding if showLegend is enabled (for multi-series charts)
  const bottomPadding = isLarge ? 60 : props.showLegend ? (isMobile.value ? 15 : 55) : (isMobile.value ? 15 : 50)
  
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
      isMobile: isMobile.value
    }),
    yAxis: createYAxisConfig({
      dualAxis: props.dualAxis,
      yFormat: props.yFormat,
      rightAxisType: props.rightAxisType,
      isLarge,
      isMobile: isMobile.value
    }),
  }

  // Handle both single series array and multi-series array
  const series = createSeriesConfig(dataSource, props.kind, {
    title: props.title,
    yearsList,
    barMaxWidth: props.barMaxWidth,
    smooth: props.smooth,
    isLarge
  })

  // Don't show legend - we have view mode buttons for switching
  return { ...base, series }
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
.chart-wrapper {
  position: relative;
}

.echart {
  width: 100%; 
  height: 340px;
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
  width: 24px;
  height: 24px;
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

.echart-modal {
  width: 100%;
  height: 70vh;
  min-height: 500px;
}

.modal-title {
  text-align: center;
  color: #E5E5E5;
  font-size: 22px;
  font-weight: 600;
  margin: 0 0 16px 0;
  padding: 0;
}

.view-mode-buttons {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  justify-content: center;
}

.view-mode-btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(42, 42, 42, 0.5);
  color: rgba(229, 229, 229, 0.7);
  cursor: pointer;
  font-size: 12px;
  font-weight: 400;
  transition: all 0.15s;
  min-width: fit-content;
  white-space: nowrap;
}

.view-mode-btn:hover {
  background: rgba(42, 42, 42, 0.8);
  color: rgba(229, 229, 229, 0.9);
  border-color: rgba(255, 255, 255, 0.15);
}

.view-mode-btn.active {
  border-color: rgba(0, 89, 76, 0.4);
  background: rgba(0, 89, 76, 0.2);
  color: #E5E5E5;
  font-weight: 500;
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

.loading-chart {
  opacity: 0.5;
}

.empty-chart {
  opacity: 0.3;
  filter: blur(2px);
}

/* Empty data overlay (matches loading overlay style) */
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

/* Mobile responsive styles */
@media (max-width: 768px) {
  /* Make charts more square-shaped on mobile (2-column layout ~175px wide each) */
  .echart {
    height: 230px;
  }

  /* Smaller expand hint on mobile */
  .expand-hint {
    width: 20px;
    height: 20px;
    font-size: 12px;
    top: 4px;
    right: 4px;
  }

  /* Modal - smaller on mobile, not full screen */
  .echart-modal {
    height: 55vh;
    min-height: 300px;
    max-height: 500px;
  }

  .modal-title {
    font-size: 18px;
    margin: 0 0 1px 0;
  }

  /* Stack view mode buttons on very small screens */
  /* .view-mode-buttons {
    flex-wrap: wrap;
    gap: 6px;
  } */

  .view-mode-btn {
    padding: 6px 12px;
    font-size: 13px;
  }
}

/* iPhone 13 / iPhone 14 (390px width) specific styles */
@media (max-width: 414px) and (min-width: 375px) {
  /* Slightly smaller modal for iPhone 13 */
  .echart-modal {
    height: 50vh;
    max-height: 450px;
  }
  
  /* Growth labels closer to chart */
  .growth-labels {
    margin-top: 8px !important;
    gap: 6px;
  }
  
  .growth-label {
    padding: 4px 8px !important;
    min-width: 50px !important;
  }
}

/* Very small phones */
@media (max-width: 400px) {
  .echart {
    height: 230px; /* More square on smaller screens */
  }

  .modal-title {
    font-size: 16px;
  }

  .view-mode-btn {
    padding: 5px 10px;
    font-size: 12px;
  }
}

/* Landscape orientation - more square for 3-column layout */
@media (max-width: 768px) and (orientation: landscape) {
  .echart {
    height: 240px; /* Square-ish for 3 columns (~260px wide each on 844px screen) */
  }

  .modal-title {
    font-size: 16px;
  }
}

/* Error and message styles */
.msg { 
  margin: 6px 0 0; 
  opacity: 0.85; 
}

.msg.error { 
  color: #ff6b6b !important; 
  font-weight: bold; 
}
</style>

