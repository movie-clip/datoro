import { describe, it, expect, beforeEach } from 'vitest';
import {
  getRevenueSeriesFromBatch,
  getRevenueSegmentsFromBatch,
  getFcfSeriesFromBatch,
  getNetIncomeSeriesFromBatch,
  getEpsSeriesFromBatch,
  getEbitdaSeriesFromBatch,
  getCashDebtSeriesFromBatch,
  getCapitalReturnedSeriesFromBatch,
  getSharesSeriesFromBatch,
  getExpensesSeriesFromBatch,
  getDividendYieldSeriesFromBatch,
  getInsiderTradingFromBatch,
  getPriceSeriesFromBatch,
  memoCache
} from '../../../src/services/financials/batchChartService.js';

// Mock batch data fixtures
const mockBatchData = {
  ticker: 'AAPL',
  timestamp: '2024-01-15T10:30:00.000Z',
  fetchDuration: 250,
  data: {
    profile: [{
      symbol: 'AAPL',
      companyName: 'Apple Inc.',
      price: 150.00
    }],
    quote: {
      symbol: 'AAPL',
      price: 150.00,
      volume: 50000000
    },
    incomeAnnual: [
      { date: '2023-09-30', revenue: 383285000000, netIncome: 96995000000, eps: 6.13, grossProfit: 169148000000, costOfRevenue: 214137000000, operatingExpenses: 54780000000, operatingIncome: 114368000000, depreciationAndAmortization: 11519000000, ebitda: 125887000000, weightedAverageShsOut: 15812547000, researchAndDevelopmentExpenses: 29915000000, sellingGeneralAndAdministrativeExpenses: 24865000000 },
      { date: '2022-09-24', revenue: 394328000000, netIncome: 99803000000, eps: 6.15, grossProfit: 170782000000, costOfRevenue: 223546000000, operatingExpenses: 51345000000, operatingIncome: 119437000000, depreciationAndAmortization: 11104000000, ebitda: 130541000000, weightedAverageShsOut: 16215963000, researchAndDevelopmentExpenses: 26251000000, sellingGeneralAndAdministrativeExpenses: 25094000000 },
      { date: '2021-09-25', revenue: 365817000000, netIncome: 94680000000, eps: 5.67, grossProfit: 152836000000, costOfRevenue: 212981000000, operatingExpenses: 43887000000, operatingIncome: 108949000000, depreciationAndAmortization: 11284000000, ebitda: 120233000000, weightedAverageShsOut: 16701272000, researchAndDevelopmentExpenses: 21914000000, sellingGeneralAndAdministrativeExpenses: 21973000000 }
    ],
    incomeQuarter: [
      { date: '2023-12-30', revenue: 119575000000, netIncome: 33916000000, eps: 2.18, weightedAverageShsOut: 15552752000 },
      { date: '2023-09-30', revenue: 89498000000, netIncome: 22956000000, eps: 1.46, weightedAverageShsOut: 15697614000 },
      { date: '2023-07-01', revenue: 81797000000, netIncome: 19881000000, eps: 1.26, weightedAverageShsOut: 15744231000 },
      { date: '2023-04-01', revenue: 94836000000, netIncome: 24160000000, eps: 1.52, weightedAverageShsOut: 15908118000 }
    ],
    balanceAnnual: [
      { date: '2023-09-30', cashAndCashEquivalents: 29965000000, shortTermInvestments: 31590000000, totalDebt: 111088000000 },
      { date: '2022-09-24', cashAndCashEquivalents: 23646000000, shortTermInvestments: 24658000000, totalDebt: 120069000000 },
      { date: '2021-09-25', cashAndCashEquivalents: 34940000000, shortTermInvestments: 27699000000, totalDebt: 124719000000 }
    ],
    balanceQuarter: [
      { date: '2023-12-30', cashAndCashEquivalents: 40760000000, shortTermInvestments: 35228000000, totalDebt: 106630000000 },
      { date: '2023-09-30', cashAndCashEquivalents: 29965000000, shortTermInvestments: 31590000000, totalDebt: 111088000000 }
    ],
    cashflowAnnual: [
      { date: '2023-09-30', freeCashFlow: 99584000000, stockBasedCompensation: 10833000000, dividendsPaid: -14841000000, commonStockRepurchased: -77550000000 },
      { date: '2022-09-24', freeCashFlow: 111443000000, stockBasedCompensation: 9038000000, dividendsPaid: -14467000000, commonStockRepurchased: -89402000000 },
      { date: '2021-09-25', freeCashFlow: 92953000000, stockBasedCompensation: 7906000000, dividendsPaid: -14467000000, commonStockRepurchased: -85971000000 }
    ],
    cashflowQuarter: [
      { date: '2023-12-30', freeCashFlow: 39118000000, stockBasedCompensation: 2863000000, dividendsPaid: -3768000000, commonStockRepurchased: -19079000000 },
      { date: '2023-09-30', freeCashFlow: 20841000000, stockBasedCompensation: 2612000000, dividendsPaid: -3736000000, commonStockRepurchased: -17399000000 }
    ],
    keyMetrics: [
      { date: '2023-09-30', freeCashFlowPerShare: 6.30 },
      { date: '2022-09-24', freeCashFlowPerShare: 6.87 },
      { date: '2021-09-25', freeCashFlowPerShare: 5.56 }
    ],
    ratiosAnnual: [
      { date: '2023-09-30', dividendYield: 0.00551, priceEarningsRatio: 28.5, priceToSalesRatio: 7.2 },
      { date: '2022-09-24', dividendYield: 0.00580, priceEarningsRatio: 25.8, priceToSalesRatio: 6.8 },
      { date: '2021-09-25', dividendYield: 0.00520, priceEarningsRatio: 30.2, priceToSalesRatio: 8.1 }
    ],
    keyMetricsQuarter: [
      { date: '2023-12-30', dividendYield: 0.00540, period: 'Q1', calendarYear: '2024' },
      { date: '2023-09-30', dividendYield: 0.00551, period: 'Q4', calendarYear: '2023' },
      { date: '2023-07-01', dividendYield: 0.00560, period: 'Q3', calendarYear: '2023' },
      { date: '2023-04-01', dividendYield: 0.00545, period: 'Q2', calendarYear: '2023' }
    ],
    revenueSegments: [
      { 
        '2023-09-30': { 
          'iPhone': 200583000000, 
          'Mac': 29357000000, 
          'iPad': 28300000000,
          'Wearables, Home and Accessories': 39845000000,
          'Services': 85200000000
        }
      },
      { 
        '2022-09-24': { 
          'iPhone': 205489000000, 
          'Mac': 40177000000, 
          'iPad': 29292000000,
          'Wearables, Home and Accessories': 41241000000,
          'Services': 78129000000
        }
      }
    ],
    dividendHistory: {
      symbol: 'AAPL',
      historical: [
        { date: '2023-11-10', dividend: 0.24 },
        { date: '2023-08-11', dividend: 0.24 },
        { date: '2023-05-12', dividend: 0.24 },
        { date: '2023-02-10', dividend: 0.23 },
        { date: '2022-11-04', dividend: 0.23 },
        { date: '2022-08-05', dividend: 0.23 }
      ]
    },
    insiderTrading: [
      { 
        transactionDate: '2023-11-15', 
        securitiesTransacted: 10000, 
        price: 180.50, 
        acquisitionOrDisposition: 'D' 
      },
      { 
        transactionDate: '2023-11-20', 
        securitiesTransacted: 5000, 
        price: 182.00, 
        acquisitionOrDisposition: 'A' 
      },
      { 
        transactionDate: '2023-10-10', 
        securitiesTransacted: 15000, 
        price: 175.00, 
        acquisitionOrDisposition: 'D' 
      }
    ],
    priceHistory: {
      symbol: 'AAPL',
      historical: [
        { date: '2024-01-15', close: 185.50, adjClose: 185.50 },
        { date: '2024-01-12', close: 185.92, adjClose: 185.92 },
        { date: '2024-01-11', close: 185.59, adjClose: 185.59 },
        { date: '2024-01-10', close: 181.18, adjClose: 181.18 },
        { date: '2023-12-29', close: 192.53, adjClose: 192.53 },
        { date: '2023-11-10', close: 180.00, adjClose: 180.00 },  // Matches dividend date
        { date: '2023-08-11', close: 175.00, adjClose: 175.00 },  // Matches dividend date
        { date: '2023-05-12', close: 170.00, adjClose: 170.00 },  // Matches dividend date
        { date: '2023-02-10', close: 165.00, adjClose: 165.00 },  // Matches dividend date
        { date: '2022-11-04', close: 160.00, adjClose: 160.00 },  // Matches dividend date
        { date: '2022-08-05', close: 155.00, adjClose: 155.00 }   // Matches dividend date
      ]
    }
  }
};

