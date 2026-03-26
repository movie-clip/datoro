// src/services/financials/batchDataSchemas.ts
// Zod validation schemas for batch API data

import { z } from 'zod'

/**
 * Utility schemas for common patterns
 */

// Coerce string numbers to actual numbers (FMP sometimes returns strings)
const NumericString = z.union([
  z.number(),
  z.string().transform(val => {
    const num = parseFloat(val)
    return isNaN(num) ? 0 : num
  })
])

// Date string that can be parsed
const DateString = z.string().refine(
  val => !isNaN(Date.parse(val)),
  { message: 'Invalid date string' }
)

/**
 * Core Company Data Schemas
 */

export const ProfileSchema = z.object({
  symbol: z.string(),
  companyName: z.string(),
  currency: z.string().optional(),
  exchangeShortName: z.string().optional(),
  industry: z.string().optional(),
  sector: z.string().optional(),
  description: z.string().optional(),
  ceo: z.string().optional(),
  website: z.string().optional(),
  image: z.string().optional(),
  ipoDate: z.string().optional(),
  isActivelyTrading: z.boolean().optional(),
}).passthrough() // Allow additional fields

export const QuoteSchema = z.object({
  symbol: z.string(),
  name: z.string().optional(),
  price: NumericString,
  changesPercentage: NumericString.optional(),
  change: NumericString.optional(),
  dayLow: NumericString.optional(),
  dayHigh: NumericString.optional(),
  yearHigh: NumericString.optional(),
  yearLow: NumericString.optional(),
  marketCap: NumericString.optional(),
  priceAvg50: NumericString.optional(),
  priceAvg200: NumericString.optional(),
  volume: NumericString.optional(),
  avgVolume: NumericString.optional(),
  exchange: z.string().optional(),
  open: NumericString.optional(),
  previousClose: NumericString.optional(),
  eps: NumericString.optional(),
  pe: NumericString.optional(),
  earningsAnnouncement: z.string().optional(),
  sharesOutstanding: NumericString.optional(),
  timestamp: z.number().optional(),
}).passthrough()

/**
 * Financial Statement Schemas
 */

export const IncomeStatementSchema = z.object({
  date: DateString,
  symbol: z.string().optional(),
  reportedCurrency: z.string().optional(),
  cik: z.string().optional(),
  fillingDate: z.string().optional(),
  acceptedDate: z.string().optional(),
  calendarYear: z.string().optional(),
  period: z.string().optional(),
  revenue: NumericString,
  costOfRevenue: NumericString.optional(),
  grossProfit: NumericString.optional(),
  grossProfitRatio: NumericString.optional(),
  researchAndDevelopmentExpenses: NumericString.optional(),
  generalAndAdministrativeExpenses: NumericString.optional(),
  sellingAndMarketingExpenses: NumericString.optional(),
  sellingGeneralAndAdministrativeExpenses: NumericString.optional(),
  otherExpenses: NumericString.optional(),
  operatingExpenses: NumericString.optional(),
  costAndExpenses: NumericString.optional(),
  interestIncome: NumericString.optional(),
  interestExpense: NumericString.optional(),
  depreciationAndAmortization: NumericString.optional(),
  ebitda: NumericString.optional(),
  ebitdaratio: NumericString.optional(),
  operatingIncome: NumericString.optional(),
  operatingIncomeRatio: NumericString.optional(),
  totalOtherIncomeExpensesNet: NumericString.optional(),
  incomeBeforeTax: NumericString.optional(),
  incomeBeforeTaxRatio: NumericString.optional(),
  incomeTaxExpense: NumericString.optional(),
  netIncome: NumericString.optional(),
  netIncomeRatio: NumericString.optional(),
  eps: NumericString.optional(),
  epsdiluted: NumericString.optional(),
  weightedAverageShsOut: NumericString.optional(),
  weightedAverageShsOutDil: NumericString.optional(),
  link: z.string().optional(),
  finalLink: z.string().optional(),
}).passthrough()

