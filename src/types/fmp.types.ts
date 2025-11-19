// src/types/fmp.types.ts
// Type definitions for Financial Modeling Prep (FMP) API responses

/**
 * Company Profile
 * Endpoint: /profile/{symbol}
 */
export interface FMPProfile {
  symbol: string
  companyName: string
  currency?: string
  exchangeShortName?: string
  industry?: string
  sector?: string
  description?: string
  ceo?: string
  website?: string
  image?: string
  ipoDate?: string
  isActivelyTrading?: boolean
  [key: string]: any // Allow additional fields
}

/**
 * Real-time Stock Quote
 * Endpoint: /quote/{symbol}
 */
export interface FMPQuote {
  symbol: string
  name?: string
  price: number
  changesPercentage?: number
  change?: number
  dayLow?: number
  dayHigh?: number
  yearHigh?: number
  yearLow?: number
  marketCap?: number
  priceAvg50?: number
  priceAvg200?: number
  volume?: number
  avgVolume?: number
  exchange?: string
  open?: number
  previousClose?: number
  eps?: number
  pe?: number
  earningsAnnouncement?: string
  sharesOutstanding?: number
  timestamp?: number
  [key: string]: any
}

/**
 * Stock News Item
 * Endpoint: /stable/news/stock
 */
export interface FMPNewsItem {
  symbol: string | string[]
  publishedDate: string
  title: string
  image: string
  site: string
  text: string
  url: string
}

/**
 * Income Statement (Annual or Quarterly)
 * Endpoints: /income-statement/{symbol}, /income-statement/{symbol}?period=quarter
 */
export interface FMPIncomeStatement {
  date: string
  symbol?: string
  reportedCurrency?: string
  cik?: string
  fillingDate?: string
  acceptedDate?: string
  calendarYear?: string
  period?: string
  revenue: number
  costOfRevenue?: number
  grossProfit?: number
  grossProfitRatio?: number
  researchAndDevelopmentExpenses?: number
  generalAndAdministrativeExpenses?: number
  sellingAndMarketingExpenses?: number
  sellingGeneralAndAdministrativeExpenses?: number
  otherExpenses?: number
  operatingExpenses?: number
  costAndExpenses?: number
  interestIncome?: number
  interestExpense?: number
  depreciationAndAmortization?: number
  ebitda?: number
  ebitdaratio?: number
  operatingIncome?: number
  operatingIncomeRatio?: number
  totalOtherIncomeExpensesNet?: number
  incomeBeforeTax?: number
  incomeBeforeTaxRatio?: number
  incomeTaxExpense?: number
  netIncome?: number
  netIncomeRatio?: number
  eps?: number
  epsdiluted?: number
  weightedAverageShsOut?: number
  weightedAverageShsOutDil?: number
  link?: string
  finalLink?: string
  [key: string]: any
}

/**
 * Balance Sheet (Annual or Quarterly)
 * Endpoints: /balance-sheet-statement/{symbol}, /balance-sheet-statement/{symbol}?period=quarter
 */
export interface FMPBalanceSheet {
  date: string
  symbol?: string
  reportedCurrency?: string
  cik?: string
  fillingDate?: string
  acceptedDate?: string
  calendarYear?: string
  period?: string
  cashAndCashEquivalents?: number
  shortTermInvestments?: number
  cashAndShortTermInvestments?: number
  netReceivables?: number
  inventory?: number
  otherCurrentAssets?: number
  totalCurrentAssets?: number
  propertyPlantEquipmentNet?: number
  goodwill?: number
  intangibleAssets?: number
  goodwillAndIntangibleAssets?: number
  longTermInvestments?: number
  taxAssets?: number
  otherNonCurrentAssets?: number
  totalNonCurrentAssets?: number
  otherAssets?: number
  totalAssets?: number
  accountPayables?: number
  shortTermDebt?: number
  taxPayables?: number
  deferredRevenue?: number
  otherCurrentLiabilities?: number
  totalCurrentLiabilities?: number
  longTermDebt?: number
  deferredRevenueNonCurrent?: number
  deferredTaxLiabilitiesNonCurrent?: number
  otherNonCurrentLiabilities?: number
  totalNonCurrentLiabilities?: number
  otherLiabilities?: number
  capitalLeaseObligations?: number
  totalLiabilities?: number
  preferredStock?: number
  commonStock?: number
  retainedEarnings?: number
  accumulatedOtherComprehensiveIncomeLoss?: number
  othertotalStockholdersEquity?: number
  totalStockholdersEquity?: number
  totalEquity?: number
  totalLiabilitiesAndStockholdersEquity?: number
  minorityInterest?: number
  totalLiabilitiesAndTotalEquity?: number
  totalInvestments?: number
  totalDebt?: number
  netDebt?: number
  link?: string
  finalLink?: string
  [key: string]: any
}

