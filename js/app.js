const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
let globalData = null;
const COLOR_GOAL    = '#71717a';   // gray-500
const COLOR_ACTUAL  = '#f97316';   // orange
const COLOR_PROJECT = '#f97316';   // orange
const COLOR_NORMAL  = '#71717a';   // gray

function fmt(n) { return n == null ? '—' : n.toFixed(3); }
function cumulative(arr) {
  let sum = 0;
  return arr.map(v => { sum += (v || 0); return +sum.toFixed(4); });
}

// ---- Build monthly aggregates ----
function buildMonthlyAggregates(projects, type) {
  const planned = Array(12).fill(0);
  const actual  = Array(12).fill(0);
  projects.forEach(p => {
    if (type && p.type !== type) return;
    p.planned.forEach((v, i) => { planned[i] += (v || 0); });
    p.actual.forEach((v, i)  => { actual[i]  += (v || 0); });
  });
  return { planned, actual };
}

// ---- Charts ----
let chartInstances = {};

function makeChart(id, config) {
  if (chartInstances[id]) chartInstances[id].destroy();
  chartInstances[id] = new Chart(document.getElementById(id), config);
}

function gradientFill(ctx, color) {
  const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
  gradient.addColorStop(0, color + '55');
  gradient.addColorStop(1, color + '00');
  return gradient;
}

