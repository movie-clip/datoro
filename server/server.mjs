// server/server.mjs — FMP Proxy Server (ESM, Node 18+)
// Run: npm run server (or: node server/server.mjs)

import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '..', '.env.local') })

const PORT = process.env.PORT || 7071
const DEV_ORIGIN = process.env.DEV_ORIGIN || 'http://localhost:5173'
const FMP_API_KEY = process.env.FMP_API_KEY || ''
const AI_PROVIDER = process.env.VITE_AI_PROVIDER || 'openai'
const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY || ''
const OLLAMA_BASE_URL = process.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.VITE_OLLAMA_MODEL || 'llama3.2'

// Cache directory for AI responses
const CACHE_DIR = join(__dirname, '..', '.ai-cache')
if (!existsSync(CACHE_DIR)) {
  mkdirSync(CACHE_DIR, { recursive: true })
}

const app = express()
app.use(cors({ origin: DEV_ORIGIN, credentials: false }))
app.use(express.json())

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

app.use('/api/fmp', async (req, res) => {
  try {
    if (!FMP_API_KEY) {
      console.error('[FMP] API key not configured')
      return res.status(500).json({ error: 'FMP_API_KEY is not set on the server' })
    }
    // Remove /api/fmp prefix and parse query params
    const subpath = req.url.replace(/^\/api\/fmp/, '')
    const [path, query] = subpath.split('?')
    const params = new URLSearchParams(query || '')
    // Add API key (override if client mistakenly sent one)
    params.set('apikey', FMP_API_KEY)
    const upstream = `https://financialmodelingprep.com${path}?${params.toString()}`
    
    console.log(`[FMP] ${req.method} ${subpath} → ${upstream}`)
    
    // Forward all headers except host
    const headers = { ...req.headers, host: 'financialmodelingprep.com', 'user-agent': UA }
    delete headers['host']
    const method = req.method || 'GET'
    const options = { method, headers }
    if (method !== 'GET' && method !== 'HEAD') {
      options.body = req.body
    }
    const fmpRes = await fetch(upstream, options)
    const contentType = fmpRes.headers.get('content-type') || 'application/json'
    
    console.log(`[FMP] Response: ${fmpRes.status} ${contentType}`)
    
    res.status(fmpRes.status).type(contentType)
    const buf = await fmpRes.arrayBuffer()
    res.send(Buffer.from(buf))
  } catch (e) {
    console.error('[FMP] Error:', e)
    res.status(500).json({ error: String(e.message || e) })
  }
})

// -------------------- AI Analysis with File Cache --------------------
function getCacheFilePath(ticker, type) {
  return join(CACHE_DIR, `${type}_${ticker}.json`)
}

function getCachedAIResponse(ticker, type) {
  const filePath = getCacheFilePath(ticker, type)
  if (!existsSync(filePath)) return null
  
  try {
    const content = readFileSync(filePath, 'utf8')
    const { data, timestamp } = JSON.parse(content)
    const age = Date.now() - timestamp
    const maxAge = 30 * 24 * 60 * 60 * 1000 // 30 days
    
    if (age < maxAge) {
      console.log(`[AI] Using cached ${type} for ${ticker}`)
      return data
    }
    return null
  } catch (error) {
    console.error('[AI] Cache read error:', error)
    return null
  }
}

function setCachedAIResponse(ticker, type, data) {
  const filePath = getCacheFilePath(ticker, type)
  try {
    const content = JSON.stringify({ data, timestamp: Date.now() }, null, 2)
    writeFileSync(filePath, content, 'utf8')
    console.log(`[AI] Cached ${type} for ${ticker}`)
  } catch (error) {
    console.error('[AI] Cache write error:', error)
  }
}

async function callAIProvider(ticker, companyName, type, systemPrompt) {
  if (AI_PROVIDER === 'ollama') {
    const prompt = `${systemPrompt}\n\nCompany: ${companyName} (${ticker})`
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.7, num_predict: 400 }
      })
    })
    if (!response.ok) throw new Error(`Ollama error: ${response.status}`)
    const result = await response.json()
    return result.response
  } else if (AI_PROVIDER === 'openai') {
    if (!OPENAI_API_KEY) throw new Error('OpenAI API key not configured')
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
          { role: 'user', content: `Company: ${companyName} (${ticker})` }
        ],
        temperature: 0.7,
        max_tokens: 400
      })
    })
    if (!response.ok) throw new Error(`OpenAI error: ${response.status}`)
    const result = await response.json()
    return result.choices[0].message.content
  } else {
    throw new Error(`Unknown AI provider: ${AI_PROVIDER}`)
  }
}