/**
 * Cash Flow Statement (Annual or Quarterly)
 * Endpoints: /cash-flow-statement/{symbol}, /cash-flow-statement/{symbol}?period=quarter
 */
export interface FMPCashFlow {
  date: string
  symbol?: string
  reportedCurrency?: string
  cik?: string
  fillingDate?: string
  acceptedDate?: string
  calendarYear?: string
  period?: string
  netIncome?: number
  depreciationAndAmortization?: number
  deferredIncomeTax?: number
  stockBasedCompensation?: number
  changeInWorkingCapital?: number
  accountsReceivables?: number
  inventory?: number
  accountsPayables?: number
  otherWorkingCapital?: number
  otherNonCashItems?: number
  netCashProvidedByOperatingActivities?: number
  investmentsInPropertyPlantAndEquipment?: number
  acquisitionsNet?: number
  purchasesOfInvestments?: number
  salesMaturitiesOfInvestments?: number
  otherInvestingActivites?: number
  netCashUsedForInvestingActivites?: number
  debtRepayment?: number
  commonStockIssued?: number
  commonStockRepurchased?: number
  dividendsPaid?: number
  otherFinancingActivites?: number
  netCashUsedProvidedByFinancingActivities?: number
  effectOfForexChangesOnCash?: number
  netChangeInCash?: number
  cashAtEndOfPeriod?: number
  cashAtBeginningOfPeriod?: number
  operatingCashFlow?: number
  capitalExpenditure?: number
  freeCashFlow?: number
  link?: string
  finalLink?: string
  [key: string]: any
}

/**
 * Key Metrics (Annual or Quarterly)
 * Endpoints: /key-metrics/{symbol}, /key-metrics/{symbol}?period=quarter
 */
export interface FMPKeyMetrics {
  date: string
  symbol?: string
  period?: string
  revenuePerShare?: number
  netIncomePerShare?: number
  operatingCashFlowPerShare?: number
  freeCashFlowPerShare?: number
  cashPerShare?: number
  bookValuePerShare?: number
  tangibleBookValuePerShare?: number
  shareholdersEquityPerShare?: number
  interestDebtPerShare?: number
  marketCap?: number
  enterpriseValue?: number
  peRatio?: number
  priceToSalesRatio?: number
  pocfratio?: number
  pfcfRatio?: number
  pbRatio?: number
  ptbRatio?: number
  evToSales?: number
  enterpriseValueOverEBITDA?: number
  evToOperatingCashFlow?: number
  evToFreeCashFlow?: number
  earningsYield?: number
  freeCashFlowYield?: number
  debtToEquity?: number
  debtToAssets?: number
  netDebtToEBITDA?: number
  currentRatio?: number
  interestCoverage?: number
  incomeQuality?: number
  dividendYield?: number
  payoutRatio?: number
  salesGeneralAndAdministrativeToRevenue?: number
  researchAndDdevelopementToRevenue?: number
  intangiblesToTotalAssets?: number
  capexToOperatingCashFlow?: number
  capexToRevenue?: number
  capexToDepreciation?: number
  stockBasedCompensationToRevenue?: number
  grahamNumber?: number
  roic?: number
  returnOnTangibleAssets?: number
  grahamNetNet?: number
  workingCapital?: number
  tangibleAssetValue?: number
  netCurrentAssetValue?: number
  investedCapital?: number
  averageReceivables?: number
  averagePayables?: number
  averageInventory?: number
  daysSalesOutstanding?: number
  daysPayablesOutstanding?: number
  daysOfInventoryOnHand?: number
  receivablesTurnover?: number
  payablesTurnover?: number
  inventoryTurnover?: number
  roe?: number
  capexPerShare?: number
  [key: string]: any
}

