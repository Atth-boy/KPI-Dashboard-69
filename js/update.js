// ── Step definitions ─────────────────────────────────────────
const PROC_STEPS = [
  { id: 1, label: 'สร้าง/ประกาศแผน'   },
  { id: 2, label: 'ขอความเห็นชอบจ้าง'  },
  { id: 3, label: 'ขออนุมัติ TOR',      parallel: true },
  { id: 4, label: 'ขออนุมัติราคากลาง', parallel: true },
  { id: 5, label: 'รายงานขอจ้าง'      },
  { id: 6, label: 'พิจารณาผล/ประกาศ'  },
  { id: 7, label: 'ลงนามสัญญา'        },
];

const STATUS_LIST  = ['กำลังดำเนินการ', 'รออนุมัติ', 'เรียบร้อย'];
const STATUS_ICON  = { 'กำลังดำเนินการ': '●', 'รออนุมัติ': '⏳', 'เรียบร้อย': '✓' };
const STATUS_CLS   = {
  'กำลังดำเนินการ': 'sup-inprogress',
  'รออนุมัติ':       'sup-waiting',
  'เรียบร้อย':       'sup-done',
};

// ── State ────────────────────────────────────────────────────
let currentProject = null;
let stepData       = {};   // { stepId: { status, details, updatedAt } }
let activeStepId   = null;
let mgmtData       = { percent: '', details: '', updatedAt: '' };
let activeFilter   = 'all';  // 'all' | 'project' | 'purchase'

function matchesFilter(p) {
  if (activeFilter === 'project')  return (p.id >= 2 && p.id <= 14) || (p.id >= 26 && p.id <= 43);
  if (activeFilter === 'purchase') return p.id >= 15 && p.id <= 25;
  return true;
}