function parseAndValidateJSON(rawResponse) {
  try {
    // Try to find complete JSON array
    const jsonMatch = rawResponse.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return { success: false, error: 'No JSON array found' }
    }
    
    const jsonStr = jsonMatch[0]
    const parsed = JSON.parse(jsonStr)
    
    // Validate structure
    if (!Array.isArray(parsed)) {
      return { success: false, error: 'Not an array' }
    }
    
    if (parsed.length === 0) {
      return { success: false, error: 'Empty array' }
    }
    
    if (!parsed.every(item => item.title && item.description)) {
      return { success: false, error: 'Missing title or description' }
    }
    
    return { success: true, data: parsed, error: null }
  } catch (parseError) {
    return { success: false, error: parseError.message }
  }
}

app.post('/api/ai/analysis', async (req, res) => {
  try {
    const { ticker, companyName, type, systemPrompt, clearCache } = req.body
    
    if (!ticker || !type) {
      return res.status(400).json({ error: 'Missing ticker or type' })
    }
    
    const t = ticker.trim().toUpperCase()
    const company = companyName || t
    
    console.log(`[AI] Request: ticker=${t}, companyName=${company}, type=${type}`)
    
    // Check cache first (unless clearCache is true)
    if (!clearCache) {
      const cached = getCachedAIResponse(t, type)
      if (cached) {
        console.log(`[AI] Cache hit for ${t} ${type}`)
        return res.json({ data: cached, cached: true, provider: AI_PROVIDER })
      }
    }
    
    // Retry logic: try up to 2 times
    let parsedData = null
    let lastError = null
    
    for (let attempt = 1; attempt <= 2; attempt++) {
      console.log(`[AI] Attempt ${attempt}/2: Fetching ${type} for ${t} (${company}) from ${AI_PROVIDER}...`)
      
      try {
        const rawResponse = await callAIProvider(t, company, type, systemPrompt)
        console.log(`[AI] Raw response (first 200 chars): ${rawResponse.substring(0, 200)}...`)
        
        const result = parseAndValidateJSON(rawResponse)
        
        if (result.success) {
          parsedData = { success: true, data: result.data, error: null }
          console.log(`[AI] ✓ Successfully parsed ${result.data.length} items on attempt ${attempt}`)
          break
        } else {
          lastError = result.error
          console.log(`[AI] ✗ Attempt ${attempt} failed: ${result.error}`)
          
          if (attempt === 2) {
            // Last attempt failed - don't cache, return error
            console.log(`[AI] Both attempts failed. Not caching.`)
            return res.json({
              data: {
                success: false,
                data: [{ 
                  title: 'Format Error', 
                  description: 'AI response format is invalid. Please click Refresh to try again.' 
                }],
                error: `Failed after 2 attempts: ${lastError}`
              },
              cached: false,
              provider: AI_PROVIDER,
              shouldRetry: true
            })
          }
          
          // Wait 1 second before retry
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      } catch (callError) {
        lastError = callError.message
        console.log(`[AI] ✗ Attempt ${attempt} error: ${callError.message}`)
        
        if (attempt === 2) {
          return res.status(500).json({ 
            error: lastError || 'AI request failed', 
            provider: AI_PROVIDER 
          })
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    // Cache only if we got valid data
    if (parsedData && parsedData.success) {
      setCachedAIResponse(t, type, parsedData)
    }
    
    res.json({ data: parsedData, cached: false, provider: AI_PROVIDER })
  } catch (error) {
    console.error('[AI] Error:', error)
    res.status(500).json({ error: error.message || 'AI request failed', provider: AI_PROVIDER })
  }
})

// -------------------- Health --------------------
app.get('/api/health', (_req, res) => res.json({ ok: true }))

const server = app.listen(PORT, () => {
  console.log(`FMP Proxy Server listening on http://localhost:${PORT}`)
  console.log(`CORS allowed origin: ${DEV_ORIGIN}`)
  console.log(`FMP API: ${FMP_API_KEY ? 'ENABLED' : 'DISABLED (set FMP_API_KEY)'}`)
})

server.on('error', (err) => {
  console.error('[SERVER] Error:', err)
  process.exit(1)
})

// Keep process alive
process.on('SIGINT', () => {
  console.log('\n[SERVER] Shutting down gracefully...')
  server.close(() => {
    console.log('[SERVER] Server closed')
    process.exit(0)
  })
})