export const BalanceSheetSchema = z.object({
  date: DateString,
  symbol: z.string().optional(),
  reportedCurrency: z.string().optional(),
  cik: z.string().optional(),
  fillingDate: z.string().optional(),
  acceptedDate: z.string().optional(),
  calendarYear: z.string().optional(),
  period: z.string().optional(),
  cashAndCashEquivalents: NumericString.optional(),
  shortTermInvestments: NumericString.optional(),
  cashAndShortTermInvestments: NumericString.optional(),
  netReceivables: NumericString.optional(),
  inventory: NumericString.optional(),
  otherCurrentAssets: NumericString.optional(),
  totalCurrentAssets: NumericString.optional(),
  propertyPlantEquipmentNet: NumericString.optional(),
  goodwill: NumericString.optional(),
  intangibleAssets: NumericString.optional(),
  goodwillAndIntangibleAssets: NumericString.optional(),
  longTermInvestments: NumericString.optional(),
  taxAssets: NumericString.optional(),
  otherNonCurrentAssets: NumericString.optional(),
  totalNonCurrentAssets: NumericString.optional(),
  otherAssets: NumericString.optional(),
  totalAssets: NumericString.optional(),
  accountPayables: NumericString.optional(),
  shortTermDebt: NumericString.optional(),
  taxPayables: NumericString.optional(),
  deferredRevenue: NumericString.optional(),
  otherCurrentLiabilities: NumericString.optional(),
  totalCurrentLiabilities: NumericString.optional(),
  longTermDebt: NumericString.optional(),
  deferredRevenueNonCurrent: NumericString.optional(),
  deferredTaxLiabilitiesNonCurrent: NumericString.optional(),
  otherNonCurrentLiabilities: NumericString.optional(),
  totalNonCurrentLiabilities: NumericString.optional(),
  otherLiabilities: NumericString.optional(),
  capitalLeaseObligations: NumericString.optional(),
  totalLiabilities: NumericString.optional(),
  preferredStock: NumericString.optional(),
  commonStock: NumericString.optional(),
  retainedEarnings: NumericString.optional(),
  accumulatedOtherComprehensiveIncomeLoss: NumericString.optional(),
  othertotalStockholdersEquity: NumericString.optional(),
  totalStockholdersEquity: NumericString.optional(),
  totalEquity: NumericString.optional(),
  totalLiabilitiesAndStockholdersEquity: NumericString.optional(),
  minorityInterest: NumericString.optional(),
  totalLiabilitiesAndTotalEquity: NumericString.optional(),
  totalInvestments: NumericString.optional(),
  totalDebt: NumericString.optional(),
  netDebt: NumericString.optional(),
  link: z.string().optional(),
  finalLink: z.string().optional(),
}).passthrough()

export const CashFlowStatementSchema = z.object({
  date: DateString,
  symbol: z.string().optional(),
  reportedCurrency: z.string().optional(),
  cik: z.string().optional(),
  fillingDate: z.string().optional(),
  acceptedDate: z.string().optional(),
  calendarYear: z.string().optional(),
  period: z.string().optional(),
  netIncome: NumericString.optional(),
  depreciationAndAmortization: NumericString.optional(),
  deferredIncomeTax: NumericString.optional(),
  stockBasedCompensation: NumericString.optional(),
  changeInWorkingCapital: NumericString.optional(),
  accountsReceivables: NumericString.optional(),
  inventory: NumericString.optional(),
  accountsPayables: NumericString.optional(),
  otherWorkingCapital: NumericString.optional(),
  otherNonCashItems: NumericString.optional(),
  netCashProvidedByOperatingActivities: NumericString.optional(),
  investmentsInPropertyPlantAndEquipment: NumericString.optional(),
  acquisitionsNet: NumericString.optional(),
  purchasesOfInvestments: NumericString.optional(),
  salesMaturitiesOfInvestments: NumericString.optional(),
  otherInvestingActivites: NumericString.optional(),
  netCashUsedForInvestingActivites: NumericString.optional(),
  debtRepayment: NumericString.optional(),
  commonStockIssued: NumericString.optional(),
  commonStockRepurchased: NumericString.optional(),
  dividendsPaid: NumericString.optional(),
  otherFinancingActivites: NumericString.optional(),
  netCashUsedProvidedByFinancingActivities: NumericString.optional(),
  effectOfForexChangesOnCash: NumericString.optional(),
  netChangeInCash: NumericString.optional(),
  cashAtEndOfPeriod: NumericString.optional(),
  cashAtBeginningOfPeriod: NumericString.optional(),
  operatingCashFlow: NumericString.optional(),
  capitalExpenditure: NumericString.optional(),
  freeCashFlow: NumericString.optional(),
  link: z.string().optional(),
  finalLink: z.string().optional(),
}).passthrough()

