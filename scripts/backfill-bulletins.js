#!/usr/bin/env node

import { fetchVisaBulletin } from '../lib/visa-bulletin.js';
import {
  formatBulletinMonth,
  readStoredVisaBulletin,
  writeStoredVisaBulletin
} from '../lib/bulletin-store.js';

function parseNumber(value) {
  if (!/^\d+$/.test(String(value))) {
    return NaN;
  }
  return Number.parseInt(value, 10);
}

function validateMonth(year, month) {
  return Number.isInteger(year)
    && Number.isInteger(month)
    && year >= 2000
    && year <= 2100
    && month >= 1
    && month <= 12;
}

function monthIndex(year, month) {
  return year * 12 + month;
}

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function getTargets(startYear, startMonth, endYear, endMonth) {
  const targets = [];
  const step = monthIndex(startYear, startMonth) <= monthIndex(endYear, endMonth) ? 1 : -1;
  let year = startYear;
  let month = startMonth;

  while (step === 1
    ? monthIndex(year, month) <= monthIndex(endYear, endMonth)
    : monthIndex(year, month) >= monthIndex(endYear, endMonth)) {
    targets.push({ year, month });

    month += step;
    if (month > 12) {
      year += 1;
      month = 1;
    } else if (month < 1) {
      year -= 1;
      month = 12;
    }
  }

  return targets;
}

async function backfillTarget(target) {
  const label = formatBulletinMonth(target.year, target.month);

  if (await readStoredVisaBulletin(target.year, target.month)) {
    console.log(`${label}: already stored`);
    return false;
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const data = await fetchVisaBulletin(target.year, target.month);
      const hasData = data.familyTables.length > 0 || data.employmentTables.length > 0;

      if (!hasData) {
        console.log(`${label}: fetched page but found no bulletin tables`);
        return false;
      }

      await writeStoredVisaBulletin(data);
      console.log(`${label}: saved`);
      return true;
    } catch (error) {
      const statusCode = error.response?.status;
      const status = statusCode ? `HTTP ${statusCode}` : error.message;

      if (statusCode === 404 || attempt === 3) {
        console.log(`${label}: skipped (${status})`);
        return false;
      }

      console.log(`${label}: retry ${attempt} (${status})`);
      await sleep(1000 * attempt);
    }
  }

  return false;
}

async function main() {
  const [startYearArg, startMonthArg, endYearArg, endMonthArg] = process.argv.slice(2);
  const startYear = parseNumber(startYearArg);
  const startMonth = parseNumber(startMonthArg);
  const endYear = parseNumber(endYearArg);
  const endMonth = parseNumber(endMonthArg);

  if (!validateMonth(startYear, startMonth)
    || !validateMonth(endYear, endMonth)) {
    console.error('Usage: npm run backfill-bulletins -- <startYear> <startMonth> <endYear> <endMonth>');
    process.exit(1);
  }

  let changedCount = 0;
  for (const target of getTargets(startYear, startMonth, endYear, endMonth)) {
    changedCount += await backfillTarget(target) ? 1 : 0;
    await sleep(250);
  }

  console.log(`Backfill complete. Added ${changedCount} file(s).`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
