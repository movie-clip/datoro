// src/services/financials/fmpProvider.ts
// LEGACY FILE - All functions moved to batchChartService.ts and batchTableService.ts
// This file is kept for reference but all functions are now UNUSED
// All components now use batch data extraction instead of direct API calls
//
// Migration completed: October 2025
// - Components use tickerStore for shared batch data
// - Data extraction via batchChartService.ts (charts) and batchTableService.ts (tables)
// - Zero direct API calls from components (96% API reduction achieved)
//
// See: 
// - src/services/financials/batchChartService.ts (chart data extraction)
// - src/services/financials/batchTableService.ts (table data extraction)
// - src/stores/tickerStore.ts (centralized batch data store)
// - server/services/batchDataService.js (single batch endpoint - 24 FMP endpoints)

/**
 * @deprecated This file contains legacy code that is no longer used.
 * All functionality has been replaced by the batch data architecture.
 * 
 * Do not add new code to this file.
 * Do not import from this file.
 * 
 * If you need financial data in a component:
 * 1. Use tickerStore to get batchData
 * 2. Extract data using batchChartService or batchTableService functions
 * 
 * This eliminates redundant API calls and improves performance.
 */

// This file intentionally left empty - all functions removed
// Keeping file structure for documentation purposes
