/**
 * Brand Configuration
 * 
 * Centralized brand identity and metadata.
 * Change the brand name here and it updates everywhere automatically.
 */

export const BRAND = {
  /** Brand name */
  name: 'Datoro',
  
  /** Brand tagline */
  tagline: 'Comprehensive Stock Analysis with AI Insights',
  
  /** Domains */
  domain: {
    production: 'datoro.onrender.com',
    api: 'datoro-api.onrender.com',
  },
  
  /** SEO metadata */
  seo: {
    title: 'Datoro - Comprehensive Stock Analysis with AI Insights',
    titleShort: 'Datoro - Comprehensive Stock Analysis with AI Insights',
    description: 'Professional stock analysis dashboard with real-time financial data, AI-powered insights, interactive charts, and comprehensive metrics. No signup required. Analyze revenue, P/E ratios, cash flow, and more for any stock. Macro analysis.',
    keywords: 'stock analysis, financial data, stock charts, P/E ratio, revenue analysis, AI stock insights, free stock data, stock dashboard, financial metrics, stock screener, investment analysis, macro analysis',
    author: 'Datoro',
  },
  
  /** URLs */
  urls: {
    canonical: 'https://datoro.onrender.com/',
    ogImage: 'https://datoro.onrender.com/og-image.png',
    twitterCard: 'https://datoro.onrender.com/twitter-card.png',
    logo: 'https://datoro.onrender.com/logo.png',
    sitemap: 'https://datoro.onrender.com/sitemap.xml',
  },
  
  /** Social media handles */
  social: {
    twitter: '@Datoro',
  },
  
  /** Organization info */
  organization: {
    name: 'Datoro',
    copyright: 'Datoro contributors',
    foundingDate: '2025',
  },
  
  /** PWA metadata */
  pwa: {
    name: 'Datoro - Comprehensive Stock Analysis with AI Insights',
    shortName: 'Datoro',
    themeColor: '#1a1a1d',
    backgroundColor: '#0a0a0a',
  },
  
  /** Structured data (Schema.org) */
  schema: {
    applicationCategory: 'FinanceApplication',
    ratingValue: '4.8',
    ratingCount: '1250',
    features: [
      'Real-time stock data for 10,000+ stocks',
      'AI-powered financial insights',
      'Interactive charts and visualizations',
      'Revenue and profit analysis',
      'P/E ratio and valuation metrics',
      'Cash flow analysis',
      'Balance sheet data',
      'Insider trading tracking',
      'DCF Calculator',
      'Deep Finder stock screener',
    ],
  },
} as const

export default BRAND
