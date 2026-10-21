/* My Plan page: chosen procedures with recovery facts, vouchers, trip summary, notes and send actions.
   mount(container, {lang, base, serviceUrl, onEvent, links}) -> {destroy()}
     links: optional {bodymap, nose, games, trip, consult} page URLs for the empty state and trip box.
   badge(el, {lang}) -> {destroy()} shows the plan item count in a header element. */

import * as store from './store.js';
import { PROCS, BRANCHES, t, procName, areaName, concernName } from './procedures.js';

export { store };

/* Apex group international WhatsApp and the hospital's LINE official account. */
const WHATSAPP = '66850002001';
const LINE_OA = '@apexsurgery';

const T = {
  title: { en: 'My Plan', th: 'แผนของฉัน' },
  hospital: { en: 'Apex Surgery Hospital', th: 'โรงพยาบาลศัลยกรรมตกแต่งเอเพ็กซ์' },
  procs: { en: 'Procedures', th: 'หัตถการ' },
  vouchers: { en: 'Vouchers', th: 'บัตรกำนัล' },
  trip: { en: 'Trip', th: 'การเดินทาง' },
  notes: { en: 'Notes', th: 'บันทึก' },
  notesHint: { en: 'What do you want to ask the surgeon?', th: 'อยากถามศัลยแพทย์เรื่องอะไรบ้าง' },
  notesPh: { en: 'Example: Can I fly home 10 days after rhinoplasty?', th: 'ตัวอย่าง: หลังเสริมจมูก 10 วัน บินกลับบ้านได้ไหม' },
  remove: { en: 'Remove', th: 'ลบ' },
  removeA: { en: 'Remove {x} from My Plan', th: 'ลบ{x}ออกจากแผน' },
  service: { en: 'Service page', th: 'หน้าบริการ' },
  recovery: { en: 'Recovery', th: 'การพักฟื้น' },
  empty: { en: 'Your plan is empty.', th: 'ยังไม่มีรายการในแผนของคุณ' },
  emptyAdd: { en: 'Add a procedure from one of these pages.', th: 'เพิ่มหัตถการได้จากหน้าเหล่านี้' },
  bodymap: { en: 'Body map', th: 'แผนที่ร่างกาย' },
  nose: { en: 'Nose preview', th: 'จำลองทรงจมูก' },
  games: { en: 'Games', th: 'เกม' },
  noTrip: { en: 'No trip planned.', th: 'ยังไม่ได้วางแผนการเดินทาง' },
  planTrip: { en: 'Plan a trip', th: 'วางแผนการเดินทาง' },
  editTrip: { en: 'Edit trip', th: 'แก้ไขการเดินทาง' },
  removeTrip: { en: 'Remove trip', th: 'ลบการเดินทาง' },
  branch: { en: 'Branch', th: 'สาขา' },
  arrival: { en: 'Arrival', th: 'วันเดินทางถึง' },
  consult: { en: 'Consultation', th: 'วันปรึกษาแพทย์' },
  surgery: { en: 'Surgery', th: 'วันผ่าตัด' },
  followup: { en: 'Follow-up check', th: 'ตรวจติดตามผล' },
  flyHome: { en: 'Earliest flight home', th: 'วันบินกลับเร็วที่สุด' },
  confirm: { en: 'Your surgeon confirms these dates at consultation.', th: 'ศัลยแพทย์จะยืนยันวันเหล่านี้ในวันปรึกษา' },
  code: { en: 'Code', th: 'รหัส' },
  validUntil: { en: 'Valid until', th: 'ใช้ได้ถึง' },
  send: { en: 'Send my plan', th: 'ส่งแผนของฉัน' },
  wa: { en: 'Send to WhatsApp', th: 'ส่งทาง WhatsApp' },
  line: { en: 'Send to LINE', th: 'ส่งทาง LINE' },
  png: { en: 'Save to phone', th: 'บันทึกลงโทรศัพท์' },
  saving: { en: 'Saving', th: 'กำลังบันทึก' },
  saved: { en: 'Plan image saved.', th: 'บันทึกรูปแผนแล้ว' },
  saveFail: { en: 'The plan image could not be saved.', th: 'บันทึกรูปแผนไม่สำเร็จ' },
  itemsA: { en: '{n} items in My Plan', th: 'แผนของฉันมี {n} รายการ' },
  nProc: { en: ['{n} procedure', '{n} procedures'], th: 'หัตถการ {n} รายการ' },
  nVouch: { en: ['{n} voucher', '{n} vouchers'], th: 'บัตรกำนัล {n} ใบ' },
  days: { en: '{n} days', th: '{n} วัน' }
};

