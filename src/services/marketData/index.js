import { fetchFmpSeries } from './fmpProvider.js';

const cache = new Map();
// key: `${ticker}|${range}-${interval}` -> { series, ts }

export async function getPriceSeries(ticker, tfConfig) {
  const t = (ticker || '').trim().toUpperCase();
  if (!t) return { data: [], error: 'No ticker provided' };

  const key = `${t}|${tfConfig.range}-${tfConfig.interval}`;
  if (cache.has(key)) return cache.get(key);

  const result = await fetchFmpSeries(t, tfConfig);
  cache.set(key, result);
  return result;
}
