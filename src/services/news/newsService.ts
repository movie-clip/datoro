// src/services/news/newsService.ts
// Service for fetching stock news from FMP API

import type { FMPNewsItem } from '../../types/fmp.types'
import { API_BASE_URL } from '../../utils/apiConfig'

export interface NewsResponse {
  success: boolean
  data: FMPNewsItem[]
  error?: string
}

/**
 * Fetch latest news for a specific ticker
 * @param ticker - Stock ticker symbol (e.g., 'AAPL')
 * @param limit - Number of news items to fetch (default: 5)
 * @returns Promise with news data
 */
export async function fetchTickerNews(
  ticker: string,
  limit: number = 5
): Promise<NewsResponse> {
  try {
    if (!ticker || ticker.trim() === '') {
      return {
        success: false,
        data: [],
        error: 'Ticker symbol is required'
      }
    }

    const tickerUpper = ticker.toUpperCase()

    const response = await fetch(
      `${API_BASE_URL}/api/news/${tickerUpper}?limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Include credentials if authentication is needed
        credentials: 'include'
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    const newsData = Array.isArray(data) ? data : []

    return {
      success: true,
      data: newsData
    }
  } catch (error) {
    console.error('[newsService] Error fetching ticker news:', error)
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Failed to fetch news'
    }
  }
}

/**
 * Format published date to readable string
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export function formatNewsDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffHours < 1) {
      return 'Just now'
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
    }
  } catch (error) {
    return dateString
  }
}

/**
 * Truncate text to specified length
 * @param text - Text to truncate
 * @param maxLength - Maximum length (default: 150)
 * @returns Truncated text with ellipsis
 */
export function truncateText(text: string, maxLength: number = 150): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}
