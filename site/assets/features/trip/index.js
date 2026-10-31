/* Trip planner for international clients: procedures, branch and arrival date in; a day-by-day timeline out.
   mount(container, {lang, base, serviceUrl, onEvent, arrival?, procedures?, branch?, links?}) -> {destroy()} */

import * as store from '../plan/store.js';
import { PROCS, PROC_KEYS, BRANCHES, BRANCH_KEYS, t, procName, contactOf, injectCSS, h, fill, loadData } from '../plan/procedures.js';

/* ------------------------------------------------------------------------------------------
   PLANNING CONFIG
   Typical stay before flying, per procedure, for planning only. The surgeon confirms at consultation.
   Days are counted from the surgery day. Each value sits on or after the procedure's rest or
   light-activity milestone in features/plan/procedures.js and includes the follow-up check.
   ------------------------------------------------------------------------------------------ */
export const STAY_DAYS = {
  facelift: 14,     /* light office work after 4 to 7 days, stitches out at about day 7 */
  browlift: 10,     /* initial recovery 7 to 14 days */
  rhinoplasty: 10,  /* rest at least 7 to 14 days */
  eyelid: 7,        /* swelling eases in 7 to 14 days */
  bone: 14,         /* same light-work milestone as breast; Apex to confirm */
  breast: 14,       /* back to light work in weeks 2 to 4 */
  lipo: 10          /* driving after 3 to 7 days */
};
/* Several procedures are assumed to be done together on one surgery day: longest stay plus this many days. */
export const COMBINED_EXTRA_DAYS = 2;
/* Consultation the day after arrival, surgery the day after consultation. */
export const CONSULT_AFTER_ARRIVAL = 1;
export const SURGERY_AFTER_CONSULT = 1;
/* Follow-up check this many days before the earliest flight home. */
export const FOLLOWUP_BEFORE_FLIGHT = 1;

