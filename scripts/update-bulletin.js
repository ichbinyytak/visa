#!/usr/bin/env node

import { fetchVisaBulletin } from '../lib/visa-bulletin.js';
import {
  formatBulletinMonth,
  getCandidateBulletinMonths,
  readStoredVisaBulletin,
  writeStoredVisaBulletin
} from '../lib/bulletin-store.js';

function parseNumber(value) {
  if (!/^\d+$/.test(String(value))) {
    return NaN;
  }
  return Number.parseInt(value, 10);
}

function parseTargets(args) {
  const [yearArg, monthArg] = args;

  if (args.length === 1 || args.length > 2) {
    return [{ year: NaN, month: NaN }];
  }

  if (yearArg && monthArg) {
    return [{
      year: parseNumber(yearArg),
      month: parseNumber(monthArg)
    }];
  }

  return getCandidateBulletinMonths();
}

function validateTarget({ year, month }) {
  return Number.isInteger(year)
    && Number.isInteger(month)
    && year >= 2000
    && year <= 2100
    && month >= 1
    && month <= 12;
}

async function updateTarget(target) {
  const label = formatBulletinMonth(target.year, target.month);
  const existing = await readStoredVisaBulletin(target.year, target.month);

  if (existing) {
    console.log(`${label}: already stored`);
    return false;
  }

  try {
    const data = await fetchVisaBulletin(target.year, target.month);
    const hasData = data.familyTables.length > 0 || data.employmentTables.length > 0;

    if (!hasData) {
      console.log(`${label}: fetched page but found no bulletin tables`);
      return false;
    }

    const filePath = await writeStoredVisaBulletin(data);
    console.log(`${label}: saved ${filePath}`);
    return true;
  } catch (error) {
    const status = error.response?.status ? `HTTP ${error.response.status}` : error.message;
    console.log(`${label}: not available (${status})`);
    return false;
  }
}

async function main() {
  const targets = parseTargets(process.argv.slice(2));
  const invalidTarget = targets.find(target => !validateTarget(target));

  if (invalidTarget) {
    console.error('Usage: npm run update-bulletin -- [year month]');
    process.exit(1);
  }

  let changed = false;
  for (const target of targets) {
    changed = await updateTarget(target) || changed;
  }

  if (!changed) {
    console.log('No new bulletin data was added.');
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