/**
 * Additional Data Schemas
 */

export const RatioSchema = z.object({
  date: DateString,
  symbol: z.string().optional(),
  period: z.string().optional(),
  currentRatio: NumericString.optional(),
  quickRatio: NumericString.optional(),
  cashRatio: NumericString.optional(),
  daysOfSalesOutstanding: NumericString.optional(),
  daysOfInventoryOutstanding: NumericString.optional(),
  operatingCycle: NumericString.optional(),
  daysOfPayablesOutstanding: NumericString.optional(),
  cashConversionCycle: NumericString.optional(),
  grossProfitMargin: NumericString.optional(),
  operatingProfitMargin: NumericString.optional(),
  pretaxProfitMargin: NumericString.optional(),
  netProfitMargin: NumericString.optional(),
  effectiveTaxRate: NumericString.optional(),
  returnOnAssets: NumericString.optional(),
  returnOnEquity: NumericString.optional(),
  returnOnCapitalEmployed: NumericString.optional(),
  netIncomePerEBT: NumericString.optional(),
  ebtPerEbit: NumericString.optional(),
  ebitPerRevenue: NumericString.optional(),
  debtRatio: NumericString.optional(),
  debtEquityRatio: NumericString.optional(),
  longTermDebtToCapitalization: NumericString.optional(),
  totalDebtToCapitalization: NumericString.optional(),
  interestCoverage: NumericString.optional(),
  cashFlowToDebtRatio: NumericString.optional(),
  companyEquityMultiplier: NumericString.optional(),
  receivablesTurnover: NumericString.optional(),
  payablesTurnover: NumericString.optional(),
  inventoryTurnover: NumericString.optional(),
  fixedAssetTurnover: NumericString.optional(),
  assetTurnover: NumericString.optional(),
  operatingCashFlowPerShare: NumericString.optional(),
  freeCashFlowPerShare: NumericString.optional(),
  cashPerShare: NumericString.optional(),
  payoutRatio: NumericString.optional(),
  operatingCashFlowSalesRatio: NumericString.optional(),
  freeCashFlowOperatingCashFlowRatio: NumericString.optional(),
  cashFlowCoverageRatios: NumericString.optional(),
  shortTermCoverageRatios: NumericString.optional(),
  capitalExpenditureCoverageRatio: NumericString.optional(),
  dividendPaidAndCapexCoverageRatio: NumericString.optional(),
  dividendPayoutRatio: NumericString.optional(),
  priceBookValueRatio: NumericString.optional(),
  priceToBookRatio: NumericString.optional(),
  priceToSalesRatio: NumericString.optional(),
  priceEarningsRatio: NumericString.optional(),
  priceToFreeCashFlowsRatio: NumericString.optional(),
  priceToOperatingCashFlowsRatio: NumericString.optional(),
  priceCashFlowRatio: NumericString.optional(),
  priceEarningsToGrowthRatio: NumericString.optional(),
  priceSalesRatio: NumericString.optional(),
  dividendYield: NumericString.optional(),
  enterpriseValueMultiple: NumericString.optional(),
  priceFairValue: NumericString.optional(),
}).passthrough()

