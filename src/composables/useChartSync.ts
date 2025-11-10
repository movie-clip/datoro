/**
 * Chart Synchronization Composable
 * Manages synchronized zooming across multiple charts
 */

import { ref, type Ref } from 'vue'
import type { TimeRange } from '../types/macro.types'
import type { UseMacroChartReturn } from './useMacroChart'

export interface UseChartSyncReturn {
  syncedTimeRange: Ref<TimeRange>
  isSyncing: Ref<boolean>
  setupChartSync: (charts: UseMacroChartReturn[], chartIndex: number) => void
}

/**
 * Get the actual data range from a chart instance
 */
function getChartDataRange(chartInstance: any): { min: number; max: number } | null {
  try {
    const option = chartInstance.getOption()
    const series = option.series?.[0]
    
    if (!series || !series.data || series.data.length === 0) {
      return null
    }
    
    const timestamps = series.data.map((point: any) => point[0])
    return {
      min: Math.min(...timestamps),
      max: Math.max(...timestamps)
    }
  } catch (e) {
    return null
  }
}

/**
 * Convert percentage range to timestamp range
 */
function percentToTimestamp(percent: number, min: number, max: number): number {
  return min + (max - min) * (percent / 100)
}

/**
 * Convert timestamp to percentage range
 */
function timestampToPercent(timestamp: number, min: number, max: number): number {
  if (max === min) return 0
  return ((timestamp - min) / (max - min)) * 100
}

/**
 * Find the nearest available time range for a chart
 */
function findNearestTimeRange(
  targetStart: number,
  targetEnd: number,
  chartDataRange: { min: number; max: number }
): TimeRange {
  const { min, max } = chartDataRange
  
  // If the target range is completely outside the data range, use full range
  if (targetEnd < min || targetStart > max) {
    return { start: 0, end: 100 }
  }
  
  // Clamp the target range to available data
  const clampedStart = Math.max(targetStart, min)
  const clampedEnd = Math.min(targetEnd, max)
  
  // Convert back to percentage
  return {
    start: timestampToPercent(clampedStart, min, max),
    end: timestampToPercent(clampedEnd, min, max)
  }
}

/**
 * Composable for managing chart synchronization
 */
export function useChartSync(): UseChartSyncReturn {
  const syncedTimeRange = ref<TimeRange>({ start: 0, end: 100 })
  const isSyncing = ref(false)

  /**
   * Setup dataZoom event listener for a specific chart
   */
  const setupChartSync = (charts: UseMacroChartReturn[], sourceIndex: number) => {
    const sourceChart = charts[sourceIndex]
    
    if (!sourceChart || !sourceChart.chartRef.value) {
      return
    }

    const instance = (sourceChart.chartRef.value as any).chart
    if (!instance) {
      return
    }

    // Listen for dataZoom events (this is the correct ECharts event name)
    instance.on('datazoom', (params: any) => {
      // Prevent infinite loops
      if (isSyncing.value) {
        return
      }

      const { start, end } = params.batch?.[0] || params

      // Update source chart zoom state
      sourceChart.isZoomed.value = start !== 0 || end !== 100

      // Only sync if source chart has sync enabled
      if (!sourceChart.isSynced.value) {
        return
      }

      // Begin sync operation
      isSyncing.value = true
      syncedTimeRange.value = { start, end }

      // Get source chart's data range
      const sourceDataRange = getChartDataRange(instance)
      
      if (!sourceDataRange) {
        // If we can't get source data range, fall back to simple percentage sync
        charts.forEach((targetChart, targetIndex) => {
          if (targetIndex === sourceIndex) return
          if (!targetChart.isSynced.value) return
          targetChart.setZoom({ start, end })
        })
      } else {
        // Convert percentage to actual timestamps
        const targetStartTimestamp = percentToTimestamp(start, sourceDataRange.min, sourceDataRange.max)
        const targetEndTimestamp = percentToTimestamp(end, sourceDataRange.min, sourceDataRange.max)

        // Propagate to all other synced charts with intelligent range matching
        charts.forEach((targetChart, targetIndex) => {
          if (targetIndex === sourceIndex) return // Skip self
          if (!targetChart.isSynced.value) return // Skip unsynced charts

          const targetInstance = (targetChart.chartRef.value as any)?.chart
          if (!targetInstance) return

          // Get target chart's data range
          const targetDataRange = getChartDataRange(targetInstance)
          
          if (!targetDataRange) {
            // No data, use full range
            targetChart.setZoom({ start: 0, end: 100 })
            return
          }

          // Find the nearest available range in the target chart
          const nearestRange = findNearestTimeRange(
            targetStartTimestamp,
            targetEndTimestamp,
            targetDataRange
          )

          targetChart.setZoom(nearestRange)
        })
      }

      // Reset sync flag after a brief delay
      setTimeout(() => {
        isSyncing.value = false
      }, 50)
    })
  }

  return {
    syncedTimeRange,
    isSyncing,
    setupChartSync
  }
}
