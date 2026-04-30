var BUDGET_SHEET   = 'กรอกรายการงบประมาณ';
var PLANNED_SHEET  = 'งบประมาณ เป้า-จ่ายจริง';
var DETAIL_SHEET   = 'รายละเอียดโครงการ';
var PROCURE_SHEET  = 'สถานะกระบวนการจัดจ้าง';   // ← tab ใหม่ (สร้างอัตโนมัติ)
var SPREADSHEET_ID = '12tNI9JBrwubtRPmL9xFjKt_ncehe7NNF2EkOlBYKSkk';
var FISCAL_YEAR_BE = 2569;
var FISCAL_YEAR_CE = FISCAL_YEAR_BE - 543;  // 2026

// ════════════════════════════════════════════════════════════
//  doGet  —  GET requests (dashboard data + procurement status)
// ════════════════════════════════════════════════════════════
function doGet(e) {
  var action = e && e.parameter ? e.parameter.action : '';

  if (action === 'getProcurementStatus') {
    var project = (e.parameter.project || '').trim();
    var result  = getProcurementStatus(project);
    return jsonResponse(result);
  }

  // default: dashboard data (หน้าหลัก index.html / page2.html)
  return jsonResponse(buildData());
}

// ════════════════════════════════════════════════════════════
//  doPost  —  POST requests (บันทึกสถานะ / % งาน)
// ════════════════════════════════════════════════════════════
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    if (body.action === 'saveProcurementStatus') {
      saveProcurementStatus(
        String(body.project || '').trim(),
        String(body.step    || '').trim(),
        String(body.status  || '').trim(),
        String(body.details || '').trim()
      );
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ ok: false, error: 'unknown action' });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

// ════════════════════════════════════════════════════════════
//  Procurement functions
// ════════════════════════════════════════════════════════════

// อ่านสถานะทุกขั้นตอนของโครงการที่เลือก
function getProcurementStatus(projectName) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = getOrCreateProcureSheet(ss);
  var rows  = sheet.getDataRange().getValues();
  var steps = [];

  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (String(r[0] || '').trim() !== projectName) continue;
    steps.push({
      step:      r[1],                          // ขั้นที่ (1-7 หรือ "บริหารโครงการ")
      status:    String(r[2] || '').trim(),
      details:   String(r[3] || '').trim(),
      updatedAt: String(r[4] || '').trim()
    });
  }

  return { steps: steps };
}

// บันทึก / อัพเดทสถานะขั้นตอน (upsert: หาแถวที่มีอยู่ก่อน ถ้าไม่มีค่อย append)
function saveProcurementStatus(projectName, step, status, details) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = getOrCreateProcureSheet(ss);
  var rows  = sheet.getDataRange().getValues();
  var now   = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm');

  for (var i = 1; i < rows.length; i++) {
    var proj = String(rows[i][0] || '').trim();
    var stp  = String(rows[i][1] || '').trim();
    if (proj === projectName && stp === step) {
      // อัพเดทแถวเดิม (col C=สถานะ, D=รายละเอียด, E=วันที่)
      sheet.getRange(i + 1, 3, 1, 3).setValues([[status, details, now]]);
      return;
    }
  }

  // ไม่มีแถวเดิม → เพิ่มแถวใหม่
  sheet.appendRow([projectName, step, status, details, now]);
}

// สร้าง tab ถ้ายังไม่มี (พร้อม header + freeze row)
function getOrCreateProcureSheet(ss) {
  var sheet = ss.getSheetByName(PROCURE_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(PROCURE_SHEET);
    var headers = [['ชื่อโครงการ', 'ขั้นที่', 'สถานะ', 'รายละเอียด', 'วันที่อัพเดท']];
    sheet.getRange(1, 1, 1, 5).setValues(headers).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 200);
    sheet.setColumnWidth(4, 280);
  }
  return sheet;
}

