#!/usr/bin/env node
/**
 * Generate AI insights using local AI provider (OpenAI/Ollama)
 * Generates a single bundle file (ai-insights.json) for efficient deployment
 * Features:
 * - Automatic retry with exponential backoff for rate limits
 * - Incremental progress saving (resume after interruption)
 * - Network error handling
 * - Force regeneration with --force flag
 * 
 * Usage:
 *   node scripts/generate-ai-insights.mjs                    # Generate test tickers
 *   node scripts/generate-ai-insights.mjs CRM TSM META       # Generate specific tickers
 *   node scripts/generate-ai-insights.mjs AAPL --force       # Force regenerate AAPL
 *   node scripts/generate-ai-insights.mjs CRM TSM --force    # Force regenerate multiple
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
const OUTPUT_FILE = path.join(__dirname, '../public/ai-insights.json')
const PROGRESS_FILE = path.join(__dirname, '../.ai-insights-progress.json')
const VERSION = '1.0'

// Retry configuration
const MAX_RETRIES = 5
const INITIAL_RETRY_DELAY = 2000 // 2 seconds
const MAX_RETRY_DELAY = 60000 // 60 seconds

// Test tickers (as specified by user)
const TEST_TICKERS = ['AAPL', 'MSFT', 'AMZN', 'GOOGL', 'CRM', 'ASML', 'TSM', 'DUOL', 'SPGI', 'MSCI']

// System prompts
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
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Call AI provider with retry logic for rate limits
 */
async function callAIWithRetry(ticker, companyName, type, retryCount = 0) {
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

      // Handle rate limiting and server errors
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        
        // Rate limit (429) or server overload (503) - retry
        if ((response.status === 429 || response.status === 503) && retryCount < MAX_RETRIES) {
          const delay = Math.min(
            INITIAL_RETRY_DELAY * Math.pow(2, retryCount),
            MAX_RETRY_DELAY
          )
          
          console.log(`  ⏳ Rate limit hit (${response.status}). Waiting ${delay / 1000}s before retry ${retryCount + 1}/${MAX_RETRIES}...`)
          await sleep(delay)
          
          return callAIWithRetry(ticker, companyName, type, retryCount + 1)
        }
        
        throw new Error(`Ollama error ${response.status}: ${errorText}`)
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
        const error = await response.json().catch(() => ({}))
        
        // Rate limit (429) - retry with exponential backoff
        if (response.status === 429 && retryCount < MAX_RETRIES) {
          const retryAfter = response.headers.get('retry-after')
          const delay = retryAfter 
            ? parseInt(retryAfter) * 1000 
            : Math.min(INITIAL_RETRY_DELAY * Math.pow(2, retryCount), MAX_RETRY_DELAY)
          
          console.log(`  ⏳ OpenAI rate limit. Waiting ${delay / 1000}s before retry ${retryCount + 1}/${MAX_RETRIES}...`)
          await sleep(delay)
          
          return callAIWithRetry(ticker, companyName, type, retryCount + 1)
        }
        
        throw new Error(`OpenAI error ${response.status}: ${error.error?.message || 'Unknown error'}`)
      }

      const result = await response.json()
      return result.choices[0].message.content
    } else {
      throw new Error(`Unknown AI provider: ${AI_PROVIDER}`)
    }
  } catch (error) {
    // Network errors - retry
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      if (retryCount < MAX_RETRIES) {
        const delay = Math.min(
          INITIAL_RETRY_DELAY * Math.pow(2, retryCount),
          MAX_RETRY_DELAY
        )
        
        console.log(`  ⏳ Connection error. Waiting ${delay / 1000}s before retry ${retryCount + 1}/${MAX_RETRIES}...`)
        await sleep(delay)
        
        return callAIWithRetry(ticker, companyName, type, retryCount + 1)
      }
    }
    
    console.error('  ✗ AI error:', error.message)
    throw error
  }
}

/**
 * Backward compatibility wrapper
 */
async function callAI(ticker, companyName, type) {
  return callAIWithRetry(ticker, companyName, type, 0)
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
    await sleep(2000)
    
    // Generate investment risks
    console.log('  → Requesting investment risks...')
    const risksRaw = await callAI(ticker, companyName, 'risks')
    const risks = parseAIResponse(risksRaw)
    
    console.log(`  ✓ Got ${risks.length} risks`)

    // Return insights data (will be bundled later)
    return {
      ticker,
      success: true,
      data: {
        advantages,
        risks,
        updated: new Date().toISOString().split('T')[0]
      }
    }
  } catch (error) {
    console.error(`  ✗ Error generating insights for ${ticker}:`, error.message)
    return { ticker, success: false, error: error.message }
  }
}

/**
 * Load existing bundle or progress
 */
async function loadExistingData() {
  try {
    const bundleContent = await fs.readFile(OUTPUT_FILE, 'utf8')
    return JSON.parse(bundleContent)
  } catch {
    return {}
  }
}

/**
 * Save progress incrementally
 */
