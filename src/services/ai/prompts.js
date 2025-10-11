// AI prompt templates for financial analysis
// These prompts instruct the AI to return structured JSON responses

export const SYSTEM_PROMPTS = {
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

// Parse AI response and extract JSON
export function parseAIResponse(rawResponse) {
  try {
    // Try to find JSON in the response (in case AI adds extra text)
    const jsonMatch = rawResponse.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('No JSON array found in response')
    }

    const parsed = JSON.parse(jsonMatch[0])
    
    // Validate structure
    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array')
    }

    // Validate each item has title and description
    for (const item of parsed) {
      if (!item.title || !item.description) {
        throw new Error('Invalid item structure')
      }
    }

    return { success: true, data: parsed, error: null }
  } catch (error) {
    console.error('Failed to parse AI response:', error)
    
    // Fallback: return raw response as single item
    return {
      success: false,
      data: [{
        title: 'Analysis',
        description: rawResponse.trim()
      }],
      error: error.message
    }
  }
}
