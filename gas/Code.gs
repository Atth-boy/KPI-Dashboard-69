var BUDGET_SHEET   = 'กรอกรายการงบประมาณ';
var PLANNED_SHEET  = 'งบประมาณ เป้า-จ่ายจริง';
var DETAIL_SHEET   = 'รายละเอียดโครงการ'; // col A = ชื่อโครงการ, col D = ประเภทงบ (ประจำปี/ผูกดำ/ผูกจ่าย)
var SPREADSHEET_ID = '12tNI9JBrwubtRPmL9xFjKt_ncehe7NNF2EkOlBYKSkk';
var FISCAL_YEAR_BE = 2569;
var FISCAL_YEAR_CE = FISCAL_YEAR_BE - 543;  // 2026

function doGet(e) {
  var data = buildData();
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function buildData() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  var budgetRows  = getSheetValues(ss, BUDGET_SHEET);
  var plannedRows = getSheetValues(ss, PLANNED_SHEET);

  // อ่าน budgetCategory จาก tab รายละเอียดโครงการ (col A = ชื่อ, col D = ประเภทงบ)
  var detailRows  = getSheetValues(ss, DETAIL_SHEET);
  var categoryMap = {};
  for (var di = 1; di < detailRows.length; di++) {
    var dr   = detailRows[di];
    var dKey = String(dr[1] || '').trim(); // col B = หมายเลขโครงการ
    var dCat = String(dr[3] || '').trim(); // col D = ประเภทงบ
    if (dKey) categoryMap[dKey] = dCat;
  }

  // ---- อ่านข้อมูลจาก planned sheet (Power BI style) ----
  var monthlyMap = {};  // key = projNo, value = { planned:[12], actual:[12] }
  var monthDays  = {}; // cal index → วันที่จาก col C (เก็บไว้แสดง "ณ วันที่ XX")

  plannedRows.forEach(function(r, idx) {
    if (idx === 0) return;                   // ข้าม header
    var pNo     = String(r[1] || '').trim(); // col B: หมายเลขโครงการ
    var dateVal = r[2];                      // col C: Date object จาก Sheets
    var plan    = toFloat(r[3]);             // col D: เป้าจ่าย (ลบ.)
    var act     = toFloat(r[4]);             // col E: จ่ายจริง (ลบ.)

    if (!pNo || !(dateVal instanceof Date)) return;

    // ใช้ calendar month index ตรงๆ (ม.ค.=0, ก.พ.=1, ..., ธ.ค.=11)
    var cal = dateVal.getMonth();           // 0-based: Jan=0 ... Dec=11
    var yr  = dateVal.getFullYear();
    if (yr !== FISCAL_YEAR_CE) return;     // เอาเฉพาะปี ค.ศ. นี้ (2026)

    if (!monthlyMap[pNo]) {
      monthlyMap[pNo] = { planned: Array(12).fill(0), actual: Array(12).fill(0) };
    }
    monthlyMap[pNo].planned[cal] += plan;
    monthlyMap[pNo].actual[cal]  += act;
    monthDays[cal] = dateVal.getDate(); // เก็บวันที่ของเดือนนี้
  });

  // ---- ประกอบโครงการ ----
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
      // ---- ใช้ข้อมูลจาก planned sheet ----
      actual  = pData.actual;
      planned = pData.planned;
    } else {
      // ---- fallback: อ่าน actual จาก budget sheet cols H-S (index 7-18) ----
      // cols เก็บยอดจ่ายสะสม (บาท) เรียง ม.ค.-ธ.ค. (calendar year)
      // ต้องแปลงเป็น fiscal month order (index 0=ต.ค., ..., 11=ก.ย.)
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

    // หาเดือนล่าสุดที่มีข้อมูล
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
      endDate:        formatDateBE(r[6]) || '—'
    });
  }

  return {
    year:             FISCAL_YEAR_BE,
    lastUpdatedMonth: lastUpdatedMonth || 1,
    lastUpdatedDay:   monthDays[(lastUpdatedMonth || 1) - 1] || 0,
    projects:         projects
  };
}

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
