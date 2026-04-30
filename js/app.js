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
  document.getElementById('last-updated').textContent = 'อัพเดต: ' + monthLabel;

  // วันที่มาจาก col C ของ planned sheet (ถ้าไม่มีให้ใช้วันสุดท้ายของเดือน)
  const ceYear  = data.year - 543;
  const lastDay = data.lastUpdatedDay || new Date(ceYear, data.lastUpdatedMonth, 0).getDate();
  const dayLabel = `ณ วันที่ ${lastDay} ${MONTHS_TH[data.lastUpdatedMonth - 1]} ${data.year}`;

  // สถานะการจ่าย (ปัจจุบัน)
  const diff    = summary.totalActual - summary.plannedToNow;
  const diffCls = diff >= 0 ? 'ahead' : 'behind';
  const diffTxt = (diff >= 0 ? '+' : '') + diff.toFixed(3);

  document.getElementById('status-month').textContent   = dayLabel;
  document.getElementById('status-planned').textContent = summary.plannedToNow.toFixed(3);
  document.getElementById('status-actual').textContent  = summary.totalActual.toFixed(3);

  const diffEl = document.getElementById('status-diff');
  diffEl.textContent = diffTxt;
  diffEl.className   = 'status-val ' + diffCls;
}

// ---- Project list ----
let activeFilter = 'all';
let _renderList  = null; // เรียกจาก DOMContentLoaded ได้

