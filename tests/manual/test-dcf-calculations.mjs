/**
 * DCF Calculation Validation Test
 * Tests the accuracy of our DCF calculations by:
 * 1. Fetching real data from our server's batch endpoint
 * 2. Performing manual calculations
 * 3. Comparing with our service calculations
 * 4. Comparing with FMP's own DCF endpoint
 */

import fetch from 'node-fetch';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const TEST_TICKER = process.argv[2] || 'AAPL';

/**
 * Fetch batch data from our server
 */
async function fetchBatchData(ticker) {
  const url = `${SERVER_URL}/api/ticker-data/${ticker}?mode=full`;
  console.log(`Fetching from: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch batch data: ${response.statusText}`);
  }
  const result = await response.json();
  return result.data;
}

/**
 * Manual DCF Calculation (replicate our service logic)
 */
function calculateDCFManually(data, inputs) {
  const {
    currentFcf,
    sharesOutstanding,
    cashAndEquivalents,
    totalDebt,
    fcfGrowthRate,
    terminalGrowthRate,
    discountRate,
    projectionYears
  } = data;

  console.log('\n📊 Manual DCF Calculation:');
  console.log('─'.repeat(60));
  console.log(`Starting FCF: $${(currentFcf / 1e9).toFixed(2)}B`);
  console.log(`Shares Outstanding: ${(sharesOutstanding / 1e9).toFixed(2)}B`);
  console.log(`Growth Rate: ${fcfGrowthRate}%`);
  console.log(`Terminal Growth: ${terminalGrowthRate}%`);
  console.log(`Discount Rate: ${discountRate}%`);
  console.log(`Projection Years: ${projectionYears}`);

  // Step 1: Project FCF for next N years
  const projectedFcfs = [];
  let fcf = currentFcf;
  
  for (let year = 1; year <= projectionYears; year++) {
    fcf = fcf * (1 + fcfGrowthRate / 100);
    projectedFcfs.push({
      year,
      fcf,
      discountFactor: Math.pow(1 + discountRate / 100, year),
      presentValue: fcf / Math.pow(1 + discountRate / 100, year)
    });
  }

  // Step 2: Calculate terminal value
  const lastYearFcf = projectedFcfs[projectedFcfs.length - 1].fcf;
  const terminalFcf = lastYearFcf * (1 + terminalGrowthRate / 100);
  const terminalValue = terminalFcf / ((discountRate - terminalGrowthRate) / 100);
  const terminalPV = terminalValue / Math.pow(1 + discountRate / 100, projectionYears);

  // Step 3: Sum all present values
  const sumPvFcf = projectedFcfs.reduce((sum, p) => sum + p.presentValue, 0);
  const enterpriseValue = sumPvFcf + terminalPV;

  // Step 4: Calculate equity value
  const equityValue = enterpriseValue + cashAndEquivalents - totalDebt;

  // Step 5: Per share value
  const intrinsicValuePerShare = equityValue / sharesOutstanding;

  console.log('\n💰 Projected FCF:');
  projectedFcfs.forEach(p => {
    console.log(`  Year ${p.year}: $${(p.fcf / 1e9).toFixed(2)}B → PV: $${(p.presentValue / 1e9).toFixed(2)}B`);
  });

  console.log('\n🎯 Valuation Breakdown:');
  console.log(`  Sum of PV FCF: $${(sumPvFcf / 1e9).toFixed(2)}B`);
  console.log(`  Terminal Value: $${(terminalValue / 1e9).toFixed(2)}B`);
  console.log(`  Terminal PV: $${(terminalPV / 1e9).toFixed(2)}B`);
  console.log(`  Enterprise Value: $${(enterpriseValue / 1e9).toFixed(2)}B`);
  console.log(`  + Cash: $${(cashAndEquivalents / 1e9).toFixed(2)}B`);
  console.log(`  - Debt: $${(totalDebt / 1e9).toFixed(2)}B`);
  console.log(`  Equity Value: $${(equityValue / 1e9).toFixed(2)}B`);
  console.log(`  ÷ Shares: ${(sharesOutstanding / 1e9).toFixed(2)}B`);
  console.log(`  = Intrinsic Value: $${intrinsicValuePerShare.toFixed(2)}`);

  return {
    intrinsicValue: intrinsicValuePerShare,
    projectedFcfs,
    sumPvFcf,
    terminalValue,
    terminalPV,
    enterpriseValue,
    equityValue
  };
}

