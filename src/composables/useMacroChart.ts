/**
 * Macro Chart Composable
 * Manages individual chart state and synchronization logic
 */

import { ref, type Ref } from 'vue'
import type VChart from 'vue-echarts'
import type { TimeRange } from '../types/macro.types'

interface DataZoomAction {
  type: 'dataZoom'
  dataZoomIndex: number
  start: number
  end: number
}

interface EChartsInstanceLike {
  dispatchAction: (action: DataZoomAction) => void
}

interface ChartRefWithInstance {
  chart?: EChartsInstanceLike
}

export interface UseMacroChartOptions {
  id: string
  syncedByDefault?: boolean
}

export interface UseMacroChartReturn {
  chartRef: Ref<InstanceType<typeof VChart> | null>
  isZoomed: Ref<boolean>
  isSynced: Ref<boolean>
  resetZoom: () => void
  toggleSync: () => void
  setZoom: (range: TimeRange) => void
}

/**
 * Composable for managing individual macro chart state
 */
export function useMacroChart(options: UseMacroChartOptions): UseMacroChartReturn {
  const { syncedByDefault = true } = options

  // Reactive state
  const chartRef = ref<InstanceType<typeof VChart> | null>(null)
  const isZoomed = ref(false)
  const isSynced = ref(syncedByDefault)

  /**
   * Reset chart zoom to 100%
   */
  const resetZoom = () => {
    if (!chartRef.value) return

    const instance = (chartRef.value as unknown as ChartRefWithInstance).chart
    if (instance) {
      instance.dispatchAction({
        type: 'dataZoom',
        dataZoomIndex: 0,
        start: 0,
        end: 100
      })
      isZoomed.value = false
    }
  }

  /**
   * Toggle sync state
   */
  const toggleSync = () => {
    isSynced.value = !isSynced.value
  }

  /**
   * Set specific zoom range (used for sync)
   */
  const setZoom = (range: TimeRange) => {
    if (!chartRef.value) return

    const instance = (chartRef.value as unknown as ChartRefWithInstance).chart
    if (instance) {
      instance.dispatchAction({
        type: 'dataZoom',
        dataZoomIndex: 0,
        start: range.start,
        end: range.end
      })
      isZoomed.value = range.start !== 0 || range.end !== 100
    }
  }

  return {
    chartRef,
    isZoomed,
    isSynced,
    resetZoom,
    toggleSync,
    setZoom
  }
}
