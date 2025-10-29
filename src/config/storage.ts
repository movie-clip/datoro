/**
 * Storage Keys Configuration
 * 
 * Centralized localStorage and sessionStorage keys.
 * Change the prefix here and all storage keys update automatically.
 */

const PREFIX = 'datoro'

export const STORAGE_KEYS = {
  /** API version tracking (localStorage) - Used by tickerStore */
  API_VERSION: `${PREFIX}-api-version`,
  
  /** Recent search history (sessionStorage) - Used by useRecentSearch */
  RECENT_SEARCH: `${PREFIX}_recent_search`,
  
  /** Active watchlist ID (localStorage) - Used by useWatchlists */
  ACTIVE_WATCHLIST: `${PREFIX}-active-watchlist`,
  
  /** Active tab selection (localStorage) - Used by App.vue */
  ACTIVE_TAB: `${PREFIX}_active_tab`,
} as const

export default STORAGE_KEYS
