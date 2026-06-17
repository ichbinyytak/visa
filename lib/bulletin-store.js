import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const BULLETIN_DATA_DIR = path.join(PROJECT_ROOT, 'data', 'visa-bulletins');

export function formatBulletinMonth(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function formatBulletinMonthKey(month) {
  return String(month).padStart(2, '0');
}

export function getBulletinYearDataPath(year) {
  return path.join(BULLETIN_DATA_DIR, `${year}.json`);
}

export function getBulletinDataPath(year) {
  return getBulletinYearDataPath(year);
}

function createYearData(year) {
  return {
    year,
    updatedAt: new Date().toISOString(),
    bulletins: {}
  };
}

function sortBulletinsByMonth(bulletins) {
  return Object.fromEntries(
    Object.entries(bulletins).sort(([monthA], [monthB]) => monthA.localeCompare(monthB))
  );
}

export async function readStoredVisaBulletin(year, month) {
  try {
    const content = await fs.readFile(getBulletinYearDataPath(year), 'utf8');
    const yearData = JSON.parse(content);
    return yearData.bulletins?.[formatBulletinMonthKey(month)] || null;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function writeStoredVisaBulletin(data) {
  await fs.mkdir(BULLETIN_DATA_DIR, { recursive: true });
  const filePath = getBulletinYearDataPath(data.year);
  const monthKey = formatBulletinMonthKey(data.month);
  let yearData = createYearData(data.year);

  try {
    const content = await fs.readFile(filePath, 'utf8');
    yearData = JSON.parse(content);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  yearData.year = data.year;
  yearData.updatedAt = new Date().toISOString();
  yearData.bulletins = sortBulletinsByMonth({
    ...(yearData.bulletins || {}),
    [monthKey]: data
  });

  await fs.writeFile(filePath, `${JSON.stringify(yearData, null, 2)}\n`);
  return filePath;
}

export async function getStoredVisaBulletinMeta() {
  const entries = await fs.readdir(BULLETIN_DATA_DIR);
  const yearFiles = entries
    .filter(fileName => /^\d{4}\.json$/.test(fileName))
    .sort();

  const months = [];

  for (const fileName of yearFiles) {
    const filePath = path.join(BULLETIN_DATA_DIR, fileName);
    const yearData = JSON.parse(await fs.readFile(filePath, 'utf8'));
    const year = Number.parseInt(fileName.replace('.json', ''), 10);

    for (const monthKey of Object.keys(yearData.bulletins || {})) {
      months.push(formatBulletinMonth(year, Number.parseInt(monthKey, 10)));
    }
  }

  months.sort();

  return {
    firstMonth: months[0] || null,
    lastMonth: months.at(-1) || null,
    monthCount: months.length,
    yearCount: yearFiles.length
  };
}

export function getCandidateBulletinMonths(referenceDate = new Date()) {
  const candidates = [];

  for (let offset = -1; offset <= 2; offset += 1) {
    const date = new Date(Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth() + offset,
      1
    ));

    candidates.push({
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1
    });
  }

  return candidates;
}
