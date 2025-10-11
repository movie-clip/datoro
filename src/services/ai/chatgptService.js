// Service for AI API integration with server-side file caching
import { SYSTEM_PROMPTS } from './prompts.js'

// Call server endpoint for AI analysis
async function callServerAI(ticker, companyName, type, clearCache = false) {
  const systemPrompt = SYSTEM_PROMPTS[type]
  
  const response = await fetch('http://localhost:7071/api/ai/analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ticker,
      companyName,
      type,
      systemPrompt,
      clearCache
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  const result = await response.json()
  return result
}

// Main function: get competitive advantages with caching
export async function getCompetitiveAdvantages(ticker, companyName, clearCache = false) {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) return { data: null, error: 'No ticker provided' }

  try {
    const result = await callServerAI(t, companyName || t, 'advantages', clearCache)
    
    if (result.cached) {
      console.log(`✓ Loaded competitive advantages for ${t} from server cache`)
    } else {
      console.log(`✓ Fetched and cached competitive advantages for ${t}`)
    }
    
    return { 
      data: result.data, 
      error: null, 
      cached: result.cached, 
      provider: result.provider 
    }
  } catch (error) {
    return { data: null, error: error.message || 'Failed to fetch analysis' }
  }
}

// Main function: get investment risks with caching
export async function getInvestmentRisks(ticker, companyName, clearCache = false) {
  const t = (ticker || '').trim().toUpperCase()
  if (!t) return { data: null, error: 'No ticker provided' }

  try {
    const result = await callServerAI(t, companyName || t, 'risks', clearCache)
    
    if (result.cached) {
      console.log(`✓ Loaded investment risks for ${t} from server cache`)
    } else {
      console.log(`✓ Fetched and cached investment risks for ${t}`)
    }
    
    return { 
      data: result.data, 
      error: null, 
      cached: result.cached, 
      provider: result.provider 
    }
  } catch (error) {
    return { data: null, error: error.message || 'Failed to fetch analysis' }
  }
}

// Note: clearAnalysisCache is no longer needed as cache is managed server-side
// The clearCache flag is passed to the server via callServerAI()
