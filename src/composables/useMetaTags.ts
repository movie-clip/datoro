/**
 * Dynamic Meta Tags Composable
 * 
 * Updates document meta tags dynamically for better SEO
 * - Title tags
 * - Description
 * - Open Graph tags
 * - Twitter Card tags
 * - Canonical URLs
 * 
 * Usage:
 * ```ts
 * import { useMetaTags } from '@/composables/useMetaTags'
 * 
 * const { updateMetaTags } = useMetaTags()
 * 
 * updateMetaTags({
 *   title: 'Apple Inc. (AAPL) Stock Analysis | Datoro',
 *   description: 'Real-time financial analysis for AAPL...',
 *   canonicalUrl: 'https://datoro.onrender.com/?ticker=AAPL'
 * })
 * ```
 */

import { watch, type Ref } from 'vue'

export interface MetaTagsOptions {
  title?: string
  description?: string
  keywords?: string
  canonicalUrl?: string
  ogImage?: string
  ogType?: string
  twitterCard?: string
}

const IS_PRODUCTION = import.meta.env.PROD
const BASE_URL = IS_PRODUCTION ? 'https://datoro.onrender.com' : 'http://localhost:5173'
const DEFAULT_TITLE = 'Datoro - Free Stock Analysis with AI Insights | 10,000+ Stocks'
const DEFAULT_DESCRIPTION = 'Professional stock analysis dashboard with real-time financial data, AI-powered insights, interactive charts, and comprehensive metrics. Completely free. No signup required.'
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`

/**
 * Set or update a meta tag
 */
function setMetaTag(selector: string, content: string, attribute: string = 'content'): void {
  let element = document.querySelector(selector) as HTMLMetaElement | null
  
  if (!element) {
    // Create meta tag if it doesn't exist
    element = document.createElement('meta')
    
    // Parse selector to set attributes
    if (selector.includes('[name=')) {
      const name = selector.match(/name=['"]([^'"]+)['"]/)?.[1]
      if (name) element.setAttribute('name', name)
    } else if (selector.includes('[property=')) {
      const property = selector.match(/property=['"]([^'"]+)['"]/)?.[1]
      if (property) element.setAttribute('property', property)
    }
    
    document.head.appendChild(element)
  }
  
  element.setAttribute(attribute, content)
}

/**
 * Set canonical link tag
 */
function setCanonicalUrl(url: string): void {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.appendChild(link)
  }
  
  link.href = url
}

/**
 * Update document title
 */
function setTitle(title: string): void {
  document.title = title
}

/**
 * Update all meta tags with provided options
 */
export function useMetaTags() {
  function updateMetaTags(options: MetaTagsOptions = {}): void {
    const {
      title = DEFAULT_TITLE,
      description = DEFAULT_DESCRIPTION,
      keywords,
      canonicalUrl = BASE_URL, // Default to base URL if not specified
      ogImage = DEFAULT_OG_IMAGE,
      ogType = 'website',
      twitterCard = 'summary_large_image'
    } = options
    
    // Update document title
    setTitle(title)
    
    // Primary meta tags
    setMetaTag('meta[name="title"]', title)
    setMetaTag('meta[name="description"]', description)
    if (keywords) {
      setMetaTag('meta[name="keywords"]', keywords)
    }
    
    // Always set canonical URL (defaults to BASE_URL)
    setCanonicalUrl(canonicalUrl)
    
    // Open Graph / Facebook / Instagram / LinkedIn
    setMetaTag('meta[property="og:title"]', title)
    setMetaTag('meta[property="og:description"]', description)
    setMetaTag('meta[property="og:image"]', ogImage)
    setMetaTag('meta[property="og:type"]', ogType)
    if (canonicalUrl) {
      setMetaTag('meta[property="og:url"]', canonicalUrl)
    }
    
    // Twitter / X
    setMetaTag('meta[name="twitter:title"]', title)
    setMetaTag('meta[name="twitter:description"]', description)
    setMetaTag('meta[name="twitter:image"]', ogImage)
    setMetaTag('meta[name="twitter:card"]', twitterCard)
    if (canonicalUrl) {
      setMetaTag('meta[name="twitter:url"]', canonicalUrl)
    }
  }
  
  /**
   * Generate stock-specific meta tags
   */
  function generateStockMetaTags(ticker: string, companyName?: string, price?: number, change?: number): MetaTagsOptions {
    const title = companyName 
      ? `${companyName} (${ticker}) Stock Analysis | Datoro`
      : `${ticker} Stock Analysis | Datoro`
    
    const priceInfo = price !== undefined && change !== undefined
      ? `Current price: $${price.toFixed(2)} (${change > 0 ? '+' : ''}${change.toFixed(2)}%). `
      : ''
    
    const description = `${priceInfo}Real-time financial analysis for ${ticker}${companyName ? ` - ${companyName}` : ''}. Revenue, profit margins, P/E ratio, cash flow, balance sheet, AI insights, and more. Free stock data.`
    
    const keywords = `${ticker} stock, ${companyName || ticker} analysis, ${ticker} P/E ratio, ${ticker} revenue, ${ticker} earnings, ${ticker} financial data, stock analysis ${ticker}`
    
    // IMPORTANT: For SPAs, all ticker URLs should canonicalize to the base URL
    // This prevents Google from treating ?ticker=AAPL as a separate page
    // The SPA dynamically loads content, so the canonical should always be the homepage
    const canonicalUrl = BASE_URL
    
    return {
      title,
      description,
      keywords,
      canonicalUrl,
      ogType: 'article'
    }
  }
  
  /**
   * Watch ticker changes and auto-update meta tags
   */
  function watchTickerMetaTags(tickerRef: Ref<string>, companyNameRef?: Ref<string | undefined>, priceRef?: Ref<number | undefined>, changeRef?: Ref<number | undefined>): void {
    watch(
      () => [tickerRef.value, companyNameRef?.value, priceRef?.value, changeRef?.value],
      ([ticker, companyName, price, change]) => {
        if (!ticker) {
          // Reset to default meta tags when no ticker
          updateMetaTags()
          return
        }
        
        const metaTags = generateStockMetaTags(
          ticker as string,
          companyName as string | undefined,
          price as number | undefined,
          change as number | undefined
        )
        
        updateMetaTags(metaTags)
      },
      { immediate: true }
    )
  }
  
  return {
    updateMetaTags,
    generateStockMetaTags,
    watchTickerMetaTags
  }
}
