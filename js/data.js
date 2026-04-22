// ── ใส่ URL จาก Apps Script Deploy ตรงนี้ ──────────────────────
// วิธีได้ URL: ดู gas/Code.gs → ทำตามขั้นตอน deploy → copy URL
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzGy8rnJVZdTBcizH83D0e96j1GXZdDHdQd-rui-HO5kyxjAFSW2htviUFh8IAm4sSx/exec';

const FISCAL_YEAR_BE = 2569;
const FISCAL_YEAR_CE = 2026;

// ── CSV parser (handles quoted fields) ──────────────────────────────
function parseCSV(text) {
  const rows = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const row = []; let inQ = false, field = '';
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"' && !inQ)           { inQ = true; }
      else if (c === '"' && inQ) {
        if (line[i + 1] === '"')       { field += '"'; i++; }
        else                            { inQ = false; }
      } else if (c === ',' && !inQ)   { row.push(field); field = ''; }
      else                             { field += c; }
    }
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function parseNum(s) {
  if (!s) return 0;
  return parseFloat(s.replace(/,/g, '')) || 0;
}

// "DD/MM/YYYY_BE"  →  { month: 0-based, year: CE }
function parseDateBE(s) {
  if (!s || !s.includes('/')) return null;
  const [d, m, y] = s.trim().split('/').map(Number);
  if (!d || !m || !y) return null;
  return { month: m - 1, year: y - 543 };
}

// กระจายงบเท่าๆ กันตามวันสัญญา (linear distribution)
function calcPlanned(budget, startStr, endStr) {
  const planned = Array(12).fill(0);
  const start = parseDateBE(startStr);
  const end   = parseDateBE(endStr);

  if (!start || !end) {
    // ไม่มีวันสัญญา: กระจายเท่ากัน 12 เดือน
    return planned.fill(+(budget / 12).toFixed(6));
  }

  // จำนวนเดือนทั้งหมดของสัญญา
  const totalMonths = Math.max(1,
    (end.year - start.year) * 12 + (end.month - start.month) + 1
  );
  const perMonth = budget / totalMonths;

  for (let m = 0; m < 12; m++) {
    const afterStart = FISCAL_YEAR_CE > start.year ||
                      (FISCAL_YEAR_CE === start.year && m >= start.month);
    const beforeEnd  = FISCAL_YEAR_CE < end.year   ||
                      (FISCAL_YEAR_CE === end.year  && m <= end.month);
    if (afterStart && beforeEnd) planned[m] = +perMonth.toFixed(6);
  }
  return planned;
}

function inferType(wbs) {
  return (wbs || '').startsWith('I/') ? 'ลงทุนโครงการ' : 'ลงทุนปกติ';
}

// ── Fetch จาก GAS ────────────────────────────────────────────────────
async function fetchSheetData() {
  if (!GAS_URL) throw new Error('ยังไม่ได้ใส่ GAS_URL');

  const res = await fetch(GAS_URL);
  if (!res.ok) throw new Error(`GAS ตอบ ${res.status}`);

  const json = await res.json();

  // เพิ่ม planned ที่คำนวณจากวันสัญญา (GAS ไม่ส่งมา)
  json.projects.forEach(p => {
    p.planned = calcPlanned(p.budget, p.startDate, p.endDate);
  });

  return json;
}

// ── Summary ──────────────────────────────────────────────────────────
function computeSummary(data) {
  let totalBudgetProject = 0, totalBudgetNormal = 0;
  let totalActual = 0, plannedToNow = 0;

  data.projects.forEach(p => {
    if (p.type === 'ลงทุนโครงการ') totalBudgetProject += p.budget;
    else                             totalBudgetNormal  += p.budget;

    for (let i = 0; i < data.lastUpdatedMonth; i++) {
      totalActual  += (p.actual[i]  || 0);
      plannedToNow += (p.planned[i] || 0);
    }
  });

  return {
    totalBudget: totalBudgetProject + totalBudgetNormal,
    totalBudgetProject,
    totalBudgetNormal,
    totalActual,
    behind: plannedToNow - totalActual,
  };
}
