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
        throw new Error(`No AI insights available for ${t}. Insights are only available for S&P 500 companies.`)
      }
      throw new Error(`Failed to load insights: HTTP ${response.status}`)
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
    return {
      data: {
        success: false,
        data: [{ 
          title: 'Not Available', 
          description: error.message 
        }],
        error: error.message
      },
      error: error.message,
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
    return {
      data: {
        success: false,
        data: [{ 
          title: 'Not Available', 
          description: error.message 
        }],
        error: error.message
      },
      error: error.message,
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
