const MONTHS_TH2 = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const C2_GOAL   = '#71717a';
const C2_ACTUAL = '#f97316';

let chartInst2 = {};

function cumul2(arr) {
  let sum = 0;
  return arr.map(v => { sum += (v || 0); return +sum.toFixed(4); });
}

function gradFill2(ctx, color) {
  const g = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
  g.addColorStop(0, color + '55');
  g.addColorStop(1, color + '00');
  return g;
}

function makeChart2(id, config) {
  if (chartInst2[id]) chartInst2[id].destroy();
  chartInst2[id] = new Chart(document.getElementById(id), config);
}

function chartOpts2() {
  return {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: { size: 11 }, boxWidth: 12, boxHeight: 12,
          borderRadius: 3, useBorderRadius: true, padding: 14, color: '#3f3f46',
        },
      },
      tooltip: {
        backgroundColor: '#18181b', titleColor: '#f4f4f5', bodyColor: '#d4d4d8',
        borderColor: '#3f3f46', borderWidth: 1, padding: 10, cornerRadius: 8,
        callbacks: {
          label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y != null ? ctx.parsed.y.toFixed(3) : '—'} ลบ.`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { font: { size: 11 }, color: '#71717a' },
      },
      y: {
        grid: { color: '#f4f4f5', lineWidth: 1 },
        border: { display: false, dash: [4, 4] },
        ticks: { font: { size: 11 }, color: '#71717a', callback: v => v.toFixed(0) },
        title: { display: true, text: 'ลบ.', font: { size: 10 }, color: '#71717a' },
      },
    },
  };
}

// ── Summary row ────────────────────────────────────────────────

function calcCatStats(projects, lastUpdatedMonth) {
  const { planned, actual } = buildAggregates2(projects);
  let totalBudget = 0;
  projects.forEach(p => { totalBudget += (p.budget || 0); });
  let cumPlan = 0, cumAct = 0;
  for (let i = 0; i < lastUpdatedMonth; i++) {
    cumPlan += (planned[i] || 0);
    cumAct  += (actual[i]  || 0);
  }
  return { totalBudget, cumPlan, cumAct, diff: cumAct - cumPlan };
}

function renderSummaryRow(data) {
  // ── Overall card (เหมือน index) ──
  const all = calcCatStats(data.projects, data.lastUpdatedMonth);
  const oDiffCls = all.diff >= 0 ? 'p2-diff-ahead' : 'p2-diff-behind';
  const oDiffTxt = all.diff >= 0
    ? `เกินเป้าสะสม ${all.diff.toFixed(3)} ลบ.`
    : `ต่ำกว่าเป้าสะสม ${Math.abs(all.diff).toFixed(3)} ลบ.`;

  document.getElementById('p2-sum-overall').innerHTML = `
    <div class="kpi-label">ภาพรวมเป้าจ่ายประจำปี 2569</div>
    <div class="kpi-row">
      <div class="kpi-item">
        <div class="kpi-sublabel">เป้าจ่าย (Goal)</div>
        <div class="kpi-value goal">${all.totalBudget.toFixed(3)}</div>
      </div>
      <div class="kpi-item">
        <div class="kpi-sublabel">จ่ายจริง (Result)</div>
        <div class="kpi-value result">${all.cumAct.toFixed(3)}</div>
      </div>
    </div>
    <div class="p2-overall-diff ${oDiffCls}">${oDiffTxt}</div>
  `;

  // ── 3 Category cards ──
  const cats = [
    { id: 'p2-sum-annual',    label: 'งบประมาณประจำปี',           keyword: 'ประจำปี'  },
    { id: 'p2-sum-commitop',  label: 'งบประมาณผูกพันดำเนินการ',   keyword: 'ผูกดำ'    },
    { id: 'p2-sum-commitpay', label: 'งบประมาณผูกพันการจ่ายเงิน', keyword: 'ผูกจ่าย' },
  ];

  cats.forEach(c => {
    const s = calcCatStats(filterByCategory(data.projects, c.keyword), data.lastUpdatedMonth);
    const dCls = s.diff >= 0 ? 'p2-diff-ahead' : 'p2-diff-behind';
    const dTxt = (s.diff >= 0 ? '+' : '') + s.diff.toFixed(3);

    document.getElementById(c.id).innerHTML = `
      <div class="p2-cat-label">${c.label}</div>
      <div class="p2-cat-budget">${s.totalBudget.toFixed(3)} <span class="p2-cat-unit">ลบ.</span></div>
      <div class="p2-cat-rows">
        <div class="p2-cat-row">
          <span>เป้าสะสม</span><span>${s.cumPlan.toFixed(3)}</span>
        </div>
        <div class="p2-cat-row">
          <span>จ่ายจริงสะสม</span><span class="kpi2-val-orange">${s.cumAct.toFixed(3)}</span>
        </div>
        <div class="p2-cat-row p2-cat-row--diff">
          <span>ส่วนต่าง</span><span class="${dCls}">${dTxt}</span>
        </div>
      </div>
    `;
  });
}

// กรองโครงการตาม budgetCategory (substring match)
function filterByCategory(projects, keyword) {
  return projects.filter(p => p.budgetCategory && p.budgetCategory.includes(keyword));
}

function buildAggregates2(projects) {
  const planned = Array(12).fill(0);
  const actual  = Array(12).fill(0);
  projects.forEach(p => {
    (p.planned || []).forEach((v, i) => { planned[i] += (v || 0); });
    (p.actual  || []).forEach((v, i) => { actual[i]  += (v || 0); });
  });
  return { planned, actual };
}

function renderCategoryChart(canvasId, projects, lastUpdatedMonth) {
  const { planned, actual } = buildAggregates2(projects);
  const cumPlan = cumul2(planned);
  const cumAct  = cumul2(actual);
  const masked  = cumAct.map((v, i) => i < lastUpdatedMonth ? v : null);

  const canvas = document.getElementById(canvasId);
  const ctx    = canvas.getContext('2d');

  makeChart2(canvasId, {
    type: 'line',
    data: {
      labels: MONTHS_TH2,
      datasets: [
        {
          label: 'เป้าจ่ายสะสม',
          data: cumPlan,
          borderColor: C2_GOAL,
          backgroundColor: gradFill2(ctx, C2_GOAL),
          borderWidth: 2,
          borderDash: [6, 3],
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#fff',
          pointBorderColor: C2_GOAL,
          pointBorderWidth: 2,
          tension: 0.4,
          fill: true,
        },
        {
          label: 'จ่ายจริงสะสม',
          data: masked,
          borderColor: C2_ACTUAL,
          backgroundColor: gradFill2(ctx, C2_ACTUAL),
          borderWidth: 2.5,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: C2_ACTUAL,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: chartOpts2(),
  });
}

function renderKPIMini(containerId, projects, lastUpdatedMonth) {
  const { planned, actual } = buildAggregates2(projects);

  let totalBudget = 0;
  projects.forEach(p => { totalBudget += (p.budget || 0); });

  let cumPlan = 0, cumAct = 0;
  for (let i = 0; i < lastUpdatedMonth; i++) {
    cumPlan += (planned[i] || 0);
    cumAct  += (actual[i]  || 0);
  }

  const diff    = cumAct - cumPlan;
  const diffCls = diff >= 0 ? 'kpi2-val-ahead' : 'kpi2-val-behind';
  const diffTxt = (diff >= 0 ? '+' : '') + diff.toFixed(3);

  document.getElementById(containerId).innerHTML = `
    <div class="kpi2-item">
      <div class="kpi2-label">จำนวนโครงการ</div>
      <div class="kpi2-val">${projects.length} โครงการ</div>
    </div>
    <div class="kpi2-divider"></div>
    <div class="kpi2-item">
      <div class="kpi2-label">งบรวม (ลบ.)</div>
      <div class="kpi2-val">${totalBudget.toFixed(3)}</div>
    </div>
    <div class="kpi2-divider"></div>
    <div class="kpi2-item">
      <div class="kpi2-label">เป้าสะสม (ลบ.)</div>
      <div class="kpi2-val">${cumPlan.toFixed(3)}</div>
    </div>
    <div class="kpi2-item">
      <div class="kpi2-label">จ่ายจริงสะสม (ลบ.)</div>
      <div class="kpi2-val kpi2-val-orange">${cumAct.toFixed(3)}</div>
    </div>
    <div class="kpi2-item">
      <div class="kpi2-label">ส่วนต่าง (ลบ.)</div>
      <div class="kpi2-val ${diffCls}">${diffTxt}</div>
    </div>
  `;
}

function renderAll2(data) {
  renderSummaryRow(data);

  const CATS = [
    { keyword: 'ประจำปี',  chartId: 'chart-annual',    kpiId: 'kpi-annual'    },
    { keyword: 'ผูกดำ',    chartId: 'chart-commitop',  kpiId: 'kpi-commitop'  },
    { keyword: 'ผูกจ่าย', chartId: 'chart-commitpay', kpiId: 'kpi-commitpay' },
  ];

  CATS.forEach(c => {
    const filtered = filterByCategory(data.projects, c.keyword);
    renderKPIMini(c.kpiId, filtered, data.lastUpdatedMonth);
    renderCategoryChart(c.chartId, filtered, data.lastUpdatedMonth);
  });

  // แสดงวันที่อัปเดตล่าสุด
  const m  = data.lastUpdatedMonth || 1;
  const ce = (data.year || 2569) - 543;
  const lastDay = new Date(ce, m, 0).getDate();
  document.getElementById('last-updated2').textContent =
    `อัพเดต: ณ วันที่ ${lastDay} ${MONTHS_TH2[m - 1]} ${data.year}`;
}

async function init2() {
  try {
    const data = await fetchSheetData();
    renderAll2(data);
  } catch (err) {
    console.warn('โหลดข้อมูลไม่ได้:', err);
    document.getElementById('last-updated2').textContent = '⚠ ไม่สามารถโหลดข้อมูลได้';
  }
}

document.addEventListener('DOMContentLoaded', init2);
