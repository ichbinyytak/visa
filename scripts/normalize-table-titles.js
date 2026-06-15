#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { BULLETIN_DATA_DIR } from '../lib/bulletin-store.js';

const TITLE_FALLBACKS = {
  familyTableTitles: [
    '亲属移民优先类别最终裁定日期',
    '亲属移民签证申请递件日期'
  ],
  employmentTableTitles: [
    '职业移民优先类别最终裁定日期',
    '职业移民签证申请递件日期'
  ]
};

const TITLE_TRANSLATIONS = {
  'Final Action Dates for Family-Sponsored Preference Cases': '亲属移民优先类别最终裁定日期',
  'Dates for Filing Family-Sponsored Visa Applications': '亲属移民签证申请递件日期',
  'Final Action Dates for Employment-Based Preference Cases': '职业移民优先类别最终裁定日期',
  'A. APPLICATION FINAL ACTION DATES FOR EMPLOYMENT-BASED PREFERENCE CASES': '职业移民优先类别最终裁定日期',
  'Dates for Filing Employment-Based Visa Applications': '职业移民签证申请递件日期'
};

function normalizeTitles(tables, titles, type) {
  return tables.map((_, index) => {
    const title = titles?.[index]?.trim() || '';

    if (TITLE_TRANSLATIONS[title]) {
      return TITLE_TRANSLATIONS[title];
    }

    if (title && title.length <= 180 && !title.startsWith('The chart below')) {
      return title;
    }

    return TITLE_FALLBACKS[type][index] || '';
  });
}

async function main() {
  const fileNames = (await fs.readdir(BULLETIN_DATA_DIR))
    .filter(fileName => /^\d{4}\.json$/.test(fileName))
    .sort();

  let updatedFiles = 0;
  let updatedBulletins = 0;

  for (const fileName of fileNames) {
    const filePath = path.join(BULLETIN_DATA_DIR, fileName);
    const yearData = JSON.parse(await fs.readFile(filePath, 'utf8'));
    let fileChanged = false;

    for (const bulletin of Object.values(yearData.bulletins || {})) {
      const nextFamilyTitles = normalizeTitles(
        bulletin.familyTables || [],
        bulletin.familyTableTitles || [],
        'familyTableTitles'
      );
      const nextEmploymentTitles = normalizeTitles(
        bulletin.employmentTables || [],
        bulletin.employmentTableTitles || [],
        'employmentTableTitles'
      );

      if (JSON.stringify(bulletin.familyTableTitles || []) !== JSON.stringify(nextFamilyTitles)
        || JSON.stringify(bulletin.employmentTableTitles || []) !== JSON.stringify(nextEmploymentTitles)) {
        bulletin.familyTableTitles = nextFamilyTitles;
        bulletin.employmentTableTitles = nextEmploymentTitles;
        fileChanged = true;
        updatedBulletins += 1;
      }
    }

    if (fileChanged) {
      yearData.updatedAt = new Date().toISOString();
      await fs.writeFile(filePath, `${JSON.stringify(yearData, null, 2)}\n`);
      updatedFiles += 1;
    }
  }

  console.log(`Normalized table titles in ${updatedFiles} yearly file(s), ${updatedBulletins} bulletin(s).`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