const THAI_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                     'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
function currentMonthLabel() {
  const d = new Date();
  return `${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

// ── Unlock rules ─────────────────────────────────────────────
function isUnlocked(id) {
  const done = n => stepData[n]?.status === 'เรียบร้อย';
  switch (id) {
    case 1: return true;
    case 2: return done(1);
    case 3: return done(2);
    case 4: return done(2);
    case 5: return done(3) && done(4);
    case 6: return done(5);
    case 7: return done(6);
    default: return false;
  }
}

function stepStateCls(id) {
  if (!isUnlocked(id)) return 'snode-locked';
  const s = stepData[id]?.status;
  if (s === 'เรียบร้อย')       return 'snode-done';
  if (s === 'กำลังดำเนินการ') return 'snode-inprogress';
  if (s === 'รออนุมัติ')       return 'snode-waiting';
  return 'snode-available';
}

function stepLabel(id) {
  if (!isUnlocked(id)) return 'ล็อก';
  return stepData[id]?.status || 'ยังไม่ดำเนินการ';
}

// ── Stepper render ───────────────────────────────────────────
function renderStepper() {
  const el  = document.getElementById('stepper');
  const done = n => stepData[n]?.status === 'เรียบร้อย';

  const node = (step) => {
    const cls     = stepStateCls(step.id);
    const lbl     = stepLabel(step.id);
    const active  = activeStepId === step.id ? ' snode-active' : '';
    const locked  = cls === 'snode-locked' || cls === 'snode-done';
    return `<div class="snode ${cls}${active}"
                 data-step="${step.id}"
                 role="${locked ? '' : 'button'}"
                 tabindex="${locked ? '-1' : '0'}"
                 aria-label="${step.label}: ${lbl}">
      <div class="snode-circle">${step.id}</div>
      <div class="snode-text">
        <div class="snode-name">${step.label}</div>
        <div class="snode-status">${lbl}</div>
      </div>
    </div>`;
  };

  const line = (active) =>
    `<div class="sconn${active ? ' sconn-on' : ''}"></div>`;

  const allParallelDone = done(3) && done(4);

  el.innerHTML = `
    ${node(PROC_STEPS[0])}
    ${line(done(1))}
    ${node(PROC_STEPS[1])}
    ${line(done(2))}

    <div class="sparallel">
      <div class="sparallel-label">ทำพร้อมกัน</div>
      <div class="sparallel-inner">
        ${node(PROC_STEPS[2])}
        <div class="sparallel-sep"></div>
        ${node(PROC_STEPS[3])}
      </div>
    </div>

    ${line(allParallelDone)}
    ${node(PROC_STEPS[4])}
    ${line(done(5))}
    ${node(PROC_STEPS[5])}
    ${line(done(6))}
    ${node(PROC_STEPS[6])}
    ${line(done(7))}

    <div class="snode ${done(7) ? (mgmtData.percent >= 100 ? 'snode-done snode-final-on' : 'snode-inprogress snode-final-on') : 'snode-locked'}"
         id="snode-final"
         ${done(7) ? 'role="button" tabindex="0"' : ''}>
      <div class="snode-circle">★</div>
      <div class="snode-text">
        <div class="snode-name">บริหารโครงการ</div>
        <div class="snode-status">${done(7) ? (mgmtData.percent >= 100 ? 'เรียบร้อย' : 'กำลังดำเนินการ') : 'ล็อก'}</div>
      </div>
    </div>
  `;

  // Bind click/keyboard on unlocked steps
  el.querySelectorAll('.snode[data-step]').forEach(n => {
    const id = parseInt(n.dataset.step);
    if (n.classList.contains('snode-locked') || n.classList.contains('snode-done')) return;
    n.addEventListener('click', () => openDetail(id));
    n.addEventListener('keydown', e => { if (e.key === 'Enter') openDetail(id); });
  });

  const finalNode = document.getElementById('snode-final');
  if (finalNode && done(7)) {
    finalNode.addEventListener('click', showMgmt);
    finalNode.addEventListener('keydown', e => { if (e.key === 'Enter') showMgmt(); });
  }

  document.getElementById('mgmt-card').style.display = done(7) ? '' : 'none';
}

// ── Detail panel ─────────────────────────────────────────────
function openDetail(stepId) {
  activeStepId = stepId;
  renderStepper();

  const step = PROC_STEPS.find(s => s.id === stepId);
  const data = stepData[stepId] || {};

  document.getElementById('detail-header').innerHTML =
    `<span class="up-detail-num">ขั้นที่ ${stepId}</span>${step.label}`;

  const optsEl = document.getElementById('status-options');
  optsEl.innerHTML = STATUS_LIST.map(opt => {
    const sel = data.status === opt ? ' sup-sel' : '';
    return `<button class="sup-btn ${STATUS_CLS[opt]}${sel}" data-status="${opt}">
      ${STATUS_ICON[opt]} ${opt}
    </button>`;
  }).join('');

  optsEl.querySelectorAll('.sup-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      optsEl.querySelectorAll('.sup-btn').forEach(b => b.classList.remove('sup-sel'));
      btn.classList.add('sup-sel');
    });
  });

  document.getElementById('step-notes').value = data.details || '';

  const savedAt = data.updatedAt || '';
  const statusEl = document.getElementById('save-status');
  statusEl.textContent = savedAt ? `บันทึกล่าสุด: ${savedAt}` : '';
  statusEl.className = 'up-save-status';

  const card = document.getElementById('step-detail-card');
  card.style.display = '';
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function findNextStep() {
  for (const step of PROC_STEPS) {
    if (isUnlocked(step.id) && stepData[step.id]?.status !== 'เรียบร้อย') return step.id;
  }
  return null;
}

function closeDetail() {
  activeStepId = null;
  document.getElementById('step-detail-card').style.display = 'none';
  renderStepper();
}

function showMgmt() {
  const el = document.getElementById('mgmt-card');
  el.style.display = '';
  renderMgmt();
  el.scrollIntoView({ behavior: 'smooth' });
}

function renderMgmt() {
  const pct     = mgmtData.percent !== '' ? mgmtData.percent : 0;
  const details = mgmtData.details  || '';
  const savedAt = mgmtData.updatedAt || '';

  document.getElementById('mgmt-body').innerHTML = `
    <div class="mgmt-month">เดือนปัจจุบัน: <strong>${currentMonthLabel()}</strong></div>

    <div class="up-field">
      <label class="up-field-label">% ความคืบหน้างาน</label>
      <div class="mgmt-pct-row">
        <input type="range" id="mgmt-slider" class="mgmt-slider" min="0" max="100" value="${pct}">
        <div class="mgmt-pct-box">
          <input type="number" id="mgmt-num" class="mgmt-num" min="0" max="100" value="${pct}">
          <span class="mgmt-pct-sign">%</span>
        </div>
      </div>
    </div>

    <div class="up-field">
      <label class="up-field-label">รายละเอียด / บันทึก</label>
      <textarea id="mgmt-notes" class="up-notes" rows="3"
        placeholder="ระบุรายละเอียดความคืบหน้า เช่น งานที่แล้วเสร็จ ปัญหาที่พบ...">${details}</textarea>
    </div>

    <div class="up-detail-actions">
      <button class="up-btn-save" id="mgmt-btn-save">บันทึก</button>
      <span class="up-save-status" id="mgmt-save-status">${savedAt ? 'บันทึกล่าสุด: ' + savedAt : ''}</span>
    </div>
  `;

  const slider = document.getElementById('mgmt-slider');
  const num    = document.getElementById('mgmt-num');
  slider.addEventListener('input', () => { num.value = slider.value; });
  num.addEventListener('input', () => {
    let v = Math.max(0, Math.min(100, parseInt(num.value) || 0));
    num.value = v;
    slider.value = v;
  });
  document.getElementById('mgmt-btn-save').addEventListener('click', saveMgmt);
}

async function saveMgmt() {
  const percent = Math.max(0, Math.min(100, parseInt(document.getElementById('mgmt-num').value) || 0));
  const details = document.getElementById('mgmt-notes').value.trim();
  const now     = new Date().toLocaleDateString('th-TH',
    { year: 'numeric', month: 'short', day: 'numeric' });

  const btn      = document.getElementById('mgmt-btn-save');
  const statusEl = document.getElementById('mgmt-save-status');
  btn.disabled   = true;
  btn.textContent = 'กำลังบันทึก...';

  mgmtData = { percent, details, updatedAt: now };

  try {
    await fetch(GAS_URL, {
      method:  'POST',
      mode:    'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body:    JSON.stringify({
        action:  'saveProcurementStatus',
        project: currentProject,
        step:    'บริหารโครงการ',
        status:  `${percent}%`,
        details,
      }),
    });
    statusEl.textContent = `บันทึกแล้ว: ${now}`;
    statusEl.className   = 'up-save-status up-save-ok';
  } catch {
    statusEl.textContent = `บันทึก local แล้ว (GAS ยังไม่รองรับ POST)`;
    statusEl.className   = 'up-save-status up-save-warn';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'บันทึก';
    renderStepper();
  }
}

// ── Save ─────────────────────────────────────────────────────
async function saveStep() {
  const selBtn = document.querySelector('#status-options .sup-btn.sup-sel');
  if (!selBtn) {
    alert('กรุณาเลือกสถานะก่อนบันทึก');
    return;
  }

  const status  = selBtn.dataset.status;
  const details = document.getElementById('step-notes').value.trim();
  const now     = new Date().toLocaleDateString('th-TH',
    { year: 'numeric', month: 'short', day: 'numeric' });

  const btn      = document.getElementById('btn-save');
  const statusEl = document.getElementById('save-status');
  btn.disabled   = true;
  btn.textContent = 'กำลังบันทึก...';

  // Optimistic local update
  if (!stepData[activeStepId]) stepData[activeStepId] = {};
  stepData[activeStepId].status    = status;
  stepData[activeStepId].details   = details;
  stepData[activeStepId].updatedAt = now;

  try {
    // POST to GAS — ต้องเพิ่ม doPost ใน GAS script ก่อนใช้งานได้จริง
    await fetch(GAS_URL, {
      method:  'POST',
      mode:    'no-cors',          // GAS redirect workaround
      headers: { 'Content-Type': 'text/plain' },
      body:    JSON.stringify({
        action:  'saveProcurementStatus',
        project: currentProject,
        step:    activeStepId,
        status,
        details,
      }),
    });
    statusEl.textContent = `บันทึกแล้ว: ${now}`;
    statusEl.className   = 'up-save-status up-save-ok';
  } catch {
    statusEl.textContent = `บันทึก local แล้ว (GAS ยังไม่รองรับ POST)`;
    statusEl.className   = 'up-save-status up-save-warn';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'บันทึก';
  }

  renderStepper();
  if (status === 'เรียบร้อย') {
    const nextId = findNextStep();
    if (nextId) openDetail(nextId);
    else { closeDetail(); showMgmt(); }
  } else {
    openDetail(activeStepId);
  }
}

// ── Load & project list ───────────────────────────────────────
let _allProjects = [];

function renderProjectList() {
  const listEl  = document.getElementById('project-list');
  const q       = document.getElementById('project-search').value.trim().toLowerCase();
  const filtered = _allProjects.filter(p => matchesFilter(p) && (!q || p.name.toLowerCase().includes(q)));

  if (!filtered.length) {
    listEl.innerHTML = '<div class="project-list-empty">ไม่พบโครงการ</div>';
    return;
  }
  listEl.innerHTML = '';
  filtered.forEach(p => {
    const item = document.createElement('div');
    item.className = 'project-list-item' +
      (p.name === currentProject ? ' active' : '') +
      (p.procComplete ? ' proc-complete' : '');
    item.textContent = p.name;
    item.addEventListener('click', () => selectProject(p.name));
    listEl.appendChild(item);
  });
}

async function selectProject(name) {
  currentProject = name;
  activeStepId   = null;

  // re-render list เพื่อ highlight item ที่เลือก (list ยังคงเปิดอยู่)
  renderProjectList();

  document.getElementById('workflow-section').style.display = '';
  document.getElementById('step-detail-card').style.display = 'none';
  document.getElementById('up-project-context').textContent = name;

  await loadProjectStatus(name);
  renderStepper();

  const nextId = findNextStep();
  if (nextId) openDetail(nextId);
  else if (stepData[7]?.status === 'เรียบร้อย') showMgmt();
}

async function loadProjects() {
  const listEl    = document.getElementById('project-list');
  const searchEl  = document.getElementById('project-search');
  const toggleBtn = document.getElementById('toggle-list-btn');
  const errEl     = document.getElementById('up-load-err');

  listEl.innerHTML = '<div class="project-list-empty">กำลังโหลด...</div>';

  try {
    const data  = await fetchSheetData();
    _allProjects = data.projects;
    renderProjectList();
    searchEl.addEventListener('input', renderProjectList);

    // Filter buttons
    document.querySelectorAll('.up-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.filter;
        document.querySelectorAll('.up-filter-btn').forEach(b => b.classList.remove('up-filter-active'));
        btn.classList.add('up-filter-active');
        renderProjectList();
      });
    });

  } catch (e) {
    listEl.innerHTML = '<div class="project-list-empty">โหลดไม่สำเร็จ — ตรวจสอบ GAS URL</div>';
    errEl.textContent = String(e);
    errEl.style.display = '';
  }

  toggleBtn.addEventListener('click', () => {
    const hidden = listEl.classList.toggle('hidden');
    toggleBtn.textContent = hidden ? '▼' : '▲';
  });
}

async function loadProjectStatus(projectName) {
  stepData = {};
  mgmtData = { percent: '', details: '', updatedAt: '' };
  const loading = document.getElementById('up-loading');
  loading.style.display = '';
  try {
    const url = `${GAS_URL}?action=getProcurementStatus&project=${encodeURIComponent(projectName)}`;
    const res  = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.steps)) {
        json.steps.forEach(s => {
          if (s.step === 'บริหารโครงการ') {
            mgmtData = {
              percent:   parseMgmtPct(s.status),
              details:   s.details  || '',
              updatedAt: s.updatedAt || '',
            };
          } else {
            stepData[s.step] = { status: s.status, details: s.details, updatedAt: s.updatedAt };
          }
        });
      }
    }
  } catch {
    // GAS อาจยังไม่รองรับ action นี้ — เริ่มด้วย state ว่างเปล่า
  } finally {
    loading.style.display = 'none';
  }
}

function escHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Sheets เก็บ % cell เป็น decimal (1.0 = 100%, 0.9 = 90%) — handle ทั้ง decimal และ string "XX%"
function parseMgmtPct(v) {
  if (typeof v === 'string' && v.includes('%')) return Math.round(parseFloat(v)) || 0;
  const n = parseFloat(v) || 0;
  return n > 1 ? Math.round(n) : Math.round(n * 100);
}

// ── Init ─────────────────────────────────────────────────────
async function init() {
  await loadProjects();
  document.getElementById('btn-save').addEventListener('click', saveStep);
  document.getElementById('btn-cancel').addEventListener('click', closeDetail);
}

init();