function populateProjectSelect(projects) {
  const list   = document.getElementById('project-list');
  const search = document.getElementById('project-search');
  let activeId = null;

  function projectDiff(p) {
    const m = globalData.lastUpdatedMonth;
    if (!m) return 0;
    let planned = 0, actual = 0;
    for (let i = 0; i < m; i++) {
      planned += (p.planned[i] || 0);
      actual  += (p.actual[i]  || 0);
    }
    return actual - planned;
  }

  function renderList() {
    const q = search.value.trim().toLowerCase();
    let filtered = q ? projects.filter(p => p.name.toLowerCase().includes(q)) : [...projects];
    if (activeFilter === 'behind') filtered = filtered.filter(p => projectDiff(p) < 0);
    if (activeFilter === 'ahead')  filtered = filtered.filter(p => projectDiff(p) >= 0);

    list.innerHTML = '';
    if (!filtered.length) {
      list.innerHTML = '<div class="project-list-empty">ไม่พบโครงการ</div>';
      return;
    }
    filtered.forEach(p => {
      const diff = projectDiff(p);
      const item = document.createElement('div');
      item.className = 'project-list-item' + (p.id === activeId ? ' active' : '');
      item.dataset.id = p.id;

      const nameSpan = document.createElement('span');
      nameSpan.textContent = p.name;

      const badge = document.createElement('span');
      badge.className = 'project-diff-badge ' + (diff < 0 ? 'badge-behind' : 'badge-ahead');
      badge.textContent = (diff >= 0 ? '+' : '') + diff.toFixed(2);

      item.appendChild(nameSpan);
      item.appendChild(badge);
      item.addEventListener('click', () => {
        activeId = p.id;
        renderList();
        renderProjectDetail(p);
        loadAndRenderProcurement(p.name);
        renderMonthlyTable(p);
        if (window.innerWidth > 540) {
          document.getElementById('project-detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
      list.appendChild(item);
    });
  }

  _renderList = renderList;
  renderList();
  search.addEventListener('input', renderList);
}

function renderProjectDetail(p) {
  const el = document.getElementById('project-detail');
  el.classList.remove('hidden');
  el.innerHTML = `
    <div class="detail-project-name">${p.name}</div>
    <div class="detail-item">
      <div class="detail-label">ประเภท</div>
      <div class="detail-value">${p.type}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">งบ (ลบ.)</div>
      <div class="detail-value">${p.budget.toFixed(3)}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">เลข WBS</div>
      <div class="detail-value">${p.wbs}</div>
    </div>
    <div class="detail-contract-row">
      <div class="detail-item">
        <div class="detail-label">เลขที่สัญญา</div>
        <div class="detail-value">${p.contract}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">วันเริ่มสัญญา</div>
        <div class="detail-value">${p.startDate}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">วันสิ้นสุดสัญญา</div>
        <div class="detail-value">${p.endDate}</div>
      </div>
    </div>
  `;
}

function renderMonthlyTable(p) {
  const wrap = document.getElementById('project-table-wrap');
  wrap.classList.remove('hidden');

  const cumPlanned = cumulative(p.planned);
  const cumActual  = cumulative(p.actual);

  const dec = window.innerWidth <= 540 ? 2 : 3;

  function buildTable(indices) {
    let html = '<thead><tr><th>รายการ</th>';
    indices.forEach(i => { html += `<th>${MONTHS_TH[i]}</th>`; });
    html += '</tr></thead><tbody>';

    html += '<tr><td class="row-label">เป้าสะสม</td>';
    indices.forEach(i => { html += `<td>${cumPlanned[i].toFixed(dec)}</td>`; });
    html += '</tr>';

    html += '<tr><td class="row-label">จ่ายจริง</td>';
    indices.forEach(i => {
      const show = i < globalData.lastUpdatedMonth;
      html += `<td>${show ? cumActual[i].toFixed(dec) : '—'}</td>`;
    });
    html += '</tr>';

    html += '<tr><td class="row-label">ส่วนต่าง</td>';
    indices.forEach(i => {
      const show = i < globalData.lastUpdatedMonth;
      if (!show) { html += '<td>—</td>'; return; }
      const diff = cumActual[i] - cumPlanned[i];
      const cls  = diff < 0 ? 'behind' : 'ahead';
      html += `<td class="${cls}">${diff >= 0 ? '+' : ''}${diff.toFixed(dec)}</td>`;
    });
    html += '</tr></tbody>';
    return html;
  }

  // PC: ตารางเต็ม
  let fullHtml = '<thead><tr><th>รายการ</th>';
  MONTHS_TH.forEach(m => { fullHtml += `<th>${m}</th>`; });
  fullHtml += '</tr></thead><tbody>';
  fullHtml += '<tr><td class="row-label">เป้าสะสม (ลบ.)</td>';
  cumPlanned.forEach(v => { fullHtml += `<td>${v.toFixed(3)}</td>`; });
  fullHtml += '</tr>';
  fullHtml += '<tr><td class="row-label">จ่ายจริงสะสม (ลบ.)</td>';
  cumActual.forEach((v, i) => {
    const show = i < globalData.lastUpdatedMonth;
    fullHtml += `<td>${show ? v.toFixed(3) : '—'}</td>`;
  });
  fullHtml += '</tr>';
  fullHtml += '<tr><td class="row-label">ส่วนต่าง (ลบ.)</td>';
  cumPlanned.forEach((v, i) => {
    const show = i < globalData.lastUpdatedMonth;
    if (!show) { fullHtml += '<td>—</td>'; return; }
    const diff = cumActual[i] - v;
    const cls  = diff < 0 ? 'behind' : 'ahead';
    fullHtml += `<td class="${cls}">${diff >= 0 ? '+' : ''}${diff.toFixed(3)}</td>`;
  });
  fullHtml += '</tr></tbody>';
  document.getElementById('project-monthly-table').innerHTML = fullHtml;

  // Mobile: swipe
  document.getElementById('project-monthly-table-1').innerHTML = buildTable([0,1,2,3,4,5]);
  document.getElementById('project-monthly-table-2').innerHTML = buildTable([6,7,8,9,10,11]);

  // dots — เลื่อนได้และกดได้
  const swipe = document.getElementById('table-swipe');
  const dots  = document.querySelectorAll('.swipe-dot');
  dots.forEach((d, i) => {
    d.addEventListener('click', () => {
      swipe.scrollTo({ left: i * swipe.offsetWidth, behavior: 'smooth' });
    });
  });
  swipe.onscroll = () => {
    const idx = Math.round(swipe.scrollLeft / swipe.offsetWidth);
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  };
}

// ---- Ranking card ----
function renderRanking(projects, lastUpdatedMonth) {
  const diffs = projects.map(p => {
    let actual = 0, planned = 0;
    for (let i = 0; i < lastUpdatedMonth; i++) {
      actual  += (p.actual[i]  || 0);
      planned += (p.planned[i] || 0);
    }
    return { name: p.name, diff: +(actual - planned).toFixed(3) };
  });

  const good   = diffs.filter(p => p.diff > 0).sort((a, b) => b.diff - a.diff).slice(0, 3);
  const behind = diffs.filter(p => p.diff < 0).sort((a, b) => a.diff - b.diff).slice(0, 3);

  const toHTML = (list, cls, sign) => list.length
    ? list.map((p, i) => `
        <li class="ranking-item">
          <span class="ranking-rank">${i + 1}.</span>
          <span class="ranking-name">${p.name}</span>
          <span class="ranking-diff ${cls}">${sign}${Math.abs(p.diff).toFixed(3)} ลบ.</span>
        </li>`).join('')
    : '<li class="ranking-item"><span class="ranking-name" style="color:var(--gray-400)">ไม่มีข้อมูล</span></li>';

  document.getElementById('ranking-good').innerHTML   = toHTML(good,   'good',   '+');
  document.getElementById('ranking-behind').innerHTML = toHTML(behind, 'behind', '-');
}

// ── Procurement card (read-only) ─────────────────────────────
const PROC_STEP_NAMES = [
  { id: 1, label: 'สร้าง/ประกาศแผน' },
  { id: 2, label: 'ขอความเห็นชอบ' },
  { id: 3, label: 'ขออนุมัติ TOR',     parallel: true },
  { id: 4, label: 'ขออนุมัติราคากลาง', parallel: true },
  { id: 5, label: 'รายงานขอจ้าง' },
  { id: 6, label: 'พิจารณาผล' },
  { id: 7, label: 'ลงนามสัญญา' },
];

function escHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function procStepCls(id, sd) {
  const done = n => sd[n]?.status === 'เรียบร้อย';
  const ok = id === 1 ? true
           : id === 2 ? done(1)
           : id === 3 ? done(2)
           : id === 4 ? done(2)
           : id === 5 ? done(3) && done(4)
           : id === 6 ? done(5)
           : id === 7 ? done(6) : false;
  if (!ok) return 'snode-locked';
  const s = sd[id]?.status;
  if (s === 'เรียบร้อย')       return 'snode-done';
  if (s === 'กำลังดำเนินการ') return 'snode-inprogress';
  if (s === 'รออนุมัติ')       return 'snode-waiting';
  return 'snode-available';
}

function renderProcCard(stepData, mgmtData) {
  const done  = n => stepData[n]?.status === 'เรียบร้อย';
  const mnode = step => {
    const cls  = procStepCls(step.id, stepData);
    const icon = cls === 'snode-done' ? '✓' : step.id;
    return `<div class="proc-mnode ${cls}">
      <div class="proc-mnode-circle">${icon}</div>
      <div class="proc-mnode-label">${escHtml(step.label)}</div>
    </div>`;
  };
  const mconn = on => `<div class="proc-mconn${on ? ' proc-mconn-on' : ''}"></div>`;

  document.getElementById('proc-stepper-mini').innerHTML = `
    <div class="proc-mini">
      ${mnode(PROC_STEP_NAMES[0])}
      ${mconn(done(1))}
      ${mnode(PROC_STEP_NAMES[1])}
      ${mconn(done(2))}
      <div class="proc-mparallel">
        <div class="proc-mparallel-label">ทำพร้อมกัน</div>
        <div class="proc-mparallel-inner">
          ${mnode(PROC_STEP_NAMES[2])}
          ${mnode(PROC_STEP_NAMES[3])}
        </div>
      </div>
      ${mconn(done(3) && done(4))}
      ${mnode(PROC_STEP_NAMES[4])}
      ${mconn(done(5))}
      ${mnode(PROC_STEP_NAMES[5])}
      ${mconn(done(6))}
      ${mnode(PROC_STEP_NAMES[6])}
    </div>`;

  const latestEl = document.getElementById('proc-latest-wrap');
  const STATE_CLS = {
    'กำลังดำเนินการ': 'state-inprogress',
    'รออนุมัติ':       'state-waiting',
    'เรียบร้อย':       'state-done',
  };

  let latest = null;
  for (let id = 7; id >= 1; id--) {
    if (stepData[id]?.status) { latest = { step: PROC_STEP_NAMES[id - 1], data: stepData[id] }; break; }
  }

  // mgmtData (บริหารโครงการ) แสดงก่อนเสมอเมื่อถึงขั้นนั้น เพราะเป็นสถานะล่าสุดของโครงการ
  if (mgmtData?.updatedAt) {
    latestEl.innerHTML = `
      <div class="proc-latest state-done">
        <div class="proc-latest-header">
          <span class="proc-latest-step">บริหารโครงการ</span>
          <span class="proc-status-pill state-done">${mgmtData.percent || 0}% ความคืบหน้า</span>
        </div>
        ${mgmtData.details ? `<div class="proc-latest-notes">${escHtml(mgmtData.details)}</div>` : ''}
        ${mgmtData.updatedAt ? `<div class="proc-latest-time">อัพเดต: ${escHtml(mgmtData.updatedAt)}</div>` : ''}
      </div>`;
  } else if (latest) {
    const { step, data } = latest;
    const sCls = STATE_CLS[data.status] || '';
    latestEl.innerHTML = `
      <div class="proc-latest ${sCls}">
        <div class="proc-latest-header">
          <span class="proc-latest-step">ขั้นที่ ${step.id} — ${escHtml(step.label)}</span>
          <span class="proc-status-pill ${sCls}">${escHtml(data.status)}</span>
        </div>
        ${data.details ? `<div class="proc-latest-notes">${escHtml(data.details)}</div>` : ''}
        ${data.updatedAt ? `<div class="proc-latest-time">อัพเดต: ${escHtml(data.updatedAt)}</div>` : ''}
      </div>`;
  } else {
    latestEl.innerHTML = '<div class="proc-no-data">ยังไม่มีข้อมูลขั้นตอนการจัดจ้าง</div>';
  }
}

async function loadAndRenderProcurement(projectName) {
  const section = document.getElementById('proc-section');
  section.classList.remove('hidden');
  document.getElementById('proc-stepper-mini').innerHTML =
    '<div class="proc-loading">กำลังโหลดสถานะ...</div>';
  document.getElementById('proc-latest-wrap').innerHTML = '';

  let stepData = {}, mgmtData = {};
  try {
    const url = `${GAS_URL}?action=getProcurementStatus&project=${encodeURIComponent(projectName)}`;
    const res  = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      (json.steps || []).forEach(s => {
        if (s.step === 'บริหารโครงการ') {
          mgmtData = { percent: parseInt(s.status) || 0, details: s.details, updatedAt: s.updatedAt };
        } else {
          stepData[s.step] = { status: s.status, details: s.details, updatedAt: s.updatedAt };
        }
      });
    }
  } catch { /* GAS อาจยังไม่รองรับ action นี้ */ }

  renderProcCard(stepData, mgmtData);
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
  renderRanking(data.projects, data.lastUpdatedMonth);
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

document.addEventListener('DOMContentLoaded', () => {
  // toggle list
  const list = document.getElementById('project-list');
  const btn  = document.getElementById('toggle-list-btn');
  if (list && btn) {
    btn.addEventListener('click', () => {
      const hidden = list.classList.toggle('hidden');
      btn.textContent = hidden ? '▼' : '▲';
    });
  }

  // filter buttons — ผูกทันทีไม่รอข้อมูล
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter;
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (_renderList) _renderList();
    });
  });

  init();
});