// ════════════════════════════════════════════════════════════
//  Dashboard data (ไม่เปลี่ยน)
// ════════════════════════════════════════════════════════════
function buildData() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  var budgetRows  = getSheetValues(ss, BUDGET_SHEET);
  var plannedRows = getSheetValues(ss, PLANNED_SHEET);

  var detailRows  = getSheetValues(ss, DETAIL_SHEET);
  var categoryMap = {};
  for (var di = 1; di < detailRows.length; di++) {
    var dr   = detailRows[di];
    var dKey = String(dr[1] || '').trim();
    var dCat = String(dr[3] || '').trim();
    if (dKey) categoryMap[dKey] = dCat;
  }

  var monthlyMap = {};
  var monthDays  = {};

  plannedRows.forEach(function(r, idx) {
    if (idx === 0) return;
    var pNo     = String(r[1] || '').trim();
    var dateVal = r[2];
    var plan    = toFloat(r[3]);
    var act     = toFloat(r[4]);

    if (!pNo || !(dateVal instanceof Date)) return;

    var cal = dateVal.getMonth();
    var yr  = dateVal.getFullYear();
    if (yr !== FISCAL_YEAR_CE) return;

    if (!monthlyMap[pNo]) {
      monthlyMap[pNo] = { planned: Array(12).fill(0), actual: Array(12).fill(0) };
    }
    monthlyMap[pNo].planned[cal] += plan;
    monthlyMap[pNo].actual[cal]  += act;
    monthDays[cal] = dateVal.getDate();
  });

  // อ่าน procurement sheet ครั้งเดียว — หา project ที่บริหารโครงการ = 100%
  var completedSet = {};
  var procSheet = ss.getSheetByName(PROCURE_SHEET);
  if (procSheet) {
    var procRows = procSheet.getDataRange().getValues();
    for (var pi = 1; pi < procRows.length; pi++) {
      var pr = procRows[pi];
      var mgmtPct = (typeof pr[2] === 'number')
        ? Math.round(pr[2] * 100)
        : parseInt(String(pr[2] || ''));
      if (String(pr[1] || '').trim() === 'บริหารโครงการ' && mgmtPct >= 100) {
        completedSet[String(pr[0] || '').trim()] = true;
      }
    }
  }

  var projects = [];
  var lastUpdatedMonth = 0;

  for (var i = 1; i < budgetRows.length; i++) {
    var r    = budgetRows[i];
    var name = String(r[0] || '').trim();
    if (!name) continue;

    var projNo = String(r[1] || '').trim();
    var wbs    = String(r[2] || '').trim();
    var budget = toFloat(r[3]);

    var pData = monthlyMap[projNo];
    var hasPlannedData = pData && pData.actual.some(function(v) { return v > 0; });

    var actual, planned;

    if (hasPlannedData) {
      actual  = pData.actual;
      planned = pData.planned;
    } else {
      var calCum = [];
      for (var m = 0; m < 12; m++) calCum.push(toFloat(r[7 + m]));

      actual = Array(12).fill(0);
      for (var cal = 0; cal < 12; cal++) {
        var inc = calCum[cal] - (cal > 0 ? calCum[cal - 1] : 0);
        if (inc < 0) inc = 0;
        actual[cal] = Math.round(inc / 1000000 * 1e6) / 1e6;
      }
      planned = pData ? pData.planned : Array(12).fill(0);
    }

    for (var m = 11; m >= 0; m--) {
      if (actual[m] > 0) {
        lastUpdatedMonth = Math.max(lastUpdatedMonth, m + 1);
        break;
      }
    }

    projects.push({
      id:             i,
      name:           name,
      type:           wbs.startsWith('I/') ? 'ลงทุนโครงการ' : 'ลงทุนปกติ',
      budgetCategory: categoryMap[projNo] || '',
      budget:         budget,
      wbs:            wbs,
      projNo:         projNo,
      actual:         actual,
      planned:        planned,
      contract:       String(r[4] || '').trim() || '—',
      startDate:      formatDateBE(r[5]) || '—',
      endDate:        formatDateBE(r[6]) || '—',
      procComplete:   completedSet[name] || false
    });
  }

  return {
    year:             FISCAL_YEAR_BE,
    lastUpdatedMonth: lastUpdatedMonth || 1,
    lastUpdatedDay:   monthDays[(lastUpdatedMonth || 1) - 1] || 0,
    projects:         projects
  };
}

// ════════════════════════════════════════════════════════════
//  Utilities
// ════════════════════════════════════════════════════════════
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheetValues(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) { Logger.log('Sheet not found: ' + name); return [[]]; }
  return sheet.getDataRange().getValues();
}

function toFloat(v) {
  if (v === '' || v === null || v === undefined) return 0;
  return typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, '')) || 0;
}

function formatDateBE(v) {
  if (!v || !(v instanceof Date)) return String(v || '').trim();
  return pad(v.getDate()) + '/' + pad(v.getMonth() + 1) + '/' + (v.getFullYear() + 543);
}

function pad(n) { return String(n).padStart(2, '0'); }

// ---- ฟังก์ชันทดสอบ: รันใน Apps Script แล้วดู Log ----
function testData() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  Logger.log('Sheets: ' + ss.getSheets().map(function(s){ return s.getName(); }).join(', '));

  var rows = getSheetValues(ss, PLANNED_SHEET);
  Logger.log('Planned rows: ' + rows.length);
  rows.slice(0, 5).forEach(function(r, i) {
    Logger.log('row ' + i + ': colB=' + r[1] + ' colC=' + r[2] + ' colD=' + r[3] + ' colE=' + r[4]);
  });
}

function testProcure() {
  // ทดสอบ save แล้ว read กลับ
  saveProcurementStatus('ทดสอบโครงการ', '1', 'เรียบร้อย', 'ทดสอบ save function');
  var result = getProcurementStatus('ทดสอบโครงการ');
  Logger.log(JSON.stringify(result));
}

function testProcComplete() {
  var ss        = SpreadsheetApp.openById(SPREADSHEET_ID);
  var procSheet = ss.getSheetByName(PROCURE_SHEET);
  if (!procSheet) { Logger.log('ไม่พบ sheet: ' + PROCURE_SHEET); return; }

  var rows = procSheet.getDataRange().getValues();
  Logger.log('จำนวนแถวใน ' + PROCURE_SHEET + ': ' + (rows.length - 1));

  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    Logger.log('แถว ' + i + ' | ชื่อ="' + r[0] + '" | ขั้น="' + r[1] + '" | สถานะ="' + r[2] + '"');
    if (String(r[1]).trim() === 'บริหารโครงการ') {
      var match = String(r[2]).trim() === '100%';
      Logger.log('  → พบ บริหารโครงการ | 100% match = ' + match);
    }
  }
}
