/**
 * DCF Scenario Testing
 * Tests different growth scenarios to match FMP's DCF values
 */

import fetch from 'node-fetch';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:7071';
const TEST_TICKER = process.argv[2] || 'AAPL';

async function fetchBatchData(ticker) {
  const url = `${SERVER_URL}/api/ticker-data/${ticker}?mode=full`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch batch data: ${response.statusText}`);
  }
  const result = await response.json();
  return result.data;
}

function calculateDCF(data, growthRate, terminalGrowth, discountRate, years) {
  const { currentFcf, sharesOutstanding, cashAndEquivalents, totalDebt } = data;
  
  // Project FCF
  let fcf = currentFcf;
  let sumPV = 0;
  
  for (let year = 1; year <= years; year++) {
    fcf = fcf * (1 + growthRate / 100);
    const pv = fcf / Math.pow(1 + discountRate / 100, year);
    sumPV += pv;
  }
  
  // Terminal value
  const terminalFcf = fcf * (1 + terminalGrowth / 100);
  const terminalValue = terminalFcf / ((discountRate - terminalGrowth) / 100);
  const terminalPV = terminalValue / Math.pow(1 + discountRate / 100, years);
  
  // Equity value
  const enterpriseValue = sumPV + terminalPV;
  const equityValue = enterpriseValue + cashAndEquivalents - totalDebt;
  
  return equityValue / sharesOutstanding;
}

function extractDcfData(batchData) {
  const profile = batchData.profile?.[0] || null;
  const quote = batchData.quote?.[0] || null;
  const cashflowAnnual = batchData.cashflowAnnual || [];
  const balanceAnnual = batchData.balanceAnnual || [];
  const ratiosTTM = batchData.ratiosTTM?.[0] || null;
  const incomeQuarter = batchData.incomeQuarter || [];

  const latestCashflow = cashflowAnnual[0];
  const currentFcf = Number(latestCashflow?.freeCashFlow) || 0;

  let sharesOutstanding = 0;
  if (quote?.sharesOutstanding) {
    sharesOutstanding = Number(quote.sharesOutstanding);
  } else if (latestCashflow?.weightedAverageShsOutDil) {
    sharesOutstanding = Number(latestCashflow.weightedAverageShsOutDil);
  }

  const currentPrice = quote?.price || 0;
  const latestBalance = balanceAnnual[0];
  const cashAndEquivalents = Number(latestBalance?.cashAndCashEquivalents) || 0;
  const totalDebt = Number(latestBalance?.totalDebt) || 0;

  // Calculate historical FCF growth
  let fcfGrowth3Y = 10;
  if (cashflowAnnual.length >= 4) {
    const oldestFcf = Number(cashflowAnnual[3].freeCashFlow) || 0;
    if (currentFcf > 0 && oldestFcf > 0) {
      fcfGrowth3Y = (Math.pow(currentFcf / oldestFcf, 1 / 3) - 1) * 100;
    }
  }

  // Calculate 5Y FCF growth if available
  let fcfGrowth5Y = fcfGrowth3Y;
  if (cashflowAnnual.length >= 6) {
    const oldestFcf = Number(cashflowAnnual[5].freeCashFlow) || 0;
    if (currentFcf > 0 && oldestFcf > 0) {
      fcfGrowth5Y = (Math.pow(currentFcf / oldestFcf, 1 / 5) - 1) * 100;
    }
  }

  const eps = quote?.eps || 0;
  
  // TTM EPS growth
  let epsGrowthTTM = 0;
  if (incomeQuarter.length >= 8) {
    const ttmEps = incomeQuarter.slice(0, 4).reduce((sum, q) => sum + (q.eps || 0), 0);
    const prevTtmEps = incomeQuarter.slice(4, 8).reduce((sum, q) => sum + (q.eps || 0), 0);
    if (ttmEps !== 0 && prevTtmEps !== 0) {
      epsGrowthTTM = ((ttmEps - prevTtmEps) / Math.abs(prevTtmEps)) * 100;
    }
  }

  let currentPE = 0;
  if (ratiosTTM?.peRatioTTM) {
    currentPE = ratiosTTM.peRatioTTM;
  } else if (ratiosTTM?.priceEarningsRatioTTM) {
    currentPE = ratiosTTM.priceEarningsRatioTTM;
  }

  return {
    ticker: profile?.symbol || TEST_TICKER,
    companyName: profile?.companyName || 'Unknown',
    currentFcf,
    sharesOutstanding,
    cashAndEquivalents,
    totalDebt,
    currentPrice,
    fcfGrowth3Y: Math.round(fcfGrowth3Y * 10) / 10,
    fcfGrowth5Y: Math.round(fcfGrowth5Y * 10) / 10,
    eps,
    currentPE,
    epsGrowthTTM: Math.round(epsGrowthTTM * 10) / 10
  };
}

async function testScenarios() {
  console.log('🧪 DCF Scenario Analysis');
  console.log('═'.repeat(70));
  console.log(`Testing ticker: ${TEST_TICKER}\n`);

  try {
    const batchData = await fetchBatchData(TEST_TICKER);
    const dcfData = extractDcfData(batchData);
    const fmpDcf = batchData.fmpDcf?.[0]?.dcf || null;

    console.log('📋 Company Data:');
    console.log('─'.repeat(70));
    console.log(`Company: ${dcfData.companyName} (${dcfData.ticker})`);
    console.log(`Current Price: $${dcfData.currentPrice.toFixed(2)}`);
    console.log(`Current FCF: $${(dcfData.currentFcf / 1e9).toFixed(2)}B`);
    console.log(`EPS (TTM): $${dcfData.eps.toFixed(2)}`);
    console.log(`P/E (TTM): ${dcfData.currentPE.toFixed(2)}`);
    console.log(`\n📊 Historical Growth Rates:`);
    console.log(`  FCF Growth (3Y): ${dcfData.fcfGrowth3Y.toFixed(1)}%`);
    console.log(`  FCF Growth (5Y): ${dcfData.fcfGrowth5Y.toFixed(1)}%`);
    console.log(`  EPS Growth (TTM YoY): ${dcfData.epsGrowthTTM.toFixed(1)}%`);

    if (fmpDcf) {
      console.log(`\n🎯 FMP DCF Target: $${fmpDcf.toFixed(2)}`);
    }

    console.log('\n📈 Testing Different Scenarios:');
    console.log('═'.repeat(70));

    const scenarios = [
      {
        name: 'Conservative (Historical 3Y FCF)',
        growth: dcfData.fcfGrowth3Y,
        terminal: 2.5,
        discount: 10
      },
      {
        name: 'Moderate (Historical 5Y FCF)',
        growth: dcfData.fcfGrowth5Y,
        terminal: 2.5,
        discount: 10
      },
      {
        name: 'Optimistic (TTM EPS Growth)',
        growth: dcfData.epsGrowthTTM > 0 ? dcfData.epsGrowthTTM : dcfData.fcfGrowth3Y,
        terminal: 3.0,
        discount: 9
      },
      {
        name: 'Aggressive (2x FCF Growth)',
        growth: dcfData.fcfGrowth3Y * 2,
        terminal: 3.5,
        discount: 8
      },
      {
        name: 'Market Implied (Match FMP)',
        growth: 15, // Will adjust
        terminal: 3.0,
        discount: 9
      }
    ];

    // Try to find growth rate that matches FMP
    if (fmpDcf) {
      let bestGrowth = 15;
      let bestDiff = Infinity;
      
      for (let g = 5; g <= 30; g += 0.5) {
        const value = calculateDCF(dcfData, g, 3.0, 9, 5);
        const diff = Math.abs(value - fmpDcf);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestGrowth = g;
        }
      }
      
      scenarios[4].growth = bestGrowth;
    }

    scenarios.forEach((scenario, idx) => {
      const value = calculateDCF(dcfData, scenario.growth, scenario.terminal, scenario.discount, 5);
      const upside = ((value - dcfData.currentPrice) / dcfData.currentPrice) * 100;
      const vsTarget = fmpDcf ? ((value - fmpDcf) / fmpDcf) * 100 : 0;

      console.log(`\n${idx + 1}. ${scenario.name}`);
      console.log(`   Growth: ${scenario.growth.toFixed(1)}% | Terminal: ${scenario.terminal}% | Discount: ${scenario.discount}%`);
      console.log(`   Intrinsic Value: $${value.toFixed(2)}`);
      console.log(`   vs Current Price: ${upside > 0 ? '+' : ''}${upside.toFixed(1)}%`);
      if (fmpDcf) {
        console.log(`   vs FMP DCF: ${vsTarget > 0 ? '+' : ''}${vsTarget.toFixed(1)}%`);
      }
    });

    // Recommendations
    console.log('\n💡 Analysis Summary:');
    console.log('═'.repeat(70));
    
    const conservativeValue = calculateDCF(dcfData, dcfData.fcfGrowth3Y, 2.5, 10, 5);
    const moderateValue = calculateDCF(dcfData, scenarios[4].growth, 3.0, 9, 5);
    
    console.log(`Conservative Range: $${conservativeValue.toFixed(2)}`);
    console.log(`Market Implied: $${moderateValue.toFixed(2)}`);
    if (fmpDcf) {
      console.log(`FMP Estimate: $${fmpDcf.toFixed(2)}`);
    }
    console.log(`Current Price: $${dcfData.currentPrice.toFixed(2)}`);
    
    const conservativeUpside = ((conservativeValue - dcfData.currentPrice) / dcfData.currentPrice) * 100;
    const marketUpside = ((moderateValue - dcfData.currentPrice) / dcfData.currentPrice) * 100;
    
    console.log(`\n📊 Implied Upside/Downside:`);
    console.log(`  Conservative: ${conservativeUpside > 0 ? '+' : ''}${conservativeUpside.toFixed(1)}%`);
    console.log(`  Market Implied: ${marketUpside > 0 ? '+' : ''}${marketUpside.toFixed(1)}%`);
    
    if (conservativeUpside > 20) {
      console.log(`\n🟢 Strong Buy - Even conservative assumptions show >20% upside`);
    } else if (marketUpside > 20) {
      console.log(`\n🟡 Buy - Market-implied valuation shows >20% upside`);
    } else if (conservativeUpside > 0) {
      console.log(`\n🟡 Hold - Conservative valuation near current price`);
    } else {
      console.log(`\n🔴 Sell - Trading above conservative fair value`);
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testScenarios();