const T = {
  sendH: { en: 'Send these dates to Apex', th: 'ส่งวันเหล่านี้ให้ Apex' },
  sendP: { en: 'The team checks the surgeon\'s schedule and replies with the dates they can do.', th: 'ทีมงานจะเช็กตารางศัลยแพทย์และตอบกลับวันที่ทำได้' },
  sendWa: { en: 'Send on WhatsApp', th: 'ส่งทาง WhatsApp' },
  sendLine: { en: 'Send on LINE', th: 'ส่งทาง LINE' },
  msgHi: { en: 'Hello Apex, I would like to book these dates.', th: 'สวัสดี Apex อยากจองวันตามนี้' },
  msgProc: { en: 'Procedure', th: 'หัตถการ' },
  msgBranch: { en: 'Branch', th: 'สาขา' },
  msgArrive: { en: 'Arrival', th: 'วันเดินทางมาถึง' },
  msgSurgery: { en: 'Surgery', th: 'วันผ่าตัด' },
  msgFly: { en: 'Flying home', th: 'วันเดินทางกลับ' },
  title: { en: 'Trip planner', th: 'วางแผนการเดินทาง' },
  procs: { en: 'Procedure', th: 'หัตถการ' },
  procsHint: { en: 'Which procedures are you planning? Choose one or more.', th: 'วางแผนทำหัตถการอะไรบ้าง เลือกได้มากกว่าหนึ่ง' },
  branch: { en: 'Branch', th: 'สาขา' },
  arrival: { en: 'Arrival date', th: 'วันเดินทางถึง' },
  arrivalHint: { en: 'Which day do you land in Thailand?', th: 'เดินทางถึงประเทศไทยวันไหน' },
  needAll: { en: 'Choose a procedure, a branch and an arrival date.', th: 'เลือกหัตถการ สาขา และวันเดินทางถึง' },
  errProc: { en: 'Procedure: choose at least one.', th: 'หัตถการ: เลือกอย่างน้อยหนึ่งรายการ' },
  errDate: { en: 'Arrival date: the date is in the past.', th: 'วันเดินทางถึง: วันที่นี้ผ่านไปแล้ว' },
  stay: { en: 'Stay in Thailand', th: 'ระยะเวลาอยู่ในประเทศไทย' },
  nights: { en: '{n} nights', th: '{n} คืน' },
  fly: { en: 'Earliest flight home', th: 'วันบินกลับเร็วที่สุด' },
  rule: { en: 'Stay after surgery: {n} days.', th: 'อยู่ต่อหลังผ่าตัด {n} วัน' },
  ruleMulti: { en: 'Stay after surgery: {n} days, since procedures done together add {x} days to the longest stay.', th: 'อยู่ต่อหลังผ่าตัด {n} วัน เนื่องจากการทำหลายหัตถการพร้อมกันบวกเพิ่ม {x} วันจากระยะที่นานที่สุด' },
  timeline: { en: 'Day by day', th: 'กำหนดการรายวัน' },
  after: { en: 'After you fly home', th: 'หลังบินกลับบ้าน' },
  eArrive: { en: 'Arrival', th: 'เดินทางถึง' },
  eArriveD: { en: 'You land and check in near the {b} branch.', th: 'เดินทางถึงและเข้าพักใกล้สาขา{b}' },
  eConsult: { en: 'Consultation', th: 'ปรึกษาแพทย์' },
  eConsultD: { en: 'The surgeon examines you and confirms the plan and dates.', th: 'ศัลยแพทย์ตรวจและยืนยันแผนการรักษาและกำหนดวัน' },
  eSurgery: { en: 'Surgery', th: 'วันผ่าตัด' },
  eFollow: { en: 'Follow-up check', th: 'ตรวจติดตามผล' },
  eFollowD: { en: 'The surgeon checks your recovery before you fly.', th: 'ศัลยแพทย์ตรวจการฟื้นตัวก่อนเดินทางกลับ' },
  eFly: { en: 'Earliest flight home', th: 'วันบินกลับเร็วที่สุด' },
  afterSurgery: { en: 'Day {n} after surgery', th: 'วันที่ {n} หลังผ่าตัด' },
  until: { en: 'Until {d}', th: 'ถึง {d}' },
  to: { en: '{a} to {b}', th: '{a} ถึง {b}' },
  confirm: { en: 'Your surgeon confirms these dates at consultation.', th: 'ศัลยแพทย์จะยืนยันวันเหล่านี้ในวันปรึกษา' },
  ics: { en: 'Add to calendar', th: 'เพิ่มในปฏิทิน' },
  save: { en: 'Save to My Plan', th: 'บันทึกในแผนของฉัน' },
  savedPlan: { en: 'Saved to My Plan', th: 'บันทึกในแผนแล้ว' },
  openPlan: { en: 'Open My Plan', th: 'เปิดแผนของฉัน' },
  call: { en: 'Call', th: 'โทร' },
  map: { en: 'Map', th: 'แผนที่' },
  hospital: { en: 'Apex Surgery Hospital', th: 'โรงพยาบาลศัลยกรรมตกแต่งเอเพ็กซ์' },
  service: { en: 'Service page', th: 'หน้าบริการ' },
  icsConsult: { en: 'Consultation, Apex Surgery Hospital', th: 'ปรึกษาแพทย์ โรงพยาบาลศัลยกรรมตกแต่งเอเพ็กซ์' },
  icsSurgery: { en: 'Surgery, Apex Surgery Hospital', th: 'ผ่าตัด โรงพยาบาลศัลยกรรมตกแต่งเอเพ็กซ์' },
  icsFly: { en: 'Earliest flight home', th: 'วันบินกลับเร็วที่สุด' }
};

