// server/server.mjs — FMP Proxy Server (ESM, Node 18+)
// Run: npm run server (or: node server/server.mjs)

import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '..', '.env.local') })

const PORT = process.env.PORT || 7071
const DEV_ORIGIN = process.env.DEV_ORIGIN || 'http://localhost:5173'
const FMP_API_KEY = process.env.FMP_API_KEY || ''

const app = express()
app.use(cors({ origin: DEV_ORIGIN, credentials: false }))

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
