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
  p2GlobalData = data;
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

  p2_populateProjectSelect(data.projects);

  // แสดงวันที่อัปเดตล่าสุด
  const m  = data.lastUpdatedMonth || 1;
  const ce = (data.year || 2569) - 543;
  const lastDay = new Date(ce, m, 0).getDate();
  // last-updated2 ถูกเอาออกจาก UI แล้ว
}

// ── Project detail card ───────────────────────────────────────
let p2GlobalData   = null;
let p2ActiveFilter = 'all';
let p2_renderListFn = null;

function p2_projectDiff(p) {
  const m = p2GlobalData?.lastUpdatedMonth;
  if (!m) return 0;
  let planned = 0, actual = 0;
  for (let i = 0; i < m; i++) {
    planned += (p.planned[i] || 0);
    actual  += (p.actual[i]  || 0);
  }
  return actual - planned;
}

function p2_populateProjectSelect(projects) {
  const listEl   = document.getElementById('p2-project-list');
  const searchEl = document.getElementById('p2-project-search');
  let activeId   = null;

  function renderList() {
    const q = searchEl.value.trim().toLowerCase();
    let filtered = q ? projects.filter(p => p.name.toLowerCase().includes(q)) : [...projects];
    if (p2ActiveFilter !== 'all') {
      filtered = filtered.filter(p => p.budgetCategory && p.budgetCategory.includes(p2ActiveFilter));
    }

    listEl.innerHTML = '';
    if (!filtered.length) {
      listEl.innerHTML = '<div class="project-list-empty">ไม่พบโครงการ</div>';
      return;
    }
    filtered.forEach(p => {
      const diff = p2_projectDiff(p);
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
        p2_renderProjectDetail(p);
        p2_loadAndRenderProcurement(p.name);
        p2_renderMonthlyTable(p);
        if (window.innerWidth > 540) {
          document.getElementById('p2-project-detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
      listEl.appendChild(item);
    });
  }

  p2_renderListFn = renderList;
  renderList();
  searchEl.addEventListener('input', renderList);
}

function p2_renderProjectDetail(p) {
  const el = document.getElementById('p2-project-detail');
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

function p2_renderMonthlyTable(p) {
  const wrap = document.getElementById('p2-project-table-wrap');
  wrap.classList.remove('hidden');

  const cumPlanned = cumul2(p.planned);
  const cumActual  = cumul2(p.actual);
  const lum = p2GlobalData?.lastUpdatedMonth || 0;
  const dec = window.innerWidth <= 540 ? 2 : 3;

  function buildTable(indices) {
    let html = '<thead><tr><th>รายการ</th>';
    indices.forEach(i => { html += `<th>${MONTHS_TH2[i]}</th>`; });
    html += '</tr></thead><tbody>';

    html += '<tr><td class="row-label">เป้าสะสม</td>';
    indices.forEach(i => { html += `<td>${cumPlanned[i].toFixed(dec)}</td>`; });
    html += '</tr>';

    html += '<tr><td class="row-label">จ่ายจริง</td>';
    indices.forEach(i => {
      html += `<td>${i < lum ? cumActual[i].toFixed(dec) : '—'}</td>`;
    });
    html += '</tr>';

    html += '<tr><td class="row-label">ส่วนต่าง</td>';
    indices.forEach(i => {
      if (i >= lum) { html += '<td>—</td>'; return; }
      const diff = cumActual[i] - cumPlanned[i];
      html += `<td class="${diff < 0 ? 'behind' : 'ahead'}">${diff >= 0 ? '+' : ''}${diff.toFixed(dec)}</td>`;
    });
    html += '</tr></tbody>';
    return html;
  }

  // PC table (12 เดือน)
  let full = '<thead><tr><th>รายการ</th>';
  MONTHS_TH2.forEach(m => { full += `<th>${m}</th>`; });
  full += '</tr></thead><tbody>';
  full += '<tr><td class="row-label">เป้าสะสม (ลบ.)</td>';
  cumPlanned.forEach(v => { full += `<td>${v.toFixed(3)}</td>`; });
  full += '</tr><tr><td class="row-label">จ่ายจริงสะสม (ลบ.)</td>';
  cumActual.forEach((v, i) => { full += `<td>${i < lum ? v.toFixed(3) : '—'}</td>`; });
  full += '</tr><tr><td class="row-label">ส่วนต่าง (ลบ.)</td>';
  cumPlanned.forEach((v, i) => {
    if (i >= lum) { full += '<td>—</td>'; return; }
    const diff = cumActual[i] - v;
    full += `<td class="${diff < 0 ? 'behind' : 'ahead'}">${diff >= 0 ? '+' : ''}${diff.toFixed(3)}</td>`;
  });
  full += '</tr></tbody>';
  document.getElementById('p2-project-monthly-table').innerHTML = full;

  // Mobile swipe
  document.getElementById('p2-project-monthly-table-1').innerHTML = buildTable([0,1,2,3,4,5]);
  document.getElementById('p2-project-monthly-table-2').innerHTML = buildTable([6,7,8,9,10,11]);

  const swipe = document.getElementById('p2-table-swipe');
  const dots  = document.querySelectorAll('#p2-project-table-wrap .swipe-dot');
  dots.forEach((d, i) => {
    d.addEventListener('click', () => { swipe.scrollTo({ left: i * swipe.offsetWidth, behavior: 'smooth' }); });
  });
  swipe.onscroll = () => {
    const idx = Math.round(swipe.scrollLeft / swipe.offsetWidth);
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
  };
}

// ── Procurement card (page2) ──────────────────────────────────
const P2_PROC_STEP_NAMES = [
  { id: 1, label: 'สร้าง/ประกาศแผน' },
  { id: 2, label: 'ขอความเห็นชอบ' },
  { id: 3, label: 'ขออนุมัติ TOR',     parallel: true },
  { id: 4, label: 'ขออนุมัติราคากลาง', parallel: true },
  { id: 5, label: 'รายงานขอจ้าง' },
  { id: 6, label: 'พิจารณาผล' },
  { id: 7, label: 'ลงนามสัญญา' },
];

function p2_esc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function p2_procCls(id, sd) {
  const done = n => sd[n]?.status === 'เรียบร้อย';
  const ok = id === 1 ? true : id === 2 ? done(1) : id === 3 ? done(2)
           : id === 4 ? done(2) : id === 5 ? done(3) && done(4)
           : id === 6 ? done(5) : id === 7 ? done(6) : false;
  if (!ok) return 'snode-locked';
  const s = sd[id]?.status;
  if (s === 'เรียบร้อย')       return 'snode-done';
  if (s === 'กำลังดำเนินการ') return 'snode-inprogress';
  if (s === 'รออนุมัติ')       return 'snode-waiting';
  return 'snode-available';
}

function p2_renderProcCard(stepData, mgmtData) {
  const done  = n => stepData[n]?.status === 'เรียบร้อย';
  const mnode = step => {
    const cls = p2_procCls(step.id, stepData);
    return `<div class="proc-mnode ${cls}">
      <div class="proc-mnode-circle">${cls === 'snode-done' ? '✓' : step.id}</div>
      <div class="proc-mnode-label">${p2_esc(step.label)}</div>
    </div>`;
  };
  const mconn = on => `<div class="proc-mconn${on ? ' proc-mconn-on' : ''}"></div>`;

  document.getElementById('p2-proc-stepper-mini').innerHTML = `
    <div class="proc-mini">
      ${mnode(P2_PROC_STEP_NAMES[0])}${mconn(done(1))}
      ${mnode(P2_PROC_STEP_NAMES[1])}${mconn(done(2))}
      <div class="proc-mparallel">
        <div class="proc-mparallel-label">ทำพร้อมกัน</div>
        <div class="proc-mparallel-inner">
          ${mnode(P2_PROC_STEP_NAMES[2])}${mnode(P2_PROC_STEP_NAMES[3])}
        </div>
      </div>
      ${mconn(done(3) && done(4))}
      ${mnode(P2_PROC_STEP_NAMES[4])}${mconn(done(5))}
      ${mnode(P2_PROC_STEP_NAMES[5])}${mconn(done(6))}
      ${mnode(P2_PROC_STEP_NAMES[6])}
    </div>`;

  const latestEl  = document.getElementById('p2-proc-latest-wrap');
  const STATE_CLS = { 'กำลังดำเนินการ': 'state-inprogress', 'รออนุมัติ': 'state-waiting', 'เรียบร้อย': 'state-done' };

  let latest = null;
  for (let id = 7; id >= 1; id--) {
    if (stepData[id]?.status) { latest = { step: P2_PROC_STEP_NAMES[id - 1], data: stepData[id] }; break; }
  }

  if (mgmtData?.updatedAt) {
    latestEl.innerHTML = `
      <div class="proc-latest state-done">
        <div class="proc-latest-header">
          <span class="proc-latest-step">บริหารโครงการ</span>
          <span class="proc-status-pill state-done">${mgmtData.percent || 0}% ความคืบหน้า</span>
        </div>
        ${mgmtData.details ? `<div class="proc-latest-notes">${p2_esc(mgmtData.details)}</div>` : ''}
        ${mgmtData.updatedAt ? `<div class="proc-latest-time">อัพเดต: ${p2_esc(mgmtData.updatedAt)}</div>` : ''}
      </div>`;
  } else if (latest) {
    const { step, data } = latest;
    const sCls = STATE_CLS[data.status] || '';
    latestEl.innerHTML = `
      <div class="proc-latest ${sCls}">
        <div class="proc-latest-header">
          <span class="proc-latest-step">ขั้นที่ ${step.id} — ${p2_esc(step.label)}</span>
          <span class="proc-status-pill ${sCls}">${p2_esc(data.status)}</span>
        </div>
        ${data.details ? `<div class="proc-latest-notes">${p2_esc(data.details)}</div>` : ''}
        ${data.updatedAt ? `<div class="proc-latest-time">อัพเดต: ${p2_esc(data.updatedAt)}</div>` : ''}
      </div>`;
  } else {
    latestEl.innerHTML = '<div class="proc-no-data">ยังไม่มีข้อมูลขั้นตอนการจัดจ้าง</div>';
  }
}

async function p2_loadAndRenderProcurement(projectName) {
  const section = document.getElementById('p2-proc-section');
  section.classList.remove('hidden');
  document.getElementById('p2-proc-stepper-mini').innerHTML =
    '<div class="proc-loading">กำลังโหลดสถานะ...</div>';
  document.getElementById('p2-proc-latest-wrap').innerHTML = '';

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
  } catch { /* GAS อาจยังไม่รองรับ */ }

  p2_renderProcCard(stepData, mgmtData);
}

async function init2() {
  try {
    const data = await fetchSheetData();
    renderAll2(data);
  } catch (err) {
    console.warn('โหลดข้อมูลไม่ได้:', err);
    console.warn('⚠ ไม่สามารถโหลดข้อมูลได้');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  init2();

  // Toggle project list
  const p2ListEl    = document.getElementById('p2-project-list');
  const p2ToggleBtn = document.getElementById('p2-toggle-list-btn');
  if (p2ListEl && p2ToggleBtn) {
    p2ToggleBtn.addEventListener('click', () => {
      const hidden = p2ListEl.classList.toggle('hidden');
      p2ToggleBtn.textContent = hidden ? '▼' : '▲';
    });
  }

  // Category filter buttons
  const p2FilterBtns = document.querySelectorAll('#p2-filter-row .filter-btn');
  p2FilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      p2ActiveFilter = btn.dataset.filter;
      p2FilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (p2_renderListFn) p2_renderListFn();
    });
  });
});
