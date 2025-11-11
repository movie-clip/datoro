/**
 * Manual test script to verify Revenue Categories data flow
 * Tests both Product and Geographic categories extraction
 * 
 * Usage: node tests/manual/test-revenue-categories.mjs AAPL
 */

import fetch from 'node-fetch'

const ticker = process.argv[2] || 'AAPL'
const baseUrl = process.env.API_BASE_URL || 'http://localhost:7071'

console.log(`\n🔍 Testing Revenue Categories for ${ticker}`)
console.log(`📡 API Base: ${baseUrl}\n`)

async function testBatchData() {
  try {
    const url = `${baseUrl}/api/ticker-data/${ticker}?mode=full`
    console.log(`Fetching: ${url}`)
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const batchData = await response.json()
    
    // Check revenueSegments (Product Categories)
    console.log('\n📦 Product Categories (revenueSegments):')
    console.log('  Exists:', !!batchData.data?.revenueSegments)
    console.log('  Type:', Array.isArray(batchData.data?.revenueSegments) ? 'array' : typeof batchData.data?.revenueSegments)
    console.log('  Length:', batchData.data?.revenueSegments?.length)
    
    if (batchData.data?.revenueSegments?.[0]) {
      console.log('  First entry sample:', JSON.stringify(batchData.data.revenueSegments[0], null, 2))
    }

    // Check revenueGeographicSegments
    console.log('\n🌍 Geographic Categories (revenueGeographicSegments):')
    console.log('  Exists:', !!batchData.data?.revenueGeographicSegments)
    console.log('  Type:', Array.isArray(batchData.data?.revenueGeographicSegments) ? 'array' : typeof batchData.data?.revenueGeographicSegments)
    console.log('  Length:', batchData.data?.revenueGeographicSegments?.length)
    
    if (batchData.data?.revenueGeographicSegments?.[0]) {
      console.log('  First entry sample:', JSON.stringify(batchData.data.revenueGeographicSegments[0], null, 2))
    }

    // Test extraction logic locally
    console.log('\n🔬 Testing Extraction Logic:')
    
    const productResult = extractProductCategories(batchData)
    console.log('\n  Product Categories Extracted:')
    console.log('    Segments:', productResult.segments.length, productResult.segments)
    console.log('    Series keys:', Object.keys(productResult.series).length, Object.keys(productResult.series))
    if (Object.keys(productResult.series).length > 0) {
      const firstKey = Object.keys(productResult.series)[0]
      console.log(`    Sample (${firstKey}):`, productResult.series[firstKey]?.length, 'data points')
    }

    const geoResult = extractGeographicCategories(batchData)
    console.log('\n  Geographic Categories Extracted:')
    console.log('    Segments:', geoResult.segments.length, geoResult.segments)
    console.log('    Series keys:', Object.keys(geoResult.series).length, Object.keys(geoResult.series))
    if (Object.keys(geoResult.series).length > 0) {
      const firstKey = Object.keys(geoResult.series)[0]
      console.log(`    Sample (${firstKey}):`, geoResult.series[firstKey]?.length, 'data points')
    }

    console.log('\n✅ Test complete\n')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    if (error.stack) console.error(error.stack)
    process.exit(1)
  }
}

// Simplified extraction logic (mirrors batchChartService.ts)
function extractProductCategories(batchData) {
  if (!batchData?.data?.revenueSegments || !Array.isArray(batchData.data.revenueSegments)) {
    return { segments: [], series: {} }
  }

  const segmentData = batchData.data.revenueSegments
  const allCategories = new Set()
  const categorySeries = {}

  segmentData.forEach(entry => {
    if (!entry || typeof entry !== 'object') return
    
    const dateKey = Object.keys(entry)[0]
    if (!dateKey) return

    const date = Date.parse(dateKey)
    if (isNaN(date)) return

    const categories = entry[dateKey]
    if (categories && typeof categories === 'object') {
      Object.entries(categories).forEach(([categoryName, value]) => {
        const numValue = Number(value)
        if (!isNaN(numValue) && numValue > 0) {
          allCategories.add(categoryName)
          if (!categorySeries[categoryName]) {
            categorySeries[categoryName] = []
          }
          categorySeries[categoryName].push([date, numValue])
        }
      })
    }
  })

  return {
    segments: Array.from(allCategories).sort(),
    series: categorySeries
  }
}

function extractGeographicCategories(batchData) {
  if (!batchData?.data?.revenueGeographicSegments || !Array.isArray(batchData.data.revenueGeographicSegments)) {
    return { segments: [], series: {} }
  }

  const segmentData = batchData.data.revenueGeographicSegments
  const allRegions = new Set()
  const regionSeries = {}

  segmentData.forEach(entry => {
    if (!entry || typeof entry !== 'object') return
    
    const dateKey = Object.keys(entry)[0]
    if (!dateKey) return

    const date = Date.parse(dateKey)
    if (isNaN(date)) return

    const regions = entry[dateKey]
    if (regions && typeof regions === 'object') {
      Object.entries(regions).forEach(([regionName, value]) => {
        const numValue = Number(value)
        if (!isNaN(numValue) && numValue > 0) {
          allRegions.add(regionName)
          if (!regionSeries[regionName]) {
            regionSeries[regionName] = []
          }
          regionSeries[regionName].push([date, numValue])
        }
      })
    }
  })

  return {
    segments: Array.from(allRegions).sort(),
    series: regionSeries
  }
}

testBatchData()
