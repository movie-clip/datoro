import { describe, it, expect } from 'vitest';
import {
  getValuationFromBatch as _getValuationFromBatch,
  getCashFlowFactsFromBatch as _getCashFlowFactsFromBatch,
  getMarginsGrowthFromBatch as _getMarginsGrowthFromBatch,
  getBalanceFromBatch as _getBalanceFromBatch
} from '../../../src/services/financials/batchTableService.js';

const getValuationFromBatch = _getValuationFromBatch as (batchData: any) => ReturnType<typeof _getValuationFromBatch>;
const getCashFlowFactsFromBatch = _getCashFlowFactsFromBatch as (batchData: any) => ReturnType<typeof _getCashFlowFactsFromBatch>;
const getMarginsGrowthFromBatch = _getMarginsGrowthFromBatch as (batchData: any) => ReturnType<typeof _getMarginsGrowthFromBatch>;
const getBalanceFromBatch = _getBalanceFromBatch as (batchData: any) => ReturnType<typeof _getBalanceFromBatch>;

// Mock batch data fixtures
const mockBatchData = {
  ticker: 'AAPL',
  timestamp: '2024-01-15T10:30:00.000Z',
  fetchDuration: 250,
  data: {
    profile: [{
      symbol: 'AAPL',
      companyName: 'Apple Inc.',
      mktCap: 3000000000000, // $3T
      price: 185.50
    }],
    quote: {
      symbol: 'AAPL',
      price: 185.50,
      volume: 50000000
    },
    ratiosAnnual: [{
      date: '2023-09-30',
      priceEarningsRatio: 29.45,
      priceToSalesRatio: 7.82,
      priceToBookRatio: 45.23,
      enterpriseValueMultiple: 22.15,
      netProfitMargin: 0.2531,
      operatingProfitMargin: 0.2983
    }],
    keyMetrics: [{
      date: '2023-09-30',
      evToEBITDA: 21.89,
      freeCashFlowYield: 0.0332,
      freeCashFlowPerShare: 6.30
    }],
    cashflowQuarter: [
      { date: '2023-12-30', freeCashFlow: 39118000000, stockBasedCompensation: 2863000000 },
      { date: '2023-09-30', freeCashFlow: 20841000000, stockBasedCompensation: 2612000000 },
      { date: '2023-07-01', freeCashFlow: 19482000000, stockBasedCompensation: 2598000000 },
      { date: '2023-04-01', freeCashFlow: 20143000000, stockBasedCompensation: 2760000000 }
    ],
    incomeQuarter: [
      { date: '2023-12-30', revenue: 119575000000, netIncome: 33916000000, eps: 2.18 },
      { date: '2023-09-30', revenue: 89498000000, netIncome: 22956000000, eps: 1.46 },
      { date: '2023-07-01', revenue: 81797000000, netIncome: 19881000000, eps: 1.26 },
      { date: '2023-04-01', revenue: 94836000000, netIncome: 24160000000, eps: 1.52 },
      { date: '2022-12-31', revenue: 117154000000, netIncome: 29998000000, eps: 1.88 },
      { date: '2022-09-24', revenue: 90146000000, netIncome: 20721000000, eps: 1.29 }
    ],
    balanceAnnual: [{
      date: '2023-09-30',
      cashAndCashEquivalents: 29965000000,
      shortTermInvestments: 31590000000,
      totalDebt: 111088000000,
      totalAssets: 352755000000,
      totalLiabilities: 290437000000
    }],
    financialScores: [{
      date: '2023-09-30',
      symbol: 'AAPL',
      altmanZScore: 3.47,
      piotroskiScore: 7
    }]
  }
};

