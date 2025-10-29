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
    
    if (!sourceChart || !sourceChart.chartRef.value) return

    const instance = (sourceChart.chartRef.value as any).chart
    if (!instance) return

    // Listen for dataZoom events
    instance.on('dataZoom', (params: any) => {
      // Prevent infinite loops
      if (isSyncing.value) return

      const { start, end } = params.batch?.[0] || params

      // Update source chart zoom state
      sourceChart.isZoomed.value = start !== 0 || end !== 100

      // Only sync if source chart has sync enabled
      if (!sourceChart.isSynced.value) return

      // Begin sync operation
      isSyncing.value = true
      syncedTimeRange.value = { start, end }

      // Propagate to all other synced charts
      charts.forEach((targetChart, targetIndex) => {
        if (targetIndex === sourceIndex) return // Skip self
        if (!targetChart.isSynced.value) return // Skip unsynced charts

        targetChart.setZoom({ start, end })
      })

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