async function saveProgress(bundle, completedTickers) {
  // Save current bundle state
  const bundleContent = JSON.stringify(bundle, null, 2)
  await fs.writeFile(OUTPUT_FILE, bundleContent, 'utf8')
  
  // Save progress metadata
  const progress = {
    lastUpdated: new Date().toISOString(),
    completedTickers,
    totalTickers: completedTickers.length
  }
  await fs.writeFile(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8')
}

/**
 * Load progress from previous run
 */
async function loadProgress() {
  try {
    const progressContent = await fs.readFile(PROGRESS_FILE, 'utf8')
    return JSON.parse(progressContent)
  } catch {
    return { completedTickers: [] }
  }
}

/**
 * Get company name from ticker
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
    'MSCI': 'MSCI Inc.',
    'META': 'Meta Platforms Inc.'
  }
  return knownCompanies[ticker.toUpperCase()] || `${ticker.toUpperCase()} Corp.`
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2)
  
  // Check for --force flag
  const forceRegenerate = args.includes('--force')
  const tickers = args.filter(arg => !arg.startsWith('--')).map(t => t.toUpperCase())
  
  console.log('🤖 AI Insights Generator')
  console.log('='.repeat(50))
  console.log(`AI Provider: ${AI_PROVIDER}`)
  console.log(`Output: ${OUTPUT_FILE}`)
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
      console.error('  Make sure Ollama is running: ollama serve')
      process.exit(1)
    }
  }

  // Determine which tickers to process
  const tickersToRequest = tickers.length > 0 ? tickers : TEST_TICKERS
  
  if (tickers.length > 0) {
    console.log(`\n📋 Custom mode: Generating insights for ${tickersToRequest.length} ticker(s)`)
  } else {
    console.log(`\n📋 Default mode: Generating insights for test tickers`)
  }
  
  if (forceRegenerate) {
    console.log('🔄 Force mode: Will overwrite existing insights')
  }

  console.log(`Tickers: ${tickersToRequest.join(', ')}`)
  
  // Load existing bundle and progress
  const existingBundle = await loadExistingData()
  const progress = forceRegenerate ? { completedTickers: [] } : await loadProgress()
  const completedTickers = new Set(progress.completedTickers || [])
  
  // Filter out already completed tickers (unless force flag is set)
  const tickersToProcess = forceRegenerate 
    ? tickersToRequest 
    : tickersToRequest.filter(t => !completedTickers.has(t.toUpperCase()))
  
  if (tickersToProcess.length === 0) {
    console.log('\n✅ All tickers already have insights!')
    console.log('   Use --force to regenerate: node scripts/generate-ai-insights.mjs AAPL --force')
    return
  }
  
  if (tickersToProcess.length < tickersToRequest.length && !forceRegenerate) {
    console.log(`\n📝 Resuming: ${tickersToProcess.length} remaining (${tickersToRequest.length - tickersToProcess.length} already done)`)
    console.log(`   Remaining: ${tickersToProcess.join(', ')}`)
    console.log(`   Use --force to regenerate all`)
  }
  
  console.log('\n⚠️  This will use your AI provider')
  console.log(`   Estimated time: ~10 seconds per ticker (${tickersToProcess.length} tickers)`)
  console.log('   💾 Progress is saved after each ticker\n')

  // Initialize bundle with existing data
  const bundle = { ...existingBundle }
  
  // Process each ticker with incremental saving
  const results = []
  for (let i = 0; i < tickersToProcess.length; i++) {
    const ticker = tickersToProcess[i]
    const companyName = getCompanyName(ticker)
    
    console.log(`\n[${i + 1}/${tickersToProcess.length}] Processing ${ticker}...`)
    
    const result = await generateInsights(ticker, companyName)
    results.push(result)
    
    // Save to bundle immediately if successful
    if (result.success) {
      const tickerUpper = ticker.toUpperCase()
      bundle[tickerUpper] = {
        advantages: result.data.advantages,
        risks: result.data.risks,
        updated: result.data.updated,
        provider: AI_PROVIDER
      }
      
      completedTickers.add(tickerUpper)
      
      // Save progress incrementally
      await saveProgress(bundle, Array.from(completedTickers))
      console.log(`  💾 Saved progress (${completedTickers.size} total)`)
    }
    
    // Rate limiting: wait 3 seconds between tickers
    if (i < tickersToProcess.length - 1) {
      console.log('  ⏳ Waiting 3 seconds before next ticker...')
      await sleep(3000)
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Generation Summary')
  console.log('='.repeat(50))
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  
  console.log(`✓ Successful: ${successful.length}/${tickersToProcess.length}`)
  console.log(`✗ Failed: ${failed.length}`)
  
  if (failed.length > 0) {
    console.log('\nFailed tickers:')
    failed.forEach(r => {
      console.log(`  - ${r.ticker}: ${r.error}`)
    })
    console.log('\n💡 Run the script again with just the failed tickers:')
    console.log(`   node scripts/generate-ai-insights.mjs ${failed.map(r => r.ticker).join(' ')}`)
  }

  // Final bundle stats (bundle already saved incrementally)
  const bundleSize = (JSON.stringify(bundle).length / 1024).toFixed(1)
  console.log(`\n📦 Bundle Info:`)
  console.log(`  File: ${OUTPUT_FILE}`)
  console.log(`  Size: ${bundleSize} KB`)
  console.log(`  Tickers: ${Object.keys(bundle).length}`)

  // Clean up progress file if everything succeeded
  if (failed.length === 0 && tickersToProcess.length === tickers.length) {
    try {
      await fs.unlink(PROGRESS_FILE)
      console.log('\n✅ All done! Progress file cleaned up.')
    } catch {
      // Progress file might not exist
    }
  } else {
    console.log('\n💾 Progress saved. Run again to retry failed tickers.')
  }

  console.log('\n🧪 Test in browser: npm run dev, then search for a ticker')
}

// Run
main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
