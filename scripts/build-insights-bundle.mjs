#!/usr/bin/env node
/**
 * Bundle all AI insights into a single optimized JSON file
 * Reduces 500 HTTP requests to 1, enables better compression
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const INSIGHTS_DIR = path.join(__dirname, '../public/ai-insights')
const OUTPUT_FILE = path.join(__dirname, '../public/ai-insights.json')

async function buildBundle() {
  console.log('📦 Building AI Insights Bundle\n')
  
  // Read all JSON files from insights directory
  const files = await fs.readdir(INSIGHTS_DIR)
  const jsonFiles = files.filter(f => f.endsWith('.json'))
  
  console.log(`Found ${jsonFiles.length} insight files`)
  
  const bundle = {}
  let totalSize = 0
  
  for (const file of jsonFiles) {
    const ticker = file.replace('.json', '').toUpperCase()
    const filepath = path.join(INSIGHTS_DIR, file)
    const content = await fs.readFile(filepath, 'utf8')
    const data = JSON.parse(content)
    
    // Store insights only (skip metadata to reduce size)
    bundle[ticker] = {
      advantages: data.insights.competitiveAdvantages,
      risks: data.insights.investmentRisks,
      updated: data.lastUpdated,
      provider: data.provider
    }
    
    totalSize += content.length
  }
  
  // Write bundle
  const bundleContent = JSON.stringify(bundle, null, 2)
  await fs.writeFile(OUTPUT_FILE, bundleContent, 'utf8')
  
  // Stats
  const bundleSize = bundleContent.length
  const savings = ((totalSize - bundleSize) / totalSize * 100).toFixed(1)
  
  console.log('\n✅ Bundle created successfully!')
  console.log(`📊 Stats:`)
  console.log(`   Files: ${jsonFiles.length}`)
  console.log(`   Individual files total: ${(totalSize / 1024).toFixed(1)} KB`)
  console.log(`   Bundle size: ${(bundleSize / 1024).toFixed(1)} KB`)
  console.log(`   Savings: ${savings}%`)
  console.log(`\n💡 Gzip will compress this ~75% further`)
  console.log(`   Expected transfer: ~${(bundleSize * 0.25 / 1024).toFixed(1)} KB`)
}

buildBundle().catch(console.error)
