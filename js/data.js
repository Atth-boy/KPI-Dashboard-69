const GAS_URL = 'https://script.google.com/macros/s/AKfycbzGy8rnJVZdTBcizH83D0e96j1GXZdDHdQd-rui-HO5kyxjAFSW2htviUFh8IAm4sSx/exec';

const FISCAL_YEAR_BE = 2569;
const FISCAL_YEAR_CE = 2026;

function parseNum(s) {
  if (!s) return 0;
  return parseFloat(s.replace(/,/g, '')) || 0;
}

// "DD/MM/YYYY_BE" → { month: 0-based gregorian, year: CE }
function parseDateBE(s) {
  if (!s || !s.includes('/')) return null;
  const [d, m, y] = s.trim().split('/').map(Number);
  if (!d || !m || !y) return null;
  return { month: m - 1, year: y - 543 };
}

// กระจายงบตามวันสัญญา — ใช้ลำดับ fiscal month (index 0 = ต.ค.)
// fiscal month m → gregorian: m<=2 → year CE-1, greg=9+m; m>=3 → year CE, greg=m-3
function calcPlanned(budget, startStr, endStr) {
  const planned = Array(12).fill(0);
  const start = parseDateBE(startStr);
  const end   = parseDateBE(endStr);

  if (!start || !end) return planned.fill(+(budget / 12).toFixed(6));

  const totalMonths = Math.max(1,
    (end.year - start.year) * 12 + (end.month - start.month) + 1
  );
  const perMonth = budget / totalMonths;

  for (let fm = 0; fm < 12; fm++) {
    // แปลง fiscal month → CE year + gregorian month
    const yr   = fm <= 2 ? FISCAL_YEAR_CE - 1 : FISCAL_YEAR_CE;
    const greg = fm <= 2 ? 9 + fm              : fm - 3;

    const mAbs     = yr * 12 + greg;
    const startAbs = start.year * 12 + start.month;
    const endAbs   = end.year   * 12 + end.month;

    if (mAbs >= startAbs && mAbs <= endAbs) planned[fm] = +perMonth.toFixed(6);
  }
  return planned;
}

// ── Fetch จาก GAS ──────────────────────────────────────────────
async function fetchSheetData() {
  if (!GAS_URL) throw new Error('ยังไม่ได้ใส่ GAS_URL');

  const res = await fetch(GAS_URL);
  if (!res.ok) throw new Error(`GAS ตอบ ${res.status}`);

  const json = await res.json();

  // ถ้า GAS ไม่ส่ง planned มา (หรือเป็น 0 ทั้งหมด) ให้คำนวณจากวันสัญญาแทน
  json.projects.forEach(p => {
    if (!p.planned || !p.planned.some(v => v > 0)) {
      p.planned = calcPlanned(p.budget, p.startDate, p.endDate);
    }
    if (!p.actual) p.actual = Array(12).fill(0);
  });

  return json;
}

// ── Summary ────────────────────────────────────────────────────
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
