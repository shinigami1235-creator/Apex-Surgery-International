/* The seven Apex procedures with their recovery facts, shared by My Plan, the trip planner and the consultation form.
   Every fact comes from the client's own service pages (see BRIEF.md, "Recovery facts").
   Day windows count from the surgery day (day 0). A month is counted as 30 days for planning.
     at:    the milestone falls between day a and day b
     until: the rule holds until somewhere between day a and day b
     rest:  this milestone marks the end of the rest period, used by the trip planner's fly-home rule */

export const PROC_KEYS = ['facelift', 'browlift', 'rhinoplasty', 'eyelid', 'bone', 'breast', 'lipo'];

export const PROCS = {
  facelift: {
    name: { en: 'Facelift', th: 'ดึงหน้า', zh: '面部提升术' },
    facts: [
      { en: 'Light office work after about 4 to 7 days.', th: 'กลับไปทำงานออฟฟิศเบา ๆ ได้ในประมาณ 4 ถึง 7 วัน', zh: '约 4 至 7 天后可进行轻度办公工作。', at: [4, 7], rest: true },
      { en: 'No strenuous exercise for 3 to 4 weeks.', th: 'งดออกกำลังกายหนัก 3 ถึง 4 สัปดาห์', zh: '3 至 4 周内避免剧烈运动。', until: [21, 28] },
      { en: 'A deep plane facelift lasts about 7 to 12 years.', th: 'ดึงหน้าแบบ Deep Plane อยู่ได้ประมาณ 7 ถึง 12 ปี', zh: '深层面部提升术的效果可维持约 7 至 12 年。' }
    ]
  },
  browlift: {
    name: { en: 'Brow lift', th: 'ยกคิ้ว', zh: '提眉术' },
    facts: [
      { en: 'Initial recovery takes 7 to 14 days.', th: 'พักฟื้นเบื้องต้นประมาณ 7 ถึง 14 วัน', zh: '初期恢复需要 7 至 14 天。', until: [7, 14], rest: true },
      { en: 'No strenuous exercise for 4 to 6 weeks.', th: 'งดออกกำลังกายหนัก 4 ถึง 6 สัปดาห์', zh: '4 至 6 周内避免剧烈运动。', until: [28, 42] },
      { en: 'Final shape at 3 to 6 months.', th: 'รูปทรงคิ้วเข้าที่ใน 3 ถึง 6 เดือน', zh: '3 至 6 个月后形态定型。', at: [90, 180] },
      { en: 'Results last about 5 to 10 years.', th: 'ผลลัพธ์อยู่ได้ประมาณ 5 ถึง 10 ปี', zh: '效果可维持约 5 至 10 年。' }
    ]
  },
  rhinoplasty: {
    name: { en: 'Rhinoplasty', th: 'เสริมจมูก', zh: '鼻整形术' },
    facts: [
      { en: 'Rest for at least 7 to 14 days.', th: 'พักฟื้นอย่างน้อย 7 ถึง 14 วัน', zh: '至少休息 7 至 14 天。', until: [7, 14], rest: true },
      { en: 'Soft food for 1 to 2 weeks.', th: 'รับประทานอาหารอ่อน 1 ถึง 2 สัปดาห์', zh: '1 至 2 周内吃软食。', until: [7, 14] },
      { en: 'Swelling eases at around 2 weeks.', th: 'อาการบวมเริ่มลดลงในประมาณ 2 สัปดาห์', zh: '约 2 周后肿胀减轻。', at: [14, 14] },
      { en: 'Shape settles in 1 to 3 months.', th: 'รูปทรงจมูกเข้าที่ใน 1 ถึง 3 เดือน', zh: '1 至 3 个月后形态稳定。', at: [30, 90] },
      { en: 'No glasses or heavy exercise for 2 to 3 weeks.', th: 'งดสวมแว่นและออกกำลังกายหนัก 2 ถึง 3 สัปดาห์', zh: '2 至 3 周内不戴眼镜，不做剧烈运动。', until: [14, 21] },
      { en: 'Result clearly visible at 3 to 6 months.', th: 'เห็นผลลัพธ์ชัดเจนใน 3 ถึง 6 เดือน', zh: '3 至 6 个月后效果明显可见。', at: [90, 180] },
      { en: 'Fully settled at 6 to 12 months.', th: 'รูปจมูกเข้าที่สมบูรณ์ใน 6 ถึง 12 เดือน', zh: '6 至 12 个月后完全稳定。', at: [180, 365] }
    ]
  },
  eyelid: {
    name: { en: 'Double eyelid surgery', th: 'ทำตาสองชั้น', zh: '双眼皮手术' },
    facts: [
      { en: 'Swelling eases in 7 to 14 days.', th: 'อาการบวมช้ำลดลงใน 7 ถึง 14 วัน', zh: '肿胀在 7 至 14 天内减轻。', at: [7, 14], rest: true },
      { en: 'No alcohol or smoking for at least 2 weeks.', th: 'งดเครื่องดื่มแอลกอฮอล์และบุหรี่อย่างน้อย 2 สัปดาห์', zh: '至少 2 周内不饮酒、不吸烟。', until: [14, 14] },
      { en: 'Final shape at 3 to 6 months.', th: 'ชั้นตาเข้าที่ใน 3 ถึง 6 เดือน', zh: '3 至 6 个月后形态定型。', at: [90, 180] }
    ]
  },
  breast: {
    name: { en: 'Breast augmentation', th: 'เสริมหน้าอก', zh: '隆胸术' },
    facts: [
      { en: 'Soreness for 3 to 7 days.', th: 'ปวดตึงประมาณ 3 ถึง 7 วันแรก', zh: '酸痛持续 3 至 7 天。', until: [3, 7] },
      { en: 'Back to light work in weeks 2 to 4.', th: 'กลับไปทำงานที่ไม่ใช้แรงได้ในสัปดาห์ที่ 2 ถึง 4', zh: '第 2 至 4 周可恢复轻度工作。', at: [14, 28], rest: true },
      { en: 'Exercise after about 1 to 2 months.', th: 'ออกกำลังกายได้หลังประมาณ 1 ถึง 2 เดือน', zh: '约 1 至 2 个月后可恢复运动。', at: [30, 60] }
    ]
  },
  bone: {
    name: { en: 'Facial bone surgery', th: 'ศัลยกรรมโครงหน้า', zh: '面部轮廓手术' },
    facts: [
      { en: 'Swelling and bruising ease over 1 to 2 weeks.', th: 'อาการบวมช้ำลดลงใน 1 ถึง 2 สัปดาห์', zh: '肿胀和淤青在 1 至 2 周内减轻。', at: [7, 14] },
      { en: 'Back to work in weeks 2 to 4.', th: 'กลับไปทำงานได้ในสัปดาห์ที่ 2 ถึง 4', zh: '第 2 至 4 周可恢复工作。', at: [14, 28], rest: true },
      { en: 'Soft food for up to 4 weeks after jaw surgery.', th: 'อาหารอ่อนนานถึง 4 สัปดาห์หลังผ่าตัดขากรรไกร', zh: '下颌手术后最长 4 周内吃软食。', until: [14, 28] },
      { en: 'The face outline shows more clearly at 1 to 3 months.', th: 'กรอบหน้าเห็นชัดขึ้นใน 1 ถึง 3 เดือน', zh: '1 至 3 个月后面部轮廓更清晰。', at: [30, 90] },
      { en: 'The face settles at about 3 to 6 months.', th: 'โครงหน้าเข้าที่ในประมาณ 3 ถึง 6 เดือน', zh: '约 3 至 6 个月后面部定型。', at: [90, 180] }
    ]
  },
  lipo: {
    name: { en: 'Liposuction', th: 'ดูดไขมัน', zh: '吸脂术' },
    facts: [
      { en: 'Wear the compression garment 22 to 24 hours a day in week 1.', th: 'ใส่ชุดกระชับวันละ 22 ถึง 24 ชั่วโมงในสัปดาห์แรก', zh: '第 1 周每天穿戴压缩衣 22 至 24 小时。', until: [7, 7] },
      { en: 'Then 12 to 18 hours a day in weeks 2 to 4.', th: 'จากนั้นวันละ 12 ถึง 18 ชั่วโมงในสัปดาห์ที่ 2 ถึง 4', zh: '第 2 至 4 周每天穿戴 12 至 18 小时。', until: [28, 28] },
      { en: 'Driving after 3 to 7 days.', th: 'ขับรถได้หลัง 3 ถึง 7 วัน', zh: '3 至 7 天后可以开车。', at: [3, 7], rest: true },
      { en: 'Results settle in 3 to 6 months.', th: 'ผลลัพธ์เข้าที่ใน 3 ถึง 6 เดือน', zh: '3 至 6 个月后效果稳定。', at: [90, 180] }
    ]
  }
};

