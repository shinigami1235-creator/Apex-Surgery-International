/* The six Apex procedures with their recovery facts, shared by My Plan, the trip planner and the consultation form.
   Every fact comes from the client's own service pages (see BRIEF.md, "Recovery facts").
   Day windows count from the surgery day (day 0). A month is counted as 30 days for planning.
     at:    the milestone falls between day a and day b
     until: the rule holds until somewhere between day a and day b
     rest:  this milestone marks the end of the rest period, used by the trip planner's fly-home rule */

export const PROC_KEYS = ['facelift', 'browlift', 'rhinoplasty', 'eyelid', 'breast', 'lipo'];

export const PROCS = {
  facelift: {
    name: { en: 'Facelift', th: 'ดึงหน้า' },
    facts: [
      { en: 'Light activity after about 2 to 3 weeks.', th: 'กลับไปทำกิจกรรมที่ไม่ใช้แรงมากได้ในประมาณ 2 ถึง 3 สัปดาห์', at: [14, 21], rest: true },
      { en: 'No strenuous exercise for 4 to 6 weeks.', th: 'งดออกกำลังกายหนัก 4 ถึง 6 สัปดาห์', until: [28, 42] },
      { en: 'Results last about 7 to 10 years.', th: 'ผลลัพธ์อยู่ได้ประมาณ 7 ถึง 10 ปี' }
    ]
  },
  browlift: {
    name: { en: 'Brow lift', th: 'ยกคิ้ว' },
    facts: [
      { en: 'Initial recovery takes 7 to 14 days.', th: 'พักฟื้นเบื้องต้นประมาณ 7 ถึง 14 วัน', until: [7, 14], rest: true },
      { en: 'No strenuous exercise for 4 to 6 weeks.', th: 'งดออกกำลังกายหนัก 4 ถึง 6 สัปดาห์', until: [28, 42] },
      { en: 'Final shape at 3 to 6 months.', th: 'รูปทรงคิ้วเข้าที่ใน 3 ถึง 6 เดือน', at: [90, 180] },
      { en: 'Results last about 5 to 10 years.', th: 'ผลลัพธ์อยู่ได้ประมาณ 5 ถึง 10 ปี' }
    ]
  },
  rhinoplasty: {
    name: { en: 'Rhinoplasty', th: 'เสริมจมูก' },
    facts: [
      { en: 'Rest for at least 7 to 14 days.', th: 'พักฟื้นอย่างน้อย 7 ถึง 14 วัน', until: [7, 14], rest: true },
      { en: 'Soft food for 1 to 2 weeks.', th: 'รับประทานอาหารอ่อน 1 ถึง 2 สัปดาห์', until: [7, 14] },
      { en: 'Swelling eases at around 2 weeks.', th: 'อาการบวมเริ่มลดลงในประมาณ 2 สัปดาห์', at: [14, 14] },
      { en: 'Shape settles in 1 to 3 months.', th: 'รูปทรงจมูกเข้าที่ใน 1 ถึง 3 เดือน', at: [30, 90] },
      { en: 'Full result at 3 to 6 months.', th: 'เห็นผลลัพธ์ชัดเจนใน 3 ถึง 6 เดือน', at: [90, 180] }
    ]
  },
  eyelid: {
    name: { en: 'Double eyelid surgery', th: 'ทำตาสองชั้น' },
    facts: [
      { en: 'Swelling eases in 7 to 14 days.', th: 'อาการบวมช้ำลดลงใน 7 ถึง 14 วัน', at: [7, 14], rest: true },
      { en: 'No alcohol for 1 month.', th: 'งดเครื่องดื่มแอลกอฮอล์อย่างน้อย 1 เดือน', until: [30, 30] },
      { en: 'Final shape at 3 to 6 months.', th: 'ชั้นตาเข้าที่ใน 3 ถึง 6 เดือน', at: [90, 180] }
    ]
  },
  breast: {
    name: { en: 'Breast augmentation', th: 'เสริมหน้าอก' },
    facts: [
      { en: 'Soreness for 3 to 7 days.', th: 'ปวดตึงประมาณ 3 ถึง 7 วันแรก', until: [3, 7] },
      { en: 'Take 5 to 7 days off work.', th: 'ลางานพักฟื้นประมาณ 5 ถึง 7 วัน', until: [5, 7], rest: true },
      { en: 'Exercise after about 1 to 2 months.', th: 'ออกกำลังกายได้หลังประมาณ 1 ถึง 2 เดือน', at: [30, 60] }
    ]
  },
  lipo: {
    name: { en: 'Liposuction', th: 'ดูดไขมัน' },
    facts: [
      { en: 'Wear the compression garment 24 hours a day for the first month.', th: 'ใส่ชุดกระชับตลอด 24 ชั่วโมงในเดือนแรก', until: [30, 30] },
      { en: 'Wear it in the daytime for 1 to 2 more months.', th: 'ใส่ชุดกระชับช่วงกลางวันต่ออีก 1 ถึง 2 เดือน', until: [60, 90] },
      { en: 'Driving after 3 to 7 days.', th: 'ขับรถได้หลัง 3 ถึง 7 วัน', at: [3, 7], rest: true },
      { en: 'Results settle in 3 to 6 months.', th: 'ผลลัพธ์เข้าที่ใน 3 ถึง 6 เดือน', at: [90, 180] }
    ]
  }
};