export const KeyMetricsSchema = z.object({
  date: DateString,
  symbol: z.string().optional(),
  period: z.string().optional(),
  revenuePerShare: NumericString.optional(),
  netIncomePerShare: NumericString.optional(),
  operatingCashFlowPerShare: NumericString.optional(),
  freeCashFlowPerShare: NumericString.optional(),
  cashPerShare: NumericString.optional(),
  bookValuePerShare: NumericString.optional(),
  tangibleBookValuePerShare: NumericString.optional(),
  shareholdersEquityPerShare: NumericString.optional(),
  interestDebtPerShare: NumericString.optional(),
  marketCap: NumericString.optional(),
  enterpriseValue: NumericString.optional(),
  peRatio: NumericString.optional(),
  priceToSalesRatio: NumericString.optional(),
  pocfratio: NumericString.optional(),
  pfcfRatio: NumericString.optional(),
  pbRatio: NumericString.optional(),
  ptbRatio: NumericString.optional(),
  evToSales: NumericString.optional(),
  enterpriseValueOverEBITDA: NumericString.optional(),
  evToOperatingCashFlow: NumericString.optional(),
  evToFreeCashFlow: NumericString.optional(),
  earningsYield: NumericString.optional(),
  freeCashFlowYield: NumericString.optional(),
  debtToEquity: NumericString.optional(),
  debtToAssets: NumericString.optional(),
  netDebtToEBITDA: NumericString.optional(),
  currentRatio: NumericString.optional(),
  interestCoverage: NumericString.optional(),
  incomeQuality: NumericString.optional(),
  dividendYield: NumericString.optional(),
  payoutRatio: NumericString.optional(),
  salesGeneralAndAdministrativeToRevenue: NumericString.optional(),
  researchAndDdevelopementToRevenue: NumericString.optional(),
  intangiblesToTotalAssets: NumericString.optional(),
  capexToOperatingCashFlow: NumericString.optional(),
  capexToRevenue: NumericString.optional(),
  capexToDepreciation: NumericString.optional(),
  stockBasedCompensationToRevenue: NumericString.optional(),
  grahamNumber: NumericString.optional(),
  roic: NumericString.optional(),
  returnOnTangibleAssets: NumericString.optional(),
  grahamNetNet: NumericString.optional(),
  workingCapital: NumericString.optional(),
  tangibleAssetValue: NumericString.optional(),
  netCurrentAssetValue: NumericString.optional(),
  investedCapital: NumericString.optional(),
  averageReceivables: NumericString.optional(),
  averagePayables: NumericString.optional(),
  averageInventory: NumericString.optional(),
  daysSalesOutstanding: NumericString.optional(),
  daysPayablesOutstanding: NumericString.optional(),
  daysOfInventoryOnHand: NumericString.optional(),
  receivablesTurnover: NumericString.optional(),
  payablesTurnover: NumericString.optional(),
  inventoryTurnover: NumericString.optional(),
  roe: NumericString.optional(),
  capexPerShare: NumericString.optional(),
}).passthrough()

export const PriceHistoryPointSchema = z.object({
  date: DateString,
  open: NumericString,
  high: NumericString,
  low: NumericString,
  close: NumericString,
  adjClose: NumericString,
  volume: NumericString,
  unadjustedVolume: NumericString.optional(),
  change: NumericString.optional(),
  changePercent: NumericString.optional(),
  vwap: NumericString.optional(),
  label: z.string().optional(),
  changeOverTime: NumericString.optional(),
}).passthrough()

export const PriceHistorySchema = z.object({
  symbol: z.string(),
  historical: z.array(PriceHistoryPointSchema).default([]),
}).passthrough()

