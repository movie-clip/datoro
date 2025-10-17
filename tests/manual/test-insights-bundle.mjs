#!/usr/bin/env node
/**
 * Test the bundled AI insights service
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BUNDLE_PATH = path.join(__dirname, '../../public/ai-insights.json')

async function testBundle() {
  console.log('🧪 Testing AI Insights Bundle\n')
  
  // Load bundle
  const content = await fs.readFile(BUNDLE_PATH, 'utf8')
  const bundle = JSON.parse(content)
  
  const tickers = Object.keys(bundle)
  console.log(`✓ Loaded bundle with ${tickers.length} tickers`)
  console.log(`  Tickers: ${tickers.join(', ')}\n`)
  
  // Test each ticker
  let passed = 0
  let failed = 0
  
  for (const ticker of tickers) {
    const data = bundle[ticker]
    
    // Validate structure
    if (!data.advantages || !data.risks) {
      console.log(`✗ ${ticker}: Missing advantages or risks`)
      failed++
      continue
    }
    
    if (!Array.isArray(data.advantages) || !Array.isArray(data.risks)) {
      console.log(`✗ ${ticker}: Invalid data format`)
      failed++
      continue
    }
    
    const advCount = data.advantages.length
    const riskCount = data.risks.length
    
    console.log(`✓ ${ticker}: ${advCount} advantages, ${riskCount} risks`)
    passed++
  }
  
  // Calculate size
  const bundleSize = (content.length / 1024).toFixed(1)
  const estimatedGzip = (content.length * 0.25 / 1024).toFixed(1)
  
  console.log('\n' + '='.repeat(50))
  console.log('📊 Summary')
  console.log('='.repeat(50))
  console.log(`✓ Passed: ${passed}/${tickers.length}`)
  if (failed > 0) {
    console.log(`✗ Failed: ${failed}`)
  }
  console.log(`\n📦 Bundle Size:`)
  console.log(`   Raw: ${bundleSize} KB`)
  console.log(`   Gzipped (est): ${estimatedGzip} KB`)
  console.log(`\n💡 For 500 tickers:`)
  console.log(`   Estimated size: ~${(bundleSize / tickers.length * 500).toFixed(0)} KB raw`)
  console.log(`   Estimated gzipped: ~${(estimatedGzip / tickers.length * 500).toFixed(0)} KB`)
  
  if (failed === 0) {
    console.log('\n✅ All tests passed!')
  } else {
    process.exit(1)
  }
}

testBundle().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
