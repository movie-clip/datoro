// src/services/ai/insightsService.ts
// Service for loading pre-generated AI insights from static JSON files
// Zero cost, fast CDN delivery, no API calls needed

/**
 * AI insight item structure
 */
export interface InsightItem {
  title: string
  description: string
}

/**
 * Bundle entry for a ticker
 */
interface BundleEntry {
  advantages: InsightItem[]
  risks: InsightItem[]
  updated: string
  provider?: string
  version?: string
}

/**
 * Bundle structure
 */
interface InsightsBundle {
  [ticker: string]: BundleEntry
}

/**
 * Insights response structure
 */
export interface InsightsResponse {
  ticker: string
  insights: {
    competitiveAdvantages: InsightItem[]
    investmentRisks: InsightItem[]
  }
  lastUpdated: string
  provider: string
  version?: string
}

/**
 * API response wrapper structure
 */
export interface InsightsApiResponse {
  data: {
    success: boolean
    data: InsightItem[]
    error: string | null
  } | null
  error: string | null
  cached: boolean
  provider: string
  version?: string
  lastUpdated?: string
}

// In-memory cache for the bundle
let insightsBundle: InsightsBundle | null = null
let bundleLoadPromise: Promise<InsightsBundle> | null = null

/**
 * Load the entire insights bundle (lazy loaded, cached in memory)
 */
async function loadBundle(): Promise<InsightsBundle> {
  if (insightsBundle) {
    return insightsBundle
  }

  if (bundleLoadPromise) {
    return bundleLoadPromise
  }

  bundleLoadPromise = (async () => {
    try {
      const response = await fetch('/ai-insights.json')
      if (!response.ok) {
        throw new Error(`Failed to load bundle: HTTP ${response.status}`)
      }
      insightsBundle = await response.json()
      return insightsBundle!
    } catch (_error) {
      console.error('Error loading insights bundle:', error)
      bundleLoadPromise = null
      throw error
    }
  })()

  return bundleLoadPromise
}

/**
 * Load AI insights for a ticker from the bundle
 * @param ticker - Stock ticker symbol
 * @returns Insights data with competitive advantages and investment risks
 */
export async function getInsights(ticker: string): Promise<InsightsResponse> {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) {
    throw new Error('No ticker provided')
  }

  try {
    const bundle = await loadBundle()

    if (!bundle[t]) {
      throw new Error('NOT_AVAILABLE')
    }

    // Return in same format as individual files
    return {
      ticker: t,
      insights: {
        competitiveAdvantages: bundle[t].advantages,
        investmentRisks: bundle[t].risks
      },
      lastUpdated: bundle[t].updated,
      provider: bundle[t].provider || 'static',
      version: bundle[t].version
    }
  } catch (_error) {
    // Don't log "NOT_AVAILABLE" errors - they're expected
    if ((error as Error).message !== 'NOT_AVAILABLE') {
      console.error(`Error loading insights for ${t}:`, error)
    }
    throw error
  }
}

/**
 * Get competitive advantages for a ticker
 * @param ticker - Stock ticker symbol
 * @param companyName - Company name (not used, kept for API compatibility)
 * @param clearCache - Not used (kept for API compatibility)
 * @returns Result with data and error fields
 */
export async function getCompetitiveAdvantages(
  ticker: string,
  companyName: string | null = null,
  clearCache: boolean = false
): Promise<InsightsApiResponse> {
  try {
    const insights = await getInsights(ticker)

    // Return structured data matching server response format
    return {
      data: {
        success: true,
        data: insights.insights.competitiveAdvantages,
        error: null
      },
      error: null,
      cached: true, // Always from static files
      provider: insights.provider || 'static',
      version: insights.version,
      lastUpdated: insights.lastUpdated
    }
  } catch (_error) {
    // Check if it's a "not available" error
    const isNotAvailable =
      (error as Error).message === 'NOT_AVAILABLE' || (error as Error).message.includes('Unexpected token')

    // For "not available", show a friendly message instead of an error
    if (isNotAvailable) {
      return {
        data: {
          success: false,
          data: [
            {
              title: 'Not Yet Available',
              description: `AI insights are not yet available for ${ticker}`
            }
          ],
          error: null
        },
        error: null, // No error to display - show the friendly message instead
        cached: false,
        provider: 'static'
      }
    }

    // For other errors, return error message
    return {
      data: null,
      error: (error as Error).message || 'Failed to load AI insights',
      cached: false,
      provider: 'static'
    }
  }
}

/**
 * Get investment risks for a ticker
 * @param ticker - Stock ticker symbol
 * @param companyName - Company name (not used, kept for API compatibility)
 * @param clearCache - Not used (kept for API compatibility)
 * @returns Result with data and error fields
 */
export async function getInvestmentRisks(
  ticker: string,
  companyName: string | null = null,
  clearCache: boolean = false
): Promise<InsightsApiResponse> {
  try {
    const insights = await getInsights(ticker)

    // Return structured data matching server response format
    return {
      data: {
        success: true,
        data: insights.insights.investmentRisks,
        error: null
      },
      error: null,
      cached: true, // Always from static files
      provider: insights.provider || 'static',
      version: insights.version,
      lastUpdated: insights.lastUpdated
    }
  } catch (_error) {
    // Check if it's a "not available" error
    const isNotAvailable =
      (error as Error).message === 'NOT_AVAILABLE' || (error as Error).message.includes('Unexpected token')

    // For "not available", show a friendly message instead of an error
    if (isNotAvailable) {
      return {
        data: {
          success: false,
          data: [
            {
              title: 'Not Yet Available',
              description: `AI insights are not yet available for ${ticker}`
            }
          ],
          error: null
        },
        error: null, // No error to display - show the friendly message instead
        cached: false,
        provider: 'static'
      }
    }

    // For other errors, return error message
    return {
      data: null,
      error: (error as Error).message || 'Failed to load AI insights',
      cached: false,
      provider: 'static'
    }
  }
}

/**
 * Check if insights are available for a ticker
 * @param ticker - Stock ticker symbol
 * @returns True if insights file exists
 */
export async function hasInsights(ticker: string): Promise<boolean> {
  try {
    await getInsights(ticker)
    return true
  } catch {
    return false
  }
}
