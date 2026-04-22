// ====================================================
// CONFIG: ใส่ URL ของ Google Sheet ที่ publish เป็น CSV
// File > Share > Publish to web > เลือก tab > CSV > copy URL
// ====================================================
const SHEET_CONFIG = {
  // tab: กรอกรายงานงบประมาณ
  budget_url: '',
  // tab: กรอกเปอร์เซ็นงาน
  progress_url: '',
};

// ====================================================
// MOCK DATA — ใช้จนกว่าจะเชื่อม Google Sheet
// โครงสร้างตรงกับ Excel "เก็บข้อมูลค่าใช้จ่ายโครงการ กสฟ."
// ====================================================
const MOCK_DATA = {
  year: 2569,
  lastUpdatedMonth: 3, // มี.ค. = 3

  projects: [
    {
      id: 1,
      name: 'ค่าจ้างออกแบบศูนย์รักษาความปลอดภัยสถานีไฟฟ้า บางรักใหญ่',
      type: 'ลงทุนปกติ',
      budget: 0.430,
      wbs: 'P-6801',
      contract: 'สญ.6801-001',
      startDate: '01/01/2568',
      endDate: '31/12/2568',
      planned: [0.040, 0.040, 0.060, 0.060, 0.040, 0.040, 0.040, 0.040, 0.030, 0.020, 0.010, 0.010],
      actual:  [0.038, 0.040, 0.058, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
      progress:[10, 20, 30, null, null, null, null, null, null, null, null, null],
    },
    {
      id: 2,
      name: 'งานปรับปรุงระบบส่งน้ำประปาที่อาคารสถานีต้นทางยิ่งดล',
      type: 'ลงทุนปกติ',
      budget: 1.864,
      wbs: 'P-6802',
      contract: 'สญ.6802-001',
      startDate: '01/02/2568',
      endDate: '30/09/2568',
      planned: [0.000, 0.150, 0.200, 0.250, 0.300, 0.280, 0.250, 0.200, 0.184, 0.000, 0.000, 0.000],
      actual:  [0.000, 0.140, 0.195, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
      progress:[null, 8, 18, null, null, null, null, null, null, null, null, null],
    },
    {
      id: 3,
      name: 'คู่อคอนแทนเนอร์พร้อมดกแต่งภายในและระบบที่เกี่ยวข้อง สำหรับงานศูนย์สั่งการระบบไฟฟ้า',
      type: 'ลงทุนปกติ',
      budget: 2.000,
      wbs: 'P-6803',
      contract: 'สญ.6803-001',
      startDate: '01/01/2568',
      endDate: '31/10/2568',
      planned: [0.100, 0.150, 0.200, 0.250, 0.300, 0.280, 0.250, 0.200, 0.150, 0.120, 0.000, 0.000],
      actual:  [0.095, 0.145, 0.198, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
      progress:[5, 13, 23, null, null, null, null, null, null, null, null, null],
    },
    {
      id: 4,
      name: 'ถังเก็บน้ำ ขนาด 1,500 ลิตร',
      type: 'ลงทุนปกติ',
      budget: 0.495,
      wbs: 'P-6804',
      contract: 'สญ.6804-001',
      startDate: '01/01/2568',
      endDate: '30/06/2568',
      planned: [0.100, 0.100, 0.100, 0.100, 0.050, 0.045, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
      actual:  [0.098, 0.098, 0.097, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
      progress:[20, 40, 60, null, null, null, null, null, null, null, null, null],
    },
    {
      id: 5,
      name: 'โครงการปรับปรุงระบบจำหน่ายแรงสูง เขตนนทบุรี ระยะที่ 2',
      type: 'ลงทุนโครงการ',
      budget: 45.200,
      wbs: 'P-6901',
      contract: 'สญ.6901-001',
      startDate: '01/01/2569',
      endDate: '31/12/2569',
      planned: [2.500, 3.000, 4.000, 5.000, 5.500, 5.500, 5.000, 4.500, 4.000, 3.500, 2.200, 0.500],
      actual:  [2.400, 2.900, 3.850, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
      progress:[5, 12, 20, null, null, null, null, null, null, null, null, null],
    },
    {
      id: 6,
      name: 'โครงการก่อสร้างสถานีไฟฟ้าย่อยบางนา',
      type: 'ลงทุนโครงการ',
      budget: 68.500,
      wbs: 'P-6902',
      contract: 'สญ.6902-001',
      startDate: '01/01/2569',
      endDate: '31/12/2570',
      planned: [3.000, 4.000, 5.000, 6.000, 7.000, 7.000, 6.500, 6.000, 5.500, 5.000, 4.000, 3.500],
      actual:  [2.850, 3.900, 4.800, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
      progress:[4, 10, 17, null, null, null, null, null, null, null, null, null],
    },
    {
      id: 7,
      name: 'โครงการติดตั้งสายเคเบิลใต้ดิน ถนนพหลโยธิน',
      type: 'ลงทุนโครงการ',
      budget: 31.684,
      wbs: 'P-6903',
      contract: 'สญ.6903-001',
      startDate: '01/02/2569',
      endDate: '30/09/2569',
      planned: [0.000, 2.000, 3.500, 4.500, 5.500, 5.500, 5.000, 5.184, 0.000, 0.000, 0.000, 0.000],
      actual:  [0.000, 1.950, 3.400, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
      progress:[null, 6, 17, null, null, null, null, null, null, null, null, null],
    },
  ],
};

// คำนวณข้อมูลสรุปจาก MOCK_DATA
function computeSummary(data) {
  const months = data.lastUpdatedMonth;
  let totalPlannedAll = 0, totalActualAll = 0;
  let totalBudgetProject = 0, totalBudgetNormal = 0;

  data.projects.forEach(p => {
    const budget = p.budget;
    if (p.type === 'ลงทุนโครงการ') totalBudgetProject += budget;
    else totalBudgetNormal += budget;

    p.planned.forEach(v => totalPlannedAll += v);
    for (let i = 0; i < months; i++) totalActualAll += (p.actual[i] || 0);
  });

  // เป้าสะสมถึงเดือนปัจจุบัน
  let cumulativePlannedToNow = 0;
  data.projects.forEach(p => {
    for (let i = 0; i < months; i++) cumulativePlannedToNow += (p.planned[i] || 0);
  });

  return {
    totalBudget: totalBudgetProject + totalBudgetNormal,
    totalBudgetProject,
    totalBudgetNormal,
    totalActual: totalActualAll,
    behind: cumulativePlannedToNow - totalActualAll,
  };
}
