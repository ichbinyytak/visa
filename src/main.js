const CURRENT_YEAR = new Date().getFullYear();
const FIRST_DATA_YEAR = 2001;
const YEARS = Array.from({ length: CURRENT_YEAR - FIRST_DATA_YEAR + 1 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = [
  { value: '1', label: '1月' },
  { value: '2', label: '2月' },
  { value: '3', label: '3月' },
  { value: '4', label: '4月' },
  { value: '5', label: '5月' },
  { value: '6', label: '6月' },
  { value: '7', label: '7月' },
  { value: '8', label: '8月' },
  { value: '9', label: '9月' },
  { value: '10', label: '10月' },
  { value: '11', label: '11月' },
  { value: '12', label: '12月' }
];

const API_BASE = '/api';

let cachedData = {};

const FAMILY_LABELS = {
  'Family- Sponsored': '亲属移民',
  'Family-Sponsored': '亲属移民',
  'All Chargeability Areas Except Those Listed': '全球（除列出地区）',
  'CHINA-mainland born': '中国大陆',
  'CHINA- mainland born': '中国大陆出生',
  'CHINA mainland born': '中国大陆出生',
  'INDIA': '印度',
  'MEXICO': '墨西哥',
  'PHILIPPINES': '菲律宾',
  'F1': 'F1 - 已婚子女',
  'F2A': 'F2A - 配偶及未成年子女',
  'F2B': 'F2B - 未成年子女',
  'F3': 'F3 - 已婚子女',
  'F4': 'F4 - 美国公民直系兄弟姐妹',
  '1st': '第一优先',
  '2nd': '第二优先',
  '3rd': '第三优先',
  '4th': '第四优先',
  'C': '无排期',
  'Current': '无排期'
};

const EMPLOYMENT_LABELS = {
  'Employment- based': '职业移民',
  'Employment-Based': '职业移民',
  'All Chargeability Areas Except Those Listed': '全球（除列出地区）',
  'CHINA-mainland born': '中国大陆',
  'CHINA- mainland born': '中国大陆出生',
  'CHINA mainland born': '中国大陆出生',
  'INDIA': '印度',
  'MEXICO': '墨西哥',
  'PHILIPPINES': '菲律宾',
  '1st': '第一优先 - 杰出人才',
  '2nd': '第二优先 - 高学历专业人士',
  '3rd': '第三优先 - 技术劳工',
  'Other Workers': '其他工人',
  '4th': '第四优先 - 特殊人士',
  'Certain Religious Workers': '宗教工作者',
  '5th Unreserved (including C5, T5, I5, R5, NU, RU)': '第五优先 - 非预留区域',
  '5th Set Aside: Rural (20%, including NR, RR)': '第五优先 - 农村地区（20%）',
  '5th Set Aside: High Unemployment (10%, including NH, RH)': '第五优先 - 高失业率地区（10%）',
  '5th Set Aside: Infrastructure (2%, including RI)': '第五优先 - 基础设施（2%）',
  '5th Unreserved': '第五优先非预留',
  '5th Set Aside:': '第五优先预留：',
  '5th Set Aside: (Rural: NR, RR - 20%)': '第五优先预留（农村：20%）',
  '5th Set Aside: (High Unemployment: NH, RH - 10%)': '第五优先预留（高失业率：10%）',
  '5th Set Aside: (Infrastructure: RI - 2%)': '第五优先预留（基础设施：2%）',
  'C': '无排期',
  'Current': '无排期'
};

const TABLE_TITLE_FALLBACKS = {
  family: [
    '亲属移民优先类别最终裁定日期',
    '亲属移民签证申请递件日期'
  ],
  employment: [
    '职业移民优先类别最终裁定日期',
    '职业移民签证申请递件日期'
  ]
};

const TABLE_TITLE_LABELS = {
  'Final Action Dates for Family-Sponsored Preference Cases': '亲属移民优先类别最终裁定日期',
  'Dates for Filing Family-Sponsored Visa Applications': '亲属移民签证申请递件日期',
  'Final Action Dates for Employment-Based Preference Cases': '职业移民优先类别最终裁定日期',
  'A. APPLICATION FINAL ACTION DATES FOR EMPLOYMENT-BASED PREFERENCE CASES': '职业移民优先类别最终裁定日期',
  'Dates for Filing Employment-Based Visa Applications': '职业移民签证申请递件日期'
};

const TABLE_DESCRIPTIONS = {
  '亲属移民优先类别最终裁定日期': '用于判断亲属移民签证名额是否可用，优先日早于表中日期通常表示可进入最终批准阶段。',
  '亲属移民签证申请递件日期': '用于判断是否可以提前向 NVC/USCIS 准备或提交申请材料，实际递件规则以官方通知为准。'
};

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function translateCell(text, category) {
  const labels = category === 'family' ? FAMILY_LABELS : EMPLOYMENT_LABELS;
  
  if (labels[text]) {
    return labels[text];
  }
  
  for (const [key, value] of Object.entries(labels)) {
    if (text.includes(key) || key.includes(text)) {
      return text.replace(key, value);
    }
  }
  
  return text;
}

function getTableTitle(data, category, index, fallbackTitle, totalTables) {
  const titles = category === 'family' ? data.familyTableTitles : data.employmentTableTitles;
  const title = titles?.[index]?.trim();

  if (title && title.length <= 180 && !title.startsWith('The chart below')) {
    return TABLE_TITLE_LABELS[title] || title;
  }

  return TABLE_TITLE_FALLBACKS[category]?.[index]
    || `${fallbackTitle}${totalTables > 1 ? ` - ${index + 1}` : ''}`;
}

function getPreviousMonth(year, month) {
  if (month > 1) {
    return { year, month: month - 1 };
  }

  if (year <= FIRST_DATA_YEAR) {
    return null;
  }

  return { year: year - 1, month: 12 };
}

function parseVisaDate(value) {
  const match = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day));
}