/* Body map areas and concerns (copied from features/bodymap so the plan can name them in both languages). */
export const AREAS = {
  breast: { en: 'Breast', th: 'หน้าอก' },
  abdomen: { en: 'Abdomen', th: 'หน้าท้อง' },
  arms: { en: 'Upper arms', th: 'ต้นแขน' },
  waistback: { en: 'Waist and back', th: 'เอวและปีกหลัง' },
  hips: { en: 'Hips and buttocks', th: 'สะโพกและบั้นท้าย' },
  thighs: { en: 'Thighs', th: 'ต้นขา' },
  calves: { en: 'Calves', th: 'น่อง' },
  facelift: { en: 'Face and neck', th: 'ใบหน้าและลำคอ' },
  brows: { en: 'Forehead and brows', th: 'หน้าผากและคิ้ว' },
  eyes: { en: 'Eyes', th: 'ดวงตา' },
  nose: { en: 'Nose', th: 'จมูก' },
  chin: { en: 'Chin and jaw', th: 'เหนียงและกรอบหน้า' }
};

const CONCERN_TH = {
  'Small breasts': 'หน้าอกเล็กโดยกำเนิด', 'Uneven breasts': 'หน้าอกสองข้างไม่เท่ากัน',
  'Volume loss after pregnancy or weight loss': 'หน้าอกหย่อนคล้อยหลังมีบุตรหรือลดน้ำหนัก',
  'Upper belly fat': 'ไขมันหน้าท้องส่วนบน', 'Lower belly fat': 'ไขมันหน้าท้องส่วนล่าง',
  'Fat that stays after diet and exercise': 'ไขมันที่ไม่ลดแม้ควบคุมอาหารและออกกำลังกาย',
  'Large upper arms': 'ต้นแขนใหญ่', 'Loose, flabby upper arms': 'แขนย้วย',
  'Love handles': 'ไขมันห่วงยางรอบเอว', 'Bra-line fat': 'ไขมันปลิ้นช่วงขอบเสื้อชั้นใน',
  'Wide hips': 'สะโพกผายเกินสัดส่วน', 'Buttock shape': 'รูปทรงบั้นท้าย',
  'Inner thighs that rub': 'ต้นขาด้านในเบียดกัน', 'Outer thigh fat': 'ไขมันต้นขาด้านนอก',
  'Large calves from fat': 'น่องใหญ่จากไขมันสะสม',
  'Sagging cheeks': 'แก้มหย่อนคล้อย', 'Deep smile lines': 'ร่องน้ำหมากลึก',
  'Jowls and a blurred jawline': 'กรอบหน้าหย่อน ไม่ชัดเหมือนเก่า', 'Loose neck skin': 'ผิวลำคอหย่อนคล้อย',
  'Low or heavy brows': 'คิ้วตก', 'Deep forehead lines': 'ริ้วรอยลึกบริเวณหน้าผาก', 'Sagging forehead skin': 'ผิวหน้าผากหย่อนคล้อย',
  'Single eyelids': 'ตาชั้นเดียว', 'Hooded upper lids': 'ตาสองชั้นหลบใน', 'Uneven eyelid folds': 'ชั้นตาสองข้างไม่เท่ากัน',
  'Heavy, puffy upper lids': 'เปลือกตาหนา อูม จากไขมันสะสม', 'Drooping lids with age': 'หนังตาตกตามวัย',
  'Low bridge': 'จมูกแบน สันจมูกน้อย', 'Short or bulbous tip': 'ปลายจมูกสั้นทู่ หรือปลายจมูกชมพู่',
  'Hump or crooked nose': 'จมูกเบี้ยวคด หรือมีฮัมพ์', 'Wide nostrils': 'ปีกจมูกกว้างหรือบาน',
  'Problems from a previous nose surgery': 'ปัญหาจากจมูกที่เคยเสริมมาแล้ว',
  'Fat under the chin': 'ไขมันใต้คาง', 'Undefined jawline': 'กรอบหน้าไม่คมชัด'
};

export const t = (o, lang) => o == null ? '' : typeof o === 'string' ? o : (o[lang] ?? o.en ?? '');
export const procName = (k, lang) => PROCS[k] ? t(PROCS[k].name, lang) : String(k || '');
export const areaName = (k, lang) => AREAS[k] ? t(AREAS[k], lang) : (k ? String(k) : '');
export const concernName = (c, lang) => !c ? '' : lang === 'th' && CONCERN_TH[c] ? CONCERN_TH[c] : String(c);

/* Branch labels. Address and phone come from data/<lang>/shared.js (branches[].key). */
export const BRANCHES = {
  ploenchit: { en: 'Phloen Chit, Bangkok', th: 'เพลินจิต กรุงเทพฯ' },
  phuket: { en: 'Phuket', th: 'ภูเก็ต' }
};
export const BRANCH_KEYS = ['ploenchit', 'phuket'];
