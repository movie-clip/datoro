// Service for loading pre-generated AI insights from static JSON files
// Zero cost, fast CDN delivery, no API calls needed

/**
 * Load AI insights from static JSON file
 * @param {string} ticker - Stock ticker symbol
 * @returns {Promise<Object>} Insights data with competitive advantages and investment risks
 */
export async function getInsights(ticker) {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) {
    throw new Error('No ticker provided')
  }

  try {
    const response = await fetch(`/ai-insights/${t.toLowerCase()}.json`)
    
    if (!response.ok) {
      if (response.status === 404) {
        // File doesn't exist - return graceful error
        throw new Error('NOT_AVAILABLE')
      }
      throw new Error(`Failed to load insights: HTTP ${response.status}`)
    }

    // Check if response is JSON (not HTML error page)
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('NOT_AVAILABLE')
    }

    const data = await response.json()
    console.log(`✓ Loaded AI insights for ${t} from static file`)
    
    return data
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