/**
 * Financial Ratios (TTM - Trailing Twelve Months)
 * Endpoint: /ratios-ttm/{symbol}
 */
export interface FMPRatiosTTM {
  dividendYielTTM?: number
  dividendYieldPercentageTTM?: number
  peRatioTTM?: number
  pegRatioTTM?: number
  payoutRatioTTM?: number
  currentRatioTTM?: number
  quickRatioTTM?: number
  cashRatioTTM?: number
  daysOfSalesOutstandingTTM?: number
  daysOfInventoryOutstandingTTM?: number
  operatingCycleTTM?: number
  daysOfPayablesOutstandingTTM?: number
  cashConversionCycleTTM?: number
  grossProfitMarginTTM?: number
  operatingProfitMarginTTM?: number
  pretaxProfitMarginTTM?: number
  netProfitMarginTTM?: number
  effectiveTaxRateTTM?: number
  returnOnAssetsTTM?: number
  returnOnEquityTTM?: number
  returnOnCapitalEmployedTTM?: number
  netIncomePerEBTTTM?: number
  ebtPerEbitTTM?: number
  ebitPerRevenueTTM?: number
  debtRatioTTM?: number
  debtEquityRatioTTM?: number
  longTermDebtToCapitalizationTTM?: number
  totalDebtToCapitalizationTTM?: number
  interestCoverageTTM?: number
  cashFlowToDebtRatioTTM?: number
  companyEquityMultiplierTTM?: number
  receivablesTurnoverTTM?: number
  payablesTurnoverTTM?: number
  inventoryTurnoverTTM?: number
  fixedAssetTurnoverTTM?: number
  assetTurnoverTTM?: number
  operatingCashFlowPerShareTTM?: number
  freeCashFlowPerShareTTM?: number
  cashPerShareTTM?: number
  operatingCashFlowSalesRatioTTM?: number
  freeCashFlowOperatingCashFlowRatioTTM?: number
  cashFlowCoverageRatiosTTM?: number
  shortTermCoverageRatiosTTM?: number
  capitalExpenditureCoverageRatioTTM?: number
  dividendPaidAndCapexCoverageRatioTTM?: number
  priceBookValueRatioTTM?: number
  priceToBookRatioTTM?: number
  priceToSalesRatioTTM?: number
  priceEarningsRatioTTM?: number
  priceToFreeCashFlowsRatioTTM?: number
  priceToOperatingCashFlowsRatioTTM?: number
  priceCashFlowRatioTTM?: number
  priceEarningsToGrowthRatioTTM?: number
  priceSalesRatioTTM?: number
  dividendYieldTTM?: number
  enterpriseValueMultipleTTM?: number
  priceFairValueTTM?: number
  [key: string]: any
}

/**
 * Financial Ratios (Annual or Quarterly)
 * Endpoint: /ratios/{symbol}
 * Similar to FMPRatiosTTM but for annual/quarterly periods
 */
export interface FMPRatios {
  date: string
  symbol?: string
  period?: string
  currentRatio?: number
  quickRatio?: number
  cashRatio?: number
  daysOfSalesOutstanding?: number
  daysOfInventoryOutstanding?: number
  operatingCycle?: number
  daysOfPayablesOutstanding?: number
  cashConversionCycle?: number
  grossProfitMargin?: number
  operatingProfitMargin?: number
  pretaxProfitMargin?: number
  netProfitMargin?: number
  effectiveTaxRate?: number
  returnOnAssets?: number
  returnOnEquity?: number
  returnOnCapitalEmployed?: number
  netIncomePerEBT?: number
  ebtPerEbit?: number
  ebitPerRevenue?: number
  debtRatio?: number
  debtEquityRatio?: number
  longTermDebtToCapitalization?: number
  totalDebtToCapitalization?: number
  interestCoverage?: number
  cashFlowToDebtRatio?: number
  companyEquityMultiplier?: number
  receivablesTurnover?: number
  payablesTurnover?: number
  inventoryTurnover?: number
  fixedAssetTurnover?: number
  assetTurnover?: number
  operatingCashFlowPerShare?: number
  freeCashFlowPerShare?: number
  cashPerShare?: number
  payoutRatio?: number
  operatingCashFlowSalesRatio?: number
  freeCashFlowOperatingCashFlowRatio?: number
  cashFlowCoverageRatios?: number
  shortTermCoverageRatios?: number
  capitalExpenditureCoverageRatio?: number
  dividendPaidAndCapexCoverageRatio?: number
  dividendPayoutRatio?: number
  priceBookValueRatio?: number
  priceToBookRatio?: number
  priceToSalesRatio?: number
  priceEarningsRatio?: number
  priceToFreeCashFlowsRatio?: number
  priceToOperatingCashFlowsRatio?: number
  priceCashFlowRatio?: number
  priceEarningsToGrowthRatio?: number
  priceSalesRatio?: number
  dividendYield?: number
  enterpriseValueMultiple?: number
  priceFairValue?: number
  [key: string]: any
}

