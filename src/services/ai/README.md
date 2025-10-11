# AI Analysis Service

## Overview
This service provides AI-powered financial analysis for companies using either OpenAI's GPT-4o-mini or local Ollama models.

## Response Format
All AI responses follow a structured JSON format for consistency and easy formatting:

```json
[
  {
    "title": "Short Title (2-5 words)",
    "description": "1-2 sentence description"
  },
  {
    "title": "Another Title",
    "description": "Another description"
  }
]
```

## Analysis Types

### Competitive Advantages (`advantages`)
Analyzes the company's competitive moats and strengths:
- Brand loyalty and strength
- Market position
- Technology and innovation
- Network effects
- Switching costs
- Unique assets

### Investment Risks (`risks`)
Analyzes key risks to consider:
- Competition
- Regulatory concerns
- Market dependence
- Technological disruption
- Cyclicality
- Valuation concerns

## Prompt Configuration

All prompts are centrally managed in `prompts.js`:
- **SYSTEM_PROMPTS**: Contains the system prompts for each analysis type
- **parseAIResponse()**: Parses raw AI responses and validates JSON structure

### Modifying Prompts

To customize the analysis:

1. Edit `src/services/ai/prompts.js`
2. Modify the `SYSTEM_PROMPTS` object
3. Ensure the prompt instructs the AI to return JSON format
4. Keep the example format in the prompt for consistency

Example:
```javascript
export const SYSTEM_PROMPTS = {
  advantages: `You are a financial analyst...
  
  Return ONLY a JSON array of objects with "title" and "description" fields.
  ...
  `
}
```

## Response Parsing

The `parseAIResponse()` function:
1. Extracts JSON array from the response (handles extra text)
2. Validates array structure
3. Validates each item has `title` and `description`
4. Falls back to plain text format if parsing fails

## Caching

Responses are cached in localStorage for 30 days:
- Cache key format: `ai_analysis_{type}_{ticker}`
- Cache includes timestamp for expiry calculation
- Use refresh button to clear cache and re-fetch

## Configuration

See `.env.local` for configuration options:
- `VITE_AI_PROVIDER`: `openai` or `ollama`
- `VITE_OPENAI_API_KEY`: OpenAI API key (if using OpenAI)
- `VITE_OLLAMA_BASE_URL`: Ollama server URL (default: `http://localhost:11434`)
- `VITE_OLLAMA_MODEL`: Ollama model name (default: `llama3.2`)

## Usage Example

```javascript
import { getCompetitiveAdvantages, getInvestmentRisks } from './ai/chatgptService'

// Fetch competitive advantages
const result = await getCompetitiveAdvantages('AAPL', 'Apple Inc.')

// Result structure:
{
  data: {
    success: true,
    data: [
      { title: "Brand Loyalty", description: "..." },
      { title: "Ecosystem Lock-in", description: "..." }
    ],
    error: null
  },
  error: null,
  cached: false,
  provider: 'ollama'
}
```

## Error Handling

- Network errors: Displays connection error message
- API errors: Shows API-specific error details
- Parse errors: Falls back to plain text display
- Missing config: Shows configuration error

## Best Practices

1. **Keep prompts concise**: Focus on 3-4 key points
2. **Be specific**: Include example JSON format in prompts
3. **Validate responses**: Use parseAIResponse() to ensure structure
4. **Cache aggressively**: Minimize API costs and improve UX
5. **Provide fallbacks**: Handle parsing errors gracefully
