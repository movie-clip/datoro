// Service for loading pre-generated AI insights from static JSON files
// Zero cost, fast CDN delivery, no API calls needed

// In-memory cache for the bundle
let insightsBundle = null
let bundleLoadPromise = null

/**
 * Load the entire insights bundle (lazy loaded, cached in memory)
 */
async function loadBundle() {
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
      return insightsBundle
    } catch (error) {
      console.error('Error loading insights bundle:', error)
      bundleLoadPromise = null
      throw error
    }
  })()
  
  return bundleLoadPromise
}

/**
 * Load AI insights for a ticker from the bundle
 * @param {string} ticker - Stock ticker symbol
 * @returns {Promise<Object>} Insights data with competitive advantages and investment risks
 */
export async function getInsights(ticker) {
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
      provider: bundle[t].provider || 'static'
    }
  } catch (error) {
    console.error(`Error loading insights for ${t}:`, error)
    throw error
  }
}

/**
 * Get competitive advantages for a ticker
 * @param {string} ticker - Stock ticker symbol
 * @param {string} companyName - Company name (not used, kept for API compatibility)
 * @param {boolean} clearCache - Not used (kept for API compatibility)
 * @returns {Promise<Object>} Result with data and error fields
 */
export async function getCompetitiveAdvantages(ticker, companyName = null, clearCache = false) {
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
  } catch (error) {
    // Check if it's a "not available" error
    const isNotAvailable = error.message === 'NOT_AVAILABLE' || error.message.includes('Unexpected token')
    
    return {
      data: {
        success: false,
        data: [{ 
          title: 'Feature Temporarily Unavailable', 
          description: 'AI insights are currently being generated for this company. Please check back soon or try another ticker.'
        }],
        error: isNotAvailable ? 'AI insights not yet available for this ticker' : error.message
      },
      error: isNotAvailable ? null : error.message,
      cached: false,
      provider: 'static'
    }
  }
}

/**
 * Get investment risks for a ticker
 * @param {string} ticker - Stock ticker symbol
 * @param {string} companyName - Company name (not used, kept for API compatibility)
 * @param {boolean} clearCache - Not used (kept for API compatibility)
 * @returns {Promise<Object>} Result with data and error fields
 */
export async function getInvestmentRisks(ticker, companyName = null, clearCache = false) {
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
  } catch (error) {
    // Check if it's a "not available" error
    const isNotAvailable = error.message === 'NOT_AVAILABLE' || error.message.includes('Unexpected token')
    
    return {
      data: {
        success: false,
        data: [{ 
          title: 'Feature Temporarily Unavailable', 
          description: 'AI insights are currently being generated for this company. Please check back soon or try another ticker.'
        }],
        error: isNotAvailable ? 'AI insights not yet available for this ticker' : error.message
      },
      error: isNotAvailable ? null : error.message,
      cached: false,
      provider: 'static'
    }
  }
}

/**
 * Check if insights are available for a ticker
 * @param {string} ticker - Stock ticker symbol
 * @returns {Promise<boolean>} True if insights file exists
 */
export async function hasInsights(ticker) {
  try {
    await getInsights(ticker)
    return true
  } catch {
    return false
  }
}
