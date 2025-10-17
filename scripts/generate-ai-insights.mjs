#!/usr/bin/env node
/**
 * Generate AI insights for S&P 500 companies using your server endpoint
 * Same prompts and API as the web page - ensures identical user experience
 * 
 * Usage:
 *   node scripts/generate-ai-insights.mjs              # Generate test tickers
 *   node scripts/generate-ai-insights.mjs AAPL MSFT    # Generate specific tickers
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:7071'
const OUTPUT_DIR = path.join(__dirname, '../public/ai-insights')
const VERSION = '1.0'

// Test tickers (as specified by user)
const TEST_TICKERS = ['AAPL', 'MSFT', 'AMZN', 'GOOGL', 'CRM', 'ASML', 'TSM', 'DUOL', 'SPGI', 'MSCI']

// System prompts (from your prompts.js file)
const SYSTEM_PROMPTS = {
  advantages: `You are a financial analyst. Analyze the competitive advantages of the given company.

Return ONLY a JSON array of objects, each with "title" and "description" fields.
- Provide 3 key advantages
- Each title should be 2-5 words (e.g., "Strong Brand Loyalty", "Network Effects")
- Each description should be 1-2 sentences max
- Focus on: moat, brand strength, market position, technology, network effects, switching costs, or unique assets
- Be specific and factual

Example format:
[
  {"title": "Brand Loyalty", "description": "Apple has cultivated exceptional brand loyalty with a retention rate above 90%, creating predictable recurring revenue."},
  {"title": "Ecosystem Lock-in", "description": "The seamless integration across devices creates high switching costs for customers."}
]

Return ONLY the JSON array, no other text.`,

  risks: `You are a financial analyst. Analyze the key investment risks for the given company.

Return ONLY a JSON array of objects, each with "title" and "description" fields.
- Provide 3 key risks
- Each title should be 2-5 words (e.g., "Regulatory Risk", "Market Concentration")
- Each description should be 1-2 sentences max
- Focus on: competition, regulation, market dependence, technological disruption, cyclicality, or valuation concerns
- Be specific and factual

Example format:
[
  {"title": "China Dependence", "description": "Over 40% of revenue comes from China, exposing the company to geopolitical and regulatory risks."},
  {"title": "Market Saturation", "description": "Smartphone market growth has slowed significantly in developed markets."}
]

Return ONLY the JSON array, no other text.`
}

/**
 * Call server endpoint (same as web page does)
 */
