/* Implant Viewer
   One viewer per implant area: breast, chin, forehead and nose. Each opens on a 3D model with the
   implant in place beside the model without it, turned together by dragging. Breast implants come
   from Motiva's and Mentor's size tables
   and are added at their true volume on a body of the visitor's height, weight and current size.
   Face implants come from published silicone implant sizes and are laid on in millimetres.
   Everything runs in the browser.

   mount(container, opts) -> {destroy()}
   opts: lang 'en' | 'th', area 'breast' | 'chin' | 'forehead' | 'nose', links {breast, chin, forehead, nose, consult},
         serviceUrl(key), onEvent(name, data)
   Testing only: threeUrl */
import * as S from './shapes.js';
import {BREAST, CHIN, FOREHEAD, NOSE} from './catalog.js';
import {createScene} from './scene.js';

const AREAS = ['breast', 'chin', 'forehead', 'nose'];
const GOLD = '#E3B85C';
const LINKS = {breast:'breast-implants.html', chin:'chin-implants.html', forehead:'forehead-implants.html', nose:'nose-implants.html', consult:'consult.html'};

const STR = {
  en:{
    area:{breast:'Breast', chin:'Chin', forehead:'Forehead', nose:'Nose'},
    areaNav:'Implant viewers',
    now:'Now', after:'With implant', front:'Front', angle:'45°', side:'Side', views:'Turn the model',
    xray:'See the implant', change:'Show the change', split:'Side by side', drag:'Drag to turn, pinch to zoom.',
    you:'You', height:'Height', weight:'Weight', cup:'Current cup size', sex:'Face', women:'Women', men:'Men',
    implant:'Implant', brand:'Brand and line', profile:'Profile', size:'Size', style:'Style', shape:'Shape', thick:'Thickness',
    compare:'Compare with another size', compareSize:'Second size', save:'Save', saveBtn:'Save to phone', plan:'Add to My Plan',
    planned:'Added to My Plan', consult:'Ask a surgeon', loading:'Loading the model',
    sim:'Simulation only', vary:'Results vary from person to person. Your surgeon measures you and chooses the implant with you.',
    cc:'cc', each:'each side', wide:'wide', proj:'projection', tall:'tall', mm:'mm', cm:'cm', kg:'kg',
    adds:'Adds', cupNow:'Cup size', cupAbout:'about', forward:'further forward', raised:'Bridge raised', tipLift:'Tip forward about',
    fuller:'Forehead comes forward', chinFwd:'Chin comes forward', across:'across', taper:'At the centre, tapering to the edges', fit:'This implant is wider than your breast base of about {b} cm. Surgeons usually choose one at or under it.',
    modelCredit:['The men\'s 3D head is adapted from', 'by lKutts,'],
    estimate:'Tip lift is an estimate. No maker publishes one.',
    err:{model:'The 3D model could not be loaded.', save:'The image could not be saved.'},
    note:{breast:'Sizes and shapes come from the Motiva and Mentor size tables. The implant is added at its full volume on a body of your height and weight.',
          chin:'Sizes from the Implantech chin catalogue. The chin moves forward a little less than the implant is thick, as the skin over it takes up some.',
          forehead:'Thickness as used for silicone forehead implants, 3 to 6 mm at the centre and tapering to the edges.',
          nose:'Thickness from the Implantech dorsal implant sizes, 1.5 to 4.5 mm.'},
    brandName:'Apex Surgery Hospital',
  },
  th:{
    area:{breast:'หน้าอก', chin:'คาง', forehead:'หน้าผาก', nose:'จมูก'},
    areaNav:'จำลองซิลิโคน',
    now:'ตอนนี้', after:'หลังเสริม', front:'ด้านหน้า', angle:'45°', side:'ด้านข้าง', views:'หมุนโมเดล',
    xray:'ดูซิลิโคน', change:'แสดงส่วนที่เปลี่ยน', split:'เทียบสองภาพ', drag:'ลากเพื่อหมุน ใช้สองนิ้วเพื่อซูม',
    you:'ข้อมูลของคุณ', height:'ส่วนสูง', weight:'น้ำหนัก', cup:'คัพปัจจุบัน', sex:'ใบหน้า', women:'ผู้หญิง', men:'ผู้ชาย',
    implant:'ซิลิโคน', brand:'ยี่ห้อและรุ่น', profile:'ทรง', size:'ขนาด', style:'ทรง', shape:'ทรง', thick:'ความหนา',
    compare:'เทียบกับอีกขนาด', compareSize:'ขนาดที่สอง', save:'บันทึก', saveBtn:'บันทึกลงโทรศัพท์', plan:'เพิ่มในแผนของฉัน',
    planned:'เพิ่มในแผนแล้ว', consult:'ปรึกษาศัลยแพทย์', loading:'กำลังโหลดโมเดล',
    sim:'ภาพจำลองเท่านั้น', vary:'ผลลัพธ์อาจแตกต่างกันในแต่ละบุคคล ศัลยแพทย์จะวัดสัดส่วนและเลือกซิลิโคนร่วมกับคุณ',
    cc:'ซีซี', each:'ต่อข้าง', wide:'กว้าง', proj:'ความสูงฐานถึงยอด', tall:'สูง', mm:'มม.', cm:'ซม.', kg:'กก.',
    adds:'เพิ่ม', cupNow:'คัพ', cupAbout:'ประมาณ', forward:'ยื่นออกมา', raised:'สันจมูกสูงขึ้น', tipLift:'ปลายจมูกยื่นขึ้นประมาณ',
    fuller:'หน้าผากนูนขึ้น', chinFwd:'คางยื่นออกมา', across:'ความยาว', taper:'หนาสุดตรงกลาง บางลงที่ขอบ', fit:'ซิลิโคนนี้กว้างกว่าฐานหน้าอกของคุณซึ่งประมาณ {b} ซม. ศัลยแพทย์มักเลือกขนาดที่ไม่เกินฐานหน้าอก',
    modelCredit:['ศีรษะ 3D ของผู้ชายดัดแปลงจาก', 'โดย lKutts ภายใต้'],
    estimate:'ระยะปลายจมูกที่ยื่นขึ้นเป็นค่าประมาณ ผู้ผลิตไม่ได้ระบุไว้',
    err:{model:'โหลดโมเดล 3 มิติไม่ได้', save:'บันทึกรูปไม่ได้'},
    note:{breast:'ขนาดและทรงจากตารางขนาดของ Motiva และ Mentor ซิลิโคนถูกเพิ่มเต็มปริมาตรบนร่างกายตามส่วนสูงและน้ำหนักของคุณ',
          chin:'ขนาดจากแคตตาล็อกซิลิโคนคางของ Implantech คางยื่นออกน้อยกว่าความหนาของซิลิโคนเล็กน้อย เพราะผิวที่คลุมอยู่รับไว้บางส่วน',
          forehead:'ความหนาตามที่ใช้กับซิลิโคนหน้าผาก 3 ถึง 6 มม. ตรงกลาง และบางลงที่ขอบ',
          nose:'ความหนาจากขนาดซิลิโคนเสริมสันจมูกของ Implantech 1.5 ถึง 4.5 มม.'},
    brandName:'Apex Surgery Hospital',
  },
};