const CSS = `
.apxt{--t-plum:var(--plum,#6A388C);--t-plum7:var(--plum-700,#55286F);--t-night:var(--night,#1F0A30);--t-night2:var(--night-2,#2A0F40);
  --t-lilac:var(--lilac,#A886CD);--t-l3:var(--lilac-300,#C9B3DD);--t-l2:var(--lilac-200,#E4D8EE);--t-l1:var(--lilac-100,#F1EAF7);--t-wash:var(--wash,#FBF3FB);
  --t-ink:var(--ink,#2A1F33);--t-ink2:var(--ink-2,#5A4A66);--t-on:var(--on-night,#F6EEFB);--t-on2:var(--on-night-2,#CDB9DD);--t-rose:#CC3366;
  --t-ease:cubic-bezier(.23,1,.32,1);
  font-family:"LINE Seed","Sarabun","Noto Sans Thai",system-ui,sans-serif;color:var(--t-ink);font-size:16px;line-height:1.6;-webkit-text-size-adjust:100%}
.apxt *,.apxt *::before,.apxt *::after{box-sizing:border-box}
.apxt button,.apxt input{font:inherit;color:inherit}
.apxt h2,.apxt h3,.apxt h4,.apxt p{margin:0}
.apxt .t-wrap{max-width:1180px;margin:0 auto;padding:24px 16px 56px}
.apxt .t-wrap>h2{font-size:clamp(30px,6vw,44px);font-weight:800;letter-spacing:-.015em;line-height:1.1;margin-bottom:20px}
.apxt .t-grid{display:grid;gap:20px}
@media (min-width:920px){.apxt .t-grid{grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);align-items:start}.apxt .t-form{position:sticky;top:16px}}
.apxt .t-form{background:#fff;border:1px solid var(--t-l2);border-radius:20px;padding:18px}
.apxt fieldset{border:0;margin:0;padding:0;min-width:0}
.apxt fieldset+fieldset,.apxt .t-field{margin-top:20px}
.apxt legend,.apxt .t-lab{display:block;padding:0;font-weight:800;font-size:17px}
.apxt legend.t-leg{margin-bottom:10px}
.apxt .t-hint{display:block;font-size:14px;color:var(--t-ink2);margin:2px 0 10px}
.apxt .t-chips{display:flex;flex-wrap:wrap;gap:8px}
.apxt .t-chip{position:relative}
.apxt .t-chip input{position:absolute;opacity:0;inset:0;margin:0;cursor:pointer}
.apxt .t-chip span{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;border-radius:999px;border:1.5px solid var(--t-l3);background:#fff;color:var(--t-plum7);font-weight:700;font-size:15px;transition:background-color .2s,border-color .2s,color .2s}
.apxt .t-chip span::before{content:"";width:16px;height:16px;border-radius:5px;border:1.5px solid var(--t-l3);background:#fff;flex:none}
.apxt .t-chip input:checked+span{background:var(--t-plum);border-color:var(--t-plum);color:#fff}
.apxt .t-chip input:checked+span::before{border-color:#fff;background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3.5 8.5l3 3 6-7' fill='none' stroke='%236A388C' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/14px no-repeat}
.apxt .t-chip input:focus-visible+span,.apxt .t-br input:focus-visible+span{outline:3px solid var(--t-lilac);outline-offset:2px}
.apxt .t-brs{display:grid;gap:8px}
@media (min-width:520px){.apxt .t-brs{grid-template-columns:1fr 1fr}}
.apxt .t-br{position:relative}
.apxt .t-br input{position:absolute;opacity:0;inset:0;margin:0;cursor:pointer;z-index:1}
.apxt .t-br span{display:block;height:100%;padding:12px 14px;border-radius:12px;border:1.5px solid var(--t-l3);background:#fff;transition:border-color .2s,background-color .2s}
.apxt .t-br b{display:block;font-size:16px;color:var(--t-ink)}
.apxt .t-br small{display:block;font-size:13px;line-height:1.45;color:var(--t-ink2);margin-top:2px}
.apxt .t-br input:checked+span{border-color:var(--t-plum);background:var(--t-l1);box-shadow:inset 0 0 0 1px var(--t-plum)}
.apxt input[type=date]{width:100%;max-width:280px;min-height:48px;border:1.5px solid var(--t-l3);border-radius:12px;padding:0 12px;background:var(--t-wash);font-size:16px}
.apxt input[type=date]:focus{outline:none;border-color:var(--t-plum);box-shadow:0 0 0 3px rgba(168,134,205,.35)}
.apxt .t-err{color:#9E2050;font-size:14px;font-weight:700;margin-top:6px}
.apxt .t-out{min-width:0}
.apxt .t-wait{border:1px dashed var(--t-l3);border-radius:20px;padding:28px 18px;color:var(--t-ink2);background:#fff;font-size:17px}
.apxt .t-sum{background:linear-gradient(155deg,var(--t-night2),var(--t-plum7));color:var(--t-on);border-radius:20px;padding:20px 20px 18px;display:grid;gap:14px}
@media (min-width:560px){.apxt .t-sum{grid-template-columns:1fr auto;align-items:end}}
.apxt .t-sum small{display:block;font-size:14px;color:var(--t-on2);font-weight:700}
.apxt .t-sum .t-fly{font-size:clamp(28px,6vw,40px);font-weight:800;line-height:1.1;color:#fff;margin-top:4px}
.apxt .t-sum .t-stay{font-size:22px;font-weight:800;color:#fff}
.apxt .t-sum .t-rule{grid-column:1/-1;font-size:14px;color:var(--t-on2);border-top:1px dashed rgba(201,179,221,.45);padding-top:10px}
.apxt .t-sec{margin-top:24px}
.apxt .t-sec>h3{font-size:20px;font-weight:800;margin-bottom:10px}
.apxt .t-tl{list-style:none;margin:0;padding:0;position:relative}
.apxt .t-tl::before{content:"";position:absolute;left:35px;top:10px;bottom:10px;border-left:2px dashed var(--t-l3)}
.apxt .t-ev{position:relative;display:grid;grid-template-columns:72px 1fr;gap:14px;padding:8px 0}
.apxt .t-date{position:relative;z-index:1;width:72px;text-align:center;background:#fff;border:1.5px solid var(--t-l2);border-radius:12px;padding:6px 2px;line-height:1.1}
.apxt .t-date small{display:block;font-size:12px;color:var(--t-ink2);font-weight:700}
.apxt .t-date b{display:block;font-size:24px;font-weight:800;color:var(--t-ink);margin:2px 0}
.apxt .t-date.rng b{font-size:15px;line-height:1.25}
.apxt .t-ev.key .t-date{background:var(--t-plum);border-color:var(--t-plum)}
.apxt .t-ev.key .t-date *{color:#fff}
.apxt .t-ev.fly .t-date{background:var(--t-rose);border-color:var(--t-rose)}
.apxt .t-ev.fly .t-date *{color:#fff}
.apxt .t-body{padding-top:4px;min-width:0}
.apxt .t-body h4{font-size:17px;font-weight:800;line-height:1.35}
.apxt .t-ev.ms .t-body{padding-top:0}
.apxt .t-ev.ms .t-tag{margin-bottom:2px}
.apxt .t-body p{font-size:15px;color:var(--t-ink2)}
.apxt .t-body p.t-day{font-size:13px;font-weight:700;color:var(--t-plum7)}
.apxt .t-tag{display:inline-block;font-size:12px;font-weight:800;line-height:22px;padding:0 9px;border-radius:999px;background:var(--t-l1);color:var(--t-plum7);margin-right:6px;vertical-align:1px}
.apxt .t-after{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.apxt .t-after li{display:grid;grid-template-columns:minmax(110px,auto) 1fr;gap:12px;background:#fff;border:1px solid var(--t-l2);border-radius:12px;padding:10px 14px;font-size:15px}
.apxt .t-after li b{color:var(--t-plum7);font-size:14px}
@media (max-width:480px){.apxt .t-after li{grid-template-columns:1fr;gap:2px}}
.apxt .t-confirm{margin-top:18px;font-weight:700;color:var(--t-plum7)}
.apxt .t-branch{margin-top:18px;background:#fff;border:1px solid var(--t-l2);border-radius:20px;padding:16px 18px}
.apxt .t-branch h4{font-size:17px;font-weight:800}
.apxt .t-branch p{font-size:15px;color:var(--t-ink2);margin-top:2px}
.apxt .t-branch .t-row{display:flex;flex-wrap:wrap;gap:4px 18px;margin-top:6px}
.apxt a.t-link{display:inline-flex;align-items:center;min-height:44px;color:var(--t-plum);font-weight:700;text-decoration:underline;text-decoration-color:var(--t-l3);text-underline-offset:.22em}
.apxt .t-acts{display:grid;gap:10px;margin-top:18px}
@media (min-width:560px){.apxt .t-acts{grid-template-columns:1fr 1fr}}
.apxt .t-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;padding:0 20px;border-radius:999px;border:2px solid transparent;font-weight:700;font-size:16px;cursor:pointer;text-decoration:none;transition:transform .16s var(--t-ease),background-color .2s,border-color .2s}
.apxt .t-btn:active{transform:scale(.97)}
.apxt .t-btn svg{width:20px;height:20px;flex:none}
.apxt .t-btn.plum{background:var(--t-plum);color:#fff}
.apxt .t-btn.plum:hover{background:var(--t-plum7)}
.apxt .t-btn.ghost{background:#fff;color:var(--t-plum);border-color:var(--t-l3)}
.apxt .t-btn.ghost:hover{border-color:var(--t-plum)}
.apxt .t-btn.wa{background:#167A43;color:#fff}.apxt .t-btn.wa:hover{background:#116636}
.apxt .t-btn.line{background:#00843A;color:#fff}.apxt .t-btn.line:hover{background:#006F31}
.apxt .t-send{margin-top:22px;padding:18px;border-radius:18px;background:var(--t-l1);box-shadow:inset 0 0 0 1px var(--t-l2)}
.apxt .t-send h4{margin:0 0 4px;font-size:17px}
.apxt .t-send p{margin:0;color:var(--t-ink2,#5A4A66);font-size:15px}
.apxt .t-send .t-acts{margin-top:12px}
.apxt .t-btn.done{background:var(--t-l1);color:var(--t-plum7);border-color:var(--t-l2)}
.apxt :is(a,button):focus-visible{outline:3px solid var(--t-lilac);outline-offset:2px}
.apxt [hidden]{display:none!important}
.apxt .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (prefers-reduced-motion:reduce){.apxt *{transition:none!important}}
`;

