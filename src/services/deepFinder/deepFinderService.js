// Deep Finder Service
// Fetches and processes stock data to find distance from MA200

import { API_BASE_URL } from '../../utils/apiConfig.js'

// Client-side cache (5 minutes TTL, matching project pattern)
const cache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Generate cache key from tickers array
 */
function getCacheKey(tickers) {
  if (!tickers || tickers.length === 0) {
    return 'deep-finder:default'
  }
  return `deep-finder:${[...tickers].sort().join(',')}`
}

/**
 * Fetch deep finder data from server
 * Returns stocks sorted by distance from MA200
 * 
 * @param {Array<string>} tickers - Array of ticker symbols to analyze
 * @returns {Promise<Object>} Object with stocks array and metadata
 */
export async function fetchDeepFinderData(tickers = []) {
  try {
    // Check client-side cache first
    const cacheKey = getCacheKey(tickers)
    const cached = cache.get(cacheKey)
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.data
    }
    
    // Build URL with query parameters
    let url = `${API_BASE_URL}/api/deep-finder`
    
    // Add tickers as query parameter if provided
    if (tickers && tickers.length > 0) {
      const params = new URLSearchParams()
      params.set('tickers', tickers.join(','))
      url += `?${params.toString()}`
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch deep finder data: ${response.statusText}`)
    }

    const data = await response.json()
    
    // Store in client cache
    cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    })
    
    return data
  } catch (error) {
    console.error('Error fetching deep finder data:', error)
    throw error
  }
}

/**
 * Calculate distance from MA200 as percentage
 * Formula: ((currentPrice - MA200) / MA200) * 100
 * 
 * @param {number} currentPrice - Current stock price
 * @param {number} ma200 - 200-day moving average
 * @returns {number} Percentage distance (positive = above MA, negative = below MA)
 */
export function calculateMA200Distance(currentPrice, ma200) {
  if (!currentPrice || !ma200 || ma200 === 0) {
    return null
  }
  return ((currentPrice - ma200) / ma200) * 100
}

/**
 * Get color based on distance from MA200
 * 
 * @param {number} distance - Distance percentage from MA200
 * @param {number} neutralThreshold - Threshold for neutral range (default 2%)
 * @returns {string} Color code
 */
export function getDistanceColor(distance, neutralThreshold = 2) {
  if (distance === null || distance === undefined) {
    return '#9CA3AF' // Gray
  }
  
  if (Math.abs(distance) <= neutralThreshold) {
    return '#9CA3AF' // Neutral gray
  }
  
  return distance < 0 ? '#ef4444' : '#00C087' // Red for oversold, Green for overbought
}