export const RevenueSegmentSchema = z.object({
  date: DateString,
  symbol: z.string().optional(),
  data: z.record(z.string(), NumericString).optional(),
}).passthrough()

export const DividendHistoryPointSchema = z.object({
  date: DateString,
  label: z.string().optional(),
  adjDividend: NumericString,
  dividend: NumericString.optional(),
  recordDate: z.string().optional(),
  paymentDate: z.string().optional(),
  declarationDate: z.string().optional(),
}).passthrough()

export const DividendHistorySchema = z.object({
  symbol: z.string(),
  historical: z.array(DividendHistoryPointSchema).default([]),
}).passthrough()

export const StockSplitPointSchema = z.object({
  date: DateString,
  label: z.string().optional(),
  numerator: NumericString,
  denominator: NumericString,
}).passthrough()

export const StockSplitSchema = z.object({
  symbol: z.string(),
  historical: z.array(StockSplitPointSchema).default([]),
}).passthrough()

export const EarningsCalendarSchema = z.object({
  date: DateString,
  symbol: z.string().optional(),
  eps: NumericString.optional(),
  epsEstimated: NumericString.optional(),
  time: z.string().optional(),
  revenue: NumericString.optional(),
  revenueEstimated: NumericString.optional(),
  fiscalDateEnding: z.string().optional(),
  updatedFromDate: z.string().optional(),
}).passthrough()

export const FinancialScoreSchema = z.object({
  symbol: z.string(),
  altmanZScore: NumericString.optional(),
  piotroskiScore: NumericString.optional(),
  workingCapital: NumericString.optional(),
  totalAssets: NumericString.optional(),
  retainedEarnings: NumericString.optional(),
  ebit: NumericString.optional(),
  marketCap: NumericString.optional(),
  totalLiabilities: NumericString.optional(),
  revenue: NumericString.optional(),
}).passthrough()

export const PriceTargetSummarySchema = z.object({
  lastMonth: NumericString.optional(),
  lastMonthAvgPriceTarget: NumericString.optional(),
  lastQuarter: NumericString.optional(),
  lastQuarterAvgPriceTarget: NumericString.optional(),
  lastYear: NumericString.optional(),
  lastYearAvgPriceTarget: NumericString.optional(),
  allTime: NumericString.optional(),
  allTimeAvgPriceTarget: NumericString.optional(),
  publishers: z.string().optional(),
}).passthrough()

export const PriceTargetConsensusSchema = z.object({
  targetHigh: NumericString.optional(),
  targetLow: NumericString.optional(),
  targetConsensus: NumericString.optional(),
  targetMedian: NumericString.optional(),
}).passthrough()

export const InsiderTradingSchema = z.object({
  symbol: z.string(),
  transactionDate: DateString,
  reportingName: z.string().optional(),
  transactionType: z.string().optional(),
  securitiesOwned: NumericString.optional(),
  securitiesTransacted: NumericString.optional(),
  price: NumericString.optional(),
  securityName: z.string().optional(),
  acquistionOrDisposition: z.string().optional(),
  formType: z.string().optional(),
  link: z.string().optional(),
}).passthrough()

/**
 * Main batch data schema
 */
export const BatchDataSchema = z.object({
  ticker: z.string(),
  timestamp: z.number(),
  fetchDuration: z.number().optional(),
  data: z.object({
    profile: z.array(ProfileSchema).default([]),
    quote: z.array(QuoteSchema).default([]),
    incomeAnnual: z.array(IncomeStatementSchema).default([]),
    incomeQuarter: z.array(IncomeStatementSchema).default([]),
    balanceAnnual: z.array(BalanceSheetSchema).default([]),
    balanceQuarter: z.array(BalanceSheetSchema).default([]),
    cashflowAnnual: z.array(CashFlowStatementSchema).default([]),
    cashflowQuarter: z.array(CashFlowStatementSchema).default([]),
    ratiosAnnual: z.array(RatioSchema).default([]),
    keyMetrics: z.array(KeyMetricsSchema).default([]),
    priceHistory: PriceHistorySchema.optional(),
    revenueSegments: z.array(RevenueSegmentSchema).default([]),
    dividendHistory: DividendHistorySchema.optional(),
    stockSplit: StockSplitSchema.optional(),
    earningsCalendar: z.array(EarningsCalendarSchema).default([]),
    financialScores: z.array(FinancialScoreSchema).default([]),
    priceTargetSummary: z.array(PriceTargetSummarySchema).default([]),
    priceTargetConsensus: z.array(PriceTargetConsensusSchema).default([]),
    insiderTrading: z.array(InsiderTradingSchema).default([]),
  })
})

