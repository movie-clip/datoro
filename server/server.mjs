// server/server.mjs — Yahoo + Finnhub proxy (ESM, Node 18+)
// Run:  FINNHUB_API_KEY=YOUR_KEY node server/server.mjs

import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'
import fetchCookie from 'fetch-cookie'
import { CookieJar } from 'tough-cookie'

const PORT = process.env.PORT || 7071
const DEV_ORIGIN = process.env.DEV_ORIGIN || 'http://localhost:5173'
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || ''

const app = express()
app.use(cors({ origin: DEV_ORIGIN, credentials: false }))

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// ---------- Yahoo crumb plumbing (kept for potential future use) ----------
const jar = new CookieJar()
const cookieFetch = fetchCookie(fetch, jar)
let crumb = null
let crumbTs = 0
const CRUMB_TTL_MS = 15 * 60 * 1000

function decodeCrumb(maybeEscaped) {
  try { return JSON.parse(`"${maybeEscaped}"`) } catch {
    return maybeEscaped.replace(/\\u002F/g, '/').replace(/\\u0026/g, '&').replace(/\\/g, '')
  }
}

async function getCrumbFromHtml(symbol) {
  const url = `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}?p=${encodeURIComponent(symbol)}`
  const resp = await cookieFetch(url, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Referer': 'https://finance.yahoo.com/' },
  })
  const html = await resp.text()
  const m = html.match(/"CrumbStore":\{"crumb":"(.*?)"\}/)
  return m?.[1] ? decodeCrumb(m[1]) : null
}

async function getCrumbFromApi() {
  const resp = await cookieFetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': UA, 'Accept': 'text/plain', 'Referer': 'https://finance.yahoo.com/' },
  })
  const txt = (await resp.text()).trim()
  return txt || null
}

async function ensureCrumb(symbol = 'AAPL') {
  const now = Date.now()
  if (crumb && now - crumbTs < CRUMB_TTL_MS) return crumb
  const c1 = await getCrumbFromHtml(symbol)
  if (c1) { crumb = c1; crumbTs = now; return crumb }
  const c2 = await getCrumbFromApi()
  if (c2) { crumb = c2; crumbTs = now; return crumb }
  throw new Error('Failed to obtain Yahoo crumb')
}

// -------------------- Health --------------------
app.get('/api/health', (_req, res) => res.json({ ok: true }))

// -------------------- Yahoo (optional) --------------------
app.post('/api/yahoo/reset', (_req, res) => {
  crumb = null; crumbTs = 0
  jar.removeAllCookiesSync?.()
  res.json({ ok: true })
})

app.get('/api/yahoo/quote', async (req, res) => {
  try {
    const symbols = String(req.query.symbols || '').toUpperCase()
    const lang = String(req.query.lang || 'en-US')
    const region = String(req.query.region || 'US')
    if (!symbols) return res.status(400).json({ error: 'Missing symbols' })

    const url =
      `https://query1.finance.yahoo.com/v7/finance/quote` +
      `?symbols=${encodeURIComponent(symbols)}&lang=${encodeURIComponent(lang)}&region=${encodeURIComponent(region)}`
    const y = await cookieFetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://finance.yahoo.com/' },
    })
    const body = await y.text()
    res.status(y.status).type('application/json').send(body)
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) })
  }
})

app.get('/api/yahoo/quoteSummary', async (req, res) => {
  try {
    const symbol = String(req.query.symbol || '').toUpperCase()
    const modules = String(req.query.modules || 'incomeStatementHistory')
    const region = String(req.query.region || 'US')
    const lang = String(req.query.lang || 'en-US')
    if (!symbol) return res.status(400).json({ error: 'Missing symbol' })

    const c = await ensureCrumb(symbol)
    const url =
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}` +
      `?lang=${encodeURIComponent(lang)}&region=${encodeURIComponent(region)}` +
      `&modules=${encodeURIComponent(modules)}&crumb=${encodeURIComponent(c)}`
    const y = await cookieFetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://finance.yahoo.com/' },
    })
    const body = await y.text()
    res.status(y.status).type('application/json').send(body)
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) })
  }
})

app.get('/api/yahoo/timeseries', async (req, res) => {
  try {
    const symbol = String(req.query.symbol || '').toUpperCase()
    const type = String(req.query.type || '')
    const period1 = String(req.query.period1 || '0')
    const period2 = String(req.query.period2 || `${Math.floor(Date.now()/1000)}`)
    const lang = String(req.query.lang || 'en-US')
    const region = String(req.query.region || 'US')
    if (!symbol || !type) return res.status(400).json({ error: 'Missing symbol or type' })

    const url =
      `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}` +
      `?type=${encodeURIComponent(type)}&period1=${encodeURIComponent(period1)}&period2=${encodeURIComponent(period2)}&merge=false&lang=${encodeURIComponent(lang)}&region=${encodeURIComponent(region)}`
    const y = await cookieFetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json', 'Referer': 'https://finance.yahoo.com/' },
    })
    const body = await y.text()
    res.status(y.status).type('application/json').send(body)
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) })
  }
})

// =====================================================================
//                          FINNHUB  (FIXED WILDCARD)
// =====================================================================
// Use app.use with mount path OR a named splat to avoid path-to-regexp v6 error.
// Here we mount with app.use so any subpath under /api/finnhub is proxied.

app.use('/api/finnhub', async (req, res) => {
  try {
    if (!FINNHUB_KEY) return res.status(500).json({ error: 'FINNHUB_API_KEY is not set on the server' })

    // Under this mount, req.url is the subpath beginning with '/' (e.g. '/stock/profile2?symbol=ACN')
    const subpath = req.url.split('?')[0] || '/'
    const qs = new URLSearchParams(req.query)
    if (!qs.has('token')) qs.set('token', FINNHUB_KEY)

    const upstream = `https://finnhub.io/api/v1${subpath}?${qs.toString()}`
    const r = await fetch(upstream, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } })
    const text = await r.text()
    res.status(r.status).type('application/json').send(text)
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) })
  }
})

app.listen(PORT, () => {
  console.log(`Proxy listening on http://localhost:${PORT}`)
  console.log(`CORS allowed origin: ${DEV_ORIGIN}`)
  console.log(`Finnhub proxy: ${FINNHUB_KEY ? 'ENABLED' : 'DISABLED (set FINNHUB_API_KEY)'}`)
})