/* Game titles from features/games/config.js, copied so the plan loads without the games bundle. */
const GAME_TITLES = {
  steady: { en: 'Steady Hand', th: 'มือนิ่ง' }, proportion: { en: 'Proportion', th: 'สัดส่วน' },
  factrush: { en: 'Fact Rush', th: 'จริงหรือเข้าใจผิด' }, recoverysort: { en: 'Recovery Sort', th: 'จัดช่วงพักฟื้น' },
  memorymatch: { en: 'Memory Match', th: 'จับคู่ความจำ' }
};

const ICON = {
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.2-.2-.4-.3z"/></svg>',
  line: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3C6.5 3 2 6.6 2 11c0 4 3.6 7.3 8.4 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6A7.5 7.5 0 0 0 22 11c0-4.4-4.5-8-10-8zM8.3 13.4H6.4a.5.5 0 0 1-.5-.5V9.1a.5.5 0 0 1 1 0v3.3h1.4a.5.5 0 0 1 0 1zm2 -.5a.5.5 0 0 1-1 0V9.1a.5.5 0 0 1 1 0zm4.6 0a.5.5 0 0 1-.9.3l-2-2.6v2.3a.5.5 0 0 1-1 0V9.1a.5.5 0 0 1 .9-.3l2 2.6V9.1a.5.5 0 0 1 1 0zm3-2.4a.5.5 0 0 1 0 1h-1.4v.9h1.4a.5.5 0 0 1 0 1h-1.9a.5.5 0 0 1-.5-.5V9.1a.5.5 0 0 1 .5-.5h1.9a.5.5 0 0 1 0 1h-1.4v.9z"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6h9v9M18 6L6 18"/></svg>'
};

