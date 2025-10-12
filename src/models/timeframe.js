function ytdDays() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const days = Math.ceil((now - start) / (1000 * 60 * 60 * 24)) + 1
  return Math.max(days, 1)
}

export const TIMEFRAMES = {
  '5D':  { range: '5d',  interval: '30m', stooqDays: 7,       title: '— 5D'  },
  '1M':  { range: '1mo', interval: '1h',  stooqDays: 31,      title: '— 1M'  },
  '6M':  { range: '6mo', interval: '1d',  stooqDays: 200,     title: '— 6M'  },
  'YTD': { range: 'ytd', interval: '1d',  stooqDays: ytdDays, title: '— YTD' },
  '5Y':  { range: '5y',  interval: '1d',  stooqDays: 1850,    title: '— 5Y'  },
  'ALL': { range: 'max', interval: '1mo', stooqDays: null,    title: '— ALL' },
}

export const TF_ORDER = ['5D', '1M', '6M', 'YTD', '5Y', 'ALL']
export const DEFAULT_TF = '6M' // Changed from YTD to reduce initial API load
