import axios from 'axios';
import * as cheerio from 'cheerio';
import express from 'express';

const app = express();
const PORT = 3001;

app.use(express.json());

const BASE_URL = 'https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin';

let cachedData = {};

async function fetchVisaBulletin(year, month) {
  const cacheKey = `${year}-${month}`;
  if (cachedData[cacheKey]) {
    return cachedData[cacheKey];
  }

  const monthNames = ['', 'january', 'february', 'march', 'april', 'may', 'june', 
                      'july', 'august', 'september', 'october', 'november', 'december'];
  const url = `${BASE_URL}/${year}/visa-bulletin-for-${monthNames[month]}-${year}.html`;

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 30000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const familyTables = [];
    const employmentTables = [];

    $('table').each((_, table) => {
      const tableHtml = $(table).html() || '';
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

    const result = { familyTables, employmentTables, year, month };
    cachedData[cacheKey] = result;
    return result;
  } catch (error) {
    console.error('Fetch error:', error.message);
    throw error;
  }
}

app.get('/api/visa-bulletin', async (req, res) => {
  const { year, month } = req.query;

  if (!year || !month) {
    return res.status(400).json({ error: 'Year and month are required' });
  }

  try {
    const data = await fetchVisaBulletin(parseInt(year), parseInt(month));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch visa bulletin data' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
});