const CSS = `
.apxp{--p-plum:var(--plum,#6A388C);--p-plum7:var(--plum-700,#55286F);--p-night:var(--night,#1F0A30);--p-night2:var(--night-2,#2A0F40);
  --p-lilac:var(--lilac,#A886CD);--p-l3:var(--lilac-300,#C9B3DD);--p-l2:var(--lilac-200,#E4D8EE);--p-l1:var(--lilac-100,#F1EAF7);--p-wash:var(--wash,#FBF3FB);
  --p-ink:var(--ink,#2A1F33);--p-ink2:var(--ink-2,#5A4A66);--p-on:var(--on-night,#F6EEFB);--p-on2:var(--on-night-2,#CDB9DD);--p-rose:#CC3366;
  --p-ease:cubic-bezier(.23,1,.32,1);
  font-family:"LINE Seed","Sarabun","Noto Sans Thai",system-ui,sans-serif;color:var(--p-ink);font-size:16px;line-height:1.6;-webkit-text-size-adjust:100%}
.apxp *,.apxp *::before,.apxp *::after{box-sizing:border-box}
.apxp button,.apxp textarea{font:inherit;color:inherit}
.apxp h2,.apxp h3,.apxp h4,.apxp p{margin:0}
.apxp .p-wrap{max-width:1180px;margin:0 auto;padding:24px 16px 56px}
.apxp .p-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:8px 16px;margin-bottom:22px}
.apxp .p-head h2{font-size:clamp(30px,6vw,44px);font-weight:800;letter-spacing:-.015em;line-height:1.1}
.apxp .p-head p{color:var(--p-ink2);font-size:15px}
.apxp .p-grid{display:grid;gap:20px}
@media (min-width:920px){.apxp .p-grid{grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);align-items:start}.apxp .p-side{position:sticky;top:16px}}
.apxp .p-sec+.p-sec{margin-top:28px}
.apxp .p-sec>h3{font-size:20px;font-weight:800;margin-bottom:12px}
.apxp .p-list{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.apxp .p-proc{background:#fff;border:1px solid var(--p-l2);border-radius:20px;padding:18px 18px 16px;display:grid;grid-template-columns:1fr auto;gap:4px 12px}
.apxp .p-proc h4{font-size:20px;font-weight:800;line-height:1.3}
.apxp .p-proc .p-area{grid-column:1/-1;font-size:15px;color:var(--p-plum7);font-weight:700}
.apxp .p-proc .p-area span{font-weight:400;color:var(--p-ink2)}
.apxp .p-facts{grid-column:1/-1;list-style:none;margin:10px 0 0;padding:12px 0 0;border-top:1px dashed var(--p-l3);display:grid;gap:4px;font-size:15px;color:var(--p-ink2)}
.apxp .p-facts li{position:relative;padding-left:18px}
.apxp .p-facts li::before{content:"";position:absolute;left:2px;top:.68em;width:7px;height:7px;border-radius:2px;background:var(--p-lilac);transform:rotate(45deg)}
.apxp .p-proc .p-links{grid-column:1/-1;margin-top:10px}
.apxp a.p-link{display:inline-flex;align-items:center;gap:6px;min-height:44px;color:var(--p-plum);font-weight:700;text-decoration:underline;text-decoration-color:var(--p-l3);text-underline-offset:.22em}
.apxp a.p-link:hover{text-decoration-color:var(--p-plum)}
.apxp a.p-link svg{width:16px;height:16px}
.apxp .p-rm{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 12px;border-radius:999px;border:1.5px solid var(--p-l2);background:#fff;color:var(--p-ink2);font-size:14px;font-weight:700;cursor:pointer;align-self:start}
.apxp .p-rm:hover{border-color:var(--p-rose);color:var(--p-rose)}
.apxp .p-rm svg{width:16px;height:16px}
.apxp .p-v{display:grid;grid-template-columns:auto 1fr;gap:2px 14px;align-items:center;background:#fff;border:1px solid var(--p-l2);border-radius:20px;padding:14px 16px;overflow:hidden;position:relative}
.apxp .p-v::before{content:"";grid-row:1/4;width:10px;align-self:stretch;margin:-14px 0 -14px -16px;background:linear-gradient(135deg,rgba(255,255,255,.18) 25%,transparent 25%) 0 0/8px 8px,linear-gradient(var(--p-rose),var(--p-plum))}
.apxp .p-v b{font-size:17px;line-height:1.3}
.apxp .p-v .p-vcode{font-weight:800;color:var(--p-plum);letter-spacing:.06em;font-size:15px}
.apxp .p-v small{font-size:13px;color:var(--p-ink2)}
.apxp .p-box{background:#fff;border:1px solid var(--p-l2);border-radius:20px;padding:18px}
.apxp .p-box+.p-box{margin-top:14px}
.apxp .p-box h3{font-size:18px;font-weight:800;margin-bottom:10px}
.apxp .p-trip dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:6px 16px;font-size:15px}
.apxp .p-trip dt{color:var(--p-ink2)}
.apxp .p-trip dd{margin:0;font-weight:700;text-align:right}
.apxp .p-trip dd.fly{color:var(--p-rose)}
.apxp .p-trip .p-note{margin-top:10px;font-size:14px;color:var(--p-ink2)}
.apxp .p-row{display:flex;flex-wrap:wrap;gap:4px 16px;margin-top:6px}
.apxp .p-muted{color:var(--p-ink2)}
.apxp label.p-lab{display:block;font-weight:800;font-size:18px}
.apxp .p-hint{display:block;font-size:14px;color:var(--p-ink2);margin:2px 0 8px}
.apxp textarea{width:100%;min-height:112px;resize:vertical;border:1.5px solid var(--p-l3);border-radius:12px;padding:10px 12px;background:var(--p-wash);font-size:16px;line-height:1.5}
.apxp textarea:focus{outline:none;border-color:var(--p-plum);box-shadow:0 0 0 3px rgba(168,134,205,.35)}
.apxp .p-acts{display:grid;gap:10px}
.apxp .p-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;padding:0 20px;border-radius:999px;border:2px solid transparent;font-weight:700;font-size:16px;cursor:pointer;text-decoration:none;transition:transform .16s var(--p-ease),background-color .2s,border-color .2s;width:100%}
.apxp .p-btn:active{transform:scale(.97)}
.apxp .p-btn svg{width:22px;height:22px;flex:none}
.apxp .p-btn.wa{background:#1F8F4E;color:#fff}
.apxp .p-btn.wa:hover{background:#18763F}
.apxp .p-btn.line{background:#06A33C;color:#fff}
.apxp .p-btn.line:hover{background:#058A33}
.apxp .p-btn.plum{background:var(--p-plum);color:#fff}
.apxp .p-btn.plum:hover{background:var(--p-plum7)}
.apxp .p-btn.ghost{background:#fff;color:var(--p-plum);border-color:var(--p-l3)}
.apxp .p-btn.ghost:hover{border-color:var(--p-plum)}
.apxp .p-btn.sm{min-height:44px;width:auto;font-size:15px;padding:0 16px}
.apxp .p-btn[disabled]{opacity:.5;cursor:progress}
.apxp :is(a,button,textarea):focus-visible{outline:3px solid var(--p-lilac);outline-offset:2px}
.apxp .p-status{min-height:1.6em;font-size:14px;color:var(--p-ink2);margin-top:8px}
.apxp .p-send{background:linear-gradient(160deg,var(--p-night2),var(--p-plum7));color:var(--p-on);border:0}
.apxp .p-send h3{color:#fff}
.apxp .p-send .p-status{color:var(--p-on2)}
.apxp .p-empty{background:#fff;border:1px dashed var(--p-l3);border-radius:20px;padding:22px 18px}
.apxp .p-empty p{font-size:18px;font-weight:800}
.apxp .p-empty p+p{font-size:15px;font-weight:400;color:var(--p-ink2);margin-top:2px}
.apxp .p-empty .p-go{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
.apxp [hidden]{display:none!important}
@media (prefers-reduced-motion:reduce){.apxp *{transition:none!important}}
`;