/**
 * Revenue Product Segment (dynamic structure)
 * Endpoint: /revenue-product-segmentation?symbol={ticker}
 * FMP returns: { "2025-09-27": { "Mac": 33708000000, "iPhone": 209586000000, ... } }
 */
export interface FMPRevenueProductSegment {
  [date: string]: {
    [segmentName: string]: number
  }
}

/**
 * Revenue Geographic Segment (dynamic structure)
 * Endpoint: /revenue-geographic-segmentation?symbol={ticker}
 * Same structure as product segments but for geographic regions
 */
export interface FMPRevenueGeographicSegment {
  [date: string]: {
    [regionName: string]: number
  }
}

/**
 * Financial Scores (Altman Z-Score, Piotroski Score)
 * Endpoint: /api/v4/score?symbol={ticker}
 */
export interface FMPFinancialScore {
  symbol: string
  altmanZScore?: number | string
  piotroskiScore?: number | string
  workingCapital?: number | string
  totalAssets?: number | string
  retainedEarnings?: number | string
  ebit?: number | string
  marketCap?: number | string
  totalLiabilities?: number | string
  revenue?: number | string
  [key: string]: any
}

/**
 * Price Target Summary
 * Endpoint: /price-target-summary?symbol={ticker}
 */
export interface FMPPriceTargetSummary {
  lastMonth?: number | string
  lastMonthAvgPriceTarget?: number | string
  lastQuarter?: number | string
  lastQuarterAvgPriceTarget?: number | string
  lastYear?: number | string
  lastYearAvgPriceTarget?: number | string
  allTime?: number | string
  allTimeAvgPriceTarget?: number | string
  publishers?: string
  [key: string]: any
}

/**
 * Price Target Consensus
 * Endpoint: /price-target-consensus?symbol={ticker}
 */
export interface FMPPriceTargetConsensus {
  targetHigh?: number | string
  targetLow?: number | string
  targetConsensus?: number | string
  targetMedian?: number | string
  [key: string]: any
}

/**
 * Enterprise Value (Annual or Quarterly)
 * Endpoints: /enterprise-values/{symbol}, /enterprise-values/{symbol}?period=quarter
 */
export interface FMPEnterpriseValue {
  date: string
  symbol?: string
  stockPrice?: number
  numberOfShares?: number
  marketCapitalization?: number
  minusCashAndCashEquivalents?: number
  addTotalDebt?: number
  enterpriseValue?: number
  [key: string]: any
}

/**
 * Financial Growth (Annual or Quarterly)
 * Endpoints: /financial-growth/{symbol}, /financial-growth/{symbol}?period=quarter
 */
export interface FMPFinancialGrowth {
  date: string
  symbol?: string
  period?: string
  calendarYear?: string
  revenueGrowth?: number
  grossProfitGrowth?: number
  ebitgrowth?: number
  operatingIncomeGrowth?: number
  netIncomeGrowth?: number
  epsgrowth?: number
  epsdilutedGrowth?: number
  weightedAverageSharesGrowth?: number
  weightedAverageSharesDilutedGrowth?: number
  dividendsperShareGrowth?: number
  operatingCashFlowGrowth?: number
  freeCashFlowGrowth?: number
  tenYRevenueGrowthPerShare?: number
  fiveYRevenueGrowthPerShare?: number
  threeYRevenueGrowthPerShare?: number
  tenYOperatingCFGrowthPerShare?: number
  fiveYOperatingCFGrowthPerShare?: number
  threeYOperatingCFGrowthPerShare?: number
  tenYNetIncomeGrowthPerShare?: number
  fiveYNetIncomeGrowthPerShare?: number
  threeYNetIncomeGrowthPerShare?: number
  tenYShareholdersEquityGrowthPerShare?: number
  fiveYShareholdersEquityGrowthPerShare?: number
  threeYShareholdersEquityGrowthPerShare?: number
  tenYDividendperShareGrowthPerShare?: number
  fiveYDividendperShareGrowthPerShare?: number
  threeYDividendperShareGrowthPerShare?: number
  receivablesGrowth?: number
  inventoryGrowth?: number
  assetGrowth?: number
  bookValueperShareGrowth?: number
  debtGrowth?: number
  rdexpenseGrowth?: number
  sgaexpensesGrowth?: number
  [key: string]: any
}