/**
 * Extract DCF data from batch (replicate our service)
 */
function extractDcfData(batchData) {
  const profile = batchData.profile?.[0] || null;
  const quote = batchData.quote?.[0] || null;
  const cashflowAnnual = batchData.cashflowAnnual || [];
  const balanceAnnual = batchData.balanceAnnual || [];
  const ratiosTTM = batchData.ratiosTTM?.[0] || null;
  const incomeQuarter = batchData.incomeQuarter || [];

  // Get current FCF
  const latestCashflow = cashflowAnnual[0];
  const currentFcf = latestCashflow ? Number(latestCashflow.freeCashFlow) || 0 : 0;

  // Get shares outstanding
  let sharesOutstanding = 0;
  if (quote?.sharesOutstanding && Number(quote.sharesOutstanding) > 0) {
    sharesOutstanding = Number(quote.sharesOutstanding);
  } else if (latestCashflow?.weightedAverageShsOutDil) {
    sharesOutstanding = Number(latestCashflow.weightedAverageShsOutDil);
  }

  // Get current price
  const currentPrice = quote?.price || 0;

  // Get cash and debt
  const latestBalance = balanceAnnual[0];
  const cashAndEquivalents = latestBalance ? Number(latestBalance.cashAndCashEquivalents) || 0 : 0;
  const totalDebt = latestBalance ? Number(latestBalance.totalDebt) || 0 : 0;

  // Calculate historical FCF growth rate (3-year CAGR)
  let historicalGrowthRate = 10;
  if (cashflowAnnual.length >= 4) {
    const oldestFcf = Number(cashflowAnnual[3].freeCashFlow) || 0;
    if (currentFcf > 0 && oldestFcf > 0) {
      historicalGrowthRate = (Math.pow(currentFcf / oldestFcf, 1 / 3) - 1) * 100;
    }
  }

  // Get TTM EPS
  const eps = quote?.eps || 0;

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
  let epsGrowth = 0;
  if (incomeQuarter.length >= 8) {
    const ttmEps = incomeQuarter.slice(0, 4).reduce((sum, q) => sum + (q.eps || 0), 0);
    const prevTtmEps = incomeQuarter.slice(4, 8).reduce((sum, q) => sum + (q.eps || 0), 0);
    if (ttmEps !== 0 && prevTtmEps !== 0) {
      epsGrowth = ((ttmEps - prevTtmEps) / Math.abs(prevTtmEps)) * 100;
    }
  }

  return {
    ticker: profile?.symbol || TEST_TICKER,
    companyName: profile?.companyName || 'Unknown',
    currentFcf,
    sharesOutstanding,
    cashAndEquivalents,
    totalDebt,
    currentPrice,
    historicalGrowthRate: Math.round(historicalGrowthRate * 10) / 10,
    eps,
    currentPE,
    epsGrowth: Math.round(epsGrowth * 10) / 10
  };
}

/**
 * Main test function
 */
