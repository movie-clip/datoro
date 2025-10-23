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

You MUST return a valid JSON array with exactly 3 objects. Each object must have "title" and "description" fields.
- Each title should be 2-5 words (e.g., "Strong Brand Loyalty", "Network Effects")
- Each description should be 1-2 sentences max
- Focus on: moat, brand strength, market position, technology, network effects, switching costs, or unique assets
- Be specific and factual

IMPORTANT: Return ONLY a JSON array like this, with no additional text:
[
  {"title": "Brand Loyalty", "description": "Apple has cultivated exceptional brand loyalty with a retention rate above 90%, creating predictable recurring revenue."},
  {"title": "Ecosystem Lock-in", "description": "The seamless integration across devices creates high switching costs for customers."},
  {"title": "Innovation Pipeline", "description": "Continuous R&D investment maintains technological leadership in consumer electronics."}
]`,

  risks: `You are a financial analyst. Analyze the key investment risks for the given company.

You MUST return a valid JSON array with exactly 3 objects. Each object must have "title" and "description" fields.
- Each title should be 2-5 words (e.g., "Regulatory Risk", "Market Concentration")
- Each description should be 1-2 sentences max
- Focus on: competition, regulation, market dependence, technological disruption, cyclicality, or valuation concerns
- Be specific and factual

IMPORTANT: Return ONLY a JSON array like this, with no additional text:
[
  {"title": "China Dependence", "description": "Over 40% of revenue comes from China, exposing the company to geopolitical and regulatory risks."},
  {"title": "Market Saturation", "description": "Smartphone market growth has slowed significantly in developed markets."},
  {"title": "Competition Pressure", "description": "Intense competition from Android ecosystem and other smartphone manufacturers."}
]`
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
      prompt: userPrompt,
      system: systemPrompt,
      stream: false,
      options: { 
        temperature: 1.0,
        num_predict: 600
      }
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
  try {
    // First, try to parse the entire response as JSON
    const parsed = JSON.parse(rawResponse.trim())
    
    // If it's a single object, wrap it in an array
    if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed.title && parsed.description) {
      console.log('⚠️  AI returned single object instead of array, wrapping it')
      return [parsed]
    }
    
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(item => item.title && item.description)) {
      return parsed
    }
  } catch (e) {
    // Continue to regex matching
  }

  // Try to find complete JSON array in the response
  const jsonMatch = rawResponse.match(/\[[\s\S]*\]/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Invalid array structure')
      }
      
      if (!parsed.every(item => item.title && item.description)) {
        throw new Error('Missing title or description')
      }
      
      return parsed
    } catch (e) {
      console.error('Failed to parse JSON array:', e.message)
      console.error('JSON string:', jsonMatch[0].substring(0, 200))
    }
  }
  
  // Try to find a single JSON object
  const objectMatch = rawResponse.match(/\{[\s\S]*?\}/)
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0])
      if (parsed.title && parsed.description) {
        console.log('⚠️  Found single object in response, wrapping it')
        return [parsed]
      }
    } catch (e) {
      console.error('Failed to parse JSON object:', e.message)
    }
  }
  
  console.error('Failed to find JSON array in response:', rawResponse.substring(0, 200))
  throw new Error('No valid JSON found in response')
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

// Regenerate single advantage
app.post('/api/regenerate-advantage', async (req, res) => {
  try {
    const { ticker, advantageIndex } = req.body
    
    if (!ticker || advantageIndex === undefined) {
      return res.status(400).json({ error: 'Missing ticker or advantageIndex' })
    }

    // Load bundle
    const bundle = await loadBundle()
    const tickerData = bundle[ticker]
    
    if (!tickerData) {
      return res.status(404).json({ error: `Ticker ${ticker} not found` })
    }

    // Get company name (use ticker if no name available)
    const companyName = tickerData.ticker || ticker
    
    // Generate new advantage using Ollama
    const systemPrompt = SYSTEM_PROMPTS.advantages
    const userPrompt = `Company: ${companyName} (${ticker})\n\nGenerate ONE competitive advantage (different from existing ones).`

    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: userPrompt,
        system: systemPrompt,
        stream: false
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`)
    }

    const data = await response.json()
    const advantages = parseAIResponse(data.response)

    // Get the first advantage from the response
    const newAdvantage = advantages[0] || {
      title: "Competitive Strength",
      description: "Notable advantage in market positioning."
    }

    res.json({ advantage: newAdvantage })
  } catch (error) {
    console.error('Error regenerating advantage:', error)
    res.status(500).json({ error: error.message })
  }
})

// Regenerate single risk
app.post('/api/regenerate-risk', async (req, res) => {
  try {
    const { ticker, riskIndex } = req.body
    
    if (!ticker || riskIndex === undefined) {
      return res.status(400).json({ error: 'Missing ticker or riskIndex' })
    }

    // Load bundle
    const bundle = await loadBundle()
    const tickerData = bundle[ticker]
    
    if (!tickerData) {
      return res.status(404).json({ error: `Ticker ${ticker} not found` })
    }

    // Get company name (use ticker if no name available)
    const companyName = tickerData.ticker || ticker
    
    // Generate new risk using Ollama
    const systemPrompt = SYSTEM_PROMPTS.risks
    const userPrompt = `Company: ${companyName} (${ticker})\n\nGenerate ONE investment risk (different from existing ones).`

    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: userPrompt,
        system: systemPrompt,
        stream: false
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`)
    }

    const data = await response.json()
    const risks = parseAIResponse(data.response)

    // Get the first risk from the response
    const newRisk = risks[0] || {
      title: "Investment Risk",
      description: "Potential challenges to business performance."
    }

    res.json({ risk: newRisk })
  } catch (error) {
    console.error('Error regenerating risk:', error)
    res.status(500).json({ error: error.message })
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 AI Insights Tool Server running on http://localhost:${PORT}`)
  console.log(`📁 Bundle file: ${BUNDLE_FILE}`)
  console.log(`🤖 Ollama URL: ${OLLAMA_BASE_URL}`)
  console.log(`🧠 Model: ${OLLAMA_MODEL}\n`)
})
