// src/composables/useMarketPerformance.ts
// Composable for managing market performance data and heatmap state

import { ref, computed, type Ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import {
  getAllSectorsData,
  fetchSP500Performance,
  type SectorData
} from '../services/market/marketPerformanceService'

export interface HeatmapNode {
  name: string
  value: number // Market cap for sizing
  performance: number // % change for coloring
  children?: HeatmapNode[]
  itemStyle?: {
    color: string
  }
}

interface UseMarketPerformanceOptions {
  enabled?: Ref<boolean>
}

export function useMarketPerformance(options: UseMarketPerformanceOptions = {}) {
  const currentPeriod = ref<string>('1D')
  const isCustomRange = ref(false)
  const customSectorsData = ref<SectorData[]>([])
  const lastUpdate = ref<Date | null>(null)
  const customLoading = ref(false)
  const customError = ref<string | null>(null)

  // Query for Sectors Data
  const {
    data: querySectorsData,
    isLoading: sectorsLoading,
    error: sectorsError,
    refetch: refetchSectors
  } = useQuery({
    queryKey: ['market', 'sectors', currentPeriod],
    queryFn: () => getAllSectorsData(currentPeriod.value),
    enabled: options.enabled ?? ref(true),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1
  })

  // Query for S&P 500 Data
  const {
    data: sp500Data,
    isLoading: sp500Loading,
    error: sp500Error,
    refetch: refetchSP500
  } = useQuery({
    queryKey: ['market', 'sp500', currentPeriod],
    queryFn: () => fetchSP500Performance(currentPeriod.value),
    enabled: options.enabled ?? ref(true),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1
  })

  // Combined Loading State
  const loading = computed(() => {
    if (customLoading.value) return true
    // If showing custom range, we are not loading standard queries
    if (isCustomRange.value) return false
    return sectorsLoading.value || sp500Loading.value
  })

  // Combined Error State
  const error = computed(() => {
    if (customError.value) return customError.value
    if (isCustomRange.value) return null
    if (sectorsError.value) return sectorsError.value instanceof Error ? sectorsError.value.message : 'Failed to fetch sectors'
    if (sp500Error.value) return sp500Error.value instanceof Error ? sp500Error.value.message : 'Failed to fetch S&P 500 data'
    return null
  })

  // Active Sectors Data (Standard vs Custom)
  const sectorsData = computed(() => {
    if (isCustomRange.value) {
      return customSectorsData.value
    }
    return querySectorsData.value || []
  })

  // Update lastUpdate when data changes
  watch([querySectorsData, sp500Data], () => {
    if (!isCustomRange.value && (querySectorsData.value || sp500Data.value)) {
      lastUpdate.value = new Date()
    }
  })

  /**
   * Fetch data (wrapper for refetch or period change)
   */
  async function fetchData(forceRefresh = false, period?: string): Promise<void> {
    if (period && period !== currentPeriod.value) {
      currentPeriod.value = period
      isCustomRange.value = false // Reset custom range when changing period
      // Query will auto-refetch due to key change
    } else if (forceRefresh) {
      isCustomRange.value = false
      await Promise.all([
        refetchSectors(),
        refetchSP500()
      ])
    }
  }

  /**
   * Get color based on performance percentage relative to all sectors
   */
  function getPerformanceColor(performance: number, allPerformances: number[]): string {
    if (allPerformances.length === 0) return '#00594C' // Fallback

    // Sort performances to calculate percentiles
    const sorted = [...allPerformances].sort((a, b) => a - b)
    const len = sorted.length

    // Handle edge case: only 1 sector
    if (len === 1) return performance >= 0 ? '#00755F' : '#A83232'

    // If current performance is negative, use red shades
    if (performance < 0) {
      const negatives = sorted.filter(p => p < 0)
      const negLen = negatives.length

      if (negLen === 1) return '#A83232'

      const negP67 = negatives[Math.floor(negLen * 0.67)] ?? negatives[negLen - 1] ?? 0
      const negP33 = negatives[Math.floor(negLen * 0.33)] ?? negatives[0] ?? 0

      if (performance <= negP33) return '#C62828'  // Worst negatives (strongest red)
      if (performance <= negP67) return '#A83232'  // Moderate negatives (medium red)
      return '#8B4545'  // Slight negatives (muted red)
    }

    // If current performance is positive, use green → grey gradient
    const positives = sorted.filter(p => p >= 0)
    const posLen = positives.length

    if (posLen === 1) return '#00755F'

    const posP83 = positives[Math.floor(posLen * 0.83)] ?? positives[posLen - 1] ?? 0
    const posP67 = positives[Math.floor(posLen * 0.67)] ?? positives[posLen - 1] ?? 0
    const posP33 = positives[Math.floor(posLen * 0.33)] ?? positives[0] ?? 0
    const posP17 = positives[Math.floor(posLen * 0.17)] ?? positives[0] ?? 0

    if (performance >= posP83) return '#00A88E'   // Top performers (bright green)
    if (performance >= posP67) return '#00755F'   // Above average (medium green)
    if (performance >= posP33) return '#00594C'   // Average (dark green)
    if (performance >= posP17) return '#4A4A4A'   // Below average (dark grey)
    return '#3A3A3A'  // Poorest positive (darker grey)
  }

  /**
   * Transform sector data into ECharts treemap format
   */
  const heatmapData = computed<HeatmapNode[]>(() => {
    if (!sectorsData.value.length) return []

    // Extract all performance values for relative coloring
    const allPerformances = sectorsData.value.map(s => s.performance)

    return sectorsData.value.map(sector => ({
      name: sector.sector,
      value: sector.totalMarketCap || 1000000000, // Use market cap for sizing
      performance: sector.performance,
      itemStyle: {
        color: getPerformanceColor(sector.performance, allPerformances)
      }
    }))
  })

  /**
   * Update sectors data with custom range data
   */
  function updateWithCustomRange(customSectors: SectorData[]): void {
    customSectorsData.value = customSectors
    isCustomRange.value = true
    lastUpdate.value = new Date()
  }

  /**
   * Summary statistics
   */
  const summary = computed(() => {
    if (!sectorsData.value.length) {
      return {
        gainers: 0,
        losers: 0,
        avgPerformance: 0,
        bestSector: null as string | null,
        worstSector: null as string | null
      }
    }

    const gainers = sectorsData.value.filter(s => s.performance > 0).length
    const losers = sectorsData.value.filter(s => s.performance < 0).length
    const avgPerformance = sectorsData.value.reduce((sum, s) => sum + s.performance, 0) / sectorsData.value.length

    const sorted = [...sectorsData.value].sort((a, b) => b.performance - a.performance)
    const bestSector = sorted[0]?.sector || null
    const worstSector = sorted[sorted.length - 1]?.sector || null

    return {
      gainers,
      losers,
      avgPerformance,
      bestSector,
      worstSector
    }
  })

  return {
    sectorsData,
    sp500Data,
    loading,
    customLoading,
    error,
    customError,
    lastUpdate,
    currentPeriod,
    isCustomRange,
    heatmapData,
    summary,
    fetchData,
    updateWithCustomRange
  }
}
