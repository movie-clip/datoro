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
