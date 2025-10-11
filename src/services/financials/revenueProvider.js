// Uses Yahoo fundamentals-timeseries (no crumb needed)

import { handleServiceError } from '../shared.js';

// Returns { data: Array, error: string|null }
export async function fetchYahooRevenueSeries(ticker, period = 'annual') {
  const t = (ticker || '').trim().toUpperCase();
  if (!t) return { data: [], error: 'No ticker provided' };

  const type = period === 'quarterly' ? 'quarterlyTotalRevenue' : 'annualTotalRevenue';
  const nowSec = Math.floor(Date.now() / 1000);
  const url =
    `/y2api/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(t)}` +
    `?type=${encodeURIComponent(type)}&period1=0&period2=${nowSec}&merge=false&lang=en-US&region=US`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const msg = `HTTP ${res.status} for ${url}`;
      return handleServiceError(new Error(msg), 'fetchYahooRevenueSeries');
    }
    const j = await res.json();
    const r = j?.timeseries?.result?.[0];
    if (!r) return { data: [], error: 'No result in response' };

    const arr = r[type];
    if (!Array.isArray(arr) || !arr.length) return { data: [], error: 'No revenue data found' };

    const out = [];
    for (const row of arr) {
      const ts =
        row?.asOfDate ? Date.parse(row.asOfDate) :
        (row?.timestamp ? row.timestamp * 1000 : NaN);
      const v = row?.reportedValue?.raw ?? row?.value;
      if (Number.isFinite(ts) && Number.isFinite(v)) out.push([ts, v]);
    }
    out.sort((a, b) => a[0] - b[0]);
    return { data: out, error: null };
  } catch (error) {
    return handleServiceError(error, 'fetchYahooRevenueSeries');
  }
}
