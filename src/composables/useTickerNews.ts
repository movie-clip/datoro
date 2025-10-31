// src/composables/useTickerNews.ts
// Composable for managing ticker news data

import { ref, computed, watch, type Ref } from 'vue'
import { fetchTickerNews } from '../services/news/newsService'
import type { FMPNewsItem } from '../types/fmp.types'

export interface UseTickerNewsReturn {
  newsItems: Ref<FMPNewsItem[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  hasNews: Ref<boolean>
  fetchNews: (ticker: string, limit?: number) => Promise<void>
}

/**
 * Composable for fetching and managing ticker news
 * @param tickerRef - Reactive ticker symbol
 * @param options - Configuration options
 * @returns News data and methods
 */
export function useTickerNews(
  tickerRef: Ref<string>,
  options: { limit?: number; autoFetch?: boolean } = {}
): UseTickerNewsReturn {
  const { limit = 10, autoFetch = true } = options

  const newsItems = ref<FMPNewsItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const hasNews = computed(() => newsItems.value.length > 0)

  /**
   * Fetch news for the given ticker
   */
  const fetchNews = async (ticker: string, fetchLimit: number = limit) => {
    if (!ticker || ticker.trim() === '') {
      newsItems.value = []
      error.value = 'No ticker provided'
      return
    }

    loading.value = true
    error.value = null

    try {
      const response = await fetchTickerNews(ticker, fetchLimit)

      if (response.success) {
        newsItems.value = response.data
        error.value = null
      } else {
        newsItems.value = []
        error.value = response.error || 'Failed to fetch news'
      }
    } catch (err) {
      newsItems.value = []
      error.value = err instanceof Error ? err.message : 'An error occurred'
    } finally {
      loading.value = false
    }
  }

  // Auto-fetch when ticker changes
  if (autoFetch) {
    watch(
      tickerRef,
      (newTicker) => {
        if (newTicker && newTicker.trim() !== '') {
          fetchNews(newTicker, limit)
        } else {
          newsItems.value = []
          error.value = null
        }
      },
      { immediate: true }
    )
  }

  return {
    newsItems,
    loading,
    error,
    hasNews,
    fetchNews
  }
}
