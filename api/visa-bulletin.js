import { readStoredVisaBulletin } from '../lib/bulletin-store.js';
import { fetchVisaBulletin } from '../lib/visa-bulletin.js';

function parseQueryNumber(value) {
  if (!/^\d+$/.test(String(value))) {
    return NaN;
  }
  return Number.parseInt(value, 10);
}

export default async function handler(req, res) {
  const year = parseQueryNumber(req.query.year);
  const month = parseQueryNumber(req.query.month);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return res.status(400).json({ error: 'Year and month are required' });
  }

  if (month < 1 || month > 12) {
    return res.status(400).json({ error: 'Month must be between 1 and 12' });
  }

  if (year < 2000 || year > 2100) {
    return res.status(400).json({ error: 'Year must be between 2000 and 2100' });
  }

  try {
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.setHeader('CDN-Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=86400');
    res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=86400');

    const storedData = await readStoredVisaBulletin(year, month);
    const data = storedData || await fetchVisaBulletin(year, month);

    res.status(200).json(data);
  } catch (error) {
    console.error('Visa bulletin API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch visa bulletin data' });
  }
}
