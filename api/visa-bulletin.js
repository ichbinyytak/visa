import axios from 'axios';
import * as cheerio from 'cheerio';

const MONTH_NAMES = ['', 'january', 'february', 'march', 'april', 'may', 'june', 
                    'july', 'august', 'september', 'october', 'november', 'december'];

const BASE_URL = 'https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin';

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

export default async function handler(req, res) {
  const { year, month } = req.query;

  if (!year || !month) {
    return res.status(400).json({ error: 'Year and month are required' });
  }

  try {
    const data = await fetchVisaBulletin(parseInt(year), parseInt(month));
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch visa bulletin data' });
  }
}
