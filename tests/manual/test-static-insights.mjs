#!/usr/bin/env node
/**
 * Test the static AI insights service
 * Verifies JSON files can be loaded and have correct structure
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const INSIGHTS_DIR = path.join(__dirname, '../../public/ai-insights')

async function testInsightFile(ticker) {
  const filename = `${ticker.toLowerCase()}.json`
  const filepath = path.join(INSIGHTS_DIR, filename)
  
  try {
    const content = await fs.readFile(filepath, 'utf8')
    const data = JSON.parse(content)
    
    // Validate structure
    const required = ['ticker', 'companyName', 'lastUpdated', 'version', 'insights']
    const missing = required.filter(field => !(field in data))
    
    if (missing.length > 0) {
      console.log(`✗ ${ticker}: Missing fields: ${missing.join(', ')}`)
      return false
    }
    
    // Validate insights
    if (!data.insights.competitiveAdvantages || !data.insights.investmentRisks) {
      console.log(`✗ ${ticker}: Missing insights content`)
      return false
    }
    
    // Check if insights are arrays (new format) or strings (old format)
    const isArray = Array.isArray(data.insights.competitiveAdvantages)
    
    if (isArray) {
      // New format: array of {title, description} objects
      const advCount = data.insights.competitiveAdvantages.length
      const riskCount = data.insights.investmentRisks.length
      
      console.log(`✓ ${ticker}: ${data.companyName}`)
      console.log(`  Advantages: ${advCount} items`)
      console.log(`  Risks: ${riskCount} items`)
      console.log(`  Version: ${data.version}, Updated: ${data.lastUpdated}`)
    } else {
      // Old format: plain text strings
      const advLen = data.insights.competitiveAdvantages.length
      const riskLen = data.insights.investmentRisks.length
      
      console.log(`✓ ${ticker}: ${data.companyName}`)
      console.log(`  Advantages: ${advLen} chars (old format)`)
      console.log(`  Risks: ${riskLen} chars (old format)`)
      console.log(`  Version: ${data.version}, Updated: ${data.lastUpdated}`)
    }
    
    return true
  } catch (_error) {
    console.log(`✗ ${ticker}: ${error.message}`)
    return false
  }
}

async function main() {
  console.log('🧪 Testing AI Insights Static Files\n')
  
  const testTickers = ['AAPL', 'MSFT', 'GOOGL']
  const results = []
  
  for (const ticker of testTickers) {
    const success = await testInsightFile(ticker)
    results.push({ ticker, success })
    console.log('')
  }
  
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  
  console.log('='.repeat(50))
  console.log(`✓ Passed: ${successful}/${testTickers.length}`)
  if (failed > 0) {
    console.log(`✗ Failed: ${failed}`)
    process.exit(1)
  } else {
    console.log('\n✅ All tests passed!')
  }
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