const ICON = {
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M12 13v5M9.5 15.5h5"/></svg>',
  plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
};



/* ---------- date helpers on plain YYYY-MM-DD strings (UTC, no time zone drift) ---------- */
const toMs = iso => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const toIso = ms => new Date(ms).toISOString().slice(0, 10);
export const addDays = (iso, n) => toIso(toMs(iso) + n * 86400e3);
const todayIso = () => { const d = new Date(); return toIso(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); };
const loc = lang => (lang === 'th' ? 'th-TH' : 'en-GB');
const fmt = (iso, lang, o) => new Date(toMs(iso)).toLocaleDateString(loc(lang), { timeZone: 'UTC', ...o });
const fmtLong = (iso, lang) => fmt(iso, lang, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const fmtShort = (iso, lang) => fmt(iso, lang, { day: 'numeric', month: 'short' });

/* Core rule, exported for tests. */
export function planTrip({ procedures, arrival, branch }) {
  const procs = PROC_KEYS.filter(k => procedures.includes(k));
  if (!procs.length || !arrival) return null;
  const longest = Math.max(...procs.map(k => STAY_DAYS[k]));
  const stayDays = longest + (procs.length > 1 ? COMBINED_EXTRA_DAYS : 0);
  const consult = addDays(arrival, CONSULT_AFTER_ARRIVAL);
  const surgery = addDays(consult, SURGERY_AFTER_CONSULT);
  const flyHome = addDays(surgery, stayDays);
  const followup = addDays(flyHome, -FOLLOWUP_BEFORE_FLIGHT);
  const milestones = [];
  procs.forEach(k => PROCS[k].facts.forEach(f => {
    const w = f.at || f.until;
    if (!w) return;
    milestones.push({ proc: k, fact: f, kind: f.at ? 'at' : 'until', from: addDays(surgery, w[0]), to: addDays(surgery, w[1]), d0: w[0], d1: w[1] });
  }));
  milestones.sort((a, b) => a.d0 - b.d0 || a.d1 - b.d1);
  return { procedures: procs, branch, arrival, consult, surgery, followup, flyHome, stayDays, longest, nights: (toMs(flyHome) - toMs(arrival)) / 86400e3, milestones };
}

/* ---------- .ics ---------- */
const icsEsc = s => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
function fold(line) {
  const enc = new TextEncoder(); const out = []; let cur = '';
  for (const ch of line) {
    if (enc.encode(cur + ch).length > (out.length ? 74 : 75)) { out.push(cur); cur = ch; } else cur += ch;
  }
  out.push(cur);
  return out.join('\r\n ');
}
export function buildICS(plan, { lang, address, branchName }) {
  const L = o => t(o, lang);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const d = iso => iso.replace(/-/g, '');
  const procs = plan.procedures.map(k => procName(k, lang)).join(', ');
  const ev = (key, iso, summary, desc) => [
    'BEGIN:VEVENT',
    `UID:apex-${key}-${d(iso)}-${plan.procedures.join('-')}@apexsurgeryhospital.com`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${d(iso)}`,
    `DTEND;VALUE=DATE:${d(addDays(iso, 1))}`,
    `SUMMARY:${icsEsc(summary)}`,
    `DESCRIPTION:${icsEsc(desc)}`,
    key === 'fly' ? null : `LOCATION:${icsEsc([branchName, address].filter(Boolean).join(', '))}`,
    'TRANSP:TRANSPARENT',
    'END:VEVENT'
  ].filter(Boolean);
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Apex Surgery Hospital//Trip planner//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    ...ev('consult', plan.consult, L(T.icsConsult), `${procs}\n${L(T.confirm)}`),
    ...ev('surgery', plan.surgery, L(T.icsSurgery), `${procs}\n${L(T.confirm)}`),
    ...ev('fly', plan.flyHome, L(T.icsFly), `${procs}\n${L(T.confirm)}`),
    'END:VCALENDAR'
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function mount(container, opts = {}) {
  const { wa: WHATSAPP, line: LINE_OA } = contactOf(opts);
  injectCSS('apxt-css', CSS);
  const lang = opts.lang === 'th' ? 'th' : 'en';
  const L = o => t(o, lang);
  const base = opts.base || new URL('../../', import.meta.url).href;
  const serviceUrl = typeof opts.serviceUrl === 'function' ? opts.serviceUrl : k => `service.html?p=${k}`;
  const emit = (n, d) => { try { opts.onEvent && opts.onEvent(n, d); } catch (e) { /* host handler error */ } };
  const site = new URL('../', base).href + (lang === 'th' ? 'th/' : '');
  const links = { plan: site + 'my-plan.html', ...(opts.links || {}) };
  const uid = 'apxt' + Math.random().toString(36).slice(2, 7);

  /* initial state: opts, then a saved trip, then procedures already in My Plan */
  const saved = store.get();
  const st = {
    procedures: opts.procedures || (saved.trip && saved.trip.procedures) || [...new Set(saved.procedures.map(p => p.key))],
    branch: opts.branch || (saved.trip && saved.trip.branch) || 'ploenchit',
    arrival: opts.arrival || (saved.trip && saved.trip.arrival) || ''
  };
  let branches = {};

  const root = h('div', { class: 'apxt', lang });
  const wrap = h('div', { class: 't-wrap' }, h('h2', null, L(T.title)));
  root.append(wrap);
  container.append(root);

  /* ----- form ----- */
  const chips = h('div', { class: 't-chips' }, PROC_KEYS.map(k => h('label', { class: 't-chip' },
    h('input', { type: 'checkbox', name: uid + '-p', value: k, checked: st.procedures.includes(k) }),
    h('span', null, procName(k, lang)))));
  const procErr = h('p', { class: 't-err', id: uid + '-pe', hidden: true });
  const brBox = h('div', { class: 't-brs' });
  const date = h('input', { type: 'date', id: uid + '-d', min: todayIso(), value: st.arrival, 'aria-describedby': `${uid}-dh ${uid}-de` });
  const dateErr = h('p', { class: 't-err', id: uid + '-de', hidden: true });
  const form = h('form', { class: 't-form', novalidate: true, onsubmit: e => e.preventDefault() },
    h('fieldset', { 'aria-describedby': `${uid}-ph ${uid}-pe` }, h('legend', null, L(T.procs)), h('span', { class: 't-hint', id: uid + '-ph' }, L(T.procsHint)), chips, procErr),
    h('fieldset', null, h('legend', { class: 't-leg' }, L(T.branch)), brBox),
    h('div', { class: 't-field' }, h('label', { class: 't-lab', for: uid + '-d' }, L(T.arrival)), h('span', { class: 't-hint', id: uid + '-dh' }, L(T.arrivalHint)), date, dateErr));
  const out = h('div', { class: 't-out', 'aria-live': 'polite' });
  wrap.append(h('div', { class: 't-grid' }, form, out));

  function renderBranches() {
    brBox.textContent = '';
    BRANCH_KEYS.forEach(k => {
      const b = branches[k];
      brBox.append(h('label', { class: 't-br' },
        h('input', { type: 'radio', name: uid + '-b', value: k, checked: st.branch === k }),
        h('span', null, h('b', null, L(BRANCHES[k])), b ? h('small', null, b.addr) : null)));
    });
  }
  renderBranches();

  chips.addEventListener('change', () => { st.procedures = [...chips.querySelectorAll('input:checked')].map(i => i.value); update(true); });
  brBox.addEventListener('change', e => { if (e.target.name === uid + '-b') { st.branch = e.target.value; update(true); } });
  date.addEventListener('input', () => { st.arrival = date.value; update(true); });
  date.addEventListener('change', () => { st.arrival = date.value; update(true); });

  let current = null;
  let touched = false;
  function update(user) {
    if (user) touched = true;
    const past = st.arrival && st.arrival < todayIso();
    procErr.hidden = !(touched && !st.procedures.length);
    procErr.textContent = L(T.errProc);
    dateErr.hidden = !past;
    dateErr.textContent = L(T.errDate);
    date.setAttribute('aria-invalid', past ? 'true' : 'false');
    current = past ? null : planTrip(st);
    renderOut();
    if (current && user) emit('trip:plan', { procedures: current.procedures, branch: current.branch, arrival: current.arrival, flyHome: current.flyHome, stayDays: current.stayDays });
  }

  function dateBlock(iso, cls) {
    return h('div', { class: 't-date' + (cls ? ' ' + cls : '') },
      h('small', null, fmt(iso, lang, { weekday: 'short' })),
      h('b', null, fmt(iso, lang, { day: 'numeric' })),
      h('small', null, fmt(iso, lang, { month: 'short' })));
  }
  const rangeText = m => {
    const sameMonth = m.from.slice(0, 7) === m.to.slice(0, 7);
    const r = m.from === m.to ? fmtShort(m.from, lang)
      : fill(L(T.to), { a: sameMonth ? fmt(m.from, lang, { day: 'numeric' }) : fmtShort(m.from, lang), b: fmtShort(m.to, lang) });
    return m.kind === 'until' ? fill(L(T.until), { d: r }) : r;
  };

  function renderOut() {
    out.textContent = '';
    const p = current;
    if (!p) { out.append(h('p', { class: 't-wait' }, L(T.needAll))); return; }
    const multi = p.procedures.length > 1;
    const bName = L(BRANCHES[p.branch]);
    const b = branches[p.branch];

    out.append(h('div', { class: 't-sum', 'data-fly': p.flyHome },
      h('div', null, h('small', null, L(T.fly)), h('p', { class: 't-fly' }, fmtLong(p.flyHome, lang))),
      h('div', null, h('small', null, L(T.stay)), h('p', { class: 't-stay' }, fill(L(T.nights), { n: p.nights }))),
      h('p', { class: 't-rule' }, multi ? fill(L(T.ruleMulti), { n: p.stayDays, x: COMBINED_EXTRA_DAYS }) : fill(L(T.rule), { n: p.stayDays }))));

    /* timeline within the stay */
    const ev = [];
    const dayOf = iso => (toMs(iso) - toMs(p.surgery)) / 86400e3;
    ev.push({ iso: p.arrival, cls: '', title: L(T.eArrive), text: fill(L(T.eArriveD), { b: bName }) });
    ev.push({ iso: p.consult, cls: 'key', title: L(T.eConsult), text: L(T.eConsultD) });
    ev.push({ iso: p.surgery, cls: 'key', title: L(T.eSurgery), text: p.procedures.map(k => procName(k, lang)).join(', ') });
    const during = p.milestones.filter(m => m.d0 < p.stayDays);
    const later = p.milestones.filter(m => m.d0 >= p.stayDays);
    during.forEach(m => ev.push({ iso: m.from, to: m.to, m, sort: dayOf(m.from) + .5 }));
    ev.push({ iso: p.followup, cls: 'key', title: L(T.eFollow), text: L(T.eFollowD), sort: p.stayDays - FOLLOWUP_BEFORE_FLIGHT + .9 });
    ev.push({ iso: p.flyHome, cls: 'fly', title: L(T.eFly), sort: p.stayDays + .95 });
    ev.forEach(e => { if (e.sort == null) e.sort = dayOf(e.iso); });
    ev.sort((a, b) => a.sort - b.sort);

    out.append(h('section', { class: 't-sec', 'aria-labelledby': uid + '-tl' },
      h('h3', { id: uid + '-tl' }, L(T.timeline)),
      h('ol', { class: 't-tl' }, ev.map(e => {
        const day = dayOf(e.iso);
        if (e.m) {
          const m = e.m;
          return h('li', { class: 't-ev ms', 'data-proc': m.proc },
            dateBlock(e.iso),
            h('div', { class: 't-body' },
              h('span', { class: 't-tag' }, procName(m.proc, lang)), h('h4', null, t(m.fact, lang)),
              h('p', null, `${rangeText(m)}`)));
        }
        return h('li', { class: 't-ev ' + e.cls, 'data-ev': e.cls || 'arrive' },
          dateBlock(e.iso),
          h('div', { class: 't-body' },
            h('h4', null, e.title),
            day > 0 ? h('p', { class: 't-day' }, fill(L(T.afterSurgery), { n: day })) : null,
            e.text ? h('p', null, e.text) : null));
      }))));

    if (later.length) out.append(h('section', { class: 't-sec', 'aria-labelledby': uid + '-af' },
      h('h3', { id: uid + '-af' }, L(T.after)),
      h('ul', { class: 't-after' }, later.map(m => h('li', null, h('b', null, rangeText(m)),
        h('span', null, h('span', { class: 't-tag' }, procName(m.proc, lang)), t(m.fact, lang)))))));

    out.append(h('p', { class: 't-confirm' }, L(T.confirm)));

    if (b) out.append(h('div', { class: 't-branch', 'data-branch': p.branch },
      h('h4', null, `${L(T.hospital)}, ${bName}`),
      h('p', null, b.addr),
      h('div', { class: 't-row' },
        h('a', { class: 't-link', href: b.tel || 'tel:' + String(b.phone).replace(/\D/g, '') }, `${L(T.call)} ${b.phone}`),
        b.map ? h('a', { class: 't-link', href: b.map, target: '_blank', rel: 'noopener' }, L(T.map)) : null)));

    const icsBtn = h('button', { type: 'button', class: 't-btn ghost', 'data-act': 'ics', html: ICON.cal + `<span>${L(T.ics)}</span>` });
    icsBtn.addEventListener('click', () => {
      const txt = buildICS(p, { lang, address: b && b.addr, branchName: `${L(T.hospital)}, ${bName}` });
      const url = URL.createObjectURL(new Blob([txt], { type: 'text/calendar;charset=utf-8' }));
      const a = h('a', { href: url, download: `apex-trip-${p.arrival}.ics` });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      emit('trip:ics', { procedures: p.procedures, arrival: p.arrival });
    });
    const savedNow = (() => { const s = store.get().trip; return s && s.arrival === p.arrival && s.branch === p.branch && String(s.procedures) === String(p.procedures); })();
    const saveBtn = h('button', { type: 'button', class: 't-btn ' + (savedNow ? 'done' : 'plum'), 'data-act': 'save',
      html: (savedNow ? ICON.check : ICON.plan) + `<span>${L(savedNow ? T.savedPlan : T.save)}</span>` });
    saveBtn.addEventListener('click', () => {
      const trip = { procedures: p.procedures, branch: p.branch, arrival: p.arrival, consult: p.consult, surgery: p.surgery, followup: p.followup, flyHome: p.flyHome, stayDays: p.stayDays };
      store.setTrip(trip);
      p.procedures.forEach(k => { if (!store.get().procedures.some(x => x.key === k)) store.addProcedure(k); });
      emit('trip:save', trip);
      saveBtn.className = 't-btn done';
      saveBtn.innerHTML = ICON.check + `<span>${L(T.savedPlan)}</span>`;
    });
    out.append(h('div', { class: 't-acts' }, icsBtn, saveBtn));
    const msg = [L(T.msgHi),
      `${L(T.msgProc)}: ${p.procedures.map(k => procName(k, lang)).join(', ')}`,
      `${L(T.msgBranch)}: ${bName}`,
      `${L(T.msgArrive)}: ${fmtLong(p.arrival, lang)}`,
      `${L(T.msgSurgery)}: ${fmtLong(p.surgery, lang)}`,
      `${L(T.msgFly)}: ${fmtLong(p.flyHome, lang)}`].join('\n');
    const wa = h('a', { class: 't-btn wa', target: '_blank', rel: 'noopener', 'data-act': 'wa', href: `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, html: `<span>${L(T.sendWa)}</span>` });
    const ln = h('a', { class: 't-btn line', target: '_blank', rel: 'noopener', 'data-act': 'line', href: `https://line.me/R/oaMessage/${LINE_OA}/?${encodeURIComponent(msg)}`, html: `<span>${L(T.sendLine)}</span>` });
    [wa, ln].forEach(a => a.addEventListener('click', () => emit('trip:send', { channel: a.dataset.act, procedures: p.procedures, branch: p.branch, arrival: p.arrival })));
    out.append(h('div', { class: 't-send' }, h('h4', null, L(T.sendH)), h('p', null, L(T.sendP)), h('div', { class: 't-acts' }, wa, ln)));
    if (savedNow || links.plan) out.append(h('p', null, h('a', { class: 't-link', href: links.plan }, L(T.openPlan))));
  }

  update(false);
  loadData(base, lang, 'shared').then(d => {
    (d.branches || []).forEach(b => { branches[b.key] = b; });
    renderBranches(); renderOut();
  }).catch(() => { /* branch details stay hidden */ });

  return { destroy() { root.remove(); }, get trip() { return current; } };
}
