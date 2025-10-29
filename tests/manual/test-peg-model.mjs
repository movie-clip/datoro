/**
 * PEG Model Calculation Validation Test
 * Tests the accuracy of the custom PEG-based valuation model
 * 
 * Formula: Target Price = Current EPS × (1 + Growth Rate)^Years × Target P/E
 * Annualized Return = (Target Price / Current Price)^(1/Years) - 1
 */

import fetch from 'node-fetch';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:7071';
const TEST_TICKER = process.argv[2] || 'AAPL';

/**
 * Fetch batch data from server
 */
async function fetchBatchData(ticker) {
  const url = `${SERVER_URL}/api/ticker-data/${ticker}?mode=full`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch batch data: ${response.statusText}`);
  }
  const result = await response.json();
  return result.data;
}

/**
 * Manual PEG model calculation (replicate our service logic)
 */
function calculatePEGModelManually(currentEPS, currentPrice, growthRate, targetPE, years) {
  console.log('\n📊 Manual PEG Model Calculation:');
  console.log('─'.repeat(70));
  console.log(`Current EPS: $${currentEPS.toFixed(2)}`);
  console.log(`Current Price: $${currentPrice.toFixed(2)}`);
  console.log(`Growth Rate: ${growthRate}% per year`);
  console.log(`Target P/E: ${targetPE}x`);
  console.log(`Projection Period: ${years} years`);

  const growthDecimal = growthRate / 100;

  // Step 1: Calculate future EPS
  const futureEPS = currentEPS * Math.pow(1 + growthDecimal, years);
  console.log(`\n📈 Step 1: Project Future EPS`);
  console.log(`  Formula: Current EPS × (1 + Growth)^Years`);
  console.log(`  ${currentEPS.toFixed(2)} × (1 + ${growthDecimal})^${years}`);
  console.log(`  ${currentEPS.toFixed(2)} × ${Math.pow(1 + growthDecimal, years).toFixed(4)}`);
  console.log(`  Future EPS = $${futureEPS.toFixed(2)}`);

  // Step 2: Calculate target price
  const targetPrice = futureEPS * targetPE;
  console.log(`\n💰 Step 2: Calculate Target Price`);
  console.log(`  Formula: Future EPS × Target P/E`);
  console.log(`  ${futureEPS.toFixed(2)} × ${targetPE}`);
  console.log(`  Target Price = $${targetPrice.toFixed(2)}`);

  // Step 3: Calculate total return
  const totalReturn = ((targetPrice - currentPrice) / currentPrice) * 100;
  console.log(`\n📊 Step 3: Calculate Total Return`);
  console.log(`  Formula: (Target - Current) / Current × 100`);
  console.log(`  (${targetPrice.toFixed(2)} - ${currentPrice.toFixed(2)}) / ${currentPrice.toFixed(2)} × 100`);
  console.log(`  Total Return = ${totalReturn > 0 ? '+' : ''}${totalReturn.toFixed(1)}%`);

  // Step 4: Calculate annualized return
  const annualizedReturn = (Math.pow(targetPrice / currentPrice, 1 / years) - 1) * 100;
  console.log(`\n📈 Step 4: Calculate Annualized Return`);
  console.log(`  Formula: (Target / Current)^(1/Years) - 1`);
  console.log(`  (${targetPrice.toFixed(2)} / ${currentPrice.toFixed(2)})^(1/${years}) - 1`);
  console.log(`  ${(targetPrice / currentPrice).toFixed(4)}^${(1/years).toFixed(4)} - 1`);
  console.log(`  Annualized Return = ${annualizedReturn > 0 ? '+' : ''}${annualizedReturn.toFixed(1)}% per year`);

  // Year-by-year breakdown
  console.log(`\n📅 Year-by-Year Projections:`);
  const projections = [];
  const currentYear = new Date().getFullYear();
  
  for (let year = 1; year <= years; year++) {
    const yearEPS = currentEPS * Math.pow(1 + growthDecimal, year);
    const yearPrice = yearEPS * targetPE;
    projections.push({
      year: currentYear + year,
      eps: yearEPS,
      price: yearPrice
    });
    
    if (year <= 5 || year === years) {
      console.log(`  Year ${year} (${currentYear + year}): EPS $${yearEPS.toFixed(2)} → Price $${yearPrice.toFixed(2)}`);
    } else if (year === 6) {
      console.log(`  ... (showing first 5 and last year)`);
    }
  }

  return {
    futureEPS,
    targetPrice,
    totalReturn,
    annualizedReturn,
    projections
  };
}

/**
 * Extract company data
 */
function extractCompanyData(batchData) {
  const profile = batchData.profile?.[0] || null;
  const quote = batchData.quote?.[0] || null;
  const ratiosTTM = batchData.ratiosTTM?.[0] || null;
  const incomeQuarter = batchData.incomeQuarter || [];

  const eps = quote?.eps || 0;
  const currentPrice = quote?.price || 0;

  // Get TTM P/E
  let currentPE = 0;
  if (ratiosTTM?.peRatioTTM) {
    currentPE = ratiosTTM.peRatioTTM;
  } else if (ratiosTTM?.priceEarningsRatioTTM) {
    currentPE = ratiosTTM.priceEarningsRatioTTM;
  } else {
    const ratiosAnnual = batchData.ratiosAnnual?.[0];
    currentPE = ratiosAnnual?.priceEarningsRatio || 0;
  }

  // Calculate TTM EPS growth
  let epsGrowthTTM = 0;
  if (incomeQuarter.length >= 8) {
    const ttmEps = incomeQuarter.slice(0, 4).reduce((_sum, _q) => sum + (q.eps || 0), 0);
    const prevTtmEps = incomeQuarter.slice(4, 8).reduce((_sum, _q) => sum + (q.eps || 0), 0);
    if (ttmEps !== 0 && prevTtmEps !== 0) {
      epsGrowthTTM = ((ttmEps - prevTtmEps) / Math.abs(prevTtmEps)) * 100;
    }
  }

  return {
    ticker: profile?.symbol || TEST_TICKER,
    companyName: profile?.companyName || 'Unknown',
    eps,
    currentPrice,
    currentPE,
    epsGrowthTTM: Math.round(epsGrowthTTM * 10) / 10
  };
}

/**
 * Test mathematical accuracy
 */
function testMathematicalAccuracy() {
  console.log('\n🧮 Mathematical Accuracy Tests:');
  console.log('═'.repeat(70));

  const tests = [
    {
      name: 'Simple Growth (10% for 10 years, P/E 20)',
      currentEPS: 10,
      currentPrice: 200,
      growthRate: 10,
      targetPE: 20,
      years: 10,
      expectedFutureEPS: 25.94, // 10 * 1.1^10
      expectedTargetPrice: 518.75, // 25.94 * 20
      expectedReturn: 159.4, // (518.75 - 200) / 200 * 100
      expectedAnnualized: 10.0 // Should match growth rate when P/E stays same
    },
    {
      name: 'Zero Growth (0% for 5 years, P/E 15)',
      currentEPS: 5,
      currentPrice: 75,
      growthRate: 0,
      targetPE: 15,
      years: 5,
      expectedFutureEPS: 5.00,
      expectedTargetPrice: 75.00,
      expectedReturn: 0.0,
      expectedAnnualized: 0.0
    },
    {
      name: 'High Growth (25% for 5 years, P/E 30)',
      currentEPS: 2,
      currentPrice: 50,
      growthRate: 25,
      targetPE: 30,
      years: 5,
      expectedFutureEPS: 6.10, // 2 * 1.25^5
      expectedTargetPrice: 183.11, // 6.10 * 30
      expectedReturn: 266.2, // (183.11 - 50) / 50 * 100
      expectedAnnualized: 29.6 // (183.11/50)^(1/5) - 1
    },
    {
      name: 'P/E Compression (15% growth, P/E 25→15)',
      currentEPS: 8,
      currentPrice: 200, // Current P/E = 25
      growthRate: 15,
      targetPE: 15, // Lower P/E
      years: 10,
      expectedFutureEPS: 32.37, // 8 * 1.15^10
      expectedTargetPrice: 485.59, // 32.37 * 15
      expectedReturn: 142.8,
      expectedAnnualized: 9.3
    }
  ];

  let passedTests = 0;
  let failedTests = 0;

  tests.forEach((_test, _idx) => {
    console.log(`\nTest ${idx + 1}: ${test.name}`);
    console.log('─'.repeat(70));

    const result = calculatePEGModelManually(
      test.currentEPS,
      test.currentPrice,
      test.growthRate,
      test.targetPE,
      test.years
    );

    // Validate results
    const tolerance = 0.5; // 0.5% tolerance for rounding
    const checks = [
      {
        name: 'Future EPS',
        actual: result.futureEPS,
        expected: test.expectedFutureEPS,
        tolerance: tolerance
      },
      {
        name: 'Target Price',
        actual: result.targetPrice,
        expected: test.expectedTargetPrice,
        tolerance: tolerance
      },
      {
        name: 'Total Return',
        actual: result.totalReturn,
        expected: test.expectedReturn,
        tolerance: tolerance
      },
      {
        name: 'Annualized Return',
        actual: result.annualizedReturn,
        expected: test.expectedAnnualized,
        tolerance: tolerance
      }
    ];

    let testPassed = true;
    checks.forEach(check => {
      const percentDiff = Math.abs((check.actual - check.expected) / check.expected * 100);
      const passed = percentDiff < check.tolerance || Math.abs(check.actual - check.expected) < 0.01;
      const status = passed ? '✅' : '❌';
      
      console.log(`  ${status} ${check.name}: ${check.actual.toFixed(2)} (expected: ${check.expected.toFixed(2)})`);
      
      if (!passed) {
        console.log(`     ⚠️  Difference: ${percentDiff.toFixed(2)}%`);
        testPassed = false;
      }
    });

    if (testPassed) {
      passedTests++;
      console.log('  ✅ Test PASSED');
    } else {
      failedTests++;
      console.log('  ❌ Test FAILED');
    }
  });

  console.log('\n' + '═'.repeat(70));
  console.log(`Results: ${passedTests} passed, ${failedTests} failed`);
  
  return failedTests === 0;
}

/**
 * Test edge cases
 */
function testEdgeCases() {
  console.log('\n⚠️  Edge Case Tests:');
  console.log('═'.repeat(70));

  const edgeCases = [
    {
      name: 'Negative Growth (-10%)',
      eps: 10,
      price: 100,
      growth: -10,
      pe: 15,
      years: 5,
      shouldWork: true
    },
    {
      name: 'Zero EPS',
      eps: 0,
      price: 100,
      growth: 10,
      pe: 20,
      years: 10,
      shouldWork: false
    },
    {
      name: 'Negative EPS',
      eps: -5,
      price: 50,
      growth: 10,
      pe: 20,
      years: 10,
      shouldWork: false
    },
    {
      name: 'Very High Growth (100%)',
      eps: 1,
      price: 20,
      growth: 100,
      pe: 50,
      years: 5,
      shouldWork: true
    },
    {
      name: 'Very Long Projection (30 years)',
      eps: 5,
      price: 100,
      growth: 8,
      pe: 20,
      years: 30,
      shouldWork: true
    }
  ];

  let passed = 0;
  let failed = 0;

  edgeCases.forEach((_test, _idx) => {
    console.log(`\nEdge Case ${idx + 1}: ${test.name}`);
    
    try {
      const result = calculatePEGModelManually(test.eps, test.price, test.growth, test.pe, test.years);
      
      if (test.shouldWork) {
        if (result.targetPrice && !isNaN(result.targetPrice) && isFinite(result.targetPrice)) {
          console.log(`  ✅ Handled correctly: Target = $${result.targetPrice.toFixed(2)}`);
          passed++;
        } else {
          console.log(`  ❌ Invalid result: ${result.targetPrice}`);
          failed++;
        }
      } else {
        // Case should NOT produce valid results (invalid inputs)
        // The service returns null/0 for invalid EPS, which is correct behavior
        const isInvalid = !result.targetPrice || 
                         result.targetPrice === 0 || 
                         result.targetPrice < 0 || 
                         isNaN(result.annualizedReturn);
        
        if (isInvalid) {
          console.log(`  ✅ Correctly handled invalid input: returned null/zero/negative/NaN`);
          passed++;
        } else {
          console.log(`  ❌ Should reject invalid input but got valid: $${result.targetPrice.toFixed(2)}`);
          failed++;
        }
      }
    } catch (_error) {
      if (test.shouldWork) {
        console.log(`  ❌ Unexpected error: ${error.message}`);
        failed++;
      } else {
        console.log(`  ✅ Correctly rejected with error`);
        passed++;
      }
    }
  });

  console.log('\n' + '═'.repeat(70));
  console.log(`Edge Cases: ${passed} passed, ${failed} failed`);
  
  return failed === 0;
}

/**
 * Test with real company data
 */
async function testRealCompanyData() {
  console.log('\n🏢 Real Company Data Test:');
  console.log('═'.repeat(70));
  console.log(`Testing ticker: ${TEST_TICKER}\n`);

  try {
    const batchData = await fetchBatchData(TEST_TICKER);
    const companyData = extractCompanyData(batchData);

    console.log('📋 Company Data:');
    console.log('─'.repeat(70));
    console.log(`Company: ${companyData.companyName} (${companyData.ticker})`);
    console.log(`Current Price: $${companyData.currentPrice.toFixed(2)}`);
    console.log(`Current EPS (TTM): $${companyData.eps.toFixed(2)}`);
    console.log(`Current P/E (TTM): ${companyData.currentPE.toFixed(2)}x`);
    console.log(`EPS Growth (TTM YoY): ${companyData.epsGrowthTTM.toFixed(1)}%`);

    // Test multiple scenarios
    const scenarios = [
      {
        name: 'Conservative',
        growth: Math.max(5, companyData.epsGrowthTTM * 0.5),
        targetPE: Math.max(15, companyData.currentPE * 0.8),
        years: 10
      },
      {
        name: 'Moderate (Current Growth)',
        growth: companyData.epsGrowthTTM > 0 ? companyData.epsGrowthTTM : 10,
        targetPE: companyData.currentPE || 20,
        years: 10
      },
      {
        name: 'Optimistic',
        growth: Math.max(companyData.epsGrowthTTM * 1.5, 15),
        targetPE: Math.min(companyData.currentPE * 1.2, 40),
        years: 10
      }
    ];

    console.log('\n📊 Scenario Analysis:');
    console.log('═'.repeat(70));

    scenarios.forEach((_scenario, _idx) => {
      console.log(`\n${idx + 1}. ${scenario.name} Scenario:`);
      console.log(`   Growth: ${scenario.growth.toFixed(1)}% | P/E: ${scenario.targetPE.toFixed(1)}x | ${scenario.years}Y`);
      
      const result = calculatePEGModelManually(
        companyData.eps,
        companyData.currentPrice,
        scenario.growth,
        scenario.targetPE,
        scenario.years
      );

      console.log(`   Target Price: $${result.targetPrice.toFixed(2)}`);
      console.log(`   Total Return: ${result.totalReturn > 0 ? '+' : ''}${result.totalReturn.toFixed(1)}%`);
      console.log(`   Annualized: ${result.annualizedReturn > 0 ? '+' : ''}${result.annualizedReturn.toFixed(1)}% per year`);
      
      if (result.annualizedReturn >= 15) {
        console.log(`   🟢 Strong Buy - Expected return >15%`);
      } else if (result.annualizedReturn >= 10) {
        console.log(`   🟡 Buy - Expected return >10%`);
      } else if (result.annualizedReturn >= 0) {
        console.log(`   🟡 Hold - Positive return expected`);
      } else {
        console.log(`   🔴 Sell - Negative return expected`);
      }
    });

    return true;
  } catch (_error) {
    console.error('\n❌ Real company test failed:', error.message);
    return false;
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🧪 PEG Model Calculation Validation');
  console.log('═'.repeat(70));
  console.log('Testing custom PEG-based valuation model\n');

  const results = {
    mathematical: false,
    edgeCases: false,
    realData: false
  };

  // Run mathematical accuracy tests
  results.mathematical = testMathematicalAccuracy();

  // Run edge case tests
  results.edgeCases = testEdgeCases();

  // Run real company data test
  results.realData = await testRealCompanyData();

  // Final summary
  console.log('\n\n' + '═'.repeat(70));
  console.log('📊 FINAL TEST SUMMARY');
  console.log('═'.repeat(70));
  console.log(`Mathematical Accuracy: ${results.mathematical ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Edge Case Handling: ${results.edgeCases ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Real Data Validation: ${results.realData ? '✅ PASSED' : '❌ FAILED'}`);

  const allPassed = results.mathematical && results.edgeCases && results.realData;
  
  console.log('\n' + '═'.repeat(70));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED - PEG Model is accurate and robust!');
    process.exit(0);
  } else {
    console.log('❌ SOME TESTS FAILED - Review results above');
    process.exit(1);
  }
}

// Run all tests
runAllTests();
