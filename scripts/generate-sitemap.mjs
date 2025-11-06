/**
 * Dynamic Sitemap Generation Script
 * 
 * Generates sitemap.xml with:
 * - Homepage
 * - Top 100 most popular stocks (from database analytics)
 * - Priority and change frequency optimized for SEO
 * 
 * Run: node scripts/generate-sitemap.mjs
 */

import { PrismaClient } from '@prisma/client'
import { writeFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const prisma = new PrismaClient()

// Top stock tickers to always include (even if not in analytics yet)
const TOP_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK.B',
  'UNH', 'JNJ', 'V', 'WMT', 'JPM', 'PG', 'XOM', 'MA', 'HD', 'CVX',
  'MRK', 'ABBV', 'PFE', 'KO', 'PEP', 'COST', 'TMO', 'AVGO', 'MCD',
  'CSCO', 'ABT', 'ACN', 'DHR', 'NKE', 'VZ', 'CMCSA', 'ADBE', 'NFLX',
  'TXN', 'CRM', 'INTC', 'AMD', 'QCOM', 'BMY', 'PM', 'UNP', 'HON',
  'RTX', 'NEE', 'LOW', 'ORCL', 'IBM', 'BA', 'CAT', 'GS', 'SBUX',
  'GILD', 'AMT', 'INTU', 'SPGI', 'AXP', 'DE', 'BLK', 'MMM', 'MDT'
]

const CANONICAL_URL = 'https://datoro.onrender.com'

/**
 * Get popular tickers from database analytics
 */
async function getPopularTickersFromDB(limit = 100) {
  try {
    const popular = await prisma.popularTicker.findMany({
      orderBy: { searchCount: 'desc' },
      take: limit,
      select: { ticker: true, searchCount: true }
    })
    
    return popular.map(p => p.ticker)
  } catch (error) {
    console.error('[Sitemap] Error fetching popular tickers:', error)
    return []
  }
}

/**
 * Generate sitemap XML
 */
function generateSitemapXML(tickers) {
  const now = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  
  <!-- Homepage -->
  <url>
    <loc>${CANONICAL_URL}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
`

  // Add stock pages
  tickers.forEach((ticker, index) => {
    // Priority: Top 10 = 0.9, top 50 = 0.8, rest = 0.7
    const priority = index < 10 ? '0.9' : index < 50 ? '0.8' : '0.7'
    
    xml += `  <!-- ${ticker} -->
  <url>
    <loc>${CANONICAL_URL}/?ticker=${ticker}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${priority}</priority>
  </url>
  
`
  })
  
  xml += `</urlset>
`

  return xml
}

/**
 * Main script
 */
async function generateSitemap() {
  console.log('[Sitemap] Starting sitemap generation...')
  
  // Get popular tickers from database
  const dbTickers = await getPopularTickersFromDB(100)
  console.log(`[Sitemap] Found ${dbTickers.length} popular tickers from database`)
  
  // Combine with top stocks (deduplicate)
  const allTickers = [...new Set([...dbTickers, ...TOP_STOCKS])]
  console.log(`[Sitemap] Total unique tickers: ${allTickers.length}`)
  
  // Generate XML
  const xml = generateSitemapXML(allTickers.slice(0, 100)) // Limit to top 100
  
  // Write to public/sitemap.xml
  const sitemapPath = join(__dirname, '..', 'public', 'sitemap.xml')
  await writeFile(sitemapPath, xml, 'utf-8')
  
  console.log(`[Sitemap] ✅ Generated sitemap.xml with ${allTickers.slice(0, 100).length} URLs`)
  console.log(`[Sitemap] File: ${sitemapPath}`)
  
  // Close database connection
  await prisma.$disconnect()
}

// Run script
generateSitemap().catch((error) => {
  console.error('[Sitemap] Fatal error:', error)
  process.exit(1)
})
