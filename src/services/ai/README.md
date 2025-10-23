# AI Analysis Service

## Overview
This service loads pre-generated AI analysis from a static JSON bundle. AI insights are generated locally using `scripts/generate-ai-insights.mjs` and stored in `public/ai-insights.json`.

## Benefits
- **Zero API costs**: No OpenAI/Ollama API calls at runtime
- **Fast loading**: Static files served from CDN
- **Predictable quality**: Pre-reviewed insights
- **No rate limits**: Unlimited concurrent users

## Response Format
All AI insights follow a structured JSON format:

```json
{
  "ticker": "AAPL",
  "companyName": "Apple Inc.",
  "generated": "2025-01-15T10:30:00.000Z",
  "version": "1.0",
  "advantages": [
    {
      "title": "Brand Loyalty",
      "description": "Apple has cultivated exceptional brand loyalty with a retention rate above 90%."
    }
  ],
  "risks": [
    {
      "title": "China Dependence",
      "description": "Over 20% of revenue from China creates geopolitical and economic risk."
    }
  ]
}
```

## Analysis Types

### Competitive Advantages
Analyzes the company's competitive moats and strengths:
- Brand loyalty and strength
- Market position
- Technology and innovation
- Network effects
- Switching costs
- Unique assets

### Investment Risks
Analyzes key risks to consider:
- Competition
- Regulatory concerns
- Market dependence
- Technological disruption
- Cyclicality
- Valuation concerns

## Generating Insights

### Single Ticker
```bash
node scripts/generate-ai-insights.mjs AAPL
```

### Multiple Tickers
```bash
node scripts/generate-ai-insights.mjs AAPL MSFT GOOGL
```

### Test Portfolio
```bash
node scripts/generate-ai-insights.mjs AAPL MSFT AMZN GOOGL CRM ASML TSM DUOL SPGI MSCI
```

See `scripts/generate-ai-insights.mjs` for generation details.

## Usage Example

```javascript
import { getCompetitiveAdvantages, getInvestmentRisks } from './ai/chatgptService'

// Fetch competitive advantages from static JSON
const result = await getCompetitiveAdvantages('AAPL', 'Apple Inc.')

// Result structure:
{
  data: {
    success: true,
    data: [
      { title: "Brand Loyalty", description: "..." },
      { title: "Ecosystem Lock-in", description: "..." }
    ]
  },
  error: null,
  cached: true  // All static files are considered "cached"
}
```

## File Structure

```
public/
  ai-insights.json     # Bundle with all AI insights (used by app)
```

The bundle format is optimized for size and performance:
```json
{
  "AAPL": {
    "advantages": [...],
    "risks": [...],
    "updated": "2025-10-17",
    "provider": "ollama"
  },
  "MSFT": { ... }
}
```

## Error Handling

- Missing file: Shows "AI insights not available for {TICKER}"
- Invalid JSON: Shows parse error with details
- Network errors: Shows connection error message

## Migrating to Static Approach

If you previously used OpenAI/Ollama API:
1. Generate insights: `node scripts/generate-ai-insights.mjs {TICKERS}`
2. Review generated bundle in `public/ai-insights.json`
3. Deploy with bundle file
4. No API keys or configuration needed!

## Best Practices

1. **Keep prompts concise**: Focus on 3-4 key points
2. **Be specific**: Include example JSON format in prompts
3. **Validate responses**: Use parseAIResponse() to ensure structure
4. **Cache aggressively**: Minimize API costs and improve UX
5. **Provide fallbacks**: Handle parsing errors gracefully