/* Body map areas and concerns (copied from features/bodymap so the plan can name them in both languages). */
export const AREAS = {
  breast: { en: 'Breast', th: 'หน้าอก', zh: '胸部' },
  abdomen: { en: 'Abdomen', th: 'หน้าท้อง', zh: '腹部' },
  arms: { en: 'Upper arms', th: 'ต้นแขน', zh: '上臂' },
  waistback: { en: 'Waist and back', th: 'เอวและปีกหลัง', zh: '腰背部' },
  hips: { en: 'Hips and buttocks', th: 'สะโพกและบั้นท้าย', zh: '髋部和臀部' },
  thighs: { en: 'Thighs', th: 'ต้นขา', zh: '大腿' },
  calves: { en: 'Calves', th: 'น่อง', zh: '小腿' },
  facelift: { en: 'Face and neck', th: 'ใบหน้าและลำคอ', zh: '面部和颈部' },
  brows: { en: 'Forehead and brows', th: 'หน้าผากและคิ้ว', zh: '额头和眉部' },
  eyes: { en: 'Eyes', th: 'ดวงตา', zh: '眼部' },
  nose: { en: 'Nose', th: 'จมูก', zh: '鼻部' },
  chin: { en: 'Chin and jaw', th: 'เหนียงและกรอบหน้า', zh: '下巴和下颌' }
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
  ploenchit: { en: 'Phloen Chit, Bangkok', th: 'เพลินจิต กรุงเทพฯ', zh: '曼谷奔集分院' },
  phuket: { en: 'Phuket', th: 'ภูเก็ต', zh: '普吉' }
};
export const BRANCH_KEYS = ['ploenchit', 'phuket'];

