#!/usr/bin/env node
/**
 * Generate AI insights using local AI provider (OpenAI/Ollama)
 * Saves results as static JSON files for zero-cost deployment
 * 
 * Usage:
 *   node scripts/generate-ai-insights.mjs              # Generate test tickers
 *   node scripts/generate-ai-insights.mjs AAPL MSFT    # Generate specific tickers
 * 
 * Configuration (via environment variables):
 *   AI_PROVIDER=ollama (or openai)
 *   OPENAI_API_KEY=sk-... (if using openai)
 *   OLLAMA_BASE_URL=http://localhost:11434 (default)
 *   OLLAMA_MODEL=llama3.2 (default)
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
config({ path: path.join(__dirname, '..', '.env') })
config({ path: path.join(__dirname, '..', '.env.local'), override: true })

// Configuration
const AI_PROVIDER = process.env.AI_PROVIDER || process.env.VITE_AI_PROVIDER || 'ollama'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || ''
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || process.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || process.env.VITE_OLLAMA_MODEL || 'llama3.2'
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
 * Call AI provider directly (OpenAI or Ollama)
 */
async function callAI(ticker, companyName, type) {
  const systemPrompt = SYSTEM_PROMPTS[type]
  const userPrompt = `Company: ${companyName} (${ticker})`

  try {
    if (AI_PROVIDER === 'ollama') {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: `${systemPrompt}\n\n${userPrompt}`,
          stream: false,
          options: { temperature: 0.7, num_predict: 400 }
        })
      })

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status}`)
      }

      const result = await response.json()
      return result.response
    } else if (AI_PROVIDER === 'openai') {
      if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured')
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 400
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`OpenAI error: ${response.status} - ${error.error?.message || 'Unknown error'}`)
      }

      const result = await response.json()
      return result.choices[0].message.content
    } else {
      throw new Error(`Unknown AI provider: ${AI_PROVIDER}`)
    }
  } catch (error) {
    console.error('  ✗ AI error:', error.message)
    throw error
  }
}

/**
 * Parse and validate AI response
 */
function parseAIResponse(rawResponse) {
  try {
    // Try to find complete JSON array
    const jsonMatch = rawResponse.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('No JSON array found in response')
    }
    
    const parsed = JSON.parse(jsonMatch[0])
    
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('Invalid array structure')
    }
    
    if (!parsed.every(item => item.title && item.description)) {
      throw new Error('Missing title or description')
    }
    
    return parsed
  } catch (error) {
    throw new Error(`Parse error: ${error.message}`)
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
    const advantagesRaw = await callAI(ticker, companyName, 'advantages')
    const advantages = parseAIResponse(advantagesRaw)
    
    console.log(`  ✓ Got ${advantages.length} advantages`)
    
    // Wait 2 seconds before next request
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Generate investment risks
    console.log('  → Requesting investment risks...')
    const risksRaw = await callAI(ticker, companyName, 'risks')
    const risks = parseAIResponse(risksRaw)
    
    console.log(`  ✓ Got ${risks.length} risks`)

    // Create insights object
    const insights = {
      ticker: ticker.toUpperCase(),
      companyName,
      lastUpdated: new Date().toISOString().split('T')[0],
      version: VERSION,
      provider: AI_PROVIDER,
      insights: {
        competitiveAdvantages: advantages,
        investmentRisks: risks
      }
    }

    // Save to file
    const filename = `${ticker.toLowerCase()}.json`
    const filepath = path.join(OUTPUT_DIR, filename)
    await fs.writeFile(filepath, JSON.stringify(insights, null, 2), 'utf8')
    
    console.log(`  ✓ Saved to ${filename}`)
    console.log(`     Advantages: ${advantages.length} items`)
    console.log(`     Risks: ${risks.length} items`)
    
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
  console.log('='.repeat(50))
  console.log(`AI Provider: ${AI_PROVIDER}`)
  console.log(`Output: ${OUTPUT_DIR}`)
  console.log('='.repeat(50))

  // Check AI provider configuration
  if (AI_PROVIDER === 'openai' && !OPENAI_API_KEY) {
    console.error('\n✗ OpenAI API key not configured')
    console.error('  Set OPENAI_API_KEY or VITE_OPENAI_API_KEY in .env.local')
    process.exit(1)
  }

  if (AI_PROVIDER === 'ollama') {
    try {
      console.log('\nChecking Ollama connection...')
      const healthCheck = await fetch(`${OLLAMA_BASE_URL}/api/tags`)
      if (!healthCheck.ok) {
        throw new Error('Ollama health check failed')
      }
      console.log(`✓ Ollama is running (${OLLAMA_MODEL})`)
    } catch (error) {
      console.error(`✗ Cannot connect to Ollama at ${OLLAMA_BASE_URL}`)
      console.error('  Make sure Ollama is running:')
      console.error('  ollama serve')
      process.exit(1)
    }
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
  
  // Build bundle if we have successful generations
  if (successful > 0) {
    console.log('\n📦 Building optimized bundle...')
    try {
      const { execSync } = await import('child_process')
      execSync('node scripts/build-insights-bundle.mjs', { stdio: 'inherit' })
    } catch (bundleError) {
      console.error('⚠️  Bundle build failed:', bundleError.message)
      console.log('   Run manually: node scripts/build-insights-bundle.mjs')
    }
  }
}

// Run
main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