function injectCSS() {
  if (document.getElementById('apxp-css')) return;
  const s = document.createElement('style'); s.id = 'apxp-css'; s.textContent = CSS; document.head.append(s);
}

function h(tag, attrs, ...kids) {
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

const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? ''));
const loc = lang => (lang === 'th' ? 'th-TH' : 'en-GB');
export function fmtDate(iso, lang, withYear = true) {
  if (!iso) return '';
  const d = typeof iso === 'number' ? new Date(iso) : new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  return d.toLocaleDateString(loc(lang), withYear ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' });
}

/* Plain-text summary used by WhatsApp and LINE. */
export function summaryText(plan, lang, vlist) {
  const L = o => t(o, lang);
  const out = [`${L(T.title)}: ${L(T.hospital)}`];
  if (plan.procedures.length) {
    out.push('', L(T.procs));
    plan.procedures.forEach(p => out.push('- ' + procLine(p, lang)));
  }
  if (plan.trip) {
    const tr = plan.trip;
    out.push('', L(T.trip));
    if (tr.procedures && tr.procedures.length) out.push(L(T.procs) + ': ' + tr.procedures.map(k => procName(k, lang)).join(', '));
    if (tr.branch) out.push(`${L(T.branch)}: ${L(BRANCHES[tr.branch]) || tr.branch}`);
    if (tr.arrival) out.push(`${L(T.arrival)}: ${fmtDate(tr.arrival, lang)}`);
    if (tr.consult) out.push(`${L(T.consult)}: ${fmtDate(tr.consult, lang)}`);
    if (tr.surgery) out.push(`${L(T.surgery)}: ${fmtDate(tr.surgery, lang)}`);
    if (tr.flyHome) out.push(`${L(T.flyHome)}: ${fmtDate(tr.flyHome, lang)}`);
    out.push(L(T.confirm));
  }
  if (vlist.length) {
    out.push('', L(T.vouchers));
    vlist.forEach(v => out.push(`- ${v.code}: ${t(v.prize, lang)}${v.expires ? `, ${L(T.validUntil).toLowerCase()} ${fmtDate(v.expires, lang)}` : ''}`));
  }
  if (plan.notes && plan.notes.trim()) out.push('', L(T.notes), plan.notes.trim());
  return out.join('\n');
}

function procLine(p, lang) {
  let s = procName(p.key, lang);
  if (p.area) s += `: ${areaName(p.area, lang)}`;
  if (p.concern) s += ` (${concernName(p.concern, lang)})`;
  return s;
}

export function whatsappUrl(text) { return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`; }
export function lineUrl(text) { return `https://line.me/R/oaMessage/${LINE_OA}/?${encodeURIComponent(text)}`; }

export function mount(container, opts = {}) {
  injectCSS();
  const lang = opts.lang === 'th' ? 'th' : 'en';
  const L = o => t(o, lang);
  const base = opts.base || new URL('../../', import.meta.url).href;
  const serviceUrl = typeof opts.serviceUrl === 'function' ? opts.serviceUrl : k => `service.html?p=${k}`;
  const emit = (n, d) => { try { opts.onEvent && opts.onEvent(n, d); } catch (e) { /* host handler error */ } };
  const site = new URL('../', base).href + (lang === 'en' ? 'en/' : '');
  const links = { bodymap: site + 'bodymap.html', nose: site + 'nose.html', games: site + 'games.html', trip: site + 'trip.html', ...(opts.links || {}) };

  const root = h('div', { class: 'apxp', lang });
  const wrap = h('div', { class: 'p-wrap' });
  root.append(wrap);
  container.append(root);

  const status = h('p', { class: 'p-status', role: 'status', 'aria-live': 'polite' });
  const notes = h('textarea', { id: 'apxp-notes', 'aria-describedby': 'apxp-notes-h', placeholder: L(T.notesPh), maxlength: '2000' });
  let noteTimer = 0;
  notes.addEventListener('input', () => {
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => { selfWrite = true; store.setNotes(notes.value); selfWrite = false; }, 300);
  });
  let selfWrite = false;
  const plural = (o, n) => { const v = o[lang]; return fill(Array.isArray(v) ? v[n === 1 ? 0 : 1] : v, { n }); };
  const countText = (p, v) => [p ? plural(T.nProc, p) : '', v ? plural(T.nVouch, v) : ''].filter(Boolean).join(lang === 'th' ? ' ' : ' and ');

  function render() {
    const plan = store.get();
    const vlist = store.vouchers();
    if (document.activeElement !== notes) notes.value = plan.notes || '';
    wrap.textContent = '';
    const isEmpty = !plan.procedures.length && !vlist.length && !plan.trip;

    wrap.append(h('div', { class: 'p-head' },
      h('h2', null, L(T.title)),
      isEmpty ? null : h('p', null, countText(plan.procedures.length, vlist.length))));

    const main = h('div', { class: 'p-main' });
    const side = h('div', { class: 'p-side' });
    wrap.append(h('div', { class: 'p-grid' }, main, side));

    if (!plan.procedures.length) {
      main.append(h('div', { class: 'p-empty', 'data-empty': '' },
        h('p', null, L(T.empty)),
        h('p', null, L(T.emptyAdd)),
        h('div', { class: 'p-go' },
          h('a', { class: 'p-btn ghost sm', href: links.bodymap }, L(T.bodymap)),
          h('a', { class: 'p-btn ghost sm', href: links.nose }, L(T.nose)),
          h('a', { class: 'p-btn ghost sm', href: links.games }, L(T.games)))));
    } else {
      main.append(h('section', { class: 'p-sec', 'aria-labelledby': 'apxp-ph' },
        h('h3', { id: 'apxp-ph' }, L(T.procs)),
        h('ul', { class: 'p-list' }, plan.procedures.map(p => procCard(p)))));
    }

    if (vlist.length) {
      main.append(h('section', { class: 'p-sec', 'aria-labelledby': 'apxp-vh' },
        h('h3', { id: 'apxp-vh' }, L(T.vouchers)),
        h('ul', { class: 'p-list' }, vlist.map(v => h('li', { class: 'p-v', 'data-code': v.code },
          h('b', null, t(v.prize, lang)),
          h('span', { class: 'p-vcode' }, v.code),
          h('small', null, [GAME_TITLES[v.game] ? L(GAME_TITLES[v.game]) : '', v.expires ? `${L(T.validUntil)} ${fmtDate(v.expires, lang)}` : ''].filter(Boolean).join(', ')))))));
    }

    side.append(tripBox(plan.trip));
    side.append(h('div', { class: 'p-box' },
      h('label', { class: 'p-lab', for: 'apxp-notes' }, L(T.notes)),
      h('span', { class: 'p-hint', id: 'apxp-notes-h' }, L(T.notesHint)),
      notes));

    const canSend = !isEmpty || (plan.notes || '').trim();
    const waBtn = h('a', { class: 'p-btn wa', href: '#', target: '_blank', rel: 'noopener', 'data-act': 'wa', html: ICON.wa + `<span>${L(T.wa)}</span>` });
    const lineBtn = h('a', { class: 'p-btn line', href: '#', target: '_blank', rel: 'noopener', 'data-act': 'line', html: ICON.line + `<span>${L(T.line)}</span>` });
    const setHref = () => {
      const txt = summaryText(store.get(), lang, store.vouchers());
      waBtn.href = whatsappUrl(txt); lineBtn.href = lineUrl(txt);
    };
    setHref();
    [waBtn, lineBtn].forEach(a => a.addEventListener('click', () => { setHref(); emit('plan:send', { channel: a.dataset.act }); }));
    const pngBtn = h('button', { type: 'button', class: 'p-btn ghost', 'data-act': 'png', html: ICON.save + `<span>${L(T.png)}</span>` });
    pngBtn.addEventListener('click', async () => {
      const lab = pngBtn.querySelector('span');
      pngBtn.disabled = true; lab.textContent = L(T.saving); status.textContent = '';
      try { const ok = await savePNG(); status.textContent = ok ? L(T.saved) : ''; emit('plan:save', { ok }); }
      catch (e) { status.textContent = L(T.saveFail); }
      pngBtn.disabled = false; lab.textContent = L(T.png);
    });
    side.append(h('div', { class: 'p-box p-send', hidden: !canSend },
      h('h3', null, L(T.send)),
      h('div', { class: 'p-acts' }, waBtn, lineBtn, pngBtn),
      status));
  }

  function procCard(p) {
    const P = PROCS[p.key];
    const name = procName(p.key, lang);
    return h('li', { class: 'p-proc', 'data-key': p.key, 'data-area': p.area || '' },
      h('h4', null, name),
      h('button', { type: 'button', class: 'p-rm', 'aria-label': fill(L(T.removeA), { x: name }), html: ICON.x + `<span>${L(T.remove)}</span>`,
        onclick: () => { store.removeProcedure(p.key, p.area || ''); emit('plan:remove', { procedure: p.key, area: p.area || '' }); } }),
      p.area ? h('p', { class: 'p-area' }, areaName(p.area, lang), p.concern ? h('span', null, `: ${concernName(p.concern, lang)}`) : null) : null,
      h('ul', { class: 'p-facts', 'aria-label': L(T.recovery) }, P.facts.map(f => h('li', null, t(f, lang)))),
      h('div', { class: 'p-links' }, h('a', { class: 'p-link', href: serviceUrl(p.key), html: `<span>${L(T.service)}</span>` + ICON.ext })));
  }

  function tripBox(tr) {
    if (!tr) return h('div', { class: 'p-box p-trip' },
      h('h3', null, L(T.trip)),
      h('p', { class: 'p-muted' }, L(T.noTrip)),
      h('div', { class: 'p-row' }, h('a', { class: 'p-link', href: links.trip }, L(T.planTrip))));
    const rows = [
      tr.procedures && tr.procedures.length ? [L(T.procs), tr.procedures.map(k => procName(k, lang)).join(', ')] : null,
      tr.branch ? [L(T.branch), L(BRANCHES[tr.branch]) || tr.branch] : null,
      [L(T.arrival), fmtDate(tr.arrival, lang)],
      [L(T.consult), fmtDate(tr.consult, lang)],
      [L(T.surgery), fmtDate(tr.surgery, lang)],
      tr.followup ? [L(T.followup), fmtDate(tr.followup, lang)] : null,
      [L(T.flyHome), fmtDate(tr.flyHome, lang), 'fly']
    ].filter(Boolean);
    return h('div', { class: 'p-box p-trip', 'data-trip': '' },
      h('h3', null, L(T.trip)),
      h('dl', null, rows.map(r => [h('dt', null, r[0]), h('dd', { class: r[2] || null }, r[1])])),
      h('p', { class: 'p-note' }, L(T.confirm)),
      h('div', { class: 'p-row' },
        h('a', { class: 'p-link', href: links.trip }, L(T.editTrip)),
        h('button', { type: 'button', class: 'p-rm', onclick: () => store.setTrip(null) }, L(T.removeTrip))));
  }

  /* ---------- summary card PNG ---------- */
  async function renderPNG() {
    try { await Promise.all([document.fonts.load('800 40px "LINE Seed"'), document.fonts.load('400 30px "LINE Seed"')]); } catch (e) { /* fonts optional */ }
    const plan = store.get(), vlist = store.vouchers();
    const W = 1080, P = 72, CW = W - P * 2;
    const F = (w, s) => `${w} ${s}px "LINE Seed","Sarabun","Noto Sans Thai",system-ui,sans-serif`;
    const c = document.createElement('canvas'), x = c.getContext('2d');
    const wrapText = (txt, font, max) => {
      x.font = font;
      const words = lang === 'th' && typeof Intl.Segmenter === 'function'
        ? [...new Intl.Segmenter('th', { granularity: 'word' }).segment(txt)].map(s => s.segment)
        : txt.split(/(\s+)/);
      const lines = []; let cur = '';
      words.forEach(w => { const n = cur + w; if (x.measureText(n).width > max && cur.trim()) { lines.push(cur.trim()); cur = w.trimStart(); } else cur = n; });
      if (cur.trim()) lines.push(cur.trim());
      return lines;
    };
    /* layout pass: list of draw ops with heights */
    const ops = [];
    const sec = title => ops.push({ k: 'sec', txt: title, hgt: 92 });
    const para = (txt, font, color, lh, gap = 0) => wrapText(txt, font, CW - 28).forEach((l, i, a) => ops.push({ k: 'txt', txt: l, font, color, lh, hgt: lh + (i === a.length - 1 ? gap : 0) }));
    if (plan.procedures.length) {
      sec(L(T.procs));
      plan.procedures.forEach(p => {
        para(procName(p.key, lang), F(800, 38), '#2A1F33', 52);
        if (p.area) para(areaName(p.area, lang) + (p.concern ? `: ${concernName(p.concern, lang)}` : ''), F(700, 28), '#55286F', 42);
        PROCS[p.key].facts.forEach((f, i, a) => para('• ' + t(f, lang), F(400, 27), '#5A4A66', 40, i === a.length - 1 ? 22 : 0));
      });
    }
    if (plan.trip) {
      const tr = plan.trip;
      sec(L(T.trip));
      const rows = [
        tr.branch ? [L(T.branch), L(BRANCHES[tr.branch])] : null,
        [L(T.arrival), fmtDate(tr.arrival, lang)], [L(T.consult), fmtDate(tr.consult, lang)],
        [L(T.surgery), fmtDate(tr.surgery, lang)], [L(T.flyHome), fmtDate(tr.flyHome, lang)]].filter(Boolean);
      rows.forEach((r, i) => ops.push({ k: 'row', a: r[0], b: r[1], hot: i === rows.length - 1, hgt: 50 }));
      para(L(T.confirm), F(400, 25), '#5A4A66', 38, 14);
    }
    if (vlist.length) {
      sec(L(T.vouchers));
      vlist.forEach(v => {
        para(t(v.prize, lang), F(800, 32), '#2A1F33', 46);
        para(`${v.code}${v.expires ? `, ${L(T.validUntil).toLowerCase()} ${fmtDate(v.expires, lang)}` : ''}`, F(700, 26), '#6A388C', 40, 16);
      });
    }
    if (plan.notes && plan.notes.trim()) {
      sec(L(T.notes));
      plan.notes.trim().split(/\n+/).slice(0, 12).forEach(n => para(n, F(400, 27), '#2A1F33', 40));
    }
    const HEAD = 300, FOOT = 150;
    const H = HEAD + ops.reduce((s, o) => s + o.hgt, 0) + FOOT;
    c.width = W; c.height = H;
    x.fillStyle = '#FBF3FB'; x.fillRect(0, 0, W, H);
    const g = x.createLinearGradient(0, 0, W, HEAD);
    g.addColorStop(0, '#2A0F40'); g.addColorStop(1, '#6A388C');
    x.fillStyle = g; x.fillRect(0, 0, W, HEAD - 40);
    /* stitched seam under the header */
    x.strokeStyle = '#C9B3DD'; x.lineWidth = 4; x.setLineDash([18, 14]);
    x.beginPath(); x.moveTo(P, HEAD - 70); x.lineTo(W - P, HEAD - 70); x.stroke(); x.setLineDash([]);
    x.textBaseline = 'alphabetic';
    x.fillStyle = '#CDB9DD'; x.font = F(700, 30); x.fillText(L(T.hospital), P, 96);
    x.fillStyle = '#FFFFFF'; x.font = F(800, 84); x.fillText(L(T.title), P, 190);
    let y = HEAD;
    ops.forEach(o => {
      if (o.k === 'sec') {
        x.fillStyle = '#CC3366'; x.fillRect(P, y + 30, 8, 36);
        x.fillStyle = '#6A388C'; x.font = F(800, 34); x.fillText(o.txt, P + 24, y + 60);
      } else if (o.k === 'txt') {
        x.fillStyle = o.color; x.font = o.font; x.fillText(o.txt, P + 24, y + o.lh - (o.lh > 46 ? 14 : 10));
      } else if (o.k === 'row') {
        x.font = F(400, 28); x.fillStyle = '#5A4A66'; x.fillText(o.a, P + 24, y + 36);
        x.font = F(800, 28); x.fillStyle = o.hot ? '#CC3366' : '#2A1F33';
        const wv = x.measureText(o.b).width; x.fillText(o.b, W - P - wv, y + 36);
        x.strokeStyle = '#E4D8EE'; x.lineWidth = 2; x.beginPath(); x.moveTo(P + 24, y + o.hgt - 2); x.lineTo(W - P, y + o.hgt - 2); x.stroke();
      }
      y += o.hgt;
    });
    x.fillStyle = '#F1EAF7'; x.fillRect(0, H - FOOT + 30, W, FOOT - 30);
    x.fillStyle = '#55286F'; x.font = F(700, 26);
    x.fillText(`WhatsApp +66 85 000 2001   LINE ${LINE_OA}`, P, H - 52);
    return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('toBlob'))), 'image/png'));
  }

  async function savePNG() {
    const blob = await renderPNG();
    const name = 'apex-my-plan.png';
    try {
      const file = new File([blob], name, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: L(T.title) });
        return true;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return false;
    }
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  }

  render();
  const unsub = store.subscribe(() => { if (!selfWrite) render(); });
  window.__apexPlanPNG = renderPNG;

  return {
    destroy() { unsub(); clearTimeout(noteTimer); root.remove(); if (window.__apexPlanPNG === renderPNG) delete window.__apexPlanPNG; },
    render
  };
}

/* Header badge: shows the plan item count inside el, hidden at zero. */
export function badge(el, opts = {}) {
  const lang = opts.lang === 'th' ? 'th' : 'en';
  const upd = () => {
    const n = store.count();
    el.textContent = n > 99 ? '99+' : String(n);
    el.hidden = n === 0;
    el.setAttribute('aria-label', fill(t(T.itemsA, lang), { n }));
    el.dataset.count = String(n);
  };
  upd();
  const unsub = store.subscribe(upd);
  const onStore = e => { if (!e.key || e.key === store.KEY || e.key === store.GAMES_VOUCHER_KEY) upd(); };
  window.addEventListener('storage', onStore);
  return { destroy() { unsub(); window.removeEventListener('storage', onStore); }, update: upd };
}
