import { getStoredVisaBulletinMeta } from '../lib/bulletin-store.js';

export default async function handler(req, res) {
  try {
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.setHeader('CDN-Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=86400');
    res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=86400');

    const meta = await getStoredVisaBulletinMeta();
    res.status(200).json(meta);
  } catch (error) {
    console.error('Visa bulletin meta API error:', error.message);
    res.status(500).json({ error: 'Failed to read visa bulletin metadata' });
  }
}