const ICON = {
  download:'<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
  plus:'<path d="M5 12h14"/><path d="M12 5v14"/>', check:'<path d="M20 6 9 17l-5-5"/>',
  arrow:'<path d="M7 7h10v10"/><path d="M7 17 17 7"/>', move:'<path d="m18 8 4 4-4 4"/><path d="M2 12h20"/><path d="m6 8-4 4 4 4"/>',
  alert:'<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>', msg:'<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  cube:'<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  rotate:'<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>',
};
const ic = k => `<svg class="im-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;

const CSS = `
.im{--im-plum:var(--plum,#6A388C);--im-plum-7:var(--plum-700,#55286F);--im-night:var(--night,#1F0A30);--im-night-2:var(--night-2,#2A0F40);
  --im-lilac:var(--lilac,#A886CD);--im-lilac-3:var(--lilac-300,#C9B3DD);--im-lilac-2:var(--lilac-200,#E4D8EE);--im-lilac-1:var(--lilac-100,#F1EAF7);
  --im-wash:var(--wash,#FBF3FB);--im-ink:var(--ink,#2A1F33);--im-ink-2:var(--ink-2,#5A4A66);--im-ink-3:var(--ink-3,#7C6A88);
  --im-on:var(--on-night,#F6EEFB);--im-on-2:var(--on-night-2,#CDB9DD);--im-gold:${GOLD};--im-gold-d:#9A6B12;--im-ease:cubic-bezier(.23,1,.32,1);
  font-family:var(--font,"LINE Seed","Sarabun","Noto Sans Thai",system-ui,sans-serif);color:var(--im-ink);line-height:1.6;display:grid;gap:14px;min-width:0;-webkit-tap-highlight-color:transparent}
.im *,.im *::before,.im *::after{box-sizing:border-box}
.im :where(button){font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
.im [hidden]{display:none!important}
.im-i{width:1.15em;height:1.15em;flex:none;display:inline-block;vertical-align:-.18em}
.im-areas{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:2px}
.im-areas::-webkit-scrollbar{display:none}
.im-areas a{flex:none;display:inline-flex;align-items:center;min-height:40px;padding:0 16px;border-radius:999px;border:1px solid var(--im-lilac-2);background:#fff;color:var(--im-plum);font-weight:700;font-size:14.5px;text-decoration:none;transition:background-color .2s,color .2s}
.im-areas a:hover{background:var(--im-lilac-1)}
.im-areas a[aria-current=page]{background:var(--im-plum);border-color:var(--im-plum);color:#fff}
.im-main{display:grid;gap:14px;min-width:0}
@media (min-width:960px){.im-main{grid-template-columns:minmax(0,1fr) 360px;grid-template-areas:"stage panel" "sum panel";gap:24px;align-items:start}
  .im-stage{grid-area:stage}.im-sum{grid-area:sum}.im-panel{grid-area:panel}}
.im-stage{position:relative;min-width:0;background:radial-gradient(120% 80% at 50% 0%,var(--im-night-2),var(--im-night) 70%);color:var(--im-on);border-radius:28px;padding:10px;display:grid;gap:10px}
.im-v button:focus-visible,.im-sw-b:focus-visible{outline:2px solid var(--im-lilac);outline-offset:2px}
.im-view{position:relative;border-radius:20px;overflow:hidden;min-height:min(66vh,480px);display:grid}
@media (min-width:960px){.im-view{min-height:min(74vh,660px)}}
.im-3d{position:absolute;inset:0}
.im-gl{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab}
.im-gl:active{cursor:grabbing}
.im-gl:focus-visible{outline:2px solid var(--im-lilac);outline-offset:-2px;border-radius:20px}
.im-panes{position:absolute;inset:0;display:grid;grid-auto-flow:column;grid-auto-columns:1fr;pointer-events:none}
.im-panes>div{position:relative;border-left:1px solid rgba(201,179,221,.14)}
.im-panes>div:first-child{border-left:0;border-top:0}
.im-panes.stack{grid-auto-flow:row;grid-auto-rows:1fr}
.im-panes.stack>div{border-left:0;border-top:1px solid rgba(201,179,221,.14)}
.im-tag{position:absolute;top:10px;left:10px;z-index:1;padding:3px 10px;border-radius:999px;font-size:12.5px;font-weight:700;background:rgba(31,10,48,.62);color:#fff;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);white-space:nowrap}
.im-tag.gold{background:rgba(227,184,92,.92);color:#2A1F33}
.im-hint{position:absolute;left:12px;bottom:12px;max-width:52%;margin:0;line-height:1.35;font-size:12.5px;color:var(--im-on-2);pointer-events:none;transition:opacity .4s}
.im-tag.sim{top:auto;bottom:10px;left:auto;right:10px;background:rgba(255,255,255,.9);color:var(--im-plum)}
.im-busy{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:12px;background:rgba(31,10,48,.72);color:#fff;font-weight:700;z-index:5}
.im-spin{width:40px;height:40px;border-radius:50%;border:3px solid rgba(255,255,255,.22);border-top-color:var(--im-gold);animation:im-spin .8s linear infinite}
@keyframes im-spin{to{transform:rotate(360deg)}}
.im-bar{display:flex;align-items:center;gap:8px 10px;flex-wrap:wrap;justify-content:space-between;padding:2px 6px 4px;min-height:44px}
.im-v{display:inline-flex;gap:4px;padding:4px;border-radius:999px;background:rgba(255,255,255,.07)}
.im-v button{min-height:36px;padding:0 13px;border-radius:999px;font-size:14px;font-weight:700;color:var(--im-on-2);transition:background-color .2s,color .2s}
.im-v button[aria-pressed=true]{background:rgba(255,255,255,.16);color:#fff}
.im-bar-r{display:flex;gap:8px;flex-wrap:wrap}
.im .im-sw-b{white-space:nowrap;display:inline-flex;align-items:center;gap:10px;height:38px;padding:0 10px 0 14px;border-radius:999px;border:1px solid rgba(201,179,221,.5);color:#fff;font-size:14px;font-weight:700}
.im-sw{position:relative;flex:none;width:30px;height:18px;border-radius:999px;background:rgba(255,255,255,.2);transition:background-color .2s}
.im-sw::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:transform .2s var(--im-ease)}
[aria-checked=true]>.im-sw{background:var(--im-gold-d)}
[aria-checked=true]>.im-sw::after{transform:translateX(12px)}
.im-credit{margin:0;padding:0 8px 4px;font-size:12px;line-height:1.4;color:var(--im-on-2)}
.im-big{width:64px;height:64px;border-radius:20px;display:grid;place-items:center;background:rgba(255,255,255,.07);border:1px solid rgba(201,179,221,.22);color:var(--im-gold);font-size:30px}
/* buttons */
.im .im-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5em;height:44px;padding:0 18px;border-radius:999px;font-size:15px;font-weight:700;white-space:nowrap;transition:transform .16s var(--im-ease),background-color .2s,color .2s,border-color .2s;text-decoration:none}
.im .im-btn:active{transform:scale(.97)}
.im .im-btn:disabled{opacity:.45;cursor:not-allowed;transform:none}
.im .im-btn.pri{background:var(--im-plum);color:#fff;box-shadow:0 10px 24px -12px rgba(106,56,140,.8)}
.im .im-btn.pri:hover:not(:disabled){background:var(--im-plum-7)}
.im .im-btn.lt{background:#fff;color:var(--im-plum)}
.im .im-btn.gh{border:1px solid rgba(201,179,221,.5);color:#fff}
.im .im-btn.gh:hover{background:rgba(255,255,255,.08)}
.im .im-btn.ol{border:1px solid var(--im-lilac-3);color:var(--im-plum);background:#fff}
.im .im-btn.ol:hover:not(:disabled){background:var(--im-lilac-1)}
.im .im-btn.sm{height:38px;padding:0 14px;font-size:14px}
.im .im-btn.wide{width:100%}
/* summary */
.im-sum{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));min-width:0}
.im-card{padding:14px 16px;border-radius:20px;border:1px solid var(--im-lilac-2);background:#fff;display:grid;gap:2px;align-content:start}
.im-card.gold{background:linear-gradient(135deg,#FFFBF0,#FFF0CF);border-color:#EAD5A2}
.im-card span{font-size:13px;color:var(--im-ink-2);font-weight:700}
.im-card b{font-size:22px;line-height:1.25;color:var(--im-ink);font-variant-numeric:tabular-nums}
.im-card.gold b{color:var(--im-gold-d)}
.im-card small{font-size:13px;color:var(--im-ink-2);line-height:1.4}
.im-warn{grid-column:1/-1;margin:0;display:flex;gap:8px;align-items:flex-start;font-size:14px;line-height:1.45;color:#7A4A00;background:#FFF6E0;border:1px solid #F0D9A0;border-radius:14px;padding:10px 12px}
.im-warn .im-i{margin-top:2px}
/* panel */
.im-panel{min-width:0;background:#fff;border:1px solid var(--im-lilac-2);border-radius:28px;padding:20px;display:grid;gap:22px}
@media (min-width:960px){.im-panel{position:sticky;top:96px}}
.im-sec{display:grid;gap:10px;min-width:0}
.im-sec h3{margin:0;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--im-plum);font-weight:700;display:flex;align-items:center;gap:8px}
.im-sec h3 i{font-style:normal;width:22px;height:22px;border-radius:50%;background:var(--im-lilac-1);display:grid;place-items:center;font-size:12px;letter-spacing:0}
.im-lab{font-size:14px;font-weight:700;color:var(--im-ink)}
.im-seg{display:flex;flex-wrap:wrap;gap:4px;padding:4px;border-radius:22px;background:var(--im-lilac-1)}
.im-seg button{flex:1 1 auto;min-height:40px;padding:0 10px;border-radius:999px;font-weight:700;font-size:14px;color:var(--im-plum);transition:background-color .2s,color .2s;white-space:nowrap}
.im-seg button[aria-pressed=true]{background:var(--im-plum);color:#fff;box-shadow:0 8px 18px -10px rgba(106,56,140,.8)}
.im-seg button:focus-visible{outline:2px solid var(--im-lilac);outline-offset:2px}
.im-amt{display:grid;gap:6px}
.im-amt div{display:flex;justify-content:space-between;gap:10px;font-size:14px;font-weight:700;color:var(--im-ink)}
.im-amt output{color:var(--im-plum);font-variant-numeric:tabular-nums;text-align:right}
.im input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:6px;margin:10px 0;background:linear-gradient(90deg,var(--im-plum) var(--v,50%),var(--im-lilac-2) var(--v,50%));outline-offset:8px}
.im input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:26px;height:26px;border-radius:50%;background:#fff;border:2px solid var(--im-plum);box-shadow:0 6px 16px -6px rgba(74,22,104,.5);cursor:pointer}
.im input[type=range]::-moz-range-thumb{width:24px;height:24px;border-radius:50%;background:#fff;border:2px solid var(--im-plum);cursor:pointer}
.im select{width:100%;min-height:44px;padding:0 40px 0 14px;border-radius:14px;border:1px solid var(--im-lilac-3);background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%236A388C' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") no-repeat right 12px center;-webkit-appearance:none;appearance:none;font:inherit;font-size:15px;color:var(--im-ink)}
.im select:focus-visible{outline:2px solid var(--im-lilac);outline-offset:2px}
.im-desc{margin:0;font-size:14px;line-height:1.45;color:var(--im-ink-2)}
.im-tg{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;min-height:44px;padding:0 4px;font-size:14.5px;font-weight:700;color:var(--im-ink)}
.im-tg .im-sw{background:var(--im-lilac-2)}
.im-tg[aria-checked=true] .im-sw{background:var(--im-plum)}
.im-tg:focus-visible{outline:2px solid var(--im-lilac);outline-offset:2px;border-radius:10px}
.im-err{margin:0;font-size:14px;color:#CC3366}
.im-note{margin:0;font-size:13px;line-height:1.45;color:var(--im-ink-3)}
.im-mcredit{margin:8px 0 0;font-size:11.5px;line-height:1.45;color:var(--im-ink-3)}
.im-mcredit a{color:inherit}
.im-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 16px;padding:14px 18px;border-radius:20px;background:var(--im-wash);border:1px solid var(--im-lilac-2)}
.im-foot p{margin:0;font-size:15px;color:var(--im-ink-2)}
@media (prefers-reduced-motion:reduce){.im *{transition:none!important;animation-duration:1.6s!important}}
`;

/* ===================================================================== */
let styleRefs = 0, styleEl = null;
const cupIndex = c => S.CUPS.indexOf(c);

export function mount(container, opts = {}){
  const lang = opts.lang === 'th' ? 'th' : 'en', T = STR[lang];
  const area = AREAS.includes(opts.area) ? opts.area : 'breast', face = area !== 'breast';
  const links = Object.assign({}, LINKS, opts.links || {});
  const emit = (n, d) => { try { opts.onEvent && opts.onEvent(n, d); } catch (e) {} };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c]));
  const fmt = (x, d = 1) => (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toLocaleString(lang === 'th' ? 'th-TH' : 'en-US', {maximumFractionDigits:d});
  if (!styleRefs++) { styleEl = document.createElement('style'); styleEl.dataset.feature = 'implants'; styleEl.textContent = CSS; document.head.append(styleEl); }

  /* ---------- state ---------- */
  const state = {mode:'3d', view:face ? 1.2 : .55, xray:false, change:true, split:true, planned:false,
    body:{height:160, weight:52, cup:'A'}, sex:'female',
    line:'motiva-ergonomix', profile:'demi', cc:300, compare:false, cc2:375,
    chin:{style:'extended', size:1}, forehead:{size:1}, nose:{shape:'i', size:1},
  };
  const KEY = 'apex.implants';
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (p) {
      if (p.body) { const b = p.body; if (b.height >= 140 && b.height <= 190) state.body.height = b.height; if (b.weight >= 35 && b.weight <= 120) state.body.weight = b.weight; if (S.CUPS.includes(b.cup)) state.body.cup = b.cup; }
      if (p.sex === 'male') state.sex = 'male';
      if (BREAST.some(l => l.id === p.line)) state.line = p.line;
      if (typeof p.profile === 'string') state.profile = p.profile;
      if (p.cc > 0) state.cc = p.cc;
    }
  } catch (e) {}
  const remember = () => { try { localStorage.setItem(KEY, JSON.stringify({body:state.body, sex:state.sex, line:state.line, profile:state.profile, cc:state.cc})); } catch (e) {} };

  const line = () => BREAST.find(l => l.id === state.line) || BREAST[0];
  const prof = () => { const L = line(); return L.profiles.find(p => p.id === state.profile) || L.profiles[Math.min(1, L.profiles.length - 1)]; };
  const nearest = (cc) => { const s = prof().sizes; let b = s[0]; for (const z of s) if (Math.abs(z[0] - cc) < Math.abs(b[0] - cc)) b = z; return b; };
  const breastImp = cc => { const L = line(), z = nearest(cc); return {cc:z[0], width:z[1], projection:z[2], height:z[3] || null, teardrop:!!L.teardrop, sag:L.sag}; };
  const faceImp = () => {
    if (area === 'chin') { const st = CHIN.find(c => c.id === state.chin.style) || CHIN[1], z = st.sizes[Math.min(state.chin.size, st.sizes.length - 1)]; return {area, ...z, name:st[lang] || st.en, code:z.s}; }
    if (area === 'forehead') { const z = FOREHEAD.sizes[state.forehead.size]; return {area, mm:z.mm, widthMm:FOREHEAD.widthMm, code:z.s}; }
    const z = NOSE.sizes[state.nose.size]; return {area, mm:z.mm, widthMm:NOSE.widthMm, tipMm:state.nose.shape === 'l' ? z.tipMm : 0, code:z.s, shape:state.nose.shape};
  };

  /* ---------- markup ---------- */
  const seg = (name, items, label) => `<div class="im-seg" role="group" aria-label="${esc(label)}" data-seg="${name}">${items.map(([v, t]) => `<button type="button" data-v="${esc(v)}" aria-pressed="false">${esc(t)}</button>`).join('')}</div>`;
  const amt = (k, label, min, max, step) => `<label class="im-amt"><div><span>${esc(label)}</span><output data-r="${k}v"></output></div><input type="range" min="${min}" max="${max}" step="${step}" data-r="${k}"></label>`;
  const youSec = face
    ? `<span class="im-lab" id="im-sex">${esc(T.sex)}</span>${seg('sex', [['female', T.women], ['male', T.men]], T.sex)}`
    : `${amt('height', T.height, 145, 185, 1)}${amt('weight', T.weight, 38, 95, 1)}<span class="im-lab">${esc(T.cup)}</span>${seg('cup', S.CUPS.map(c => [c, c]), T.cup)}`;
  let impSec;
  if (area === 'breast') impSec = `<label class="im-lab" for="im-line">${esc(T.brand)}</label>
      <select id="im-line" data-r="line">${BREAST.map(l => `<option value="${l.id}">${esc(l.name)}</option>`).join('')}</select>
      <span class="im-lab">${esc(T.profile)}</span><div data-r="profiles"></div>
      ${amt('cc', T.size, 0, 1, 1)}
      <button class="im-tg" type="button" role="switch" aria-checked="false" data-act="compare">${esc(T.compare)}<span class="im-sw" aria-hidden="true"></span></button>
      <div data-r="cmp" hidden>${amt('cc2', T.compareSize, 0, 1, 1)}</div>`;
  else if (area === 'chin') impSec = `<span class="im-lab">${esc(T.style)}</span>${seg('chinStyle', CHIN.map(c => [c.id, c[lang] || c.en]), T.style)}<p class="im-desc" data-r="desc"></p>
      <span class="im-lab">${esc(T.size)}</span><div data-r="chinSizes"></div>`;
  else if (area === 'forehead') impSec = `<span class="im-lab">${esc(T.thick)}</span>${seg('fhSize', FOREHEAD.sizes.map((z, i) => [i, z.s.replace('mm', T.mm)]), T.thick)}`;
  else impSec = `<span class="im-lab">${esc(T.shape)}</span>${seg('noseShape', NOSE.shapes.map(s => [s.id, s[lang] || s.en]), T.shape)}<p class="im-desc" data-r="desc"></p>
      <span class="im-lab">${esc(T.thick)}</span>${seg('noseSize', NOSE.sizes.map((z, i) => [i, z.s.replace('mm', T.mm)]), T.thick)}<p class="im-note" data-r="est" hidden>${esc(T.estimate)}</p>`;
  const planOk = area === 'breast' || area === 'nose';

  const root = document.createElement('div');
  root.className = 'im'; root.lang = lang; root.dataset.area = area;
  root.innerHTML = `
  <nav class="im-areas" aria-label="${esc(T.areaNav)}">${AREAS.map(a => `<a href="${esc(links[a])}"${a === area ? ' aria-current="page"' : ''}>${esc(T.area[a])}</a>`).join('')}</nav>
  <div class="im-main">
    <section class="im-stage" aria-label="${esc(T.area[area])}">
      <div class="im-view">
        <div class="im-3d" id="im-p3">
          <div class="im-panes" aria-hidden="true"></div>
          <p class="im-hint">${esc(T.drag)}</p>
          <span class="im-tag sim">${esc(T.sim)}</span>
          <div class="im-busy" data-r="busy3"><span class="im-spin"></span><span>${esc(T.loading)}</span></div>
        </div>
      </div>
      <div class="im-bar" data-r="bar3">
        <div class="im-v" role="group" aria-label="${esc(T.views)}">
          <button type="button" data-yaw="0" aria-pressed="false">${esc(T.front)}</button><button type="button" data-yaw="${face ? .78 : .62}" aria-pressed="false">${esc(T.angle)}</button><button type="button" data-yaw="1.57" aria-pressed="false">${esc(T.side)}</button>
        </div>
        <div class="im-bar-r">
          <button class="im-sw-b" type="button" role="switch" aria-checked="false" data-act="${face ? 'change' : 'xray'}">${esc(face ? T.change : T.xray)}<span class="im-sw" aria-hidden="true"></span></button>
          <button class="im-sw-b" type="button" role="switch" aria-checked="true" data-act="split">${esc(T.split)}<span class="im-sw" aria-hidden="true"></span></button>
        </div>
      </div>
    </section>
    <section class="im-sum" aria-live="polite" data-r="sum"></section>
    <aside class="im-panel">
      <div class="im-sec"><h3><i>1</i>${esc(T.you)}</h3>${youSec}</div>
      <div class="im-sec"><h3><i>2</i>${esc(T.implant)}</h3>${impSec}<p class="im-note">${esc(T.note[area])}</p></div>
      <div class="im-sec"><h3><i>3</i>${esc(T.save)}</h3>
        <button class="im-btn pri wide" data-act="save">${ic('download')}${esc(T.saveBtn)}</button>
        ${planOk ? `<button class="im-btn ol wide" data-act="plan">${ic('plus')}<span>${esc(T.plan)}</span></button>` : ''}
        <a class="im-btn ol wide" href="${esc(links.consult)}">${ic('msg')}${esc(T.consult)}</a>
        <p class="im-err" data-r="saveerr" hidden></p>
        ${face ? `<p class="im-mcredit">${esc(T.modelCredit[0])} <a href="https://sketchfab.com/3d-models/male-head-sculpt-deb721f8d38e4b00b17abadd5ace9cc1" target="_blank" rel="noopener">Male Head Sculpt</a> ${esc(T.modelCredit[1])} <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a></p>` : ''}
      </div>
    </aside>
  </div>
  <div class="im-foot"><p>${esc(T.vary)}</p></div>`;
  container.append(root);
  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)], R = k => root.querySelector(`[data-r="${k}"]`);

  /* ---------- 3D ---------- */
  let sc = null, M = null, dead = false;
  const G = {};          // working buffers
  async function start3d(){
    try {
      // the model (about 370 KB) waits until the page has drawn, so it does not hold up the first screen
      await new Promise(go => { const run = () => requestAnimationFrame(() => setTimeout(go, 0)); document.readyState === 'complete' ? run() : addEventListener('load', run, {once:true}); });
      if (dead) return;
      const url = new URL(face ? './face.bin' : './torso.bin', import.meta.url);
      const [buf, scene] = await Promise.all([fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }),
        createScene($('.im-3d'), {threeUrl:opts.threeUrl, fov:face ? 20 : 24, fit:face ? .78 : .75, onTouch:() => { const h = $('.im-hint'); if (h) h.style.opacity = 0; }, onChange:() => syncViews(), onLayout:st => $('.im-panes').classList.toggle('stack', st)})]);
      if (dead) { scene.destroy(); return; }
      sc = scene;
      $('.im-3d').prepend(sc.canvas);
      sc.canvas.setAttribute('aria-label', T.area[area] + ' · ' + T.drag);
      M = face ? S.faceModel(buf) : S.torsoModel(buf);
      setupModel();
      R('busy3').hidden = true;
      update();
      sc.setView(state.view, 0);
      syncViews();
    } catch (e) {
      R('busy3').innerHTML = `<span class="im-big">${ic('alert')}</span><span>${esc(T.err.model)}</span>`;
      emit('implants:error', {error:'model'});
    }
  }
  function colors(T0){
    const N = M.N, c = new Float32Array(N * 3), P = face ? M[state.sex] : M.base;
    let y0 = 1e9; for (let i = 1; i < N * 3; i += 3) y0 = Math.min(y0, P[i]);
    for (let i = 0; i < N; i++) {
      let r = .86, g = .79, b = .91;
      // the cut edge fades into the stage, so the model reads as a bust rather than a cut-off shape
      const f = .12 + .88 * S.smooth(y0, y0 + (face ? .55 : .9), P[i * 3 + 1]);
      r *= f; g *= f; b *= f;
      if (face) { const k = M.kind[i]; if (k === 2) { r = .16; g = .1; b = .22; } else if (k === 1) { r = .9; g = .68; b = .76; } }
      if (T0 && T0[i] > 0) { const t = Math.min(1, T0[i]) * .75; r += (.95 - r) * t; g += (.76 - g) * t; b += (.38 - b) * t; }
      c[i * 3] = r; c[i * 3 + 1] = g; c[i * 3 + 2] = b;
    }
    return c;
  }
  function setupModel(){
    G.base = colors(null);
    sc.setModel({pos:face ? M[state.sex] : M.base, idx:M.tri, colors:G.base, capStart:face ? null : M.h.capStart}, 2);
    frameCam();
  }
  function frameCam(){
    if (!sc || !M) return;
    if (face) {
      const P = M[state.sex], L = M.h.landmarks[state.sex], p = i => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]];
      const tip = p(L.tip), mid = (P[L.pogonion * 3 + 1] + P[L.glabella * 3 + 1]) / 2;
      if (area === 'nose') sc.frame([0, tip[1] + .12, tip[2] - .7], 6.2);
      else if (area === 'chin') sc.frame([0, mid - .2, tip[2] - .8], 8.6);
      else sc.frame([0, mid + .25, tip[2] - .8], 8.6);
    } else {
      const n = M.h.nipples[0], P = M.base;
      sc.frame([0, P[n * 3 + 1] - .1, P[n * 3 + 2] - .9], 12);
    }
  }
  function update(){
    if (!sc || !M) return;
    if (face) {
      const P = M[state.sex], N0 = S.normals(P, M.tri, M.N);
      const imp = faceImp(), TH = S.faceThickness(M, state.sex, N0, imp);
      const Q = S.addFace(P, N0, TH, TH.mmPer);
      sc.setPositions(0, P, N0); sc.setPositions(1, Q);
      // the gold tint marks where the skin moves, scaled to the thickest point
      const mx = TH.T.reduce((a, b) => Math.max(a, b), 0) || 1, rel = new Float32Array(M.N);
      for (let i = 0; i < M.N; i++) rel[i] = TH.T[i] / mx;
      setColors(1, state.change ? colors(rel) : G.base);
      setColors(0, G.base);
      G.face = {imp, T:TH};
    } else {
      const bp = S.bodyParams(state.body), cm = 10 * bp.scale, key = JSON.stringify(bp);
      if (G.bodyKey !== key) {   // the rounded body is kept until the visitor changes their measurements
        const P0 = S.morphTorso(M, bp), P1 = S.roundBreasts(M, P0, S.normals(P0, M.tri, M.N), cm);
        G.bodyKey = key; G.body = {P:P1, N:S.normals(P1, M.tri, M.N)};
      }
      const P = G.body.P, N0 = G.body.N;
      const one = cc => {
        const imp = breastImp(cc), raw = S.breastField(imp), F = S.blurField(raw, 1.8);
        return {imp, raw, F, Q:S.fitBreasts(M, P, N0, F, cm)};
      };
      const A = one(state.cc), B = state.compare ? one(state.cc2) : null;
      sc.setPositions(0, B ? A.Q : P); sc.setPositions(1, B ? B.Q : A.Q);
      G.breast = {bp, cm, P, A, B};
      ghosts();
    }
    tags(); summary();
  }
  const setColors = (k, c) => sc && sc.setColors(k, c);
  /* the implants seen through the skin: lenses on the chest wall, behind the breast */
  function ghosts(){
    if (!sc || face || !G.breast) return;
    const {bp, cm, P, A, B} = G.breast;
    const lens = R => {
      if (!state.xray) return [];
      const frames = S.breastFrames(M, P, R.raw.H / cm);
      // the chest wall: where the nipple would sit with the smallest breast, a centimetre deeper
      const Pmin = S.morphTorso(M, {...bp, cup:-1});
      return frames.map((f, k) => {
        const ni = M.h.nipples[k], d = (P[ni * 3 + 2] - Pmin[ni * 3 + 2]) + 2.5 / cm;
        const fr = {...f, c:[f.c[0] - f.n[0] * d, f.c[1] - f.n[1] * d, f.c[2] - f.n[2] * d]};
        return S.implantShell(R.raw, fr, cm, k);
      });
    };
    sc.setGhosts(0, B ? lens(A) : []); sc.setGhosts(1, lens(B || A));
    sc.render();
  }
  function tags(){
    const box = $('.im-panes');
    let names;
    if (face) names = [T.now, T.after];
    else if (state.compare && G.breast && G.breast.B) names = [G.breast.A.imp.cc + ' ' + T.cc, G.breast.B.imp.cc + ' ' + T.cc];
    else names = [T.now, (G.breast ? G.breast.A.imp.cc + ' ' + T.cc : T.after)];
    const shown = state.split ? names : [names[1]];
    box.innerHTML = shown.map((t, i) => `<div><span class="im-tag${i === shown.length - 1 ? ' gold' : ''}">${esc(t)}</span></div>`).join('');
  }
  function syncViews(){
    if (!sc) return;
    const y = sc.view.yaw;
    $$('[data-yaw]').forEach(b => b.setAttribute('aria-pressed', String(Math.abs(Math.abs(y) - +b.dataset.yaw) < .06)));
  }

  /* ---------- summary cards ---------- */
  const cupAfter = cc => {
    const i = cupIndex(state.body.cup), gain = cc / 175, j = i + gain;
    const names = [...S.CUPS, 'E', 'F', 'G'];
    const lo = names[Math.min(names.length - 1, Math.floor(j))], hi = names[Math.min(names.length - 1, Math.ceil(j))];
    return lo === hi || j - Math.floor(j) < .25 ? lo : j - Math.floor(j) > .75 ? hi : lo + '–' + hi;
  };
  function breastBase(){
    // the breast's own base width on this body, from the breast-weighted vertices at nipple height
    const {P, cm} = G.breast, n = M.h.nipples[0], y = P[n * 3 + 1];
    let a = 1e9, b = -1e9;
    for (let i = 0; i < M.N; i++) {
      if (M.breast[i] < 90 || P[i * 3] <= 0 || Math.abs(P[i * 3 + 1] - y) > .4) continue;
      a = Math.min(a, P[i * 3]); b = Math.max(b, P[i * 3]);
    }
    return b > a ? (b - a) * cm + 2 : null;
  }
  function summary(){
    const box = R('sum');
    if (face) {
      if (!G.face) return;
      const {imp} = G.face;
      const cards = [];
      if (area === 'chin') cards.push([T.chinFwd, fmt(imp.mm * .9) + ' ' + T.mm, null, true], [T.implant, `${imp.name} ${imp.code}`, `${fmt(imp.mm)} ${T.mm} · ${fmt(imp.spanMm / 10)} ${T.cm} ${T.across}`]);
      if (area === 'forehead') cards.push([T.fuller, fmt(imp.mm * .95) + ' ' + T.mm, null, true], [T.implant, `${fmt(imp.mm)} ${T.mm}`, T.taper]);
      if (area === 'nose') {
        cards.push([T.raised, fmt(imp.mm * .92) + ' ' + T.mm, `${(NOSE.shapes.find(s => s.id === state.nose.shape) || {})[lang] || ''} · ${fmt(imp.mm)} ${T.mm}`, true]);
        if (imp.tipMm) cards.push([T.tipLift, fmt(imp.tipMm) + ' ' + T.mm, T.estimate]);
      }
      box.innerHTML = cards.map(([s, b, sm, g]) => `<div class="im-card${g ? ' gold' : ''}"><span>${esc(s)}</span><b>${esc(b)}</b>${sm ? `<small>${esc(sm)}</small>` : ''}</div>`).join('');
      return;
    }
    if (!G.breast) return;
    const {A, B} = G.breast, a = A.imp;
    const cards = [[T.adds, `${a.cc} ${T.cc}`, T.each, true], [T.cupNow, `${state.body.cup} → ${T.cupAbout} ${cupAfter(a.cc)}`, null],
      [T.implant, `${fmt(a.width)} × ${fmt(a.projection)} ${T.cm}`, a.height ? `${T.wide} × ${T.proj} · ${fmt(a.height)} ${T.cm} ${T.tall}` : `${T.wide} × ${T.proj}`]];
    if (B) cards.splice(1, 0, [T.adds, `${B.imp.cc} ${T.cc}`, `${T.each} · ${T.cupAbout} ${cupAfter(B.imp.cc)}`, true]);
    const bw = breastBase();
    box.innerHTML = cards.map(([s, b, sm, g]) => `<div class="im-card${g ? ' gold' : ''}"><span>${esc(s)}</span><b>${esc(b)}</b>${sm ? `<small>${esc(sm)}</small>` : ''}</div>`).join('')
      + (bw && a.width > bw + .5 ? `<p class="im-warn">${ic('alert')}<span>${esc(T.fit.replace('{b}', fmt(bw)))}</span></p>` : '');
  }

  /* ---------- panel ---------- */
  function sizeSlider(k, cc){
    const el = R(k), sizes = prof().sizes, i = sizes.indexOf(nearest(cc));
    el.max = sizes.length - 1; el.value = i;
    el.style.setProperty('--v', (sizes.length > 1 ? i / (sizes.length - 1) * 100 : 50) + '%');
    const z = sizes[i];
    R(k + 'v').textContent = `${z[0]} ${T.cc} · ${fmt(z[1])} ${T.cm}`;
    el.setAttribute('aria-valuetext', `${z[0]} ${T.cc}`);
    return z[0];
  }
  function sync(){
    $$('[data-seg]').forEach(g => {
      const k = g.dataset.seg;
      const cur = {sex:state.sex, cup:state.body.cup, chinStyle:state.chin.style, fhSize:String(state.forehead.size), noseShape:state.nose.shape, noseSize:String(state.nose.size)}[k];
      g.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === cur)));
    });
    if (area === 'breast') {
      R('line').value = state.line;
      const L = line();
      if (!L.profiles.some(p => p.id === state.profile)) state.profile = L.profiles[Math.min(1, L.profiles.length - 1)].id;
      R('profiles').innerHTML = L.profiles.length > 4
        ? `<select data-r="profsel" aria-label="${esc(T.profile)}">${L.profiles.map(p => `<option value="${p.id}"${p.id === state.profile ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select>`
        : seg('profile', L.profiles.map(p => [p.id, p.name]), T.profile);
      R('profiles').querySelectorAll('[data-v]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === state.profile)));
      state.cc = sizeSlider('cc', state.cc);
      R('cmp').hidden = !state.compare;
      $('[data-act="compare"]').setAttribute('aria-checked', String(state.compare));
      if (state.compare) state.cc2 = sizeSlider('cc2', state.cc2);
      for (const k of ['height', 'weight']) {
        const el = R(k); el.value = state.body[k];
        el.style.setProperty('--v', ((state.body[k] - el.min) / (el.max - el.min) * 100) + '%');
        R(k + 'v').textContent = state.body[k] + ' ' + (k === 'height' ? T.cm : T.kg);
      }
    }
    if (area === 'chin') {
      const st = CHIN.find(c => c.id === state.chin.style) || CHIN[1];
      if (state.chin.size >= st.sizes.length) state.chin.size = st.sizes.length - 1;
      R('desc').textContent = st.desc[lang] || st.desc.en;
      R('chinSizes').innerHTML = seg('chinSize', st.sizes.map((z, i) => [i, `${z.s} · ${fmt(z.mm)} ${T.mm}`]), T.size);
      R('chinSizes').querySelectorAll('[data-v]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.v === state.chin.size)));
    }
    if (area === 'nose') {
      const sh = NOSE.shapes.find(s => s.id === state.nose.shape);
      R('desc').textContent = sh.desc[lang] || sh.desc.en;
      R('est').hidden = state.nose.shape !== 'l';
    }
    $('[data-act="split"]').setAttribute('aria-checked', String(state.split));
    const sw = $(face ? '[data-act="change"]' : '[data-act="xray"]');
    sw.setAttribute('aria-checked', String(face ? state.change : state.xray));
    const pl = $('[data-act="plan"]');
    if (pl) pl.innerHTML = (state.planned ? ic('check') : ic('plus')) + `<span>${esc(state.planned ? T.planned : T.plan)}</span>`;
    if (sc) { sc.setSplit(state.split, 2); }
  }
  let rq = 0;
  const later = () => { if (rq) return; rq = requestAnimationFrame(() => { rq = 0; update(); }); };

  /* ---------- save ---------- */
  async function save(){
    const err = R('saveerr'); err.hidden = true;
    try {
      const font = getComputedStyle(root).fontFamily;
      try { await document.fonts.load(`700 20px ${font}`); } catch (e) {}
      let pic;
      if (sc) pic = sc.snapshot(state.split ? 1200 : 760, 900);
      if (!pic) return;
      const pad = 32, lines = summaryLines(), W = Math.max(pic.width + pad * 2, 900), H = pad + pic.height + 40 + lines.length * 40 + 70;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      g.fillStyle = '#1F0A30'; g.fillRect(0, 0, W, H);
      g.drawImage(pic, (W - pic.width) / 2, pad);
      let y = pad + pic.height + 50;
      g.font = `700 26px ${font}`; g.fillStyle = GOLD; g.fillText(T.area[area] + ' · ' + T.implant, pad, y); y += 40;
      g.font = `400 22px ${font}`; g.fillStyle = '#F6EEFB';
      for (const l of lines.slice(1)) { g.fillText(l, pad, y); y += 40; }
      g.font = `400 20px ${font}`; g.fillStyle = '#CDB9DD';
      g.fillText(T.sim, pad, H - 28);
      const bw = g.measureText(T.brandName).width; g.fillText(T.brandName, W - pad - bw, H - 28);
      const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', .9));
      if (!blob) throw new Error('blob');
      const name = `apex-${area}-implant.jpg`, fl = new File([blob], name, {type:'image/jpeg'});
      let shared = false;
      if (navigator.canShare && navigator.share) {
        try { if (navigator.canShare({files:[fl]})) { await navigator.share({files:[fl], title:T.brandName}); shared = true; } }
        catch (e) { if (e && e.name === 'AbortError') shared = true; }
      }
      if (!shared) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
      emit('implants:saved', {area, mode:'3d'});
    } catch (e) { err.textContent = T.err.save; err.hidden = false; }
  }
  function summaryLines(){
    const out = [T.area[area]];
    if (face) {
      const imp = faceImp();
      if (area === 'chin') out.push(`${imp.name} ${imp.code}: ${fmt(imp.mm)} ${T.mm} · ${T.forward} ${fmt(imp.mm * .9)} ${T.mm}`);
      if (area === 'forehead') out.push(`${T.thick} ${fmt(imp.mm)} ${T.mm}`);
      if (area === 'nose') { out.push(`${(NOSE.shapes.find(s => s.id === state.nose.shape) || {})[lang]} · ${fmt(imp.mm)} ${T.mm}`); if (imp.tipMm) out.push(`${T.tipLift} ${fmt(imp.tipMm)} ${T.mm}`); }
    } else {
      const a = breastImp(state.cc), L = line();
      out.push(`${L.name} ${prof().name} ${a.cc} ${T.cc} · ${fmt(a.width)} ${T.cm} ${T.wide} · ${fmt(a.projection)} ${T.cm} ${T.proj}`);
      if (state.compare) { const b = breastImp(state.cc2); out.push(`${L.name} ${prof().name} ${b.cc} ${T.cc} · ${fmt(b.width)} ${T.cm} ${T.wide}`); }
      out.push(`${T.height} ${state.body.height} ${T.cm} · ${T.weight} ${state.body.weight} ${T.kg} · ${T.cupNow} ${state.body.cup} → ${T.cupAbout} ${cupAfter(a.cc)}`);
    }
    return out;
  }

  /* ---------- events ---------- */
  function onClick(e){
    const yb = e.target.closest('[data-yaw]');
    if (yb && sc) { animateYaw(+yb.dataset.yaw * (sc.view.yaw < 0 ? -1 : 1)); return; }
    const sb = e.target.closest('[data-seg] [data-v]');
    if (sb) {
      const k = sb.closest('[data-seg]').dataset.seg, v = sb.dataset.v;
      if (k === 'sex') { state.sex = v; if (M) setupModel(); }
      else if (k === 'cup') state.body.cup = v;
      else if (k === 'profile') state.profile = v;
      else if (k === 'chinStyle') state.chin.style = v;
      else if (k === 'chinSize') state.chin.size = +v;
      else if (k === 'fhSize') state.forehead.size = +v;
      else if (k === 'noseShape') state.nose.shape = v;
      else if (k === 'noseSize') state.nose.size = +v;
      remember(); sync(); later();
      emit('implants:change', {area, key:k, value:v});
      return;
    }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'xray') { state.xray = !state.xray; sync(); ghosts(); }
    else if (a === 'change') { state.change = !state.change; sync(); later(); }
    else if (a === 'split') { state.split = !state.split; sync(); tags(); }
    else if (a === 'compare') { state.compare = !state.compare; if (state.compare) { const s = prof().sizes, i = s.indexOf(nearest(state.cc)); state.cc2 = s[Math.min(s.length - 1, i + 2)][0]; } sync(); later(); }
    else if (a === 'save') save();
    else if (a === 'plan') {
      state.planned = true;
      if (area === 'breast') { const z = breastImp(state.cc); emit('plan:add', {procedure:'breast', concern:`${line().name} ${prof().name} ${z.cc} cc`, source:'implants'}); }
      else emit('plan:add', {procedure:'rhinoplasty', concern:`${NOSE.shapes.find(s => s.id === state.nose.shape).en} ${NOSE.sizes[state.nose.size].s}`, source:'implants'});
      sync();
    }
  }
  let anim = 0;
  function animateYaw(to){
    cancelAnimationFrame(anim);
    const from = sc.view.yaw, t0 = performance.now(), dur = 520;
    const step = now => { const t = Math.min(1, (now - t0) / dur), k = 1 - Math.pow(1 - t, 3); sc.setView(from + (to - from) * k, sc.view.pitch * (1 - k)); syncViews(); if (t < 1) anim = requestAnimationFrame(step); };
    anim = requestAnimationFrame(step);
  }
  root.addEventListener('click', onClick);
  root.addEventListener('input', e => {
    const el = e.target, k = el.dataset && el.dataset.r;
    if (k === 'height' || k === 'weight') { state.body[k] = +el.value; sync(); later(); }
    else if (k === 'cc' || k === 'cc2') { const z = prof().sizes[+el.value]; if (z) state[k] = z[0]; sync(); later(); }
  });
  root.addEventListener('change', e => {
    const el = e.target, k = el.dataset && el.dataset.r;
    if (k === 'line') { state.line = el.value; sync(); later(); }
    else if (k === 'profsel') { state.profile = el.value; sync(); later(); }
    if (k) { remember(); emit('implants:change', {area, key:k, value:el.value}); }
  });

  sync();
  start3d();
  return {
    destroy(){
      dead = true; cancelAnimationFrame(rq); cancelAnimationFrame(anim);
      sc && sc.destroy(); root.removeEventListener('click', onClick); root.remove();
      if (!--styleRefs && styleEl) { styleEl.remove(); styleEl = null; }
    },
    _state:state, _G:G, _scene:() => sc,
  };
}