// Type inference from Zod schema
export type BatchDataType = z.infer<typeof BatchDataSchema>
export type ProfileType = z.infer<typeof ProfileSchema>
export type QuoteType = z.infer<typeof QuoteSchema>
export type IncomeStatementType = z.infer<typeof IncomeStatementSchema>
export type BalanceSheetType = z.infer<typeof BalanceSheetSchema>
export type CashFlowStatementType = z.infer<typeof CashFlowStatementSchema>

interface BatchDataFallbackMeta {
  ticker?: string
  timestamp?: number
  fetchDuration?: number
}

function getBatchDataFallbackMeta(data: unknown): BatchDataFallbackMeta {
  if (!data || typeof data !== 'object') {
    return {}
  }

  const candidate = data as Record<string, unknown>

  return {
    ticker: typeof candidate.ticker === 'string' ? candidate.ticker : undefined,
    timestamp: typeof candidate.timestamp === 'number' ? candidate.timestamp : undefined,
    fetchDuration: typeof candidate.fetchDuration === 'number' ? candidate.fetchDuration : undefined
  }
}

/**
 * Validate and sanitize batch data
 * Returns validated data or throws with detailed error information
 */
export function validateBatchData(data: unknown): BatchDataType {
  try {
    return BatchDataSchema.parse(data)
  } catch (_error) {
    if (_error instanceof z.ZodError) {
      const fallbackMeta = getBatchDataFallbackMeta(data)

      console.error('[BatchDataValidation] Validation failed:', {
        ticker: fallbackMeta.ticker,
        errors: _error.issues.map((e: z.ZodIssue) => ({
          path: e.path.join('.'),
          message: e.message,
          code: e.code
        }))
      })
      
      // Return a safe default structure instead of throwing
      // This prevents crashes while logging validation issues
      const ticker = fallbackMeta.ticker || 'UNKNOWN'
      return {
        ticker,
        timestamp: fallbackMeta.timestamp || Date.now(),
        fetchDuration: fallbackMeta.fetchDuration || 0,
        data: {
          profile: [],
          quote: [],
          incomeAnnual: [],
          incomeQuarter: [],
          balanceAnnual: [],
          balanceQuarter: [],
          cashflowAnnual: [],
          cashflowQuarter: [],
          ratiosAnnual: [],
          keyMetrics: [],
          priceHistory: { symbol: ticker, historical: [] },
          revenueSegments: [],
          dividendHistory: { symbol: ticker, historical: [] },
          stockSplit: { symbol: ticker, historical: [] },
          earningsCalendar: [],
          financialScores: [],
          priceTargetSummary: [],
          priceTargetConsensus: [],
          insiderTrading: [],
        }
      }
    }
    throw _error
  }
}

/**
 * Safe parse - returns { success: true, data } or { success: false, error }
 */
export function safeParseBatchData(data: unknown) {
  const result = BatchDataSchema.safeParse(data)
  const fallbackMeta = getBatchDataFallbackMeta(data)
  
  if (!result.success) {
    console.warn('[BatchDataValidation] Safe parse failed:', {
      ticker: fallbackMeta.ticker,
      errorCount: result.error?.issues?.length || 0
    })
  }
  
  return result
}