function renderMainSCurve(data) {
  const { planned, actual } = buildMonthlyAggregates(data.projects);
  const cumPlanned = cumulative(planned);
  const cumActual  = cumulative(actual);
  const maskedActual = cumActual.map((v, i) => i < data.lastUpdatedMonth ? v : null);

  const canvas = document.getElementById('chart-scurve-main');
  const ctx    = canvas.getContext('2d');

  makeChart('chart-scurve-main', {
    type: 'line',
    data: {
      labels: MONTHS_TH,
      datasets: [
        {
          label: 'เป้าจ่ายสะสม',
          data: cumPlanned,
          borderColor: COLOR_GOAL,
          backgroundColor: gradientFill(ctx, COLOR_GOAL),
          borderWidth: 2,
          borderDash: [6, 3],
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#fff',
          pointBorderColor: COLOR_GOAL,
          pointBorderWidth: 2,
          tension: 0.4,
          fill: true,
        },
        {
          label: 'จ่ายจริงสะสม',
          data: maskedActual,
          borderColor: COLOR_ACTUAL,
          backgroundColor: gradientFill(ctx, COLOR_ACTUAL),
          borderWidth: 2.5,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: COLOR_ACTUAL,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: chartOptions('ลบ.'),
  });
}

function renderSubChart(canvasId, projects, type) {
  const { planned, actual } = buildMonthlyAggregates(projects, type);
  const cumPlanned = cumulative(planned);
  const cumActual  = cumulative(actual);
  const maskedActual = cumActual.map((v, i) => i < globalData.lastUpdatedMonth ? v : null);

  const canvas = document.getElementById(canvasId);
  const ctx    = canvas.getContext('2d');

  makeChart(canvasId, {
    type: 'line',
    data: {
      labels: MONTHS_TH,
      datasets: [
        {
          label: 'เป้าจ่ายสะสม',
          data: cumPlanned,
          borderColor: COLOR_GOAL,
          backgroundColor: gradientFill(ctx, COLOR_GOAL),
          borderWidth: 1.5,
          borderDash: [5, 3],
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: '#fff',
          pointBorderColor: COLOR_GOAL,
          pointBorderWidth: 1.5,
          tension: 0.4,
          fill: true,
        },
        {
          label: 'จ่ายจริงสะสม',
          data: maskedActual,
          borderColor: COLOR_ACTUAL,
          backgroundColor: gradientFill(ctx, COLOR_ACTUAL),
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: COLOR_ACTUAL,
          pointBorderColor: '#fff',
          pointBorderWidth: 1.5,
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: chartOptions('ลบ.'),
  });
}

function renderDonut(budgetProject, budgetNormal) {
  makeChart('chart-donut', {
    type: 'doughnut',
    data: {
      labels: ['ลงทุนโครงการ', 'ลงทุนปกติ'],
      datasets: [{
        data: [budgetProject, budgetNormal],
        backgroundColor: [COLOR_PROJECT, COLOR_NORMAL],
        borderWidth: 3,
        borderColor: '#fff',
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.raw.toFixed(3)} ลบ. (${(ctx.parsed / (budgetProject + budgetNormal) * 100).toFixed(1)}%)`,
          },
        },
      },
    },
  });

  const legend = document.getElementById('donut-legend');
  const colors = [COLOR_PROJECT, COLOR_NORMAL];
  const labels = ['ลงทุนโครงการ', 'ลงทุนปกติ'];
  const values = [budgetProject, budgetNormal];
  legend.innerHTML = labels.map((l, i) =>
    `<div class="legend-item">
      <div class="legend-dot" style="background:${colors[i]}"></div>
      <span>${l}: <strong>${values[i].toFixed(3)}</strong> ลบ.</span>
    </div>`
  ).join('');
}

function chartOptions(unit) {
  return {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: { size: 11 },
          boxWidth: 12,
          boxHeight: 12,
          borderRadius: 3,
          useBorderRadius: true,
          padding: 14,
          color: '#3f3f46',
        },
      },
      tooltip: {
        backgroundColor: '#18181b',
        titleColor: '#f4f4f5',
        bodyColor: '#d4d4d8',
        borderColor: '#3f3f46',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y != null ? ctx.parsed.y.toFixed(3) : '—'} ${unit}`,
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
        ticks: {
          font: { size: 11 },
          color: '#71717a',
          callback: v => v.toFixed(0),
        },
        title: { display: true, text: unit, font: { size: 10 }, color: '#71717a' },
      },
    },
  };
}

// ---- KPI & Info ----
function renderKPI(summary, data) {
  const monthLabel = MONTHS_TH[data.lastUpdatedMonth - 1] + ' ' + data.year;

  document.getElementById('kpi-goal').textContent   = summary.totalBudget.toFixed(3);
  document.getElementById('kpi-result').textContent = summary.totalActual.toFixed(3);
  document.getElementById('kpi-diff').textContent   =
    summary.behind > 0 ? `ต่ำกว่าเป้าสะสม ${summary.behind.toFixed(3)} ลบ.` : '';
  document.getElementById('info-month').textContent  = MONTHS_TH[data.lastUpdatedMonth - 1] + '/' + data.year;
  document.getElementById('info-behind').textContent = summary.behind.toFixed(3);
  document.getElementById('last-updated').textContent = 'อัพเดต: ' + monthLabel;

  // สถานะการจ่าย (ปัจจุบัน)
  const diff    = summary.totalActual - summary.plannedToNow;
  const diffCls = diff >= 0 ? 'ahead' : 'behind';
  const diffTxt = (diff >= 0 ? '+' : '') + diff.toFixed(3);

  document.getElementById('status-month').textContent   = 'ณ เดือน ' + monthLabel;
  document.getElementById('status-planned').textContent = summary.plannedToNow.toFixed(3);
  document.getElementById('status-actual').textContent  = summary.totalActual.toFixed(3);

  const diffEl = document.getElementById('status-diff');
  diffEl.textContent = diffTxt;
  diffEl.className   = 'status-val ' + diffCls;
}

// ---- Project dropdown ----
function populateProjectSelect(projects) {
  const sel = document.getElementById('project-select');
  projects.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    sel.appendChild(opt);
  });

  sel.addEventListener('change', () => {
    const proj = projects.find(p => p.id === +sel.value);
    if (!proj) {
      document.getElementById('project-detail').classList.add('hidden');
      document.getElementById('project-table-wrap').classList.add('hidden');
      return;
    }
    renderProjectDetail(proj);
    renderMonthlyTable(proj);
  });
}

function renderProjectDetail(p) {
  const el = document.getElementById('project-detail');
  el.classList.remove('hidden');
  el.innerHTML = [
    { label: 'ประเภท',          value: p.type },
    { label: 'งบ (ลบ.)',        value: p.budget.toFixed(3) },
    { label: 'เลข WBS',         value: p.wbs },
    { label: 'เลขที่สัญญา',     value: p.contract },
    { label: 'วันเริ่มสัญญา',   value: p.startDate },
    { label: 'วันสิ้นสุดสัญญา', value: p.endDate },
  ].map(item =>
    `<div class="detail-item">
      <div class="detail-label">${item.label}</div>
      <div class="detail-value">${item.value}</div>
    </div>`
  ).join('');
}

function renderMonthlyTable(p) {
  const wrap = document.getElementById('project-table-wrap');
  wrap.classList.remove('hidden');

  const cumPlanned = cumulative(p.planned);
  const cumActual  = cumulative(p.actual);

  let html = '<thead><tr><th>รายการ</th>';
  MONTHS_TH.forEach(m => { html += `<th>${m}</th>`; });
  html += '</tr></thead><tbody>';

  // เป้าสะสม
  html += '<tr><td class="row-label">เป้าจ่ายสะสม (ลบ.)</td>';
  cumPlanned.forEach(v => { html += `<td>${v.toFixed(3)}</td>`; });
  html += '</tr>';

  // จ่ายจริงสะสม
  html += '<tr><td class="row-label">จ่ายจริงสะสม (ลบ.)</td>';
  cumActual.forEach((v, i) => {
    const show = i < globalData.lastUpdatedMonth;
    html += `<td>${show ? v.toFixed(3) : '—'}</td>`;
  });
  html += '</tr>';

  // ส่วนต่าง
  html += '<tr><td class="row-label">ส่วนต่าง (ลบ.)</td>';
  cumPlanned.forEach((v, i) => {
    const show = i < globalData.lastUpdatedMonth;
    if (!show) { html += '<td>—</td>'; return; }
    const diff = cumActual[i] - v;
    const cls  = diff < 0 ? 'behind' : 'ahead';
    html += `<td class="${cls}">${diff >= 0 ? '+' : ''}${diff.toFixed(3)}</td>`;
  });
  html += '</tr></tbody>';

  document.getElementById('project-monthly-table').innerHTML = html;
}

// ---- Loading state ----
function setLoading(on) {
  document.getElementById('last-updated').textContent = on ? 'กำลังโหลดข้อมูล...' : '';
}

// ---- Render all ----
function renderAll(data) {
  const summary = computeSummary(data);
  renderKPI(summary, data);
  renderDonut(summary.totalBudgetProject, summary.totalBudgetNormal);
  renderMainSCurve(data);
  renderSubChart('chart-project', data.projects, 'ลงทุนโครงการ');
  renderSubChart('chart-normal',  data.projects, 'ลงทุนปกติ');
  populateProjectSelect(data.projects);
}

// ---- Init ----
async function init() {
  setLoading(true);
  try {
    const data = await fetchSheetData();
    globalData = data;
    renderAll(data);
  } catch (err) {
    console.warn('โหลดข้อมูลไม่ได้:', err);
    document.getElementById('last-updated').textContent = '⚠ ไม่สามารถโหลดข้อมูลได้';
  }
}

document.addEventListener('DOMContentLoaded', init);
