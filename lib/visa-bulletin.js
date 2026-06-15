import axios from 'axios';
import * as cheerio from 'cheerio';

export const MONTH_NAMES = [
  '',
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december'
];

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

export function getBulletinUrl(year, month) {
  return getBulletinUrls(year, month)[0];
}

export function getBulletinUrls(year, month) {
  const fiscalYear = month >= 10 ? year + 1 : year;
  const monthName = MONTH_NAMES[month];
  return [
    `${BASE_URL}/${fiscalYear}/visa-bulletin-for-${monthName}-${year}.html`,
    `${BASE_URL}/${fiscalYear}/visa-bulletin-${monthName}-${year}.html`
  ];
}

export function normalizeBulletinDate(value, bulletinYear = new Date().getFullYear()) {
  const match = /^(\d{2})([A-Z]{3})(\d{2})$/.exec(value);
  if (!match) {
    return value;
  }

  const [, day, monthAbbrev, year] = match;
  const monthNumber = MONTH_ABBREVIATIONS[monthAbbrev];
  if (!monthNumber) {
    return value;
  }

  const twoDigitYear = Number.parseInt(year, 10);
  const candidateYear = 2000 + twoDigitYear;
  const fullYear = candidateYear <= bulletinYear ? candidateYear : 1900 + twoDigitYear;

  return `${fullYear}/${monthNumber}/${day}`;
}

function normalizeCellText(value, bulletinYear) {
  return normalizeBulletinDate(value.trim().replace(/\s+/g, ' '), bulletinYear);
}

function isLikelyTableTitle(text) {
  if (!text || text.length > 180) {
    return false;
  }

  if (/^The chart below/i.test(text) || /Applicants for immigrant visas/i.test(text)) {
    return false;
  }

  return /FINAL ACTION DATES|DATES FOR FILING|Family-Sponsored Preference|Employment-Based Preference/i.test(text);
}

function getTableTitle($, table, bulletinYear) {
  const titleNode = $(table)
    .prevAll('h2, h3, h4, h5, p')
    .filter((_, node) => {
      const text = normalizeCellText($(node).text(), bulletinYear);
      return isLikelyTableTitle(text);
    })
    .first();

  return titleNode.length ? normalizeCellText(titleNode.text(), bulletinYear) : '';
}

export function parseVisaBulletinHtml(html, bulletinYear = new Date().getFullYear()) {
  const $ = cheerio.load(html);
  const familyTables = [];
  const employmentTables = [];
  const familyTableTitles = [];
  const employmentTableTitles = [];

  $('table').each((_, table) => {
    const tableText = $(table).text() || '';
    const rows = [];

    $(table)
      .find('tr')
      .each((_, row) => {
        const cells = [];
        $(row)
          .find('td, th')
          .each((_, cell) => {
            cells.push(normalizeCellText($(cell).text(), bulletinYear));
          });
        if (cells.length > 0) {
          rows.push(cells);
        }
      });

    if (rows.length === 0) {
      return;
    }

    const title = getTableTitle($, table, bulletinYear);
    const searchableText = `${title} ${tableText}`;

    if (/Family|Familiar/i.test(searchableText)) {
      familyTables.push(rows);
      familyTableTitles.push(title);
    } else if (/Employment/i.test(searchableText)) {
      employmentTables.push(rows);
      employmentTableTitles.push(title);
    }
  });

  return {
    familyTables,
    employmentTables,
    familyTableTitles,
    employmentTableTitles
  };
}

export async function fetchVisaBulletin(year, month) {
  let lastError;

  for (const sourceUrl of getBulletinUrls(year, month)) {
    try {
      const response = await axios.get(sourceUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        timeout: 30000
      });

      return {
        year,
        month,
        sourceUrl,
        fetchedAt: new Date().toISOString(),
        ...parseVisaBulletinHtml(response.data, year)
      };
    } catch (error) {
      lastError = error;
      if (error.response?.status !== 404) {
        throw error;
      }
    }
  }

  throw lastError;
}
