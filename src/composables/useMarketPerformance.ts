// src/composables/useMarketPerformance.ts
// Composable for managing market performance data and heatmap state

import { ref, computed, type Ref } from 'vue'
import { 
  getAllSectorsData, 
  fetchSP500Performance,
  clearCache, 
  type SectorData,
  type SP500Performance 
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

export function useMarketPerformance() {
  const sectorsData = ref<SectorData[]>([])
  const sp500Data = ref<SP500Performance | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastUpdate = ref<Date | null>(null)
  const currentPeriod = ref<string>('1D')
  const isCustomRange = ref(false) // Track if showing custom range data

  /**
   * Fetch sector performance data and S&P 500 data
   * @param forceRefresh Force refresh (clear cache)
   * @param period Time period to fetch (defaults to currentPeriod)
   */
  async function fetchData(forceRefresh = false, period?: string): Promise<void> {
    if (forceRefresh) {
      clearCache()
    }

    const fetchPeriod = period || currentPeriod.value
    currentPeriod.value = fetchPeriod

    console.log(`[Market Performance] Fetching data for period: ${fetchPeriod}`)

    loading.value = true
    error.value = null

    try {
      // Fetch both sectors and S&P 500 in parallel
      const [sectorsResult, sp500Result] = await Promise.all([
        getAllSectorsData(fetchPeriod),
        fetchSP500Performance(fetchPeriod)
      ])
      
      console.log(`[Market Performance] Received ${sectorsResult.length} sectors:`, sectorsResult.slice(0, 2))
      console.log(`[Market Performance] Received S&P 500 data:`, sp500Result)
      
      sectorsData.value = sectorsResult
      sp500Data.value = sp500Result
      lastUpdate.value = new Date()
      isCustomRange.value = false // Reset custom range flag
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch market data'
      console.error('Error fetching market performance:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Get color based on performance percentage relative to all sectors
   * Uses dynamic thresholds based on data distribution (percentiles)
   * This ensures color differentiation regardless of time window
   * 
   * Color logic:
   * - Positive performance: Green shades (best) → Grey (worst positive)
   * - Negative performance: Red shades (worst negative)
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
   * Single-level structure: Just sectors (simpler, like Finviz)
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
   * This allows updating the heatmap with custom date range selections
   */
  function updateWithCustomRange(customSectors: SectorData[]): void {
    sectorsData.value = customSectors
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
    error,
    lastUpdate,
    currentPeriod,
    isCustomRange,
    heatmapData,
    summary,
    fetchData,
    updateWithCustomRange
  }
}
