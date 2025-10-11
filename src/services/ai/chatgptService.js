// Service for ChatGPT API integration with caching
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''
const CACHE_DURATION_DAYS = 30
const CACHE_KEY_PREFIX = 'chatgpt_analysis_'

// System prompts for consistent responses
const PROMPTS = {
  advantages: `You are a concise financial analyst. Analyze the competitive advantages of the given company.
Format your response as 3-4 bullet points (use • symbol), each 1-2 sentences max.
Focus on: moat, brand strength, market position, technology, network effects, switching costs, or unique assets.
Be specific and factual. Total response should be under 150 words.`,

  risks: `You are a concise financial analyst. Analyze the key investment risks for the given company.
Format your response as 3-4 bullet points (use • symbol), each 1-2 sentences max.
Focus on: competition, regulation, market dependence, technological disruption, cyclicality, or valuation concerns.
Be specific and factual. Total response should be under 150 words.`
}

// Check if cached response is still valid
function getCachedResponse(ticker, type) {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${type}_${ticker}`
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return null

    const { data, timestamp } = JSON.parse(cached)
    const age = Date.now() - timestamp
    const maxAge = CACHE_DURATION_DAYS * 24 * 60 * 60 * 1000

    if (age < maxAge) {
      console.log(`Using cached ${type} for ${ticker}`)
      return data
    } else {
      localStorage.removeItem(cacheKey)
      return null
    }
  } catch (error) {
    console.error('Cache read error:', error)
    return null
  }
}

// Save response to cache
function setCachedResponse(ticker, type, data) {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${type}_${ticker}`
    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now()
    }))
  } catch (error) {
    console.error('Cache write error:', error)
  }
}

// Call ChatGPT API
async function callChatGPT(ticker, companyName, type) {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }

  const systemPrompt = PROMPTS[type]
  const userPrompt = `Company: ${companyName} (${ticker})`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // Cheaper and faster model
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 250
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || `HTTP ${response.status}`)
  }

  const result = await response.json()
  return result.choices[0].message.content
}

// Main function: get competitive advantages with caching
export async function getCompetitiveAdvantages(ticker, companyName) {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) return { data: null, error: 'No ticker provided' }

  try {
    // Check cache first
    const cached = getCachedResponse(t, 'advantages')
    if (cached) {
      return { data: cached, error: null, cached: true }
    }

    // Call API
    const result = await callChatGPT(t, companyName || t, 'advantages')
    
    // Cache the result
    setCachedResponse(t, 'advantages', result)
    
    return { data: result, error: null, cached: false }
  } catch (error) {
    return { data: null, error: error.message || 'Failed to fetch analysis' }
  }
}

// Main function: get investment risks with caching
export async function getInvestmentRisks(ticker, companyName) {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) return { data: null, error: 'No ticker provided' }

  try {
    // Check cache first
    const cached = getCachedResponse(t, 'risks')
    if (cached) {
      return { data: cached, error: null, cached: true }
    }

    // Call API
    const result = await callChatGPT(t, companyName || t, 'risks')
    
    // Cache the result
    setCachedResponse(t, 'risks', result)
    
    return { data: result, error: null, cached: false }
  } catch (error) {
    return { data: null, error: error.message || 'Failed to fetch analysis' }
  }
}

// Clear cache for a specific ticker (useful for refresh)
export function clearAnalysisCache(ticker, type = null) {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) return

  if (type) {
    localStorage.removeItem(`${CACHE_KEY_PREFIX}${type}_${t}`)
  } else {
    localStorage.removeItem(`${CACHE_KEY_PREFIX}advantages_${t}`)
    localStorage.removeItem(`${CACHE_KEY_PREFIX}risks_${t}`)
  }
}
