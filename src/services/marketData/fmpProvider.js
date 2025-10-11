import { handleServiceError } from '../shared.js';

// Returns { data: Array<[ts:number, close:number]>, error: string|null }
export async function fetchFmpSeries(ticker, { range }) {
  try {
    const t = (ticker || '').trim().toUpperCase();
    if (!t) return { data: [], error: 'No ticker provided' };

    // Map timeframe to approximate number of days
    const days = mapRangeToDays(range);
  const base = `/api/fmp/api/v3/historical-price-full/${encodeURIComponent(t)}`;
  const url = days ? `${base}?timeseries=${days}` : base; // omit timeseries for full history

    const res = await fetch(url);
    if (!res.ok) {
      const msg = `HTTP ${res.status} for ${url}`;
      return handleServiceError(new Error(msg), 'fetchFmpSeries');
    }
    const j = await res.json();
    const hist = Array.isArray(j.historical) ? j.historical : [];
    if (!hist.length) return { data: [], error: 'No price data' };
    const out = [];
    for (const row of hist) {
      const ts = row?.date ? Date.parse(row.date) : NaN;
      const y = row?.adjClose ?? row?.close;
      if (Number.isFinite(ts) && Number.isFinite(y)) out.push([ts, y]);
    }
    // FMP returns most-recent first; sort ascending by timestamp
    out.sort((a, b) => a[0] - b[0]);
    return { data: out, error: null };
  } catch (error) {
    return handleServiceError(error, 'fetchFmpSeries');
  }
}

function mapRangeToDays(range) {
  switch (range) {
    case '5d': return 7;
    case '1mo': return 31;
    case '6mo': return 200;
    case 'ytd': return daysSinceStartOfYear();
    case '5y': return 1850;
    case 'max':
    default:
      return null; // full history
  }
}

function daysSinceStartOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.max(1, Math.ceil((now - start) / (1000 * 60 * 60 * 24)) + 1);
}
