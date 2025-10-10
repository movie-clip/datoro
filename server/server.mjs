// server/server.mjs — Yahoo fundamentals proxy with HTML-crumb fallback (ESM)
import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'
import fetchCookie from 'fetch-cookie'
import { CookieJar } from 'tough-cookie'

const PORT = process.env.PORT || 7071
const DEV_ORIGIN = process.env.DEV_ORIGIN || 'http://localhost:5173'

const app = express()
app.use(cors({ origin: DEV_ORIGIN, credentials: false }))

// Cookie jar across all requests
const jar = new CookieJar()
const cookieFetch = fetchCookie(fetch, jar)

// Reasonable browser UA helps avoid blocks/consent variants
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

let crumb = null
let crumbTs = 0
const CRUMB_TTL_MS = 15 * 60 * 1000 // 15 minutes

function decodeCrumb(maybeEscaped) {
  try { return JSON.parse(`"${maybeEscaped}"`) }
  catch {
    return maybeEscaped
      .replace(/\\u002F/g, '/')
      .replace(/\\u0026/g, '&')
      .replace(/\\/g, '')
  }
}

async function getCrumbFromHtml(symbol) {
  const url = `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}?p=${encodeURIComponent(symbol)}`
  const resp = await cookieFetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })
  const html = await resp.text()
  const m = html.match(/"CrumbStore":\{"crumb":"(.*?)"\}/)
  return m?.[1] ? decodeCrumb(m[1]) : null
}

async function getCrumbFromApi() {
  const resp = await cookieFetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': UA, 'Accept': 'text/plain' },
  })
  const txt = (await resp.text()).trim()
  return txt || null
}

async function ensureCrumb(symbol = 'AAPL') {
  const now = Date.now()
  if (crumb && now - crumbTs < CRUMB_TTL_MS) return crumb

  // 1) Try HTML crumb
  const htmlCrumb = await getCrumbFromHtml(symbol)
  if (htmlCrumb) {
    crumb = htmlCrumb
    crumbTs = now
    return crumb
  }

  // 2) Fallback to legacy endpoint
  const apiCrumb = await getCrumbFromApi()
  if (apiCrumb) {
    crumb = apiCrumb
    crumbTs = now
    return crumb
  }

  throw new Error('Failed to obtain Yahoo crumb')
}

// Example proxy for endpoints that still require crumb/cookies:
// GET /api/yahoo/quoteSummary?symbol=MSFT&modules=incomeStatementHistory
app.get('/api/yahoo/quoteSummary', async (req, res) => {
  try {
    const symbol = String(req.query.symbol || '').toUpperCase()
    const modules = String(req.query.modules || 'incomeStatementHistory')
    const region = String(req.query.region || 'US')
    const lang   = String(req.query.lang || 'en-US')
    if (!symbol) return res.status(400).json({ error: 'Missing symbol' })

    const c = await ensureCrumb(symbol)

    const url =
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}` +
      `?lang=${encodeURIComponent(lang)}&region=${encodeURIComponent(region)}` +
      `&modules=${encodeURIComponent(modules)}&crumb=${encodeURIComponent(c)}`

    const y = await cookieFetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
    })

    const body = await y.text() // passthrough JSON text
    res.status(y.status).type('application/json').send(body)
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) })
  }
})

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.post('/api/yahoo/reset', (_req, res) => {
  crumb = null
  crumbTs = 0
  // clear cookies if supported by tough-cookie version
  jar.removeAllCookiesSync?.()
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`Yahoo fundamentals proxy listening on http://localhost:${PORT}`)
  console.log(`CORS allowed origin: ${DEV_ORIGIN}`)
})