async function callServerAPI(ticker, companyName, type) {
  try {
    const response = await fetch(`${SERVER_URL}/api/ai/analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticker,
        companyName,
        type,
        systemPrompt: SYSTEM_PROMPTS[type],
        clearCache: true // Force fresh generation
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('  ✗ API error:', error.message)
    throw error
  }
}

/**
 * Format AI response data (array of {title, description} objects)
 */
function formatInsights(items) {
  return items.map(item => `**${item.title}**: ${item.description}`).join('\n\n')
}

/**
 * Generate insights for a single ticker
 */
async function generateInsights(ticker, companyName) {
  console.log(`\n📊 Generating insights for ${ticker} (${companyName})...`)

  try {
    // Generate competitive advantages
    console.log('  → Requesting competitive advantages...')
    const advantagesResult = await callServerAPI(ticker, companyName, 'advantages')
    
    if (advantagesResult.error || !advantagesResult.data?.success) {
      throw new Error(`Advantages failed: ${advantagesResult.error || 'Invalid response'}`)
    }
    
    console.log(`  ✓ Got ${advantagesResult.data.data.length} advantages`)
    
    // Wait 2 seconds before next request
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Generate investment risks
    console.log('  → Requesting investment risks...')
    const risksResult = await callServerAPI(ticker, companyName, 'risks')
    
    if (risksResult.error || !risksResult.data?.success) {
      throw new Error(`Risks failed: ${risksResult.error || 'Invalid response'}`)
    }
    
    console.log(`  ✓ Got ${risksResult.data.data.length} risks`)

    // Create insights object
    const insights = {
      ticker: ticker.toUpperCase(),
      companyName,
      lastUpdated: new Date().toISOString().split('T')[0],
      version: VERSION,
      provider: advantagesResult.provider || 'unknown',
      insights: {
        competitiveAdvantages: advantagesResult.data.data,
        investmentRisks: risksResult.data.data
      }
    }

    // Save to file
    const filename = `${ticker.toLowerCase()}.json`
    const filepath = path.join(OUTPUT_DIR, filename)
    await fs.writeFile(filepath, JSON.stringify(insights, null, 2), 'utf8')
    
    console.log(`  ✓ Saved to ${filename}`)
    console.log(`     Advantages: ${advantagesResult.data.data.length} items`)
    console.log(`     Risks: ${risksResult.data.data.length} items`)
    
    return { ticker, success: true }
  } catch (error) {
    console.error(`  ✗ Error generating insights for ${ticker}:`, error.message)
    return { ticker, success: false, error: error.message }
  }
}

/**
 * Get company name from ticker (simplified version)
 */
function getCompanyName(ticker) {
  const knownCompanies = {
    'AAPL': 'Apple Inc.',
    'MSFT': 'Microsoft Corporation',
    'AMZN': 'Amazon.com Inc.',
    'GOOGL': 'Alphabet Inc.',
    'CRM': 'Salesforce Inc.',
    'ASML': 'ASML Holding N.V.',
    'TSM': 'Taiwan Semiconductor Manufacturing Company',
    'DUOL': 'Duolingo Inc.',
    'SPGI': 'S&P Global Inc.',
    'MSCI': 'MSCI Inc.'
  }
  return knownCompanies[ticker.toUpperCase()] || `${ticker.toUpperCase()} Corp.`
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)
  
  console.log('🤖 AI Insights Generator')
  console.log('=' .repeat(50))
  console.log(`Server: ${SERVER_URL}`)
  console.log(`Output: ${OUTPUT_DIR}`)
  console.log('=' .repeat(50))

  // Check server is running
  try {
    console.log('\nChecking server connection...')
    const healthCheck = await fetch(`${SERVER_URL}/api/health`)
    if (!healthCheck.ok) {
      throw new Error('Server health check failed')
    }
    console.log('✓ Server is running')
  } catch (error) {
    console.error(`✗ Cannot connect to server at ${SERVER_URL}`)
    console.error('  Make sure your server is running:')
    console.error('  npm run pm2:start')
    console.error('  or')
    console.error('  node server/server.mjs')
    process.exit(1)
  }

  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true })

  // Determine which tickers to process
  let tickers
  if (args.length > 0) {
    tickers = args.map(t => t.toUpperCase())
    console.log(`\n📋 Custom mode: Generating insights for ${tickers.length} ticker(s)`)
  } else {
    tickers = TEST_TICKERS
    console.log(`\n📋 Default mode: Generating insights for test tickers`)
  }

  console.log(`Tickers: ${tickers.join(', ')}`)
  console.log('\n⚠️  This will use your AI provider (ChatGPT/Claude/etc)')
  console.log('   Estimated time: ~10 seconds per ticker\n')

  // Process each ticker
  const results = []
  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i]
    const companyName = getCompanyName(ticker)
    const result = await generateInsights(ticker, companyName)
    results.push(result)
    
    // Rate limiting: wait 3 seconds between tickers
    if (i < tickers.length - 1) {
      console.log('  ⏳ Waiting 3 seconds...')
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Generation Summary')
  console.log('='.repeat(50))
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  
  console.log(`✓ Successful: ${successful}/${tickers.length}`)
  console.log(`✗ Failed: ${failed}`)
  
  if (failed > 0) {
    console.log('\nFailed tickers:')
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.ticker}: ${r.error}`)
    })
  }

  console.log('\n✅ Done!')
  console.log(`\n💡 Files saved to: ${OUTPUT_DIR}`)
  console.log('   Test in browser: npm run dev, then search for a ticker')
}

// Run
main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