function isCurrent(value) {
  return value === 'C' || value === 'Current' || value === '无排期';
}

function getCellComparison(currentValue, previousValue) {
  if (!previousValue) {
    return null;
  }

  const current = currentValue.trim();
  const previous = previousValue.trim();
  const currentDate = parseVisaDate(current);
  const previousDate = parseVisaDate(previous);

  if (currentDate && previousDate) {
    const days = Math.round((currentDate - previousDate) / 86400000);

    if (days > 0) {
      return { type: 'advance', text: `较上月 +${days}天` };
    }

    if (days < 0) {
      return { type: 'retrogress', text: `较上月 ${days}天` };
    }

    return { type: 'neutral', text: '较上月持平' };
  }

  if (isCurrent(current) && isCurrent(previous)) {
    return { type: 'neutral', text: '仍无排期' };
  }

  if (isCurrent(current) && previousDate) {
    return { type: 'advance', text: '转为无排期' };
  }

  if (currentDate && isCurrent(previous)) {
    return { type: 'retrogress', text: '出现排期' };
  }

  return null;
}

function getPreviousCell(previousData, category, tableIndex, row, rowIndex, cellIndex) {
  if (!previousData) {
    return null;
  }

  const previousTables = category === 'family' ? previousData.familyTables : previousData.employmentTables;
  const previousTable = previousTables?.[tableIndex];
  if (!previousTable) {
    return null;
  }

  const previousRows = previousTable.slice(1);
  const rowKey = row[0]?.trim();
  const previousRow = previousRows.find(candidate => candidate[0]?.trim() === rowKey) || previousRows[rowIndex];

  return previousRow?.[cellIndex] || null;
}

function renderComparison(comparison) {
  if (!comparison) {
    return '';
  }

  return `<span class="delta delta-${comparison.type}">${escapeHtml(comparison.text)}</span>`;
}

function renderTableDescription(title) {
  const description = TABLE_DESCRIPTIONS[title];
  return description ? `<p class="table-description">${escapeHtml(description)}</p>` : '';
}

function initSelectors() {
  const yearSelect = document.getElementById('yearSelect');
  const monthSelect = document.getElementById('monthSelect');
  
  YEARS.forEach(year => {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  });
  
  const currentMonth = new Date().getMonth() + 1;
  MONTHS.forEach(month => {
    const option = document.createElement('option');
    option.value = month.value;
    option.textContent = month.label;
    monthSelect.appendChild(option);
  });
  
  yearSelect.value = CURRENT_YEAR;
  monthSelect.value = currentMonth.toString();
  
  yearSelect.addEventListener('change', loadData);
  monthSelect.addEventListener('change', loadData);
  document.getElementById('categorySelect').addEventListener('change', loadData);
}