/* WhatsApp and LINE for the send buttons. The site passes the numbers set in WordPress as opts.contact;
   these are only used when a tool runs on its own, as on the lab pages. */
export const contactOf = o => Object.assign({ wa: '66886241617', waX: '+66 88 624 1617', line: '@apexsurgery' }, o && o.contact);

/* ---------- small DOM and data helpers the plan, trip, consultation and stories modules share ---------- */
export function injectCSS(id, css) {
  if (document.getElementById(id)) return;
  const s = document.createElement('style'); s.id = id; s.textContent = css; document.head.append(s);
}
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  kids.flat(Infinity).forEach(c => { if (c != null && c !== false) el.append(c.nodeType ? c : String(c)); });
  return el;
}
export const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? ''));

/* ---------- data files (data/<lang>/<file>.js assign APEX._d[id]) ---------- */
const dataCache = {};
export function loadData(base, lang, id) {
  const ck = lang + '|' + id;
  if (dataCache[ck]) return dataCache[ck];
  const file = id.includes(':') ? id.replace(':', '/') : id;
  const P = window.APEX || {};
  if (P._d && P._d[id] && (P.lang || lang) === lang) return Promise.resolve(JSON.parse(JSON.stringify(P._d[id])));
  const one = l => new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = P.dataUrl ? `${P.dataUrl}${l}/${file}` : `${base}data/${l}/${file}.js`;
    s.onload = () => { s.remove(); const d = window.APEX && APEX._d && APEX._d[id]; d ? res(JSON.parse(JSON.stringify(d))) : rej(new Error('empty ' + id)); };
    s.onerror = () => { s.remove(); rej(new Error('missing ' + s.src)); };
    document.head.append(s);
  });
  dataCache[ck] = one(lang).catch(e => (lang !== 'th' ? one('th') : Promise.reject(e)));
  dataCache[ck].catch(() => { delete dataCache[ck]; });
  return dataCache[ck];
}

/* A procedure Apex adds later as a service in WordPress joins My Plan, the trip planner, the consultation form and
   the review videos here: its name from the services list, its recovery timeline as plain facts. With no day
   windows the trip planner uses the service's "Stay in Thailand after surgery" days. */
export function addServices(services) {
  (services || []).forEach(s => {
    if (!s || !s.key || PROCS[s.key]) return;
    const nm = s.short || s.name || s.key;
    PROCS[s.key] = { name: { en: nm, th: nm }, facts: (s.recovery || []).map(r => { const x = [r.w, r.x].filter(Boolean).join(': '); return { en: x, th: x }; }) };
    PROC_KEYS.push(s.key);
  });
}
/* a branch Apex adds under Branches joins the branch choices the same way */
export function addBranches(branches) {
  (branches || []).forEach(b => {
    if (!b || !b.key || BRANCHES[b.key]) return;
    const nm = b.short || b.name || b.key;
    BRANCHES[b.key] = { en: nm, th: nm };
    BRANCH_KEYS.push(b.key);
  });
}
try { const S = globalThis.APEX && globalThis.APEX._d && globalThis.APEX._d.shared; if (S) { addServices(S.services); addBranches(S.branches); } } catch (e) { /* the tools also run on their own */ }