describe('Batch Table Service', () => {
  
  describe('getValuationFromBatch', () => {
    it('should extract all valuation metrics', () => {
      const result = getValuationFromBatch(mockBatchData);
      
      expect(result.marketCap).toBe('$3.00T'); // 3000B = 3T
      expect(result.pe).toBe('29.45');
      expect(result.ps).toBe('7.82');
      expect(result.pb).toBe('45.23');
      expect(result.evEbitda).toBe('22.15');
    });

    it('should format market cap correctly', () => {
      const tests = [
        { mktCap: 3500000000000, expected: '$3.50T' }, // 3500B = 3.5T
        { mktCap: 450000000000, expected: '$450.00B' },
        { mktCap: 25000000000, expected: '$25.00B' },
        { mktCap: 500000000, expected: '$500.00M' },
        { mktCap: 50000000, expected: '$50.00M' },
        { mktCap: 5000000, expected: '$5.00M' },
        { mktCap: 500000, expected: '$500.00K' },
        { mktCap: 50000, expected: '$50.00K' },
        { mktCap: 5000, expected: '$5.00K' },
        { mktCap: 500, expected: '$500.00' }
      ];
      
      tests.forEach(({ mktCap, expected }) => {
        const data = {
          data: {
            profile: [{ mktCap }]
          }
        };
        const result = getValuationFromBatch(data as any);
        expect(result.marketCap).toBe(expected);
      });
    });

    it('should use fallback EV/EBITDA from keyMetrics', () => {
      const dataWithoutRatios = {
        data: {
          profile: [{ mktCap: 1000000000 }],
          keyMetrics: [{ evToEBITDA: 18.50 }]
        }
      };
      
      const result = getValuationFromBatch(dataWithoutRatios);
      expect(result.evEbitda).toBe('18.50');
    });

    it('should handle missing profile data', () => {
      const noProfile = {
        data: {
          ratiosAnnual: mockBatchData.data.ratiosAnnual
        }
      };
      
      const result = getValuationFromBatch(noProfile);
      expect(result.marketCap).toBe('—');
      expect(result.pe).toBe('29.45'); // Still gets ratios
    });

    it('should handle missing ratios data', () => {
      const noRatios = {
        data: {
          profile: mockBatchData.data.profile
        }
      };
      
      const result = getValuationFromBatch(noRatios);
      expect(result.marketCap).toBe('$3.00T'); // 3000B = 3T
      expect(result.pe).toBe('—');
      expect(result.ps).toBe('—');
      expect(result.pb).toBe('—');
    });

    it('should handle null/undefined values', () => {
      const nullValues = {
        data: {
          profile: [{ mktCap: null }],
          ratiosAnnual: [{
            priceEarningsRatio: null,
            priceToSalesRatio: undefined
          }]
        }
      };
      
      const result = getValuationFromBatch(nullValues);
      expect(result.marketCap).toBe('—');
      expect(result.pe).toBe('—');
      expect(result.ps).toBe('—');
    });

    it('should return defaults for null batchData', () => {
      const result = getValuationFromBatch(null);
      
      expect(result.marketCap).toBe('—');
      expect(result.pe).toBe('—');
      expect(result.ps).toBe('—');
      expect(result.pb).toBe('—');
      expect(result.evEbitda).toBe('—');
      expect(result.fpe).toBe('—');
    });

    it('should handle empty arrays', () => {
      const emptyArrays = {
        data: {
          profile: [],
          ratiosAnnual: [],
          keyMetrics: []
        }
      };
      
      const result = getValuationFromBatch(emptyArrays);
      
      Object.values(result).forEach(value => {
        expect(value).toBe('—');
      });
    });

    it('should round ratios to 2 decimal places', () => {
      const preciseData = {
        data: {
          ratiosAnnual: [{
            priceEarningsRatio: 29.456789,
            priceToSalesRatio: 7.823456,
            priceToBookRatio: 45.234567,
            enterpriseValueMultiple: 22.156789
          }]
        }
      };
      
      const result = getValuationFromBatch(preciseData);
      expect(result.pe).toBe('29.46');
      expect(result.ps).toBe('7.82');
      expect(result.pb).toBe('45.23');
      expect(result.evEbitda).toBe('22.16');
    });
  });

  describe('getCashFlowFactsFromBatch', () => {
    it('should calculate TTM FCF yield', () => {
      const result = getCashFlowFactsFromBatch(mockBatchData);
      
      // TTM FCF = 39118 + 20841 + 19482 + 20143 = 99584 million
      // Market cap = 3,000,000 million
      // FCF Yield = (99584 / 3000000) * 100 = 3.32%
      expect(result.fcfYield).toBe('3.32%');
    });

    it('should calculate FCF yield adjusted for SBC', () => {
      const result = getCashFlowFactsFromBatch(mockBatchData);
      
      // TTM SBC = 2863 + 2612 + 2598 + 2760 = 10833 million
      // Adjusted FCF = 99584 - 10833 = 88751 million
      // Adjusted FCF Yield = (88751 / 3000000) * 100 = 2.96%
      expect(result.fcfYieldAdjSBC).toBe('2.96%');
    });

    it('should calculate SBC impact percentage', () => {
      const result = getCashFlowFactsFromBatch(mockBatchData);
      
      // SBC Impact = ((3.32 - 2.96) / 3.32) * 100 = 10.88% (actual calculation)
      expect(result.sbcImpact).toBe('10.88%');
    });

    it('should handle missing quarterly cashflow data', () => {
      const noQuarter = {
        data: {
          profile: mockBatchData.data.profile
        }
      };
      
      const result = getCashFlowFactsFromBatch(noQuarter);
      expect(result.fcfYield).toBe('—');
      expect(result.fcfYieldAdjSBC).toBe('—');
      expect(result.sbcImpact).toBe('—');
    });

    it('should handle less than 4 quarters of data', () => {
      const insufficientData = {
        data: {
          cashflowQuarter: mockBatchData.data.cashflowQuarter.slice(0, 2),
          profile: mockBatchData.data.profile
        }
      };
      
      const result = getCashFlowFactsFromBatch(insufficientData);
      expect(result.fcfYield).toBe('—');
    });

    it('should use keyMetrics fallback for FCF yield', () => {
      const withKeyMetrics = {
        data: {
          cashflowQuarter: [
            { freeCashFlow: 1000000000, stockBasedCompensation: 100000000 },
            { freeCashFlow: 1000000000, stockBasedCompensation: 100000000 },
            { freeCashFlow: 1000000000, stockBasedCompensation: 100000000 },
            { freeCashFlow: 1000000000, stockBasedCompensation: 100000000 }
          ],
          profile: [{ mktCap: 0 }], // Zero market cap triggers fallback
          keyMetrics: [{ freeCashFlowYield: 0.0445 }]
        }
      };
      
      const result = getCashFlowFactsFromBatch(withKeyMetrics);
      // 0.0445 * 100 = 4.45%
      expect(result.fcfYield).toBe('4.45%');
    });

    it('should handle zero market cap', () => {
      const zeroMktCap = {
        data: {
          cashflowQuarter: mockBatchData.data.cashflowQuarter,
          profile: [{ mktCap: 0 }]
        }
      };
      
      const result = getCashFlowFactsFromBatch(zeroMktCap);
      expect(result.fcfYield).toBe('—');
      expect(result.fcfYieldAdjSBC).toBe('—');
    });

    it('should handle missing profile data', () => {
      const noProfile = {
        data: {
          cashflowQuarter: mockBatchData.data.cashflowQuarter
        }
      };
      
      const result = getCashFlowFactsFromBatch(noProfile);
      expect(result.fcfYield).toBe('—');
    });

    it('should handle negative FCF', () => {
      const negativeFCF = {
        data: {
          cashflowQuarter: [
            { freeCashFlow: -1000000000, stockBasedCompensation: 500000000 },
            { freeCashFlow: -800000000, stockBasedCompensation: 400000000 },
            { freeCashFlow: -600000000, stockBasedCompensation: 300000000 },
            { freeCashFlow: -400000000, stockBasedCompensation: 200000000 }
          ],
          profile: [{ mktCap: 10000000000 }]
        }
      };
      
      const result = getCashFlowFactsFromBatch(negativeFCF);
      
      // TTM FCF = -2,800,000,000
      // FCF Yield = (-2800 / 10000) * 100 = -28.00%
      expect(result.fcfYield).toBe('-28.00%');
    });

    it('should handle null/undefined in cashflow data', () => {
      const nullCashflow = {
        data: {
          cashflowQuarter: [
            { freeCashFlow: null, stockBasedCompensation: 500000000 },
            { freeCashFlow: 1000000000, stockBasedCompensation: null },
            { freeCashFlow: undefined, stockBasedCompensation: 300000000 },
            { freeCashFlow: 800000000, stockBasedCompensation: undefined }
          ],
          profile: [{ mktCap: 10000000000 }]
        }
      };
      
      const result = getCashFlowFactsFromBatch(nullCashflow);
      
      // TTM FCF = 0 + 1000 + 0 + 800 = 1800 million
      // TTM SBC = 500 + 0 + 300 + 0 = 800 million
      expect(result.fcfYield).toBe('18.00%');
      expect(result.fcfYieldAdjSBC).toBe('10.00%');
    });

    it('should return defaults for null batchData', () => {
      const result = getCashFlowFactsFromBatch(null);
      
      expect(result.fcfYield).toBe('—');
      expect(result.fcfYieldAdjSBC).toBe('—');
      expect(result.sbcImpact).toBe('—');
    });
  });

  describe('getMarginsGrowthFromBatch', () => {
    it('should extract profit margins', () => {
      const result = getMarginsGrowthFromBatch(mockBatchData);
      
      // 0.2531 * 100 = 25.31%
      expect(result.profitMargin).toBe('25.31%');
      // 0.2983 * 100 = 29.83%
      expect(result.operatingMargin).toBe('29.83%');
    });

    it('should calculate quarterly earnings YoY growth', () => {
      const result = getMarginsGrowthFromBatch(mockBatchData);
      
      // Current Q (Q4 2023): 33,916
      // Year ago Q (Q4 2022): 29,998
      // Growth = ((33916 - 29998) / 29998) * 100 = 13.06%
      expect(result.earningsYoY).toBe('13.06%');
    });

    it('should calculate quarterly revenue YoY growth', () => {
      const result = getMarginsGrowthFromBatch(mockBatchData);
      
      // Current Q (Q4 2023): 119,575
      // Year ago Q (Q4 2022): 117,154
      // Growth = ((119575 - 117154) / 117154) * 100 = 2.07%
      expect(result.revenueYoY).toBe('2.07%');
    });

    it('should handle missing ratios data', () => {
      const noRatios = {
        data: {
          incomeQuarter: mockBatchData.data.incomeQuarter
        }
      };
      
      const result = getMarginsGrowthFromBatch(noRatios);
      expect(result.profitMargin).toBe('—');
      expect(result.operatingMargin).toBe('—');
      // Should still calculate YoY
      expect(result.earningsYoY).toBe('13.06%');
    });

    it('should handle insufficient quarterly data', () => {
      const insufficientQuarters = {
        data: {
          ratiosAnnual: mockBatchData.data.ratiosAnnual,
          incomeQuarter: mockBatchData.data.incomeQuarter.slice(0, 4)
        }
      };
      
      const result = getMarginsGrowthFromBatch(insufficientQuarters);
      expect(result.profitMargin).toBe('25.31%');
      expect(result.earningsYoY).toBe('—'); // Can't calculate YoY
      expect(result.revenueYoY).toBe('—');
    });

    it('should handle negative growth rates', () => {
      const negativeGrowth = {
        data: {
          incomeQuarter: [
            { revenue: 80000000000, netIncome: 15000000000 },
            { revenue: 85000000000, netIncome: 18000000000 },
            { revenue: 90000000000, netIncome: 20000000000 },
            { revenue: 95000000000, netIncome: 22000000000 },
            { revenue: 100000000000, netIncome: 25000000000 }, // Year ago
            { revenue: 105000000000, netIncome: 28000000000 }
          ]
        }
      };
      
      const result = getMarginsGrowthFromBatch(negativeGrowth);
      
      // Earnings: (15000 - 25000) / 25000 * 100 = -40.00%
      expect(result.earningsYoY).toBe('-40.00%');
      // Revenue: (80000 - 100000) / 100000 * 100 = -20.00%
      expect(result.revenueYoY).toBe('-20.00%');
    });

    it('should handle zero year-ago values', () => {
      const zeroYearAgo = {
        data: {
          incomeQuarter: [
            { revenue: 100000000000, netIncome: 20000000000 },
            { revenue: 90000000000, netIncome: 18000000000 },
            { revenue: 80000000000, netIncome: 16000000000 },
            { revenue: 70000000000, netIncome: 14000000000 },
            { revenue: 0, netIncome: 0 }, // Year ago - zero values
            { revenue: 60000000000, netIncome: 12000000000 }
          ]
        }
      };
      
      const result = getMarginsGrowthFromBatch(zeroYearAgo);
      expect(result.earningsYoY).toBe('—'); // Can't divide by zero
      expect(result.revenueYoY).toBe('—');
    });

    it('should handle null margins', () => {
      const nullMargins = {
        data: {
          ratiosAnnual: [{
            netProfitMargin: null,
            operatingProfitMargin: undefined
          }]
        }
      };
      
      const result = getMarginsGrowthFromBatch(nullMargins);
      expect(result.profitMargin).toBe('—');
      expect(result.operatingMargin).toBe('—');
    });

    it('should return defaults for null batchData', () => {
      const result = getMarginsGrowthFromBatch(null);
      
      expect(result.profitMargin).toBe('—');
      expect(result.operatingMargin).toBe('—');
      expect(result.earningsYoY).toBe('—');
      expect(result.revenueYoY).toBe('—');
    });

    it('should handle empty arrays', () => {
      const emptyArrays = {
        data: {
          ratiosAnnual: [],
          incomeQuarter: []
        }
      };
      
      const result = getMarginsGrowthFromBatch(emptyArrays);
      
      Object.values(result).forEach(value => {
        expect(value).toBe('—');
      });
    });

    it('should round margins to 2 decimal places', () => {
      const preciseMargins = {
        data: {
          ratiosAnnual: [{
            netProfitMargin: 0.253456789,
            operatingProfitMargin: 0.298345678
          }]
        }
      };
      
      const result = getMarginsGrowthFromBatch(preciseMargins);
      expect(result.profitMargin).toBe('25.35%');
      expect(result.operatingMargin).toBe('29.83%');
    });
  });

  describe('getBalanceFromBatch', () => {
    it('should calculate cash from cash equivalents + short term investments', () => {
      const result = getBalanceFromBatch(mockBatchData);
      
      // Cash = 29,965 + 31,590 = 61,555 million -> $61.55B (rounds down)
      expect(result.cash).toBe('$61.55B');
    });

    it('should extract total debt', () => {
      const result = getBalanceFromBatch(mockBatchData);
      
      // Debt = 111,088 million
      expect(result.debt).toBe('$111.09B');
    });

    it('should calculate net debt (cash - debt)', () => {
      const result = getBalanceFromBatch(mockBatchData);
      
      // Net = 61,555 - 111,088 = -49,533 million
      expect(result.net).toBe('$-49.53B');
    });

    it('should extract Altman Z-Score', () => {
      const result = getBalanceFromBatch(mockBatchData);
      
      expect(result.altmanZScore).toBe('3.47');
    });

    it('should determine Altman Z-Score color - green for safe zone', () => {
      const result = getBalanceFromBatch(mockBatchData);
      
      // Z-Score = 3.47 > 2.99 = green (safe)
      expect(result.altmanZColor).toBe('green');
    });

    it('should determine Altman Z-Score color - red for distress zone', () => {
      const distressData = {
        data: {
          balanceAnnual: mockBatchData.data.balanceAnnual,
          financialScores: [{
            altmanZScore: 1.50 // < 1.81 = red (distress)
          }]
        }
      };
      
      const result = getBalanceFromBatch(distressData);
      expect(result.altmanZScore).toBe('1.50');
      expect(result.altmanZColor).toBe('red');
    });

    it('should determine Altman Z-Score color - grey for grey zone', () => {
      const greyZoneData = {
        data: {
          balanceAnnual: mockBatchData.data.balanceAnnual,
          financialScores: [{
            altmanZScore: 2.50 // 1.81 - 2.99 = grey (grey zone)
          }]
        }
      };
      
      const result = getBalanceFromBatch(greyZoneData);
      expect(result.altmanZScore).toBe('2.50');
      expect(result.altmanZColor).toBe('grey');
    });

    it('should handle missing short term investments', () => {
      const noShortTerm = {
        data: {
          balanceAnnual: [{
            cashAndCashEquivalents: 50000000000,
            totalDebt: 100000000000
          }]
        }
      };
      
      const result = getBalanceFromBatch(noShortTerm);
      
      // Cash = 50,000 + 0 = 50,000 million
      expect(result.cash).toBe('$50.00B');
      expect(result.net).toBe('$-50.00B');
    });

    it('should handle missing financialScores', () => {
      const noScores = {
        data: {
          balanceAnnual: mockBatchData.data.balanceAnnual
        }
      };
      
      const result = getBalanceFromBatch(noScores);
      expect(result.altmanZScore).toBe('—');
      expect(result.altmanZColor).toBe('grey'); // Default color
    });

    it('should handle null Z-Score', () => {
      const nullZScore = {
        data: {
          balanceAnnual: mockBatchData.data.balanceAnnual,
          financialScores: [{
            altmanZScore: null
          }]
        }
      };
      
      const result = getBalanceFromBatch(nullZScore);
      expect(result.altmanZScore).toBe('—');
      expect(result.altmanZColor).toBe('grey');
    });

    it('should handle missing balance sheet data', () => {
      const noBalance = {
        data: {
          financialScores: mockBatchData.data.financialScores
        }
      };
      
      const result = getBalanceFromBatch(noBalance);
      expect(result.cash).toBe('—');
      expect(result.debt).toBe('—');
      expect(result.net).toBe('—');
    });

    it('should handle zero debt', () => {
      const zeroDebt = {
        data: {
          balanceAnnual: [{
            cashAndCashEquivalents: 100000000000,
            shortTermInvestments: 50000000000,
            totalDebt: 0
          }]
        }
      };
      
      const result = getBalanceFromBatch(zeroDebt);
      // formatNumber returns '$0.00' for zero values
      expect(result.debt).toBe('$0.00');
      expect(result.net).toBe('$150.00B'); // All cash, no debt
    });

    it('should handle negative debt (rare but possible)', () => {
      const negativeDebt = {
        data: {
          balanceAnnual: [{
            cashAndCashEquivalents: 50000000000,
            shortTermInvestments: 30000000000,
            totalDebt: -10000000000 // Should not happen, but test edge case
          }]
        }
      };
      
      const result = getBalanceFromBatch(negativeDebt);
      expect(result.debt).toBe('$-10.00B');
      expect(result.net).toBe('$90.00B');
    });

    it('should return defaults for null batchData', () => {
      const result = getBalanceFromBatch(null);
      
      expect(result.cash).toBe('—');
      expect(result.debt).toBe('—');
      expect(result.net).toBe('—');
      expect(result.altmanZScore).toBe('—');
      expect(result.altmanZColor).toBe('grey');
    });

    it('should handle empty balance array', () => {
      const emptyBalance = {
        data: {
          balanceAnnual: []
        }
      };
      
      const result = getBalanceFromBatch(emptyBalance);
      
      expect(result.cash).toBe('—');
      expect(result.debt).toBe('—');
      expect(result.net).toBe('—');
    });

    it('should round Z-Score to 2 decimal places', () => {
      const preciseZScore = {
        data: {
          balanceAnnual: mockBatchData.data.balanceAnnual,
          financialScores: [{
            altmanZScore: 3.4789123
          }]
        }
      };
      
      const result = getBalanceFromBatch(preciseZScore);
      expect(result.altmanZScore).toBe('3.48');
    });

    it('should handle Z-Score exactly at boundaries', () => {
      const tests = [
        { zScore: 2.99, expectedColor: 'grey' },
        { zScore: 3.00, expectedColor: 'green' },
        { zScore: 1.81, expectedColor: 'grey' },
        { zScore: 1.80, expectedColor: 'red' }
      ];
      
      tests.forEach(({ zScore, expectedColor }) => {
        const data = {
          data: {
            balanceAnnual: mockBatchData.data.balanceAnnual,
            financialScores: [{ altmanZScore: zScore }]
          }
        };
        const result = getBalanceFromBatch(data);
        expect(result.altmanZColor).toBe(expectedColor);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed data structures', () => {
      const malformed = {
        data: {
          profile: 'not an array',
          ratiosAnnual: { invalid: 'structure' },
          cashflowQuarter: null
        }
      };
      
      expect(() => getValuationFromBatch(malformed as any)).not.toThrow();
      expect(() => getCashFlowFactsFromBatch(malformed as any)).not.toThrow();
      expect(() => getMarginsGrowthFromBatch(malformed as any)).not.toThrow();
      expect(() => getBalanceFromBatch(malformed as any)).not.toThrow();
    });

    it('should handle undefined data property', () => {
      const noData = { ticker: 'AAPL' };
      
      const v = getValuationFromBatch(noData as any);
      const c = getCashFlowFactsFromBatch(noData as any);
      const m = getMarginsGrowthFromBatch(noData as any);
      const b = getBalanceFromBatch(noData as any);
      
      expect(v.marketCap).toBe('—');
      expect(c.fcfYield).toBe('—');
      expect(m.profitMargin).toBe('—');
      expect(b.cash).toBe('—');
    });

    it('should not throw on completely empty object', () => {
      expect(() => getValuationFromBatch({} as any)).not.toThrow();
      expect(() => getCashFlowFactsFromBatch({} as any)).not.toThrow();
      expect(() => getMarginsGrowthFromBatch({} as any)).not.toThrow();
      expect(() => getBalanceFromBatch({} as any)).not.toThrow();
    });
  });

  describe('Number Formatting', () => {
    it('should format billions correctly', () => {
      const tests = [
        { value: 1000000000000, expected: '$1.00T' }, // 1000B = 1T
        { value: 500000000000, expected: '$500.00B' },
        { value: 123456789012, expected: '$123.46B' },
        { value: 1500000000, expected: '$1.50B' }
      ];
      
      tests.forEach(({ value, expected }) => {
        const data = { data: { profile: [{ mktCap: value }] } };
        const result = getValuationFromBatch(data as any);
        expect(result.marketCap).toBe(expected);
      });
    });

    it('should format millions correctly', () => {
      const tests = [
        { value: 999999999, expected: '$1000.00M' },
        { value: 500000000, expected: '$500.00M' },
        { value: 123456789, expected: '$123.46M' },
        { value: 1500000, expected: '$1.50M' }
      ];
      
      tests.forEach(({ value, expected }) => {
        const data = { data: { profile: [{ mktCap: value }] } };
        const result = getValuationFromBatch(data as any);
        expect(result.marketCap).toBe(expected);
      });
    });

    it('should format thousands correctly', () => {
      const tests = [
        { value: 999999, expected: '$1000.00K' },
        { value: 500000, expected: '$500.00K' },
        { value: 123456, expected: '$123.46K' },
        { value: 1500, expected: '$1.50K' }
      ];
      
      tests.forEach(({ value, expected }) => {
        const data = { data: { profile: [{ mktCap: value }] } };
        const result = getValuationFromBatch(data as any);
        expect(result.marketCap).toBe(expected);
      });
    });

    it('should format small values without suffix', () => {
      const tests = [
        { value: 999, expected: '$999.00' },
        { value: 100, expected: '$100.00' },
        { value: 10.5, expected: '$10.50' },
        { value: 1, expected: '$1.00' }
      ];
      
      tests.forEach(({ value, expected }) => {
        const data = { data: { profile: [{ mktCap: value }] } };
        const result = getValuationFromBatch(data as any);
        expect(result.marketCap).toBe(expected);
      });
    });

    it('should handle negative values', () => {
      const negativeData = {
        data: {
          balanceAnnual: [{
            cashAndCashEquivalents: 30000000000,
            shortTermInvestments: 20000000000,
            totalDebt: 200000000000
          }]
        }
      };
      
      const result = getBalanceFromBatch(negativeData as any);
      // Net = 50B - 200B = -150B
      expect(result.net).toBe('$-150.00B');
    });

    it('should handle zero values', () => {
      const zeroData = {
        data: {
          profile: [{ mktCap: 0 }],
          balanceAnnual: [{
            cashAndCashEquivalents: 0,
            shortTermInvestments: 0,
            totalDebt: 0
          }]
        }
      };
      
      const valuation = getValuationFromBatch(zeroData as any);
      const balance = getBalanceFromBatch(zeroData as any);
      
      // Zero market cap is treated as "not available" by the truthiness check
      expect(valuation.marketCap).toBe('—');
      // But balance fields with explicit 0 will be formatted as $0.00
      expect(balance.cash).toBe('$0.00');
      expect(balance.debt).toBe('$0.00');
      expect(balance.net).toBe('$0.00');
    });

    it('should handle NaN values', () => {
      const nanData = {
        data: {
          profile: [{ mktCap: NaN }]
        }
      };
      
      const result = getValuationFromBatch(nanData as any);
      expect(result.marketCap).toBe('—');
    });
  });
});
