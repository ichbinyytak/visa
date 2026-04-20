const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i);
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

function renderData(data) {
  const content = document.getElementById('content');
  const category = document.getElementById('categorySelect').value;
  const year = document.getElementById('yearSelect').value;
  const monthObj = MONTHS.find(m => m.value === document.getElementById('monthSelect').value);
  const selectedMonth = document.getElementById('monthSelect').value.padStart(2, '0');
  
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
        <div class="meta-note">当前展示月份</div>
      </div>
      <div class="results-summary">
        <h2>${sectionTitle}</h2>
        <p>数据按美国国务院当月发布内容抓取并整理显示，线上接口会自动更新。</p>
      </div>
      <div class="results-status">
        <span class="status-pill">自动抓取</span>
        <span class="status-pill">缓存 24 小时</span>
      </div>
    </section>
    <div class="tables-container">
  `;
  
  tables.forEach((table, index) => {
    const headers = table[0] || [];
    const rows = table.slice(1);

    html += `
      <div class="table-section">
        <div class="section-heading">
          <h3>${sectionTitle}${tables.length > 1 ? ` - ${index + 1}` : ''}</h3>
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
              ${rows.map(row => `
                <tr>
                  ${row.map((cell, cellIndex) => {
                    const translated = translateCell(cell.trim(), category);
                    const label = headers[cellIndex] ? escapeHtml(translateCell(headers[cellIndex].trim(), category)) : `列 ${cellIndex + 1}`;
                    return `<td data-label="${label}">${escapeHtml(translated)}</td>`;
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
  
  try {
    const data = await fetchVisaBulletin(year, month);
    renderData(data);
  } catch (error) {
    renderError('无法获取签证排期数据，请稍后重试。');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initSelectors();
  loadData();
});
