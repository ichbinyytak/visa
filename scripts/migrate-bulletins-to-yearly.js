#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  BULLETIN_DATA_DIR,
  formatBulletinMonthKey,
  writeStoredVisaBulletin
} from '../lib/bulletin-store.js';

const MONTHLY_FILE_PATTERN = /^(\d{4})-(\d{2})\.json$/;

async function main() {
  const entries = await fs.readdir(BULLETIN_DATA_DIR);
  const monthlyFiles = entries.filter(fileName => MONTHLY_FILE_PATTERN.test(fileName)).sort();

  if (monthlyFiles.length === 0) {
    console.log('No monthly bulletin files found.');
    return;
  }

  let migratedCount = 0;
  for (const fileName of monthlyFiles) {
    const [, year, month] = MONTHLY_FILE_PATTERN.exec(fileName);
    const filePath = path.join(BULLETIN_DATA_DIR, fileName);
    const data = JSON.parse(await fs.readFile(filePath, 'utf8'));

    data.year = Number.parseInt(year, 10);
    data.month = Number.parseInt(month, 10);

    if (formatBulletinMonthKey(data.month) !== month) {
      throw new Error(`Month mismatch in ${fileName}`);
    }

    await writeStoredVisaBulletin(data);
    await fs.unlink(filePath);
    migratedCount += 1;
  }

  console.log(`Migrated ${migratedCount} monthly file(s) into yearly files.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
