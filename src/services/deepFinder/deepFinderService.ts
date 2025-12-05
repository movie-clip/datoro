// src/services/deepFinder/deepFinderService.ts
// Deep Finder Service
// Fetches and processes stock data to find distance from MA200

import { API_BASE_URL } from '../../utils/apiConfig'

/**
 * Stock analysis result from deep finder
 */
export interface DeepFinderStock {
  ticker: string
  currentPrice: number
  ma200: number
  distance: number
  [key: string]: any
}

/**
 * Deep finder response structure
 */
export interface DeepFinderResponse {
  stocks: DeepFinderStock[]
  timestamp?: number
  source?: string
  [key: string]: any
}

/**
 * Fetch deep finder data from server
 * Returns stocks sorted by distance from MA200
 *
 * @param tickers - Array of ticker symbols to analyze
 * @returns Object with stocks array and metadata
 */
export async function fetchDeepFinderData(tickers: string[] = []): Promise<DeepFinderResponse> {
  try {
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

    return await response.json()
  } catch (error) {
    console.error('Error fetching deep finder data:', error)
    throw error
  }
}

/**
 * Calculate distance from MA200 as percentage
 * Formula: ((currentPrice - MA200) / MA200) * 100
 *
 * @param currentPrice - Current stock price
 * @param ma200 - 200-day moving average
 * @returns Percentage distance (positive = above MA, negative = below MA)
 */
export function calculateMA200Distance(currentPrice: number, ma200: number): number | null {
  if (!currentPrice || !ma200 || ma200 === 0) {
    return null
  }
  return ((currentPrice - ma200) / ma200) * 100
}

/**
 * Get color based on distance from MA200
 *
 * @param distance - Distance percentage from MA200
 * @param neutralThreshold - Threshold for neutral range (default 2%)
 * @returns Color code
 */
export function getDistanceColor(distance: number | null, neutralThreshold: number = 2): string {
  if (distance === null || distance === undefined) {
    return '#9CA3AF' // Gray
  }

  if (Math.abs(distance) <= neutralThreshold) {
    return '#9CA3AF' // Neutral gray
  }

  return distance < 0 ? '#ef4444' : '#00C087' // Red for oversold, Green for overbought
}
