import axios from 'axios';
import * as cheerio from 'cheerio';

const MONTH_NAMES = ['', 'january', 'february', 'march', 'april', 'may', 'june', 
                    'july', 'august', 'september', 'october', 'november', 'december'];
const MONTH_ABBREVIATIONS = {
  JAN: '01',
  FEB: '02',
  MAR: '03',
  APR: '04',
  MAY: '05',
  JUN: '06',
  JUL: '07',
  AUG: '08',
  SEP: '09',
  OCT: '10',
  NOV: '11',
  DEC: '12'
};

const BASE_URL = 'https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin';

function parseQueryNumber(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : NaN;
}

async function fetchVisaBulletin(year, month) {
  const url = `${BASE_URL}/${year}/visa-bulletin-for-${MONTH_NAMES[month]}-${year}.html`;

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 30000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const familyTables = [];
    const employmentTables = [];

    $('table').each((_, table) => {
      const tableText = $(table).text() || '';
      const rows = [];

      $(table).find('tr').each((_, row) => {
        const cells = [];
        $(row).find('td, th').each((_, cell) => {
          let cellText = $(cell).text().trim();
          cellText = cellText.replace(/\s+/g, ' ');
          cellText = normalizeBulletinDate(cellText);
          cells.push(cellText);
        });
        if (cells.length > 0) {
          rows.push(cells);
        }
      });

      if (rows.length > 0) {
        if (tableText.includes('Family') || tableText.includes('Familiar')) {
          familyTables.push(rows);
        } else if (tableText.includes('Employment')) {
          employmentTables.push(rows);
        }
      }
    });

    return { familyTables, employmentTables, year, month };
  } catch (error) {
    console.error('Fetch error:', error.message);
    throw error;
  }
}

function normalizeBulletinDate(value) {
  const match = /^(\d{2})([A-Z]{3})(\d{2})$/.exec(value);
  if (!match) {
    return value;
  }

  const [, day, monthAbbrev, year] = match;
  const monthNumber = MONTH_ABBREVIATIONS[monthAbbrev];
  if (!monthNumber) {
    return value;
  }

  return `20${year}/${monthNumber}/${day}`;
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
    const data = await fetchVisaBulletin(year, month);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch visa bulletin data' });
  }
}