/**
 * Insider Trading
 * Endpoint: /insider-trading/{symbol}
 */
export interface FMPInsiderTrading {
  symbol: string
  filingDate?: string
  transactionDate?: string
  reportingName?: string
  typeOfOwner?: string
  transactionType?: string
  securitiesOwned?: number
  securitiesTransacted?: number
  price?: number
  securityName?: string
  link?: string
  [key: string]: any
}

/**
 * Stock Split History
 * Endpoint: /stock_split/{symbol}
 */
export interface FMPStockSplit {
  date: string
  label?: string
  symbol?: string
  numerator?: number
  denominator?: number
  [key: string]: any
}

/**
 * Dividend History
 * Endpoint: /historical-price-full/stock_dividend/{symbol}
 */
export interface FMPDividend {
  date: string
  label?: string
  adjDividend?: number
  dividend?: number
  recordDate?: string
  paymentDate?: string
  declarationDate?: string
  [key: string]: any
}

/**
 * Historical Stock Price
 * Endpoint: /historical-price-full/{symbol}
 */
export interface FMPHistoricalPrice {
  date: string
  open: number
  high: number
  low: number
  close: number
  adjClose?: number
  volume: number
  unadjustedVolume?: number
  change?: number
  changePercent?: number
  vwap?: number
  label?: string
  changeOverTime?: number
  [key: string]: any
}

/**
 * Price Target Summary
 * Endpoint: /price-target-summary/{symbol}
 */
export interface FMPPriceTarget {
  symbol?: string
  lastMonth?: number
  lastMonthAvgPriceTarget?: number
  lastQuarter?: number
  lastQuarterAvgPriceTarget?: number
  lastYear?: number
  lastYearAvgPriceTarget?: number
  allTime?: number
  allTimeAvgPriceTarget?: number
  publishers?: string[]
  [key: string]: any
}

/**
 * DCF (Discounted Cash Flow) Valuation
 * Endpoint: /discounted-cash-flow/{symbol}
 */
export interface FMPDCF {
  symbol?: string
  date?: string
  dcf?: number
  'Stock Price'?: number
  [key: string]: any
}

/**
 * Historical Earnings Calendar
 * Endpoint: /historical/earning_calendar/{symbol}
 */
export interface FMPEarnings {
  date: string // Report date (when earnings were announced)
  symbol: string
  eps: number | null // Actual EPS reported
  epsEstimated: number | null // Analyst estimated EPS
  time: string // 'amc' (after market close) or 'bmo' (before market open)
  revenue: number | null // Actual revenue reported
  revenueEstimated: number | null // Analyst estimated revenue
  updatedFromDate: string // When this data was last updated
  fiscalDateEnding: string // Fiscal quarter end date (e.g., "2024-09-28")
}

/**
 * Sector Performance
 * Endpoint: /api/v3/sector-performance
 */
export interface FMPSectorPerformance {
  sector: string
  changesPercentage: string // e.g., "1.23%"
}

/**
 * Historical Sector Performance
 * Endpoint: /stable/historical-sector-performance
 */
export interface FMPHistoricalSectorPerformance {
  date: string
  sector: string
  exchange: string
  averageChange: number
}

/**
 * Stock Screener Result
 * Endpoint: /api/v3/stock-screener
 */
export interface FMPStockScreener {
  symbol: string
  companyName: string
  marketCap: number
  sector: string
  industry: string
  beta: number
  price: number
  lastAnnualDividend: number
  volume: number
  exchange: string
  exchangeShortName: string
  country: string
  isEtf: boolean
  isFund: boolean
  isActivelyTrading: boolean
}