describe('Batch Chart Service', () => {
  
  // Clear memoization cache before each test to ensure test isolation
  beforeEach(() => {
    memoCache.clear();
  });
  
  describe('getRevenueSeriesFromBatch', () => {
    it('should extract annual revenue series', () => {
      const result = getRevenueSeriesFromBatch(mockBatchData, 'annual');
      
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual([Date.parse('2023-09-30'), 383285000000]);
      expect(result[1]).toEqual([Date.parse('2022-09-24'), 394328000000]);
      expect(result[2]).toEqual([Date.parse('2021-09-25'), 365817000000]);
    });

    it('should extract quarterly revenue series', () => {
      const result = getRevenueSeriesFromBatch(mockBatchData, 'quarterly');
      
      expect(result).toHaveLength(4);
      expect(result[0][1]).toBe(119575000000);
      expect(result[1][1]).toBe(89498000000);
    });

    it('should return empty array if no data', () => {
      const emptyData = { data: {} };
      const result = getRevenueSeriesFromBatch(emptyData, 'annual');
      
      expect(result).toEqual([]);
    });

    it('should handle missing incomeAnnual gracefully', () => {
      const incompleteData = { data: { incomeQuarter: [] } };
      const result = getRevenueSeriesFromBatch(incompleteData, 'annual');
      
      expect(result).toEqual([]);
    });

    it('should handle invalid revenue values', () => {
      const badData = {
        data: {
          incomeAnnual: [
            { date: '2023-09-30', revenue: null },
            { date: '2022-09-24', revenue: 'invalid' },
            { date: '2021-09-25', revenue: 100000 }
          ]
        }
      };
      const result = getRevenueSeriesFromBatch(badData, 'annual');
      
      expect(result).toHaveLength(3);
      expect(result[0][1]).toBe(0); // null becomes 0
      expect(result[1][1]).toBe(0); // 'invalid' becomes 0
      expect(result[2][1]).toBe(100000); // valid number
    });
  });

  describe('getRevenueSegmentsFromBatch', () => {
    it('should extract revenue segments and series', () => {
      const result = getRevenueSegmentsFromBatch(mockBatchData);
      
      expect(result.segments).toContain('iPhone');
      expect(result.segments).toContain('Services');
      expect(result.segments.length).toBeGreaterThan(0);
      
      expect(result.series['iPhone']).toBeDefined();
      expect(result.series['iPhone'].length).toBeGreaterThan(0);
      expect(result.series['iPhone'][0]).toHaveLength(2); // [timestamp, value]
    });

    it('should sort segments alphabetically', () => {
      const result = getRevenueSegmentsFromBatch(mockBatchData);
      
      const sorted = [...result.segments].sort();
      expect(result.segments).toEqual(sorted);
    });

    it('should return empty structure if no segment data', () => {
      const noSegments = { data: {} };
      const result = getRevenueSegmentsFromBatch(noSegments);
      
      expect(result.segments).toEqual([]);
      expect(result.series).toEqual({});
    });

    it('should filter out zero or negative values', () => {
      const dataWithZeros = {
        data: {
          revenueSegments: [{
            '2023-09-30': {
              'Active': 1000000,
              'Legacy': 0,
              'Discontinued': -500
            }
          }]
        }
      };
      const result = getRevenueSegmentsFromBatch(dataWithZeros);
      
      expect(result.segments).toContain('Active');
      expect(result.segments).not.toContain('Legacy');
      expect(result.segments).not.toContain('Discontinued');
    });
  });

  describe('getFcfSeriesFromBatch', () => {
    it('should extract FCF series with metrics for annual data', () => {
      const result = getFcfSeriesFromBatch(mockBatchData, 'annual');
      
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('fcf');
      expect(result[0]).toHaveProperty('fcfPerShare');
      expect(result[0]).toHaveProperty('sbc');
      
      expect(result[0].fcf).toBe(99584000000);
      expect(result[0].fcfPerShare).toBe(6.30);
      expect(result[0].sbc).toBe(10833000000);
    });

    it('should extract quarterly FCF series', () => {
      const result = getFcfSeriesFromBatch(mockBatchData, 'quarterly');
      
      expect(result).toHaveLength(2);
      expect(result[0].fcf).toBe(39118000000);
    });

    it('should handle missing key metrics', () => {
      const noMetrics = {
        data: {
          cashflowAnnual: mockBatchData.data.cashflowAnnual
        }
      };
      const result = getFcfSeriesFromBatch(noMetrics, 'annual');
      
      expect(result).toHaveLength(3);
      expect(result[0].fcfPerShare).toBe(0); // No metrics, defaults to 0
    });

    it('should return empty array if no cashflow data', () => {
      const noCashflow = { data: {} };
      const result = getFcfSeriesFromBatch(noCashflow, 'annual');
      
      expect(result).toEqual([]);
    });
  });

  describe('getNetIncomeSeriesFromBatch', () => {
    it('should extract annual net income series', () => {
      const result = getNetIncomeSeriesFromBatch(mockBatchData, 'annual');
      
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual([Date.parse('2023-09-30'), 96995000000]);
      expect(result[1][1]).toBe(99803000000);
    });

    it('should extract quarterly net income series', () => {
      const result = getNetIncomeSeriesFromBatch(mockBatchData, 'quarterly');
      
      expect(result).toHaveLength(4);
      expect(result[0][1]).toBe(33916000000);
    });

    it('should return empty array if no data', () => {
      const result = getNetIncomeSeriesFromBatch({ data: {} }, 'annual');
      expect(result).toEqual([]);
    });
  });

  describe('getEpsSeriesFromBatch', () => {
    it('should extract annual EPS series by default', () => {
      const result = getEpsSeriesFromBatch(mockBatchData);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual([Date.parse('2023-09-30'), 6.13]);
      expect(result[1][1]).toBe(6.15);
    });

    it('should extract quarterly EPS series when specified', () => {
      const result = getEpsSeriesFromBatch(mockBatchData, 'quarterly');
      
      expect(result).toHaveLength(4);
      // Quarterly data returns 4-element arrays: [timestamp, value, period, fiscalYear]
      // If period/fiscalYear are missing from mock data, they will be empty strings
      expect(result[0]).toEqual([Date.parse('2023-12-30'), 2.18, '', '']);
      expect(result[1][1]).toBe(1.46);
    });

    it('should return empty array if no annual data', () => {
      const noData = { data: { incomeAnnual: [] } };
      const result = getEpsSeriesFromBatch(noData);
      
      expect(result).toEqual([]);
    });

    it('should handle zero EPS', () => {
      const zeroEps = {
        data: {
          incomeAnnual: [
            { date: '2023-09-30', eps: 0 }
          ]
        }
      };
      const result = getEpsSeriesFromBatch(zeroEps);
      
      expect(result).toHaveLength(1);
      expect(result[0][1]).toBe(0);
    });
  });

  describe('getEbitdaSeriesFromBatch', () => {
    it('should extract EBITDA series with bridge components', () => {
      const result = getEbitdaSeriesFromBatch(mockBatchData, 'annual');
      
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('revenue');
      expect(result[0]).toHaveProperty('ebitda');
      expect(result[0]).toHaveProperty('depreciationAndAmortization');
      
      expect(result[0].ebitda).toBe(125887000000);
      expect(result[0].operatingIncome).toBe(114368000000);
    });

    it('should handle missing fields gracefully', () => {
      const partialData = {
        data: {
          incomeAnnual: [{
            date: '2023-09-30',
            revenue: 1000000,
            ebitda: 500000
            // Missing other fields
          }]
        }
      };
      const result = getEbitdaSeriesFromBatch(partialData, 'annual');
      
      expect(result[0].revenue).toBe(1000000);
      expect(result[0].ebitda).toBe(500000);
      expect(result[0].costOfRevenue).toBe(0);
    });

    it('should return empty array if no data', () => {
      const result = getEbitdaSeriesFromBatch({ data: {} }, 'annual');
      expect(result).toEqual([]);
    });
  });

  describe('getCashDebtSeriesFromBatch', () => {
    it('should extract cash and debt series', () => {
      const result = getCashDebtSeriesFromBatch(mockBatchData, 'annual');
      
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('cash');
      expect(result[0]).toHaveProperty('debt');
      
      // Cash = cashAndCashEquivalents + shortTermInvestments
      expect(result[0].cash).toBe(29965000000 + 31590000000);
      expect(result[0].debt).toBe(111088000000);
    });

    it('should extract quarterly data', () => {
      const result = getCashDebtSeriesFromBatch(mockBatchData, 'quarterly');
      
      expect(result).toHaveLength(2);
      expect(result[0].cash).toBe(40760000000 + 35228000000);
    });

    it('should handle missing short term investments', () => {
      const noShortTerm = {
        data: {
          balanceAnnual: [{
            date: '2023-09-30',
            cashAndCashEquivalents: 1000000,
            totalDebt: 500000
          }]
        }
      };
      const result = getCashDebtSeriesFromBatch(noShortTerm, 'annual');
      
      expect(result[0].cash).toBe(1000000); // Only cash, no short term
      expect(result[0].debt).toBe(500000);
    });
  });

  describe('getCapitalReturnedSeriesFromBatch', () => {
    it('should extract capital returned (dividends + buybacks)', () => {
      const result = getCapitalReturnedSeriesFromBatch(mockBatchData, 'annual');
      
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('dividends');
      expect(result[0]).toHaveProperty('buybacks');
      expect(result[0]).toHaveProperty('total');
      
      // FMP returns negative numbers, we convert to positive
      expect(result[0].dividends).toBe(14841000000);
      expect(result[0].buybacks).toBe(77550000000);
      expect(result[0].total).toBe(14841000000 + 77550000000);
    });

    it('should handle quarterly data', () => {
      const result = getCapitalReturnedSeriesFromBatch(mockBatchData, 'quarterly');
      
      expect(result).toHaveLength(2);
      expect(result[0].dividends).toBeGreaterThan(0);
    });

    it('should handle missing values', () => {
      const missingValues = {
        data: {
          cashflowAnnual: [{
            date: '2023-09-30',
            dividendsPaid: -1000000
            // Missing commonStockRepurchased
          }]
        }
      };
      const result = getCapitalReturnedSeriesFromBatch(missingValues, 'annual');
      
      expect(result[0].dividends).toBe(1000000);
      expect(result[0].buybacks).toBe(0);
      expect(result[0].total).toBe(1000000);
    });
  });

  describe('getSharesSeriesFromBatch', () => {
    it('should extract shares outstanding series', () => {
      const result = getSharesSeriesFromBatch(mockBatchData, 'annual');
      
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual([Date.parse('2023-09-30'), 15812547000]);
      expect(result[1][1]).toBe(16215963000);
    });

    it('should handle quarterly data', () => {
      const result = getSharesSeriesFromBatch(mockBatchData, 'quarterly');
      
      expect(result).toHaveLength(4);
      expect(result[0][1]).toBe(15552752000);
    });

    it('should return empty array if no data', () => {
      const result = getSharesSeriesFromBatch({ data: {} }, 'annual');
      expect(result).toEqual([]);
    });
  });

  describe('getExpensesSeriesFromBatch', () => {
    it('should extract expense breakdown', () => {
      const result = getExpensesSeriesFromBatch(mockBatchData, 'annual');
      
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('costOfRevenue');
      expect(result[0]).toHaveProperty('operatingExpenses');
      expect(result[0]).toHaveProperty('researchAndDevelopment');
      expect(result[0]).toHaveProperty('sellingGeneralAdmin');
      
      expect(result[0].costOfRevenue).toBe(214137000000);
      expect(result[0].researchAndDevelopment).toBe(29915000000);
    });

    it('should handle missing expense fields', () => {
      const partialExpenses = {
        data: {
          incomeAnnual: [{
            date: '2023-09-30',
            costOfRevenue: 1000000
            // Missing other expense fields
          }]
        }
      };
      const result = getExpensesSeriesFromBatch(partialExpenses, 'annual');
      
      expect(result[0].costOfRevenue).toBe(1000000);
      expect(result[0].operatingExpenses).toBe(0);
      expect(result[0].researchAndDevelopment).toBe(0);
    });
  });

  describe('getDividendYieldSeriesFromBatch', () => {
    it('should return annual dividend yield from ratiosAnnual', () => {
      const result = getDividendYieldSeriesFromBatch(mockBatchData, 'annual');
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveLength(2); // [timestamp, yield%]
      
      // Verify yield matches mock data (0.00551 * 100 = 0.551%)
      expect(result[0][1]).toBe(0.551);
      expect(result[0][1]).toBeGreaterThan(0);
      expect(result[0][1]).toBeLessThan(100); // Reasonable yield percentage
    });

    it('should return quarterly dividend yield from keyMetricsQuarter', () => {
      const result = getDividendYieldSeriesFromBatch(mockBatchData, 'quarterly');
      
      expect(result.length).toBeGreaterThan(0);
      // Quarterly data includes fiscal period metadata (4-element arrays)
      expect(result[0].length).toBeGreaterThanOrEqual(2);
      
      // First point should be Q1 2024 with yield 0.540% (0.00540 * 100)
      expect(result[0][1]).toBe(0.540);
    });

    it('should fallback to ratiosAnnual if quarterly data unavailable', () => {
      const dataWithoutQuarterly = {
        ...mockBatchData,
        data: {
          ...mockBatchData.data,
          keyMetricsQuarter: [] // Empty quarterly data
        }
      };
      
      const result = getDividendYieldSeriesFromBatch(dataWithoutQuarterly as any, 'quarterly');
      
      // Should fallback to annual data
      expect(result.length).toBeGreaterThan(0);
      expect(result[0][1]).toBe(0.551); // From ratiosAnnual
    });

    it('should return empty array if no dividend data', () => {
      const noDividends = { 
        data: { 
          profile: [{ price: 150 }],
          dividendHistory: { historical: [] } 
        } 
      };
      const result = getDividendYieldSeriesFromBatch(noDividends, 'annual');
      
      expect(result).toEqual([]);
    });

    it('should require priceHistory to calculate yield', () => {
      const noPrice = {
        data: {
          dividendHistory: mockBatchData.data.dividendHistory
          // No priceHistory
        }
      };
      const result = getDividendYieldSeriesFromBatch(noPrice, 'annual');
      
      // Without price history, should return empty array
      expect(result).toEqual([]);
    });
  });

  describe('getInsiderTradingFromBatch', () => {
    it('should aggregate insider trading by month', () => {
      const result = getInsiderTradingFromBatch(mockBatchData);
      
      expect(result).toHaveProperty('buys');
      expect(result).toHaveProperty('sells');
      expect(result).toHaveProperty('net');
      
      expect(Array.isArray(result.buys)).toBe(true);
      expect(Array.isArray(result.sells)).toBe(true);
      expect(Array.isArray(result.net)).toBe(true);
    });

    it('should calculate buy and sell values correctly', () => {
      const result = getInsiderTradingFromBatch(mockBatchData);
      
      // November 2023 should have both buy and sell
      const novBuys = result.buys.find(item => {
        const date = new Date(item[0]);
        return date.getMonth() === 10 && date.getFullYear() === 2023;
      });
      
      const novSells = result.sells.find(item => {
        const date = new Date(item[0]);
        return date.getMonth() === 10 && date.getFullYear() === 2023;
      });
      
      expect(novBuys).toBeDefined();
      expect(novSells).toBeDefined();
      
      if (novBuys) {
        // Buy: 5000 * 182.00 = 910,000
        expect(novBuys[1]).toBe(5000 * 182.00);
      }
      
      if (novSells) {
        // Sells: (10000 * 180.50) = 1,805,000
        expect(novSells[1]).toBe(10000 * 180.50);
      }
    });

    it('should calculate net shares correctly', () => {
      const result = getInsiderTradingFromBatch(mockBatchData);
      
      const novNet = result.net.find(item => {
        const date = new Date(item[0]);
        return date.getMonth() === 10 && date.getFullYear() === 2023;
      });
      
      expect(novNet).toBeDefined();
      if (novNet) {
        // Net = +5000 (buy) - 10000 (sell) = -5000
        expect(novNet[1]).toBe(-5000);
      }
    });

    it('should return empty arrays if no insider data', () => {
      const noInsider = { data: {} };
      const result = getInsiderTradingFromBatch(noInsider);
      
      expect(result.buys).toEqual([]);
      expect(result.sells).toEqual([]);
      expect(result.net).toEqual([]);
    });

    it('should sort results by date', () => {
      const result = getInsiderTradingFromBatch(mockBatchData);
      
      // Check buys are sorted
      for (let i = 1; i < result.buys.length; i++) {
        expect(result.buys[i][0]).toBeGreaterThanOrEqual(result.buys[i-1][0]);
      }
    });
  });

  describe('getPriceSeriesFromBatch', () => {
    it('should extract price history series', () => {
      const result = getPriceSeriesFromBatch(mockBatchData);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveLength(2); // [timestamp, price]
      
      // Should be sorted ascending by timestamp (oldest first)
      for (let i = 1; i < result.length; i++) {
        expect(result[i][0]).toBeGreaterThan(result[i-1][0]);
      }
    });

    it('should use adjClose if available, else close', () => {
      const result = getPriceSeriesFromBatch(mockBatchData);
      
      // Sorted ascending, so oldest is first (2022-08-05)
      const oldest = result[0];
      expect(oldest[1]).toBe(155.00);  // From 2022-08-05
      
      // Most recent is last (2024-01-15)
      const newest = result[result.length - 1];
      expect(newest[1]).toBe(185.50);
    });

    it('should limit data to maxDays', () => {
      // Create data with today's date for realistic maxDays test
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const tenDaysAgo = new Date(today);
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      
      const recentData = {
        data: {
          priceHistory: {
            historical: [
              { date: today.toISOString().split('T')[0], adjClose: 100 },
              { date: yesterday.toISOString().split('T')[0], adjClose: 99 },
              { date: tenDaysAgo.toISOString().split('T')[0], adjClose: 95 }
            ]
          }
        }
      };
      
      const result = getPriceSeriesFromBatch(recentData, 7);
      
      // Should only include data from last 7 days (filters out 10-day-old data)
      expect(result.length).toBe(2);
      const oldestTimestamp = result[0][0];
      const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
      expect(oldestTimestamp).toBeGreaterThanOrEqual(cutoff);
    });

    it('should filter out invalid data points', () => {
      const badData = {
        data: {
          priceHistory: {
            historical: [
              { date: '2024-01-15', adjClose: 185.50 },
              { date: null, adjClose: 180.00 }, // Invalid date
              { date: '2024-01-13', adjClose: null }, // Invalid price
              { date: '2024-01-12', close: 182.00 } // Valid with close
            ]
          }
        }
      };
      const result = getPriceSeriesFromBatch(badData);
      
      expect(result.length).toBe(2); // Only 2 valid data points
    });

    it('should return empty array if no price history', () => {
      const noPrice = { data: {} };
      const result = getPriceSeriesFromBatch(noPrice);
      
      expect(result).toEqual([]);
    });

    it('should handle empty historical array', () => {
      const emptyHistory = { 
        data: { 
          priceHistory: { historical: [] } 
        } 
      };
      const result = getPriceSeriesFromBatch(emptyHistory);
      
      expect(result).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle null batchData gracefully', () => {
      expect(getRevenueSeriesFromBatch(null)).toEqual([]);
      expect(getFcfSeriesFromBatch(null)).toEqual([]);
      expect(getEpsSeriesFromBatch(null)).toEqual([]);
      expect(getPriceSeriesFromBatch(null)).toEqual([]);
    });

    it('should handle undefined batchData gracefully', () => {
      expect(getNetIncomeSeriesFromBatch(undefined)).toEqual([]);
      expect(getSharesSeriesFromBatch(undefined)).toEqual([]);
      expect(getExpensesSeriesFromBatch(undefined)).toEqual([]);
    });

    it('should handle malformed data structures', () => {
      const malformed = {
        data: {
          incomeAnnual: 'not an array',
          cashflowQuarter: null
        }
      };
      
      expect(getRevenueSeriesFromBatch(malformed)).toEqual([]);
      expect(getFcfSeriesFromBatch(malformed, 'quarterly')).toEqual([]);
    });

    it('should not throw errors on missing nested properties', () => {
      const partial = { data: { someOtherField: 'value' } };
      
      expect(() => getRevenueSeriesFromBatch(partial)).not.toThrow();
      expect(() => getFcfSeriesFromBatch(partial)).not.toThrow();
      expect(() => getCashDebtSeriesFromBatch(partial)).not.toThrow();
    });
  });

  describe('Data Type Conversions', () => {
    it('should convert date strings to timestamps', () => {
      const result = getRevenueSeriesFromBatch(mockBatchData, 'annual');
      
      expect(typeof result[0][0]).toBe('number');
      expect(result[0][0]).toBeGreaterThan(0);
      expect(result[0][0]).toBe(Date.parse('2023-09-30'));
    });

    it('should convert string numbers to actual numbers', () => {
      const stringData = {
        data: {
          incomeAnnual: [{
            date: '2023-09-30',
            revenue: '1000000',
            netIncome: '500000'
          }]
        }
      };
      
      const revenueResult = getRevenueSeriesFromBatch(stringData, 'annual');
      const incomeResult = getNetIncomeSeriesFromBatch(stringData, 'annual');
      
      expect(typeof revenueResult[0][1]).toBe('number');
      expect(revenueResult[0][1]).toBe(1000000);
      expect(typeof incomeResult[0][1]).toBe('number');
      expect(incomeResult[0][1]).toBe(500000);
    });

    it('should handle null/undefined values as zero', () => {
      const nullData = {
        data: {
          incomeAnnual: [{
            date: '2023-09-30',
            revenue: null,
            netIncome: undefined
          }]
        }
      };
      
      const revenueResult = getRevenueSeriesFromBatch(nullData, 'annual');
      const incomeResult = getNetIncomeSeriesFromBatch(nullData, 'annual');
      
      expect(revenueResult[0][1]).toBe(0);
      expect(incomeResult[0][1]).toBe(0);
    });
  });

  // =====================================================
  // PRICE HISTORY INTEGRITY TESTS
  // These tests catch the bug where priceHistory is null
  // =====================================================
  describe('getPriceSeriesFromBatch - Data Integrity', () => {
    it('should return empty array when batchData is null', () => {
      const result = getPriceSeriesFromBatch(null)
      expect(result).toEqual([])
    })

    it('should return empty array when priceHistory is null (BUG CASE)', () => {
      const batchDataWithNullPrice = {
        ticker: 'AAPL',
        data: {
          profile: [{ symbol: 'AAPL' }],
          priceHistory: null  // THIS IS THE BUG WE'RE CATCHING
        }
      }

      const result = getPriceSeriesFromBatch(batchDataWithNullPrice)
      expect(result).toEqual([])
    })

    it('should return empty array when priceHistory is undefined', () => {
      const batchDataWithUndefinedPrice = {
        ticker: 'AAPL',
        data: {
          profile: [{ symbol: 'AAPL' }]
          // priceHistory is undefined
        }
      }

      const result = getPriceSeriesFromBatch(batchDataWithUndefinedPrice)
      expect(result).toEqual([])
    })

    it('should return empty array when historical array is empty', () => {
      const batchDataWithEmptyHistory = {
        ticker: 'AAPL',
        data: {
          priceHistory: {
            symbol: 'AAPL',
            historical: []  // Empty array
          }
        }
      }

      const result = getPriceSeriesFromBatch(batchDataWithEmptyHistory)
      expect(result).toEqual([])
    })

    it('should extract valid price data with adjClose', () => {
      const validBatchData = {
        ticker: 'AAPL',
        data: {
          priceHistory: {
            symbol: 'AAPL',
            historical: [
              {
                date: '2024-01-01',
                close: 184.0,
                adjClose: 183.5
              },
              {
                date: '2024-01-02',
                close: 185.0,
                adjClose: 184.8
              }
            ]
          }
        }
      }

      const result = getPriceSeriesFromBatch(validBatchData)
      
      expect(result).toHaveLength(2)
      expect(result[0][1]).toBe(183.5)  // Uses adjClose
      expect(result[1][1]).toBe(184.8)
    })

    it('should fallback to close when adjClose is missing', () => {
      const batchDataNoAdjClose = {
        ticker: 'AAPL',
        data: {
          priceHistory: {
            symbol: 'AAPL',
            historical: [
              {
                date: '2024-01-01',
                close: 184.0
                // No adjClose
              }
            ]
          }
        }
      }

      const result = getPriceSeriesFromBatch(batchDataNoAdjClose)
      
      expect(result).toHaveLength(1)
      expect(result[0][1]).toBe(184.0)  // Fallback to close
    })

    it('should filter out entries with invalid dates', () => {
      const batchDataInvalidDates = {
        ticker: 'AAPL',
        data: {
          priceHistory: {
            symbol: 'AAPL',
            historical: [
              {
                date: '2024-01-01',
                close: 184.0
              },
              {
                date: 'invalid-date',
                close: 185.0
              },
              {
                date: null,
                close: 186.0
              },
              {
                // Missing date entirely
                close: 187.0
              }
            ]
          }
        }
      }

      const result = getPriceSeriesFromBatch(batchDataInvalidDates)
      
      // Should only include the valid entry
      expect(result).toHaveLength(1)
      expect(result[0][1]).toBe(184.0)
    })

    it('should filter out entries with invalid prices', () => {
      const batchDataInvalidPrices = {
        ticker: 'AAPL',
        data: {
          priceHistory: {
            symbol: 'AAPL',
            historical: [
              {
                date: '2024-01-01',
                close: 184.0
              },
              {
                date: '2024-01-02',
                close: null
              },
              {
                date: '2024-01-03',
                close: NaN
              },
              {
                date: '2024-01-04'
                // Missing close entirely
              }
            ]
          }
        }
      }

      const result = getPriceSeriesFromBatch(batchDataInvalidPrices)
      
      // Should only include the valid entry
      expect(result).toHaveLength(1)
      expect(result[0][1]).toBe(184.0)
    })

    it('should sort data by timestamp ascending', () => {
      const unsortedBatchData = {
        ticker: 'AAPL',
        data: {
          priceHistory: {
            symbol: 'AAPL',
            historical: [
              {
                date: '2024-01-03',
                close: 186.0
              },
              {
                date: '2024-01-01',
                close: 184.0
              },
              {
                date: '2024-01-02',
                close: 185.0
              }
            ]
          }
        }
      }

      const result = getPriceSeriesFromBatch(unsortedBatchData)
      
      // Should be sorted oldest to newest
      expect(result).toHaveLength(3)
      expect(result[0][1]).toBe(184.0)  // 2024-01-01
      expect(result[1][1]).toBe(185.0)  // 2024-01-02
      expect(result[2][1]).toBe(186.0)  // 2024-01-03
    })

    it('should handle maxDays parameter to limit data range', () => {
      const now = Date.now()
      const oneDayMs = 24 * 60 * 60 * 1000
      
      const batchDataManyDays = {
        ticker: 'AAPL',
        data: {
          priceHistory: {
            symbol: 'AAPL',
            historical: [
              {
                date: new Date(now - 30 * oneDayMs).toISOString().split('T')[0],
                close: 180.0
              },
              {
                date: new Date(now - 10 * oneDayMs).toISOString().split('T')[0],
                close: 185.0
              },
              {
                date: new Date(now - 1 * oneDayMs).toISOString().split('T')[0],
                close: 190.0
              }
            ]
          }
        }
      }

      // Get last 15 days only
      const result = getPriceSeriesFromBatch(batchDataManyDays, 15)
      
      // Should exclude data older than 15 days
      expect(result.length).toBeLessThanOrEqual(2)
    })

    it('should handle real FMP response structure', () => {
      const realFMPStructure = {
        ticker: 'AAPL',
        data: {
          priceHistory: {
            symbol: 'AAPL',
            historical: [
              {
                date: '2024-11-06',
                open: 189.5,
                high: 191.2,
                low: 188.8,
                close: 190.5,
                adjClose: 190.5,
                volume: 52000000,
                unadjustedVolume: 52000000,
                change: 1.0,
                changePercent: 0.53,
                vwap: 190.0,
                label: 'November 06, 24',
                changeOverTime: 0.0053
              }
            ]
          }
        }
      }

      const result = getPriceSeriesFromBatch(realFMPStructure)
      
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual([
        new Date('2024-11-06').getTime(),
        190.5
      ])
    })

    it('should return valid data when priceHistory exists with large dataset', () => {
      // Simulate 30 years of data (7500+ entries)
      const largePriceHistory = {
        ticker: 'AAPL',
        data: {
          priceHistory: {
            symbol: 'AAPL',
            historical: Array.from({ length: 7500 }, (_, i) => ({
              date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              close: 100 + Math.random() * 100,
              adjClose: 100 + Math.random() * 100
            }))
          }
        }
      }

      const result = getPriceSeriesFromBatch(largePriceHistory)
      
      expect(result.length).toBeGreaterThan(7000)
      expect(result[0]).toHaveLength(2)  // [timestamp, price]
      expect(typeof result[0][0]).toBe('number')
      expect(typeof result[0][1]).toBe('number')
    })
  })
});

