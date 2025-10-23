/**
 * AI Insights Tool - Standalone Node.js Backend
 * Provides API endpoints for generating AI insights using local Ollama
 */

import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
config({ path: path.join(__dirname, '.env') })

// Configuration
const PORT = 7072
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2'
const BUNDLE_FILE = path.join(__dirname, 'output', 'ai-insights.json')

const app = express()

app.use(cors())
app.use(express.json())

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

// Helper functions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function loadBundle() {
  try {
    const data = await fs.readFile(BUNDLE_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    return {}
  }
}

async function saveBundle(bundle) {
  await fs.mkdir(path.dirname(BUNDLE_FILE), { recursive: true })
  await fs.writeFile(BUNDLE_FILE, JSON.stringify(bundle, null, 2))
}

function parseTickers(input) {
  return input
    .split(/[\n,]+/)
    .map(t => t.trim().toUpperCase())
    .filter(t => t.length > 0)
}

async function callOllama(ticker, companyName, type) {
  const systemPrompt = SYSTEM_PROMPTS[type]
  const userPrompt = `Company: ${companyName} (${ticker})`

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
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`Ollama error ${response.status}: ${errorText}`)
  }

  const result = await response.json()
  return result.response
}

function parseAIResponse(rawResponse) {
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
}

async function generateInsightsForTicker(ticker, companyName = ticker) {
  // Generate competitive advantages
  const advantagesRaw = await callOllama(ticker, companyName, 'advantages')
  const advantages = parseAIResponse(advantagesRaw)

  // Wait 3 seconds between requests
  await sleep(3000)

  // Generate risks
  const risksRaw = await callOllama(ticker, companyName, 'risks')
  const risks = parseAIResponse(risksRaw)

  return {
    ticker,
    updated: new Date().toISOString().split('T')[0],
    advantages,
    risks
  }
}

// API Endpoints

// Check Ollama status
app.get('/api/ollama/status', async (req, res) => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(2000)
    })
    res.json({ running: response.ok })
  } catch (error) {
    res.json({ running: false })
  }
})

// Get bundle statistics
app.get('/api/bundle/stats', async (req, res) => {
  try {
    const bundle = await loadBundle()
    const tickers = Object.keys(bundle)
    
    let stats = {
      count: tickers.length,
      size_kb: 0,
      last_updated: 'Never'
    }

    if (tickers.length > 0) {
      const fileStats = await fs.stat(BUNDLE_FILE)
      stats.size_kb = Math.round(fileStats.size / 1024)
      stats.last_updated = fileStats.mtime.toISOString().split('T')[0]
    }

    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Check tickers
app.post('/api/tickers/check', async (req, res) => {
  try {
    const { tickers: tickersInput } = req.body
    const bundle = await loadBundle()
    
    const tickers = parseTickers(tickersInput)
    const validTickers = []
    const tickerInfo = {}

    for (const ticker of tickers) {
      // Validate ticker format (1-5 uppercase letters)
      if (!/^[A-Z]{1,5}$/.test(ticker)) {
        tickerInfo[ticker] = {
          status: 'invalid',
          error: 'Invalid ticker format (use 1-5 letters)'
        }
        continue
      }

      // Check if exists in bundle
      if (bundle[ticker]) {
        validTickers.push(ticker)
        tickerInfo[ticker] = {
          status: 'exists',
          data: bundle[ticker]
        }
      } else {
        validTickers.push(ticker)
        tickerInfo[ticker] = {
          status: 'new'
        }
      }
    }

    res.json({ validTickers, tickerInfo })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Generate insights (streaming)
app.post('/api/generate', async (req, res) => {
  const { tickers, force = false } = req.body

  // Set up Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  try {
    const bundle = await loadBundle()
    let successCount = 0
    const failed = []

    for (const ticker of tickers) {
      try {
        // Generate insights
        const insights = await generateInsightsForTicker(ticker)
        
        // Save to bundle
        bundle[ticker] = insights
        await saveBundle(bundle)

        successCount++
        sendEvent({
          type: 'result',
          ticker,
          success: true,
          insights
        })
      } catch (error) {
        failed.push([ticker, error.message])
        sendEvent({
          type: 'result',
          ticker,
          success: false,
          error: error.message
        })
      }
    }

    // Send summary
    sendEvent({
      type: 'summary',
      successCount,
      failedCount: failed.length,
      failed
    })

    res.end()
  } catch (error) {
    sendEvent({
      type: 'error',
      message: error.message
    })
    res.end()
  }
})

// Apply selected tickers to main project
app.post('/api/apply-to-main', async (req, res) => {
  try {
    const { tickers } = req.body
    
    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({ success: false, error: 'No tickers provided' })
    }

    // Load bundle from ai-insights-tool
    const toolBundle = await loadBundle()
    
    // Load main project bundle
    const mainBundlePath = path.join(__dirname, '..', 'public', 'ai-insights.json')
    let mainBundle = {}
    
    try {
      const mainData = await fs.readFile(mainBundlePath, 'utf-8')
      mainBundle = JSON.parse(mainData)
    } catch (error) {
      // File doesn't exist or is invalid, start fresh
      console.log('Main bundle not found, creating new one')
    }

    // Merge selected tickers
    let appliedCount = 0
    for (const ticker of tickers) {
      if (toolBundle[ticker]) {
        mainBundle[ticker] = toolBundle[ticker]
        appliedCount++
      }
    }

    // Save merged bundle to main project
    await fs.writeFile(mainBundlePath, JSON.stringify(mainBundle, null, 2))

    res.json({ 
      success: true, 
      appliedCount,
      message: `Successfully applied ${appliedCount} ticker(s) to main project`
    })
  } catch (error) {
    console.error('Error applying to main project:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 AI Insights Tool Server running on http://localhost:${PORT}`)
  console.log(`📁 Bundle file: ${BUNDLE_FILE}`)
  console.log(`🤖 Ollama URL: ${OLLAMA_BASE_URL}`)
  console.log(`🧠 Model: ${OLLAMA_MODEL}\n`)
})