async function fetchVisaBulletin(year, month) {
  const cacheKey = `${year}-${month}`;
  if (cachedData[cacheKey]) {
    return cachedData[cacheKey];
  }
  
  const url = `${API_BASE}/visa-bulletin?year=${year}&month=${month}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    cachedData[cacheKey] = data;
    return data;
  } catch (error) {
    console.error('Failed to fetch visa bulletin:', error);
    throw error;
  }
}

function renderData(data, previousData = null) {
  const content = document.getElementById('content');
  const category = document.getElementById('categorySelect').value;
  const year = document.getElementById('yearSelect').value;
  const monthObj = MONTHS.find(m => m.value === document.getElementById('monthSelect').value);
  const selectedMonth = document.getElementById('monthSelect').value.padStart(2, '0');
  const sourceUrl = data.sourceUrl || 'https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html';
  
  const tables = category === 'family' ? data.familyTables : data.employmentTables;
  const sectionTitle = category === 'family' ? '亲属移民 (Family-Sponsored)' : '职业移民 (Employment-Based)';
  
  if (!tables || tables.length === 0) {
    content.innerHTML = `
      <div class="no-data">
        <p>未找到 ${year} 年 ${monthObj.label} 的${category === 'family' ? '亲属移民' : '职业移民'}排期数据</p>
        <p style="margin-top: 10px; font-size: 0.9rem;">该月份数据可能尚未发布或格式有变化</p>
      </div>
    `;
    return;
  }
  
  let html = `
    <section class="results-head">
      <div class="results-meta">
        <div class="current-date">${year}-${selectedMonth}</div>
        <a class="source-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener">官方来源</a>
      </div>
      <div class="results-summary">
        <h2>${sectionTitle}</h2>
        <p>${previousData ? '当前显示所选月份数据，并标注较上月变化。' : '当前显示所选月份的 Visa Bulletin 数据。'}</p>
      </div>
    </section>
    <div class="tables-container">
  `;
  
  tables.forEach((table, index) => {
    const headers = table[0] || [];
    const rows = table.slice(1);
    const tableTitle = getTableTitle(data, category, index, sectionTitle, tables.length);

    html += `
      <div class="table-section">
        <div class="section-heading">
          <div>
            <h3>${escapeHtml(tableTitle)}</h3>
            ${renderTableDescription(tableTitle)}
          </div>
          <span>${Math.max(rows.length, 0)} 条记录</span>
        </div>
        <div class="table-wrapper">
          <table class="bulletin-table">
            <thead>
              <tr>
                ${headers.map(cell => `<th>${escapeHtml(translateCell(cell.trim(), category))}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.map((row, rowIndex) => `
                <tr>
                  ${row.map((cell, cellIndex) => {
                    const rawCell = cell.trim();
                    const translated = translateCell(rawCell, category);
                    const label = headers[cellIndex] ? escapeHtml(translateCell(headers[cellIndex].trim(), category)) : `列 ${cellIndex + 1}`;
                    const previousCell = cellIndex > 0
                      ? getPreviousCell(previousData, category, index, row, rowIndex, cellIndex)
                      : null;
                    const comparison = getCellComparison(rawCell, previousCell);

                    return `
                      <td data-label="${label}">
                        <div class="cell-content">
                          <span class="cell-value">${escapeHtml(translated)}</span>
                          ${renderComparison(comparison)}
                        </div>
                      </td>
                    `;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  content.innerHTML = html;
}

function renderError(message) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="error">
      <p>加载数据时出错</p>
      <p style="margin-top: 10px; font-size: 0.9rem;">${message}</p>
    </div>
  `;
}

async function loadData() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">正在加载数据...</div>';
  
  const year = document.getElementById('yearSelect').value;
  const month = document.getElementById('monthSelect').value;
  const previousMonth = getPreviousMonth(Number(year), Number(month));
  
  try {
    const data = await fetchVisaBulletin(year, month);
    let previousData = null;

    if (previousMonth) {
      try {
        previousData = await fetchVisaBulletin(previousMonth.year, previousMonth.month);
      } catch (error) {
        previousData = null;
      }
    }

    renderData(data, previousData);
  } catch (error) {
    renderError('无法获取签证排期数据，请稍后重试。');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initSelectors();
  loadData();
});