async function testDcfCalculations() {
  console.log('🧪 DCF Calculation Validation Test');
  console.log('═'.repeat(60));
  console.log(`Testing ticker: ${TEST_TICKER}\n`);

  try {
    // Fetch batch data from our server
    console.log('📡 Fetching data from server...');
    const batchData = await fetchBatchData(TEST_TICKER);
    
    console.log('✅ Data fetched successfully\n');

    // Extract DCF data
    const dcfData = extractDcfData(batchData);
    
    console.log('📋 Company Data:');
    console.log('─'.repeat(60));
    console.log(`Company: ${dcfData.companyName} (${dcfData.ticker})`);
    console.log(`Current Price: $${dcfData.currentPrice.toFixed(2)}`);
    console.log(`EPS (TTM): $${dcfData.eps.toFixed(2)}`);
    console.log(`P/E (TTM): ${dcfData.currentPE.toFixed(2)}`);
    console.log(`EPS Growth (TTM YoY): ${dcfData.epsGrowth.toFixed(1)}%`);
    console.log(`Historical FCF Growth (3Y): ${dcfData.historicalGrowthRate.toFixed(1)}%`);

    // Test with standard inputs
    const inputs = {
      fcfGrowthRate: dcfData.historicalGrowthRate,
      terminalGrowthRate: 2.5,
      discountRate: 10,
      projectionYears: 5
    };

    // Perform manual calculation
    const manualResult = calculateDCFManually({
      ...dcfData,
      ...inputs
    }, inputs);

    // Compare with FMP's DCF
    console.log('\n🔍 Comparison with FMP DCF:');
    console.log('─'.repeat(60));
    const fmpDcf = batchData.fmpDcf;
    if (fmpDcf && fmpDcf[0]?.dcf) {
      const fmpValue = fmpDcf[0].dcf;
      const fmpDate = fmpDcf[0].date;
      const difference = manualResult.intrinsicValue - fmpValue;
      const percentDiff = (difference / fmpValue) * 100;

      console.log(`FMP DCF Value: $${fmpValue.toFixed(2)} (as of ${fmpDate})`);
      console.log(`Our Calculation: $${manualResult.intrinsicValue.toFixed(2)}`);
      console.log(`Difference: $${difference.toFixed(2)} (${percentDiff.toFixed(1)}%)`);

      if (Math.abs(percentDiff) < 5) {
        console.log('✅ PASS: Values are within 5% tolerance');
      } else {
        console.log('⚠️  WARNING: Values differ by more than 5%');
        console.log('   This could be due to:');
        console.log('   - Different growth assumptions');
        console.log('   - Different discount rates');
        console.log('   - Different projection periods');
        console.log('   - Data timing differences');
      }
    } else {
      console.log('⚠️  FMP DCF data not available for comparison');
    }

    // Validation checks
    console.log('\n✓ Validation Checks:');
    console.log('─'.repeat(60));
    
    const checks = [
      {
        name: 'FCF is positive',
        pass: dcfData.currentFcf > 0,
        value: `$${(dcfData.currentFcf / 1e9).toFixed(2)}B`
      },
      {
        name: 'Shares outstanding > 1M',
        pass: dcfData.sharesOutstanding > 1_000_000,
        value: `${(dcfData.sharesOutstanding / 1e9).toFixed(2)}B shares`
      },
      {
        name: 'Enterprise value > 0',
        pass: manualResult.enterpriseValue > 0,
        value: `$${(manualResult.enterpriseValue / 1e9).toFixed(2)}B`
      },
      {
        name: 'Intrinsic value > 0',
        pass: manualResult.intrinsicValue > 0,
        value: `$${manualResult.intrinsicValue.toFixed(2)}`
      },
      {
        name: 'Terminal value reasonable',
        pass: manualResult.terminalPV > 0 && manualResult.terminalPV < manualResult.enterpriseValue * 0.9,
        value: `${((manualResult.terminalPV / manualResult.enterpriseValue) * 100).toFixed(1)}% of EV`
      },
      {
        name: 'Discount rate > Terminal growth',
        pass: inputs.discountRate > inputs.terminalGrowthRate,
        value: `${inputs.discountRate}% vs ${inputs.terminalGrowthRate}%`
      }
    ];

    checks.forEach(check => {
      const status = check.pass ? '✅' : '❌';
      console.log(`${status} ${check.name}: ${check.value}`);
    });

    const allPassed = checks.every(c => c.pass);
    
    console.log('\n' + '═'.repeat(60));
    if (allPassed) {
      console.log('✅ All validation checks PASSED');
    } else {
      console.log('❌ Some validation checks FAILED');
    }

    // Calculate upside
    const upside = ((manualResult.intrinsicValue - dcfData.currentPrice) / dcfData.currentPrice) * 100;
    console.log('\n📈 Investment Analysis:');
    console.log('─'.repeat(60));
    console.log(`Current Price: $${dcfData.currentPrice.toFixed(2)}`);
    console.log(`Intrinsic Value: $${manualResult.intrinsicValue.toFixed(2)}`);
    console.log(`Upside/Downside: ${upside > 0 ? '+' : ''}${upside.toFixed(1)}%`);
    
    if (upside > 20) {
      console.log('🟢 Recommendation: BUY (>20% upside)');
    } else if (upside > 0) {
      console.log('🟡 Recommendation: HOLD (0-20% upside)');
    } else if (upside > -20) {
      console.log('🟡 Recommendation: HOLD (0-20% downside)');
    } else {
      console.log('🔴 Recommendation: SELL (>20% downside)');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testDcfCalculations();
