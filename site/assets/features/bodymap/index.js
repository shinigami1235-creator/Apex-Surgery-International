/* Body Map: a mesh body (MakeHuman CC0 base mesh, decimated) drawn as glowing points joined by
   faint lines, in the style of the main site's Face Atlas, with tappable areas.
   Tapping the face swaps in a denser head mesh built from the same base mesh (heads.bin).
   Each area lists the client's own concerns and leads to its procedure. */

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
const HERE = new URL('./', import.meta.url);

/* ---------------- strings ---------------- */
const STR = {
  en: {
    region: 'Body map', areas: 'Areas', body: 'Body', female: 'Female', male: 'Male',
    back: 'Full body', face: 'Face',
    hintBody: 'Tap an area to see its procedures.', hintFace: 'Tap a feature to see its procedures.',
    concerns: 'Concerns', pick: 'Choose a concern.', recovery: 'Recovery',
    vary: 'Results may vary from person to person.',
    add: 'Add to My Plan', added: 'Added to My Plan', details: 'Procedure details', close: 'Close',
    loading: 'Loading', loadError: 'The body model could not be loaded.', faceError: 'The face model could not be loaded.'
  },
  th: {
    region: 'แผนที่ร่างกาย', areas: 'บริเวณ', body: 'รูปร่าง', female: 'ผู้หญิง', male: 'ผู้ชาย',
    back: 'ทั้งตัว', face: 'ใบหน้า',
    hintBody: 'แตะบริเวณที่สนใจเพื่อดูหัตถการ', hintFace: 'แตะส่วนของใบหน้าเพื่อดูหัตถการ',
    concerns: 'ปัญหาที่พบ', pick: 'เลือกปัญหาที่ตรงกับคุณ', recovery: 'การพักฟื้น',
    vary: 'ผลลัพธ์อาจแตกต่างกันไปในแต่ละบุคคล',
    add: 'เพิ่มในแผนของฉัน', added: 'เพิ่มในแผนของฉันแล้ว', details: 'รายละเอียดหัตถการ', close: 'ปิด',
    loading: 'กำลังโหลด', loadError: 'โหลดโมเดลร่างกายไม่สำเร็จ', faceError: 'โหลดโมเดลใบหน้าไม่สำเร็จ'
  }
};

/* Recovery facts come from the client's own service pages (Q&A blocks). */
const PROC = {
  facelift: { en: 'Facelift', th: 'ดึงหน้า', rec: {
    en: [['Light activity', 'After about 2 to 3 weeks'], ['No strenuous exercise', 'For 4 to 6 weeks'], ['Results last', 'About 7 to 10 years']],
    th: [['กิจกรรมที่ไม่ใช้แรงมาก', 'ประมาณ 2 ถึง 3 สัปดาห์'], ['งดออกกำลังกายหนัก', '4 ถึง 6 สัปดาห์'], ['ผลลัพธ์อยู่ได้', 'ประมาณ 7 ถึง 10 ปี']] } },
  browlift: { en: 'Brow lift', th: 'ยกคิ้ว', rec: {
    en: [['Initial recovery', '7 to 14 days'], ['No strenuous exercise', 'For 4 to 6 weeks'], ['Final shape', '3 to 6 months'], ['Results last', 'About 5 to 10 years']],
    th: [['พักฟื้นเบื้องต้น', '7 ถึง 14 วัน'], ['งดออกกำลังกายหนัก', '4 ถึง 6 สัปดาห์'], ['คิ้วเข้าที่', '3 ถึง 6 เดือน'], ['ผลลัพธ์อยู่ได้', 'ประมาณ 5 ถึง 10 ปี']] } },
  rhinoplasty: { en: 'Rhinoplasty', th: 'เสริมจมูก', rec: {
    en: [['Rest', 'At least 7 to 14 days'], ['Swelling eases', 'Around 2 weeks'], ['Shape settles', '1 to 3 months'], ['Full result', '3 to 6 months'], ['Soft food', '1 to 2 weeks']],
    th: [['พักฟื้น', 'อย่างน้อย 7 ถึง 14 วัน'], ['อาการบวมเริ่มบรรเทา', 'ประมาณ 2 สัปดาห์'], ['ทรงจมูกรัดแกน', '1 ถึง 3 เดือน'], ['ผลลัพธ์ชัดเจนที่สุด', '3 ถึง 6 เดือน'], ['อาหารอ่อน', '1 ถึง 2 สัปดาห์แรก']] } },
  eyelid: { en: 'Double eyelid surgery', th: 'ทำตาสองชั้น', rec: {
    en: [['Swelling eases', '7 to 14 days'], ['Final shape', '3 to 6 months'], ['No alcohol', '1 month']],
    th: [['อาการบวมช้ำลดลง', '7 ถึง 14 วัน'], ['ชั้นตาเข้าที่', '3 ถึง 6 เดือน'], ['งดแอลกอฮอล์', 'อย่างน้อย 1 เดือน']] } },
  breast: { en: 'Breast augmentation', th: 'เสริมหน้าอก', rec: {
    en: [['Soreness', '3 to 7 days'], ['Time off work', '5 to 7 days'], ['Exercise', 'After about 1 to 2 months']],
    th: [['อาการปวดตึง', '3 ถึง 7 วันแรก'], ['ลางานพักฟื้น', 'ประมาณ 5 ถึง 7 วัน'], ['ออกกำลังกาย', 'หลังประมาณ 1 ถึง 2 เดือน']] } },
  lipo: { en: 'Liposuction', th: 'ดูดไขมัน', rec: {
    en: [['Compression garment', '24 hours a day for the first month, then daytime for 1 to 2 more months'], ['Driving', 'After 3 to 7 days'], ['Results settle', '3 to 6 months']],
    th: [['ชุดกระชับ', 'ใส่ตลอด 24 ชั่วโมงในเดือนแรก แล้วใส่ช่วงกลางวันต่ออีก 1 ถึง 2 เดือน'], ['ขับรถ', 'หลัง 3 ถึง 7 วัน'], ['ผลลัพธ์เข้าที่', '3 ถึง 6 เดือน']] } }
};

/* Body region ids written by the Python build (see SOURCE.md). */
const REG = { head: 1, neck: 2, breast: 3, abdomen: 4, arms: 5, waistback: 6, hips: 7, thighs: 8, calves: 9 };
const C = (en, th) => ({ en, th });

/* a: the viewing angle around the body (0 = front, PI = back). side: which side the marker sits on. */
const AREAS = [
  { k: 'face', lvl: 'body', reg: [REG.head, REG.neck], a: 0, name: C('Face', 'ใบหน้า') },
  { k: 'breast', zr: 2.4, lvl: 'body', reg: [REG.breast], a: .42, female: true, proc: 'breast', name: C('Breast', 'หน้าอก'),
    cn: [C('Small breasts', 'หน้าอกเล็กโดยกำเนิด'), C('Uneven breasts', 'หน้าอกสองข้างไม่เท่ากัน'), C('Volume loss after pregnancy or weight loss', 'หน้าอกหย่อนคล้อยหลังมีบุตรหรือลดน้ำหนัก')] },
  { k: 'abdomen', zr: 2.6, lvl: 'body', reg: [REG.abdomen], a: .3, proc: 'lipo', name: C('Abdomen', 'หน้าท้อง'),
    cn: [C('Upper belly fat', 'ไขมันหน้าท้องส่วนบน'), C('Lower belly fat', 'ไขมันหน้าท้องส่วนล่าง'), C('Fat that stays after diet and exercise', 'ไขมันที่ไม่ลดแม้ควบคุมอาหารและออกกำลังกาย')] },
  { k: 'arms', zr: 2.5, lvl: 'body', reg: [REG.arms], a: 2.05, side: 1, proc: 'lipo', name: C('Upper arms', 'ต้นแขน'),
    cn: [C('Large upper arms', 'ต้นแขนใหญ่'), C('Loose, flabby upper arms', 'แขนย้วย')] },
  { k: 'waistback', zr: 2.9, lvl: 'body', reg: [REG.waistback], a: 2.55, proc: 'lipo', name: C('Waist and back', 'เอวและปีกหลัง'),
    cn: [C('Love handles', 'ไขมันห่วงยางรอบเอว'), C('Bra-line fat', 'ไขมันปลิ้นช่วงขอบเสื้อชั้นใน')] },
  { k: 'hips', zr: 2.9, lvl: 'body', reg: [REG.hips], a: 2.75, proc: 'lipo', name: C('Hips and buttocks', 'สะโพกและบั้นท้าย'),
    cn: [C('Wide hips', 'สะโพกผายเกินสัดส่วน'), C('Buttock shape', 'รูปทรงบั้นท้าย')] },
  { k: 'thighs', zr: 3.4, lvl: 'body', reg: [REG.thighs], a: .55, side: 1, proc: 'lipo', name: C('Thighs', 'ต้นขา'),
    cn: [C('Inner thighs that rub', 'ต้นขาด้านในเบียดกัน'), C('Outer thigh fat', 'ไขมันต้นขาด้านนอก')] },
  { k: 'calves', zr: 3.2, lvl: 'body', reg: [REG.calves], a: 2.6, side: 1, proc: 'lipo', name: C('Calves', 'น่อง'),
    cn: [C('Large calves from fat', 'น่องใหญ่จากไขมันสะสม')] },
  /* face level */
  { k: 'facelift', zr: 1.0, lvl: 'face', reg: [REG.neck], a: .62, side: 1, proc: 'facelift', name: C('Face and neck', 'ใบหน้าและลำคอ'),
    cn: [C('Sagging cheeks', 'แก้มหย่อนคล้อย'), C('Deep smile lines', 'ร่องน้ำหมากลึก'), C('Jowls and a blurred jawline', 'กรอบหน้าหย่อน ไม่ชัดเหมือนเก่า'), C('Loose neck skin', 'ผิวลำคอหย่อนคล้อย')] },
  { k: 'brows', zr: 0.85, lvl: 'face', a: .12, proc: 'browlift', name: C('Forehead and brows', 'หน้าผากและคิ้ว'),
    cn: [C('Low or heavy brows', 'คิ้วตก'), C('Deep forehead lines', 'ริ้วรอยลึกบริเวณหน้าผาก'), C('Sagging forehead skin', 'ผิวหน้าผากหย่อนคล้อย')] },
  { k: 'eyes', zr: 0.75, lvl: 'face', a: .18, proc: 'eyelid', name: C('Eyes', 'ดวงตา'),
    cn: [C('Single eyelids', 'ตาชั้นเดียว'), C('Hooded upper lids', 'ตาสองชั้นหลบใน'), C('Uneven eyelid folds', 'ชั้นตาสองข้างไม่เท่ากัน'), C('Heavy, puffy upper lids', 'เปลือกตาหนา อูม จากไขมันสะสม'), C('Drooping lids with age', 'หนังตาตกตามวัย')] },
  { k: 'nose', zr: 0.8, lvl: 'face', a: .48, proc: 'rhinoplasty', name: C('Nose', 'จมูก'),
    cn: [C('Low bridge', 'จมูกแบน สันจมูกน้อย'), C('Short or bulbous tip', 'ปลายจมูกสั้นทู่ หรือปลายจมูกชมพู่'), C('Hump or crooked nose', 'จมูกเบี้ยวคด หรือมีฮัมพ์'), C('Wide nostrils', 'ปีกจมูกกว้างหรือบาน'), C('Problems from a previous nose surgery', 'ปัญหาจากจมูกที่เคยเสริมมาแล้ว')] },
  { k: 'chin', zr: 0.95, lvl: 'face', a: .5, proc: 'lipo', name: C('Chin and jaw', 'เหนียงและกรอบหน้า'),
    cn: [C('Fat under the chin', 'ไขมันใต้คาง'), C('Undefined jawline', 'กรอบหน้าไม่คมชัด')] }
];
const AREA = Object.fromEntries(AREAS.map(a => [a.k, a]));
const FACE_KEYS = AREAS.filter(a => a.lvl === 'face').map(a => a.k);

const IC = {
  back: '<path d="M15 6l-6 6 6 6"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  arrow: '<path d="M7 17L17 7M9 7h8v8"/>',
  turn: '<path d="M3 12a9 4 0 0 0 15 3"/><path d="M21 12a9 4 0 0 0-15-3"/><path d="M16 17l2-2-2-2M8 7L6 9l2 2"/>'
};
const ic = n => `<svg class="bm-i" viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------------- styles ---------------- */
const CSS = `
.bm{--bm-night:var(--night,#1F0A30);--bm-night2:var(--night-2,#2A0F40);--bm-plum:var(--plum,#6A388C);--bm-plum7:var(--plum-700,#55286F);
--bm-lilac:var(--lilac,#A886CD);--bm-l3:var(--lilac-300,#C9B3DD);--bm-l1:var(--lilac-100,#F1EAF7);--bm-ink:var(--ink,#2A1F33);--bm-ink2:var(--ink-2,#5A4A66);
--bm-on:var(--on-night,#F6EEFB);--bm-on2:var(--on-night-2,#CDB9DD);--bm-rose:#CC3366;--bm-ease:var(--ease-out,cubic-bezier(.23,1,.32,1));--bm-drawer:var(--ease-drawer,cubic-bezier(.32,.72,0,1));
position:relative;width:100%;height:var(--bm-h,clamp(620px,90svh,920px));overflow:hidden;isolation:isolate;container:bm/inline-size;
background:transparent;color:var(--bm-on);
font-family:var(--font,"LINE Seed","Sarabun","Noto Sans Thai",system-ui,sans-serif);line-height:1.5;-webkit-tap-highlight-color:transparent}
:where(.bm) *,:where(.bm) *::before,:where(.bm) *::after{box-sizing:border-box}
:where(.bm) button{font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer}
.bm :focus-visible{outline:2px solid var(--bm-l3);outline-offset:3px}
.bm-i{width:18px;height:18px;flex:none;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.bm-sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.bm-stage{position:absolute;inset:0;touch-action:pan-y;cursor:grab}
.bm-stage.drag{cursor:grabbing}
.bm-stage canvas{position:absolute;inset:0;width:100%!important;height:100%!important;display:block;
-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 9%,#000 91%,transparent 100%),linear-gradient(180deg,transparent 0,#000 8%,#000 84%,transparent 100%);
-webkit-mask-composite:source-in;mask-image:linear-gradient(90deg,transparent 0,#000 9%,#000 91%,transparent 100%),linear-gradient(180deg,transparent 0,#000 8%,#000 84%,transparent 100%);mask-composite:intersect}
.bm-glow{position:absolute;left:50%;top:46%;width:min(120%,1100px);aspect-ratio:1;transform:translate(-50%,-50%);pointer-events:none;
background:radial-gradient(closest-side,rgba(122,64,160,.30),rgba(106,56,140,.13) 45%,rgba(204,51,102,.04) 70%,transparent)}
.bm-mks{position:absolute;inset:0;pointer-events:none;z-index:2}
.bm-mk{position:absolute;left:0;top:0;width:40px;height:40px;margin:-20px 0 0 -20px;display:grid;place-items:center;pointer-events:auto;opacity:0;transition:opacity .35s ease;will-change:transform}
.bm-mk.vis{opacity:1}
.bm-mk.off{pointer-events:none}
.bm-mk i{position:relative;width:12px;height:12px;border-radius:50%;border:1.5px solid rgba(246,238,251,.95);background:rgba(204,51,102,.35);box-shadow:0 0 0 3px rgba(168,134,205,.18),0 0 14px rgba(201,179,221,.8);transition:transform .3s var(--bm-ease),background-color .2s}
.bm-mk i::after{content:"";position:absolute;inset:-1.5px;border-radius:50%;border:1px solid rgba(201,179,221,.9);animation:bmPulse 2.6s var(--bm-ease) infinite}
.bm-mk:hover i,.bm-mk.on i{transform:scale(1.25);background:var(--bm-rose)}
.bm-mk b{position:absolute;left:30px;top:50%;transform:translate(-4px,-50%);white-space:nowrap;font-weight:500;font-size:13px;letter-spacing:.01em;padding:5px 12px;border-radius:999px;background:rgba(31,10,48,.72);border:1px solid rgba(201,179,221,.32);color:var(--bm-on);opacity:0;pointer-events:none;transition:opacity .3s ease,transform .35s var(--bm-ease);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);margin-top:var(--ly,0px)}
.bm-mk.lft b{left:auto;right:30px;transform:translate(4px,-50%)}
.bm-mk:hover b,.bm-mk.lab b,.bm-mk.on b{opacity:1;transform:translate(0,-50%)}
.bm-mk.on b{background:#fff;color:var(--bm-plum);border-color:#fff}
@keyframes bmPulse{0%{transform:scale(1);opacity:.85}70%,100%{transform:scale(2.6);opacity:0}}
.bm-top{position:absolute;z-index:3;top:16px;left:16px;right:16px;display:flex;align-items:center;justify-content:space-between;gap:12px;pointer-events:none}
.bm-top>*{pointer-events:auto}
.bm-glass{background:rgba(36,13,54,.62);border:1px solid rgba(201,179,221,.26);-webkit-backdrop-filter:blur(12px) saturate(1.3);backdrop-filter:blur(12px) saturate(1.3)}
.bm-seg{display:inline-flex;padding:4px;border-radius:999px}
.bm-seg button{height:36px;min-width:72px;padding:0 16px;border-radius:999px;font-size:14px;color:var(--bm-on2);transition:background-color .25s,color .25s}
.bm-seg button[aria-pressed=true]{background:#fff;color:var(--bm-plum);font-weight:600}
.bm-back{display:inline-flex;align-items:center;gap:6px;height:44px;padding:0 18px 0 12px;border-radius:999px;font-size:14px;color:var(--bm-on);opacity:0;transform:translateY(-6px);pointer-events:none;transition:opacity .3s,transform .4s var(--bm-ease),background-color .2s}
.bm-back.vis{opacity:1;transform:none;pointer-events:auto}
.bm-back:hover{background:rgba(85,40,111,.7)}
.bm-rail{position:absolute;z-index:3;left:0;right:0;bottom:calc(18px + env(safe-area-inset-bottom));margin:0;padding:6px 20px;list-style:none;display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 20px,#000 calc(100% - 20px),transparent);mask-image:linear-gradient(90deg,transparent 0,#000 20px,#000 calc(100% - 20px),transparent);transition:opacity .3s,transform .45s var(--bm-ease)}
.bm-rail li:first-child{margin-left:auto}
.bm-rail li:last-child{margin-right:auto}
.bm-rail::-webkit-scrollbar{display:none}
.bm-rail li{flex:none}
.bm-rail button{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 16px 0 13px;border-radius:999px;font-size:14px;white-space:nowrap;color:var(--bm-on);box-shadow:0 10px 28px -14px rgba(8,2,16,.9);transition:background-color .2s,color .2s,border-color .2s,transform .16s var(--bm-ease)}
.bm-rail button::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--bm-lilac);box-shadow:0 0 0 3px rgba(168,134,205,.2);transition:background-color .2s}
.bm-rail button:hover{color:var(--bm-on);border-color:rgba(201,179,221,.55)}
.bm-rail button:active{transform:scale(.97)}
.bm-rail button[aria-pressed=true]{background:#fff;color:var(--bm-plum);border-color:#fff}
.bm-rail button[aria-pressed=true]::before{background:var(--bm-rose)}
.bm-hint{position:absolute;z-index:2;left:50%;bottom:calc(var(--bm-railh,52px) + 30px + env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;align-items:center;gap:8px;font-size:13px;color:var(--bm-on2);white-space:nowrap;pointer-events:none;transition:opacity .5s}
.bm-hint.hide{opacity:0}
.bm-load{position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px;border-radius:50%;border:1.5px solid rgba(201,179,221,.25);border-top-color:var(--bm-l3);animation:bmSpin 1s linear infinite;transition:opacity .4s}
.bm-load.done{opacity:0;pointer-events:none}
@keyframes bmSpin{to{transform:rotate(1turn)}}
.bm-err{position:absolute;z-index:3;left:16px;right:16px;top:72px;text-align:center;font-size:14px;color:var(--bm-on2)}
.bm-panel{position:absolute;z-index:4;left:0;right:0;bottom:0;max-height:min(60%,560px);display:flex;flex-direction:column;background:#fff;color:var(--bm-ink);border-radius:28px 28px 0 0;box-shadow:0 -24px 60px -24px rgba(20,6,32,.7);transform:translateY(calc(100% + 24px));visibility:hidden;transition:transform .55s var(--bm-drawer),visibility 0s .55s}
.bm-panel.open{transform:none;visibility:visible;transition:transform .55s var(--bm-drawer)}
.bm-panel::before{content:"";flex:none;width:40px;height:4px;border-radius:4px;background:var(--bm-l3);margin:10px auto 0}
.bm-ph{display:flex;align-items:flex-start;gap:12px;padding:14px 20px 8px}
.bm-ph>div{flex:1;min-width:0}
.bm-eye{margin:0 0 2px;font-size:12.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--bm-plum)}
.bm-ph h3{margin:0;font-size:26px;line-height:1.15;font-weight:500;letter-spacing:-.02em;color:var(--bm-ink);outline:none}
.bm .bm-ph h3:focus,.bm .bm-ph h3:focus-visible{outline:none}
.bm-x{flex:none;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:var(--bm-l1);color:var(--bm-plum);transition:background-color .2s}
.bm-x:hover{background:#E4D8EE}
.bm-pb{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:4px 20px 22px}
.bm-pb h4{margin:14px 0 8px;font-size:13px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--bm-ink2)}
.bm-pick{margin:0 0 10px;font-size:15px;color:var(--bm-ink2)}
.bm-cn{display:flex;flex-wrap:wrap;gap:8px}
.bm-cn button{min-height:40px;padding:8px 16px;border-radius:20px;border:1px solid var(--bm-l3);background:#fff;color:var(--bm-ink);font-size:14.5px;line-height:1.35;text-align:left;transition:background-color .2s,color .2s,border-color .2s,transform .16s var(--bm-ease)}
.bm-cn button:hover{border-color:var(--bm-plum);background:var(--bm-l1)}
.bm-cn button:active{transform:scale(.97)}
.bm-cn button[aria-pressed=true]{background:var(--bm-plum);border-color:var(--bm-plum);color:#fff}
.bm-proc{margin-top:18px;padding:18px;border-radius:20px;background:linear-gradient(160deg,#FBF3FB,#F1EAF7);animation:bmIn .5s var(--bm-ease) both}
.bm-proc[hidden]{display:none}
.bm-proc h5{margin:0;font-size:22px;font-weight:500;letter-spacing:-.015em;color:var(--bm-plum)}
.bm-proc h4{margin-top:12px}
.bm-dl{margin:0;display:grid;gap:0}
.bm-dl div{display:grid;grid-template-columns:minmax(0,44%) 1fr;gap:12px;padding:9px 0;border-top:1px solid rgba(106,56,140,.12);font-size:14.5px}
.bm-dl div:first-child{border-top:0}
.bm-dl dt{color:var(--bm-ink2)}
.bm-dl dd{margin:0;color:var(--bm-ink);font-weight:500}
.bm-note{margin:10px 0 0;font-size:13px;color:var(--bm-ink2)}
.bm-act{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}
.bm-add{display:inline-flex;align-items:center;gap:8px;height:48px;padding:0 22px;border-radius:999px;background:var(--bm-plum)!important;color:#fff!important;font-weight:600!important;font-size:15px;box-shadow:0 10px 24px -12px rgba(106,56,140,.8);transition:background-color .2s,transform .16s var(--bm-ease)}
.bm-add:hover{background:var(--bm-plum7)!important}
.bm-add:active{transform:scale(.97)}
.bm-add.done{background:#fff!important;color:var(--bm-plum)!important;box-shadow:inset 0 0 0 1px var(--bm-l3)}
.bm-link{display:inline-flex;align-items:center;gap:6px;height:48px;padding:0 6px;font-weight:600;font-size:15px;color:var(--bm-plum);text-decoration:none}
.bm-link .bm-i{transition:transform .25s var(--bm-ease)}
.bm-link:hover .bm-i{transform:translate(2px,-2px)}
@keyframes bmIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.bm.panel-open .bm-rail{opacity:0;pointer-events:none;transform:translateY(12px)}
.bm.panel-open .bm-hint{opacity:0}
@container bm (min-width:560px) and (max-width:879.98px){
  .bm-rail{left:28px;right:28px;bottom:26px;padding:0;flex-wrap:wrap;justify-content:center;overflow:visible;-webkit-mask-image:none;mask-image:none}
  .bm-rail li:first-child,.bm-rail li:last-child{margin:0}
}
@container bm (min-width:880px){
  .bm-top{top:24px;left:24px;right:24px}
  .bm-rail{left:28px;right:auto;top:50%;bottom:auto;transform:translateY(-50%);flex-direction:column;padding:0;overflow:visible;-webkit-mask-image:none;mask-image:none}
  .bm-rail li:first-child,.bm-rail li:last-child{margin:0}
  .bm.panel-open .bm-rail{opacity:1;pointer-events:auto;transform:translateY(-50%)}
  .bm-hint{bottom:28px}
  .bm-panel{left:auto;top:24px;right:24px;bottom:auto;width:400px;max-height:calc(100% - 48px);border-radius:28px;box-shadow:0 30px 80px -30px rgba(10,2,18,.85);transform:translateX(calc(100% + 40px))}
  .bm-panel::before{display:none}
  .bm-ph{padding:26px 26px 6px}
  .bm-ph h3{font-size:32px}
  .bm-pb{padding:4px 26px 26px}
}
.bm--flat{height:auto!important;padding:24px 16px;background:var(--bm-night);border-radius:20px}
.bm--flat .bm-stage,.bm--flat .bm-hint,.bm--flat .bm-back,.bm--flat .bm-mks{display:none}
.bm--flat .bm-top{position:static;margin-bottom:16px}
.bm--flat .bm-rail{position:static;flex-wrap:wrap;overflow:visible;padding:0;transform:none;flex-direction:row;-webkit-mask-image:none;mask-image:none}
.bm--flat .bm-rail li{margin:0!important}
.bm--flat .bm-glow{display:none}
.bm--flat.panel-open .bm-rail{opacity:1;pointer-events:auto;transform:none}
.bm--flat .bm-panel{position:relative;inset:auto;width:auto;height:auto;margin-top:16px;border-radius:20px;transform:none;display:none;visibility:visible}
.bm--flat .bm-panel.open{display:flex}
.bm--flat .bm-panel::before{display:none}
.bm--flat .bm-err{position:static;text-align:left;margin:0 0 12px}
@media (prefers-reduced-motion:reduce){.bm *,.bm *::before,.bm *::after{animation:none!important;transition-duration:.01s!important;transition-delay:0s!important}}
`;
let cssRefs = 0, cssEl = null, uidN = 0;

/* ---------------- shaders ---------------- */
/* Net look, matched to the Face Atlas on the group's main site: a glowing point at every
   vertex and three more along every edge, joined by faint additive lines. The active area
   turns white and lifts off the surface. One program serves the body and, with HEAD
   defined, the face-zoom head. */
const NET_HEAD = `
attribute vec3 aPosB; attribute vec3 aNrmA; attribute vec3 aNrmB; attribute float aRnd; attribute float aEdge;
#ifdef HEAD
attribute float aArea; attribute float aKind; attribute float aAo;
uniform float uFace, uAct, uHov; uniform vec3 uHC;
#else
attribute float aReg;
uniform float uIntro, uActA, uActB, uHovA, uHovB, uHide, uDim;
#endif
uniform float uTime, uMorph, uPix, uSize, uRef, uCut, uE1, uE2, uWob, uPop, uFocus, uDepthR;
varying float vOn; varying float vHov; varying float vA; varying float vRim;
float is(float v, float t){ return 1. - step(.1, abs(v - t)); }
`;
/* shared body of both vertex shaders: sets p, n, on, hov, tone, keep, k */
const NET_SETUP = `
  float m = smoothstep(0., 1., uMorph);
  vec3 p = mix(position, aPosB, m);
  vec3 n = normalize(mix(aNrmA, aNrmB, m));
#ifdef HEAD
  float on = is(aArea, uAct);
  float hov = is(aArea, uHov) * (1. - on);
  /* lips and the seam stay dim so the closed mouth never reads as an outline */
  float tone = 1. - is(aKind, 1.) * .68 - is(aKind, 7.) * .55 - is(aKind, 2.) * .5 - is(aKind, 3.) * .3 - is(aKind, 4.) * .12 + is(aKind, 5.) * .45 + is(aKind, 6.) * .15;
  tone *= mix(.55, 1., smoothstep(.55, .95, aAo));
  float keep = smoothstep(uCut - .12, uCut + .14, p.y);
  float k = smoothstep(aRnd * .4, aRnd * .4 + .6, uFace);
#else
  float r = (aReg > 2.5 && aReg < 3.5 && uMorph > .5) ? 0. : aReg;
  float on = r > .5 ? max(is(r, uActA), is(r, uActB)) : 0.;
  float hov = r > .5 ? max(is(r, uHovA), is(r, uHovB)) * (1. - on) : 0.;
  float tone = mix(1., on > .5 ? 1. : .42, uDim);
  float keep = r > .5 && r < 1.5 ? 1. - uHide : (r > 1.5 && r < 2.5 ? 1. - uHide * smoothstep(uCut - .12, uCut + .14, p.y) : 1.);
  float k = smoothstep(aRnd * .45, aRnd * .45 + .55, uIntro);
#endif
  vOn = on; vHov = hov;
`;
const NET_PLACE = `
#ifdef HEAD
  p = uHC + (p - uHC) * mix(1.35, 1., k);
#else
  p.xz *= mix(2.2, 1., k); p.y = mix(p.y - 3. + aRnd * 2., p.y, k);
#endif
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  float f = dot(normalize(normalMatrix * n), normalize(-mv.xyz));
  vRim = pow(1. - clamp(f, 0., 1.), 3.) * step(0., f);
  float back = f < 0. ? .06 : 1.;
  /* nearer is brighter, as on the atlas */
  float depth = 1. - smoothstep(0., 1., (-mv.z - uFocus) / uDepthR) * .55;
  vA = k * keep * tone * back * depth;
`;
const PT_VS = NET_HEAD + `
void main(){
${NET_SETUP}
  p += n * (sin(uTime * 1.6 + aRnd * 12.) * uWob + on * uPop * (1. + .6 * sin(uTime * 3. + aRnd * 6.)));
${NET_PLACE}
  float ew = aEdge < .5 ? 1. : (aEdge < 1.5 ? uE1 : uE2);
  vA *= ew;
  gl_PointSize = clamp(uSize * (on > .5 ? 1.5 : 1.) * sqrt(uRef / -mv.z) * (.75 + aRnd * .5), 1., 7.) * uPix;
  if (vA < .004) gl_Position = vec4(2., 2., 2., 1.);
}`;
const PT_FS = `
varying float vOn; varying float vHov; varying float vA; varying float vRim;
void main(){
  vec2 c = gl_PointCoord - .5; float d = length(c);
  if (d > .5) discard;
  float a = 1. - smoothstep(0., .5, d);
  vec3 col = mix(vec3(.70, .58, .86), vec3(1., .93, 1.), max(vOn, vHov * .5));
  col = mix(col, vec3(.92, .86, 1.), vRim * .45);
  gl_FragColor = vec4(col, a * vA * (vOn > .5 ? 1. : .7 + vHov * .15 + vRim * .2));
}`;
const LN_VS = NET_HEAD + `
uniform float uLine;
void main(){
${NET_SETUP}
  p += n * on * uPop;
${NET_PLACE}
  vA *= mix(uLine, .45, on) + hov * .08;
}`;
const LN_FS = `
varying float vOn; varying float vHov; varying float vA; varying float vRim;
void main(){
  vec3 col = mix(vec3(.55, .42, .72), vec3(1., .85, 1.), max(vOn, vHov * .5));
  gl_FragColor = vec4(mix(col, vec3(.8, .72, .95), vRim * .4), vA);
}`;
const GROUND_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const GROUND_FS = `varying vec2 vUv; uniform float uTime, uIntro;
void main(){
  float d = length(vUv - .5) * 2.;
  float glow = exp(-d * d * 7.) * .42;
  float ring = (1. - smoothstep(0., .018, abs(d - .52))) * (.16 + .08 * sin(uTime * 1.2));
  float ring2 = (1. - smoothstep(0., .012, abs(d - .78))) * .07;
  vec3 col = mix(vec3(.62, .45, .82), vec3(.85, .35, .55), .25);
  gl_FragColor = vec4(col, (glow + ring + ring2) * uIntro);
}`;

/* ---------------- helpers ---------------- */
const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 4);
const lerp = (a, b, t) => a + (b - a) * t;
const wrapPI = a => { a = (a + Math.PI) % (Math.PI * 2); if (a < 0) a += Math.PI * 2; return a - Math.PI; };

/* bodies.bin: one decimated topology, female and male shapes (see SOURCE.md) */
function decodeBodies(buf){
  const dv = new DataView(buf);
  const n = dv.getUint32(0, true), ne = dv.getUint32(4, true);
  const h = new Float32Array(buf.slice(8, 80));
  const e = new Uint16Array(buf, 80 + n * 12, ne * 2);
  const reg = Float32Array.from(new Uint8Array(buf, 80 + n * 12 + ne * 4 + n * 4, n));
  const body = (pOff, nOff, L) => ({ n, e, reg, pos: unpackI16(buf, pOff, n, h), nrm: unpackOcta(buf, nOff, n),
    eyes: [L[0], L[1], L[2]], chin: L[3], crown: L[4], front: L[5], halfW: L[6] });
  const nOff = 80 + n * 12 + ne * 4;
  return { female: body(80, nOff, h.slice(4, 11)), male: body(80 + n * 6, nOff + n * 2, h.slice(11, 18)) };
}
function unpackI16(buf, off, n, h){
  const q = new Int16Array(buf, off, n * 3), p = new Float32Array(n * 3), s = h[3] / 32767;
  for (let i = 0; i < n * 3; i++) p[i] = q[i] * s + h[i % 3];
  return p;
}
function unpackOcta(buf, off, n){
  const q = new Uint8Array(buf, off, n * 2), o = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let x = q[i * 2] / 255 * 2 - 1, y = q[i * 2 + 1] / 255 * 2 - 1, z = 1 - Math.abs(x) - Math.abs(y);
    if (z < 0) { const ox = x; x = (1 - Math.abs(y)) * Math.sign(ox || 1); y = (1 - Math.abs(ox)) * Math.sign(y || 1); }
    const l = Math.hypot(x, y, z) || 1;
    o[i * 3] = x / l; o[i * 3 + 1] = y / l; o[i * 3 + 2] = z / l;
  }
  return o;
}

/* heads.bin: the face-zoom head, one topology for both genders (see SOURCE.md) */
function decodeHeads(buf){
  const dv = new DataView(buf);
  const n = dv.getUint32(0, true), ne = dv.getUint32(4, true);
  const h = new Float32Array(buf.slice(8, 32));
  const o = 32 + n * 12 + ne * 4;
  const out = { n, cutF: h[4], cutM: h[5], e: new Uint16Array(buf, 32 + n * 12, ne * 2),
    pf: unpackI16(buf, 32, n, h), pm: unpackI16(buf, 32 + n * 6, n, h), nf: unpackOcta(buf, o, n), nm: unpackOcta(buf, o + n * 2, n) };
  const ak = new Uint8Array(buf, o + n * 4, n);
  out.area = new Float32Array(n); out.kind = new Float32Array(n);
  for (let i = 0; i < n; i++) { const a = ak[i] & 15; out.area[i] = a === 15 ? 99 : a; out.kind[i] = ak[i] >> 4; }
  out.ao = Float32Array.from(new Uint8Array(buf, o + n * 5, n), v => v / 255);
  return out;
}

/* Points (every vertex plus three along each edge) and line segments for one net.
   attrs: per-vertex Float32Arrays copied to both. */
function buildNet(THREE, M, attrs){
  const n = M.n, ne = M.e.length / 2, np = n + ne * 3, E = M.e;
  const mk = k => new Float32Array(np * k);
  const P = mk(3), PB = mk(3), NA = mk(3), NB = mk(3), rnd = mk(1), edge = mk(1);
  const X = {}; for (const k in attrs) X[k] = mk(1);
  P.set(M.pf); PB.set(M.pm); NA.set(M.nf); NB.set(M.nm);
  for (const k in attrs) X[k].set(attrs[k]);
  for (let i = 0; i < n; i++) rnd[i] = Math.random();
  let j = n;
  for (let q = 0; q < ne; q++) {
    const a = E[q * 2], b = E[q * 2 + 1];
    for (let s = 1; s < 4; s++, j++) {
      const t = s / 4 + (Math.random() - .5) * .08;
      for (let c = 0; c < 3; c++) {
        P[j * 3 + c] = lerp(M.pf[a * 3 + c], M.pf[b * 3 + c], t); PB[j * 3 + c] = lerp(M.pm[a * 3 + c], M.pm[b * 3 + c], t);
        NA[j * 3 + c] = lerp(M.nf[a * 3 + c], M.nf[b * 3 + c], t); NB[j * 3 + c] = lerp(M.nm[a * 3 + c], M.nm[b * 3 + c], t);
      }
      for (const k in attrs) X[k][j] = (t < .5 ? attrs[k][a] : attrs[k][b]);
      rnd[j] = Math.random(); edge[j] = s === 2 ? 1 : 2;
    }
  }
  const pg = new THREE.BufferGeometry();
  const set = (g, name, arr, k) => g.setAttribute(name, new THREE.BufferAttribute(arr, k));
  set(pg, 'position', P, 3); set(pg, 'aPosB', PB, 3); set(pg, 'aNrmA', NA, 3); set(pg, 'aNrmB', NB, 3); set(pg, 'aRnd', rnd, 1); set(pg, 'aEdge', edge, 1);
  for (const k in X) set(pg, k, X[k], 1);
  /* lines: two vertices per edge */
  const lv = ne * 2, L = { position: new Float32Array(lv * 3), aPosB: new Float32Array(lv * 3), aNrmA: new Float32Array(lv * 3), aNrmB: new Float32Array(lv * 3) };
  const LX = {}; for (const k in attrs) LX[k] = new Float32Array(lv);
  const lr = new Float32Array(lv), le = new Float32Array(lv);
  for (let q = 0; q < lv; q++) {
    const v = E[q];
    for (let c = 0; c < 3; c++) { L.position[q * 3 + c] = M.pf[v * 3 + c]; L.aPosB[q * 3 + c] = M.pm[v * 3 + c]; L.aNrmA[q * 3 + c] = M.nf[v * 3 + c]; L.aNrmB[q * 3 + c] = M.nm[v * 3 + c]; }
    for (const k in attrs) LX[k][q] = attrs[k][v];
    lr[q] = .5;
  }
  const lg = new THREE.BufferGeometry();
  for (const k in L) set(lg, k, L[k], 3);
  set(lg, 'aRnd', lr, 1); set(lg, 'aEdge', le, 1);
  for (const k in LX) set(lg, k, LX[k], 1);
  return { pg, lg };
}

function hasWebGL(){
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
  catch (e) { return false; }
}

/* ---------------- mount ---------------- */
export function mount(container, opts = {}){
  const lang = opts.lang === 'th' ? 'th' : 'en';
  const T = STR[lang];
  const serviceUrl = opts.serviceUrl || (k => `service.html?p=${k}`);
  const emit = (n, d) => { try { opts.onEvent && opts.onEvent(n, d); } catch (e) { /* host handler error */ } };
  const uid = 'bm' + (++uidN);
  const reduced = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  const L = o => o[lang];

  if (!cssRefs++) { cssEl = document.createElement('style'); cssEl.dataset.feature = 'bodymap'; cssEl.textContent = CSS; document.head.appendChild(cssEl); }

  let gender = 'female';
  try { const g = localStorage.getItem('apex.bodymap.gender'); if (g === 'male' || g === 'female') gender = g; } catch (e) { /* storage unavailable */ }

  const root = document.createElement('div');
  root.className = 'bm';
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', T.region);
  root.innerHTML = `
    <div class="bm-glow" aria-hidden="true"></div><div class="bm-stage" aria-hidden="true"><div class="bm-load"><span class="bm-sr">${esc(T.loading)}</span></div></div>
    <div class="bm-mks" aria-hidden="true"></div>
    <div class="bm-top">
      <div class="bm-seg bm-glass" role="group" aria-label="${esc(T.body)}">
        <button type="button" data-g="female">${esc(T.female)}</button><button type="button" data-g="male">${esc(T.male)}</button>
      </div>
      <button type="button" class="bm-back bm-glass" tabindex="-1">${ic('back')}<span>${esc(T.back)}</span></button>
    </div>
    <ul class="bm-rail" aria-label="${esc(T.areas)}"></ul>
    <p class="bm-hint">${ic('turn')}<span></span></p>
    <section class="bm-panel" aria-labelledby="bm-t-${uid}" aria-live="polite">
      <div class="bm-ph"><div><p class="bm-eye"></p><h3 id="bm-t-${uid}" tabindex="-1"></h3></div>
        <button type="button" class="bm-x" aria-label="${esc(T.close)}">${ic('x')}</button></div>
      <div class="bm-pb">
        <h4>${esc(T.concerns)}</h4><p class="bm-pick">${esc(T.pick)}</p>
        <div class="bm-cn" role="group" aria-label="${esc(T.concerns)}"></div>
        <div class="bm-proc" hidden>
          <h5></h5><h4>${esc(T.recovery)}</h4><dl class="bm-dl"></dl>
          <p class="bm-note">${esc(T.vary)}</p>
          <div class="bm-act"><button type="button" class="bm-add"></button><a class="bm-link" href="#"></a></div>
        </div>
      </div>
    </section>`;
  container.innerHTML = '';
  /* a host with its own height (such as the home hero stage) is filled edge to edge */
  if (container.clientHeight >= 320) root.style.height = '100%';
  container.appendChild(root);

  const $ = s => root.querySelector(s);
  const stage = $('.bm-stage'), mksEl = $('.bm-mks'), rail = $('.bm-rail'), hint = $('.bm-hint'), panel = $('.bm-panel');
  const backBtn = $('.bm-back'), seg = $('.bm-seg'), loadEl = $('.bm-load');
  const cleanups = [];
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); cleanups.push(() => el.removeEventListener(ev, fn, o)); };

  /* ---- UI state ---- */
  let level = 'body';        // 'body' | 'face'
  let sel = null;            // selected area key
  let concern = null;
  let flat = false;
  let gl = null;             // WebGL scene api once ready

  const visibleAreas = () => {
    if (flat) return AREAS.filter(a => a.k !== 'face' && (!a.female || gender === 'female'));
    return AREAS.filter(a => a.lvl === level && (!a.female || gender === 'female'));
  };

  let railSig = '';
  function renderRail(){
    const list = visibleAreas();
    const sig = list.map(a => a.k).join();
    if (sig !== railSig) {
      const had = rail.contains(document.activeElement);
      railSig = sig;
      rail.innerHTML = list.map(a => `<li><button type="button" class="bm-glass" data-k="${a.k}">${esc(L(a.name))}</button></li>`).join('');
      if (had) rail.querySelector('button')?.focus({ preventScroll: true });
    }
    rail.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === sel));
    railH();
  }
  function railH(){ root.style.setProperty('--bm-railh', (rail.offsetHeight || 52) + 'px'); }
  function renderSeg(){ seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.g === gender)); }
  function renderHint(){ hint.querySelector('span').textContent = level === 'face' ? T.hintFace : T.hintBody; }
  function renderBack(){
    const vis = !flat && (level === 'face' || sel);
    backBtn.classList.toggle('vis', !!vis);
    backBtn.tabIndex = vis ? 0 : -1;
    backBtn.setAttribute('aria-hidden', vis ? 'false' : 'true');
  }

  function renderPanel(){
    const a = sel && AREA[sel];
    const open = !!(a && a.proc);
    panel.classList.toggle('open', open);
    root.classList.toggle('panel-open', open);
    if (!open) return;
    const p = PROC[a.proc];
    $('.bm-eye').textContent = L(p);
    $('.bm-ph h3').textContent = L(a.name);
    $('.bm-cn').innerHTML = a.cn.map((c, i) => `<button type="button" data-i="${i}" aria-pressed="${concern === i}">${esc(L(c))}</button>`).join('');
    renderProc();
  }
  function renderProc(){
    const a = AREA[sel]; const box = $('.bm-proc');
    $('.bm-pick').hidden = concern !== null;
    if (concern === null) { box.hidden = true; return; }
    const p = PROC[a.proc];
    box.hidden = false;
    box.querySelector('h5').textContent = L(p);
    box.querySelector('.bm-dl').innerHTML = p.rec[lang].map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
    const link = box.querySelector('.bm-link');
    link.href = serviceUrl(a.proc);
    link.innerHTML = `<span>${esc(T.details)}</span>${ic('arrow')}`;
    const add = box.querySelector('.bm-add');
    add.classList.remove('done');
    add.innerHTML = `${ic('plus')}<span>${esc(T.add)}</span>`;
  }

  function select(k, viaKey){
    const a = AREA[k];
    if (!a) return;
    if (a.female && gender !== 'female') return;
    if (k === 'face') { enterFace(); return; }
    if (a.lvl === 'face' && level !== 'face' && !flat) enterFace(true);
    sel = k; concern = null;
    renderRail(); renderPanel(); renderBack();
    gl && gl.focusArea(k);
    hint.classList.add('hide');
    emit('bodymap:area', { area: k, procedure: a.proc || null });
    if (viaKey) {
      /* the heading can take focus only once the panel has finished opening, so keep trying briefly */
      const h3 = $('.bm-ph h3'); let n = 0;
      const go = () => { h3.focus({ preventScroll: true }); if (document.activeElement !== h3 && ++n < 12 && !destroyed) setTimeout(go, 100); };
      requestAnimationFrame(go);
    }
  }
  function enterFace(silent){
    level = 'face'; sel = null; concern = null;
    renderRail(); renderPanel(); renderHint(); renderBack();
    if (!silent) gl && gl.focusFace();
    hint.classList.remove('hide');
    if (!silent) emit('bodymap:area', { area: 'face', procedure: null });
  }
  function goBack(){
    if (flat) { sel = null; concern = null; renderRail(); renderPanel(); return; }
    if (level === 'face' && sel) { sel = null; concern = null; renderRail(); renderPanel(); renderBack(); gl && gl.focusFace(); return; }
    level = 'body'; sel = null; concern = null;
    renderRail(); renderPanel(); renderHint(); renderBack();
    gl && gl.focusBody();
  }
  function setGender(g){
    if (g === gender) return;
    gender = g;
    try { localStorage.setItem('apex.bodymap.gender', g); } catch (e) { /* storage unavailable */ }
    if (sel && AREA[sel].female && g !== 'female') { sel = null; concern = null; gl && gl.focusBody(); level = 'body'; }
    renderSeg(); renderRail(); renderPanel(); renderBack(); renderHint();
    gl && gl.setGender(g);
    emit('bodymap:gender', { gender: g });
  }

  on(rail, 'click', e => { const b = e.target.closest('button[data-k]'); if (b) select(b.dataset.k, e.detail === 0); });
  on(seg, 'click', e => { const b = e.target.closest('button[data-g]'); if (b) setGender(b.dataset.g); });
  on(backBtn, 'click', goBack);
  on($('.bm-x'), 'click', goBack);
  on($('.bm-cn'), 'click', e => {
    const b = e.target.closest('button[data-i]'); if (!b) return;
    concern = +b.dataset.i;
    $('.bm-cn').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    renderProc();
    const pb = $('.bm-pb'); const box = $('.bm-proc');
    requestAnimationFrame(() => { const r = box.getBoundingClientRect(), pr = pb.getBoundingClientRect(); if (r.bottom > pr.bottom) pb.scrollTo({ top: pb.scrollTop + (r.top - pr.top) - 12, behavior: reduced ? 'auto' : 'smooth' }); });
  });
  on($('.bm-add'), 'click', () => {
    const a = AREA[sel]; if (!a || concern === null) return;
    emit('plan:add', { procedure: a.proc, area: a.k, concern: a.cn[concern].en });
    const add = $('.bm-add');
    add.classList.add('done');
    add.innerHTML = `${ic('check')}<span>${esc(T.added)}</span>`;
  });
  on(root, 'keydown', e => {
    if (e.key !== 'Escape' || !(sel || level === 'face')) return;
    e.preventDefault();
    const prev = sel || 'face';
    goBack();
    (rail.querySelector(`button[data-k="${prev}"]`) || rail.querySelector('button'))?.focus({ preventScroll: true });
  });

  renderSeg(); renderRail(); renderHint(); renderBack();

  function goFlat(msg){
    flat = true; level = 'body';
    root.classList.add('bm--flat');
    if (msg) { const p = document.createElement('p'); p.className = 'bm-err'; p.setAttribute('role', 'status'); p.textContent = msg; root.insertBefore(p, rail); }
    renderRail(); renderPanel(); renderBack();
  }

  /* ---- WebGL start, deferred until the map scrolls into view ---- */
  let destroyed = false;
  if (!hasWebGL()) { goFlat(); }
  else {
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      start().catch(err => { if (!destroyed) { console.warn('[bodymap]', err); goFlat(err && err.bodymap ? T.loadError : null); } });
    }, { rootMargin: '200px 0px' });
    io.observe(root);
    cleanups.push(() => io.disconnect());
  }

  async function start(){
    const THREE = await import(opts.threeUrl || THREE_URL);
    if (destroyed) return;
    const r = await fetch(opts.bodiesUrl || new URL('bodies.bin', HERE).href).catch(() => null);
    if (!r || !r.ok) throw Object.assign(new Error('body'), { bodymap: 1 });
    const bodies = decodeBodies(await r.arrayBuffer());
    if (destroyed) return;
    gl = createScene(THREE, bodies, gender);
  }

  /* ---------------- scene ---------------- */
  function createScene(THREE, bodies, firstGender){
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    const pix = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pix);
    stage.prepend(renderer.domElement);
    loadEl.classList.add('done');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, .05, 400);
    const N = bodies.female.n;

    /* body net: position = female, aPosB = male, one topology */
    const net = buildNet(THREE, { n: N, e: bodies.female.e, pf: bodies.female.pos, pm: bodies.male.pos, nf: bodies.female.nrm, nm: bodies.male.nrm }, { aReg: bodies.female.reg });
    const U = { uTime: { value: 0 }, uMorph: { value: firstGender === 'male' ? 1 : 0 }, uPix: { value: pix }, uIntro: { value: reduced ? 1 : 0 },
      uActA: { value: -1 }, uActB: { value: -1 }, uHovA: { value: -1 }, uHovB: { value: -1 }, uHide: { value: 0 }, uCut: { value: 0 }, uDim: { value: 0 },
      uSize: { value: 2.8 }, uRef: { value: 13 }, uE1: { value: 0 }, uE2: { value: 0 }, uWob: { value: reduced ? 0 : .012 }, uPop: { value: .045 },
      uFocus: { value: 40 }, uDepthR: { value: 2.4 }, uLine: { value: .11 } };
    const mkMat = (vs, fs, uni, defs) => new THREE.ShaderMaterial({ uniforms: uni, vertexShader: vs, fragmentShader: fs, defines: defs || {}, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const mat = mkMat(PT_VS, PT_FS, U), lmat = mkMat(LN_VS, LN_FS, U);
    const lines = new THREE.LineSegments(net.lg, lmat); lines.frustumCulled = false; scene.add(lines);
    const points = new THREE.Points(net.pg, mat); points.frustumCulled = false; scene.add(points);
    const geo = net.pg;

    /* ground */
    const gU = { uTime: U.uTime, uIntro: { value: reduced ? 1 : 0 } };
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), new THREE.ShaderMaterial({ uniforms: gU, vertexShader: GROUND_VS, fragmentShader: GROUND_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    /* floor dust: a slow ring of motes */
    const DN = 520, dpos = new Float32Array(DN * 3), drnd = new Float32Array(DN);
    for (let i = 0; i < DN; i++) { const r = 2.6 + Math.pow(Math.random(), 1.6) * 3.6, t = Math.random() * Math.PI * 2; dpos[i * 3] = Math.cos(t) * r; dpos[i * 3 + 1] = Math.random() * .08; dpos[i * 3 + 2] = Math.sin(t) * r; drnd[i] = Math.random(); }
    const dgeo = new THREE.BufferGeometry();
    dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
    dgeo.setAttribute('aRnd', new THREE.BufferAttribute(drnd, 1));
    const dust = new THREE.Points(dgeo, new THREE.ShaderMaterial({
      uniforms: { uTime: U.uTime, uPix: U.uPix, uIntro: gU.uIntro },
      vertexShader: `attribute float aRnd; uniform float uTime, uPix, uIntro; varying float vA;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv;
          vA = (.25 + .35 * sin(uTime * (.8 + aRnd) + aRnd * 30.)) * uIntro; gl_PointSize = clamp(1.6 * 40. / -mv.z, 1., 3.) * uPix; }`,
      fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); if (d > .5) discard; gl_FragColor = vec4(.78,.66,.92, (1. - smoothstep(.0, .5,d)) * max(vA, 0.)); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    dust.frustumCulled = false;
    scene.add(dust);

    /* ---- anchors per gender ---- */
    const anchors = { female: null, male: null };
    function regionStats(b, regs, dir, side){
      const P = b.pos, Nn = b.nrm, R = b.reg;
      let cx = 0, cy = 0, cz = 0, c = 0, ax = 0, ay = 0, az = 0, ac = 0;
      for (let i = 0; i < b.n; i++) {
        if (!regs.includes(R[i])) continue;
        const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
        if (side && Math.sign(x) !== side) continue;
        cx += x; cy += y; cz += z; c++;
        const f = Nn[i * 3] * dir[0] + Nn[i * 3 + 2] * dir[2];
        if (f > .55) { ax += x; ay += y; az += z; ac++; }
      }
      if (!c) return null;
      const cen = [cx / c, cy / c, cz / c];
      let rad = 0;
      for (let i = 0; i < b.n; i++) {
        if (!regs.includes(R[i])) continue;
        const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
        if (side && Math.sign(x) !== side) continue;
        rad = Math.max(rad, Math.hypot(x - cen[0], (y - cen[1]) * .9, z - cen[2]));
      }
      const anc = ac ? [ax / ac + dir[0] * .12, ay / ac, az / ac + dir[2] * .12] : cen;
      return { cen, anc, rad };
    }
    function computeAnchors(g){
      const b = bodies[g]; const out = {};
      for (const a of AREAS) {
        if (a.lvl !== 'body') continue;
        const dir = [Math.sin(a.a), 0, Math.cos(a.a)];
        if (a.k === 'face') {
          const s = { cen: [0, (b.crown + b.chin) / 2 - .06, b.eyes[2] - .45], anc: [b.halfW * .15, b.eyes[1] - .32, b.front + .15], rad: (b.crown - b.chin) * .6 };
          out.face = { ...s, dir }; continue;
        }
        const s = regionStats(b, a.reg, dir, a.side ? Math.sign(dir[0]) * a.side : 0);
        if (s) out[a.k] = { ...s, dir };
      }
      out._land = { eyes: b.eyes, chin: b.chin, crown: b.crown, front: b.front, halfW: b.halfW };
      let yMax = -Infinity, yMin = Infinity;
      for (let i = 1; i < b.n * 3; i += 3) { yMax = Math.max(yMax, b.pos[i]); yMin = Math.min(yMin, b.pos[i]); }
      out._land.top = yMax; out._land.bottom = yMin;
      anchors[g] = out;
    }
    computeAnchors('female'); computeAnchors('male');

    /* blend helper across the morph */
    const mval = () => smooth(U.uMorph.value);
    const smooth = t => t * t * (3 - 2 * t);
    function A(k){
      const f = anchors.female, m = anchors.male, t = mval();
      const fa = f && f[k], ma = m && m[k];
      if (!fa) return ma; if (!ma) return fa;
      const mix = (x, y) => x.map((v, i) => lerp(v, y[i], t));
      return { cen: mix(fa.cen, ma.cen), anc: mix(fa.anc, ma.anc), rad: lerp(fa.rad, ma.rad, t), dir: fa.dir };
    }
    function land(){
      const f = anchors.female && anchors.female._land, m = anchors.male && anchors.male._land, t = mval();
      if (!f) return m; if (!m) return f;
      const o = {};
      for (const k in f) o[k] = Array.isArray(f[k]) ? f[k].map((v, i) => lerp(v, m[k][i], t)) : lerp(f[k], m[k], t);
      return o;
    }

    /* ---- detailed head (loaded on demand, same units as the body) ---- */
    let face = null, faceLoading = null;
    const fU = { uTime: U.uTime, uPix: U.uPix, uFace: { value: 0 }, uAct: { value: -1 }, uHov: { value: -1 }, uSize: { value: 2.8 }, uRef: { value: 5.6 },
      uMorph: U.uMorph, uCut: U.uCut, uFocus: U.uFocus, uDepthR: { value: 1.4 }, uE1: { value: 0 }, uE2: { value: 0 }, uWob: { value: reduced ? 0 : .003 }, uPop: { value: .014 },
      uLine: { value: .14 }, uHC: { value: new THREE.Vector3() } };
    /* camera target, marker anchor and radius of each face area, per gender */
    function areaStats(P, Nn, area){
      const n = area.length;
      return FACE_KEYS.map((k, i) => {
        const dir = [Math.sin(AREA[k].a), 0, Math.cos(AREA[k].a)];
        let cx = 0, cy = 0, cz = 0, c = 0;
        for (let j = 0; j < n; j++) if (area[j] === i && Nn[j * 3 + 2] > .2) { cx += P[j * 3]; cy += P[j * 3 + 1]; cz += P[j * 3 + 2]; c++; }
        const cen = [cx / c, cy / c, cz / c];
        let rad = 0, ax = 0, ay = 0, az = 0, ac = 0, tip = -1, tz = -Infinity;
        for (let j = 0; j < n; j++) {
          if (area[j] !== i) continue;
          const x = P[j * 3], y = P[j * 3 + 1], z = P[j * 3 + 2];
          rad = Math.max(rad, Math.hypot(x - cen[0], y - cen[1], z - cen[2]));
          if (Math.abs(x) < .12 && z > tz) { tz = z; tip = j; }
          const f = Nn[j * 3] * dir[0] + Nn[j * 3 + 2] * dir[2];
          let ok = f > .55;
          if (k === 'eyes') ok = ok && x > .08;
          if (k === 'facelift') ok = ok && x > .22 && y < cen[1] - .5 && y > cen[1] - .66;
          if (ok) { ax += x; ay += y; az += z; ac++; }
        }
        let anc = ac ? [ax / ac + dir[0] * .05, ay / ac, az / ac + dir[2] * .05] : cen;
        const t = tip >= 0 ? [P[tip * 3], P[tip * 3 + 1], P[tip * 3 + 2]] : cen;
        if (k === 'nose') anc = [t[0] + .1, t[1] + .06, t[2] + .02];
        if (k === 'chin') anc = [t[0] + .2, t[1] + .02, t[2] - .03];
        if (k === 'brows') anc = [anc[0] + .2, anc[1] + .06, anc[2]];
        return { cen, anc, rad, dir };
      });
    }
    function headCenter(P){
      let x = 0, y = 0, z = 0; const n = P.length / 3;
      for (let i = 0; i < n; i++) { x += P[i * 3]; y += P[i * 3 + 1]; z += P[i * 3 + 2]; }
      return [x / n, y / n, z / n];
    }
    function buildHead(H){
      const net = buildNet(THREE, { n: H.n, e: H.e, pf: H.pf, pm: H.pm, nf: H.nf, nm: H.nm }, { aArea: H.area, aKind: H.kind, aAo: H.ao });
      const grp = new THREE.Group(); grp.visible = false;
      const mats = [mkMat(LN_VS, LN_FS, fU, { HEAD: 1 }), mkMat(PT_VS, PT_FS, fU, { HEAD: 1 })];
      const ln = new THREE.LineSegments(net.lg, mats[0]), pt = new THREE.Points(net.pg, mats[1]);
      ln.frustumCulled = pt.frustumCulled = false;
      grp.add(ln, pt);
      scene.add(grp);
      return { grp, geos: [net.pg, net.lg], mats, H, n: H.n,
        st: { female: areaStats(H.pf, H.nf, H.area), male: areaStats(H.pm, H.nm, H.area) },
        hc: { female: headCenter(H.pf), male: headCenter(H.pm) } };
    }
    function ensureFace(){
      if (face) return Promise.resolve(face);
      if (!faceLoading) faceLoading = fetch(opts.headsUrl || new URL('heads.bin', HERE).href)
        .then(r => { if (!r.ok) throw new Error('heads'); return r.arrayBuffer(); })
        .then(b => { if (destroyed) return null; face = buildHead(decodeHeads(b)); return face; })
        .catch(() => { faceLoading = null; const p = document.createElement('p'); p.className = 'bm-err'; p.setAttribute('role', 'status'); p.textContent = T.faceError; root.appendChild(p); setTimeout(() => p.remove(), 4000); return null; });
      return faceLoading;
    }
    const mixArr = (x, y, t) => x.map((v, i) => lerp(v, y[i], t));
    function faceArea(k){
      if (!face) return null;
      const i = FACE_KEYS.indexOf(k), t = mval();
      const f = face.st.female[i], m = face.st.male[i];
      return { cen: mixArr(f.cen, m.cen, t), anc: mixArr(f.anc, m.anc, t), rad: lerp(f.rad, m.rad, t), dir: f.dir };
    }

    /* ---- markers ---- */
    const mk = {};
    for (const a of AREAS) {
      const el = document.createElement('button');
      el.type = 'button'; el.className = 'bm-mk'; el.tabIndex = -1; el.dataset.k = a.k;
      el.innerHTML = `<i></i><b>${esc(L(a.name))}</b>`;
      mksEl.appendChild(el);
      mk[a.k] = el;
    }
    const onMk = e => { const b = e.target.closest('.bm-mk'); if (b) { e.stopPropagation(); select(b.dataset.k); } };
    on(mksEl, 'click', onMk);
    on(mksEl, 'pointerdown', e => e.stopPropagation());
    on(mksEl, 'mouseover', e => { const b = e.target.closest('.bm-mk'); setHover(b ? b.dataset.k : null); });
    on(mksEl, 'mouseout', e => { if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest('.bm-mk')) setHover(null); });

    /* ---- camera rig: orbit around a target ---- */
    let W = 1, H = 1;
    const view = { tx: 0, ty: 0, tz: 0, dist: 40, el: .06, ox: 0, oy: 0 };
    let from = { ...view }, to = { ...view }, tw0 = 0, twDur = 1;
    let az = 0, azFrom = 0, azTo = 0, dragAz = 0, dragAzS = 0, dragEl = 0, dragElS = 0, autoSpin = !reduced;
    let lastUser = -1e9;

    function layoutInfo(){
      const desk = W >= 880;
      const open = panel.classList.contains('open');
      let l = 0, r = 0, t = 0, b = 0;
      if (desk) { l = rail.getBoundingClientRect().width + 40; r = open ? 448 : l; t = b = 40; }
      else { t = 68; b = open ? (panel.getBoundingClientRect().height || H * .58) : (rail.offsetHeight || 52) + 64; }
      return { fw: Math.max(W - l - r, 120), fh: Math.max(H - t - b, 120), ox: (r - l) / 2, oy: (b - t) / 2 };
    }
    function fitDist(radV, radH){
      const li = layoutInfo();
      const tv = Math.tan(camera.fov * Math.PI / 360);
      const dv = radV / (tv * li.fh / H);
      const dh = radH / (tv * camera.aspect * li.fw / W);
      return { d: Math.max(dv, dh), li };
    }
    function goTo(goal, az2, dur){
      from = { ...view }; to = { ...view, ...goal };
      tw0 = performance.now(); twDur = reduced ? 1 : dur;
      if (az2 !== undefined) {
        const cur = az + dragAzS;
        azFrom = cur; azTo = cur + wrapPI(az2 - cur);
        az = cur; dragAz = dragAzS = 0; autoSpin = false;
      } else { azFrom = azTo = az; }
      dragEl = dragElS = 0;
    }
    let mode = 'body';
    function bodyGoal(){
      const l = land();
      const mid = (l.top + l.bottom) / 2, half = (l.top - l.bottom) / 2;
      const { d, li } = fitDist(half * 1.08, 4.9);
      return { tx: 0, ty: mid - .1, tz: 0, dist: d, el: .05, ox: li.ox, oy: li.oy };
    }
    function focusBody(){
      mode = 'body';
      U.uActA.value = U.uActB.value = -1; fU.uAct.value = -1;
      goTo(bodyGoal(), undefined, 1300);
      autoSpin = !reduced;
      fadeTo('dim', 0);
      fadeTo('head', 1); fadeTo('face', 0);
    }
    function focusFace(){
      mode = 'face';
      U.uActA.value = U.uActB.value = -1; fU.uAct.value = -1;
      const a = A('face');
      requestAnimationFrame(() => {
        const { d, li } = fitDist(a.rad * 1.05, a.rad * (W < 560 ? .8 : .95));
        goTo({ tx: a.cen[0], ty: a.cen[1], tz: a.cen[2], dist: d, el: .02, ox: li.ox, oy: li.oy }, 0, 1500);
      });
      ensureFace().then(f => { if (f && mode !== 'body') { f.grp.visible = true; fadeTo('face', 1); fadeTo('head', 0); fadeTo('dim', 0); } });
    }
    function focusArea(k, keep){
      const a = AREA[k];
      if (a.lvl === 'face') {
        mode = 'face';
        U.uActA.value = a.reg ? a.reg[0] : -1; U.uActB.value = -1;
        fU.uAct.value = FACE_KEYS.indexOf(k);
        const go = () => {
          const s = faceArea(k); if (!s) return;
          requestAnimationFrame(() => {
            const { d, li } = fitDist(a.zr, a.zr);
            const ty = k === 'facelift' ? s.cen[1] - .25 : s.cen[1];
            goTo({ tx: s.cen[0] * .6, ty, tz: s.cen[2] - .1, dist: d, el: k === 'chin' ? -.12 : .03, ox: li.ox, oy: li.oy }, keep ? undefined : a.a, keep ? 700 : 1300);
          });
        };
        ensureFace().then(f => { if (f && mode === 'face') { f.grp.visible = true; fadeTo('face', 1); fadeTo('head', 0); fadeTo('dim', 0); go(); } });
        return;
      }
      mode = 'area';
      fadeTo('face', 0); fadeTo('head', 1);
      U.uActA.value = a.reg[0]; U.uActB.value = a.reg[1] ?? -1;
      fU.uAct.value = -1;
      fadeTo('dim', 1);
      const s = A(k);
      requestAnimationFrame(() => {
        const { d, li } = fitDist(a.zr, a.zr);
        goTo({ tx: s.cen[0] * .7, ty: s.cen[1], tz: s.cen[2] * .5, dist: d, el: .05, ox: li.ox, oy: li.oy }, keep ? undefined : a.a, keep ? 700 : 1300);
      });
    }

    /* scalar fades */
    const fades = { head: { v: 1, f: 1, t: 1, t0: 0 }, face: { v: 0, f: 0, t: 0, t0: 0 }, morph: { v: U.uMorph.value, f: 0, t: U.uMorph.value, t0: 0, dur: 1200 }, dim: { v: 0, f: 0, t: 0, t0: 0 } };
    function fadeTo(n, t, dur){ const o = fades[n]; o.f = o.v; o.t = t; o.t0 = performance.now(); o.dur = reduced ? 1 : (dur || 900); }

    let refocusT = 0;
    function setGender(g){
      const go = () => {
        fadeTo('morph', g === 'male' ? 1 : 0, 1400);
        /* with reduced motion the switch is instant, so the refocus below must see the new shape */
        if (reduced) fades.morph.v = fades.morph.f = U.uMorph.value = g === 'male' ? 1 : 0;
        clearTimeout(refocusT);
        refocusT = setTimeout(() => { if (destroyed) return; if (mode === 'face' && !sel) focusFace(); else if (mode !== 'body' && sel) focusArea(sel); }, reduced ? 0 : 1450);
      };
      go();
    }

    /* ---- picking in screen space ---- */
    const tmp = new THREE.Vector3();
    function pick(cx, cy){
      const r = stage.getBoundingClientRect();
      const px = cx - r.left, py = cy - r.top;
      camera.updateMatrixWorld();
      const camPos = camera.position;
      let best = null, bestD = 1e9;
      const thr = 16;
      if (mode !== 'body' && face && fades.face.v > .5) {
        const HD = face.H, t = mval();
        for (let i = 0; i < face.n; i++) {
          const ai = HD.area[i]; if (ai > 50) continue;
          const j = i * 3;
          tmp.set(lerp(HD.pf[j], HD.pm[j], t), lerp(HD.pf[j + 1], HD.pm[j + 1], t), lerp(HD.pf[j + 2], HD.pm[j + 2], t));
          const vx = camPos.x - tmp.x, vy = camPos.y - tmp.y, vz = camPos.z - tmp.z;
          if (HD.nf[j] * vx + HD.nf[j + 1] * vy + HD.nf[j + 2] * vz < 0) continue;
          const depth = Math.hypot(vx, vy, vz);
          tmp.project(camera);
          const sx = (tmp.x + 1) / 2 * W, sy = (1 - tmp.y) / 2 * H;
          const dd = Math.hypot(sx - px, sy - py);
          if (dd < thr && dd + depth * 4 < bestD) { bestD = dd + depth * 4; best = FACE_KEYS[ai]; }
        }
        if (best) return best;
      }
      const fb = bodies.female || bodies.male, mb = bodies.male || bodies.female;
      const t = mval(); const R = fb.reg;
      const nx = new THREE.Vector3();
      for (let i = 0; i < N; i++) {
        let reg = R[i]; if (!reg) continue;
        if (reg === REG.breast && gender !== 'female') continue;
        const j = i * 3;
        tmp.set(lerp(fb.pos[j], mb.pos[j], t), lerp(fb.pos[j + 1], mb.pos[j + 1], t), lerp(fb.pos[j + 2], mb.pos[j + 2], t));
        nx.set(fb.nrm[j], fb.nrm[j + 1], fb.nrm[j + 2]);
        const vx = camPos.x - tmp.x, vy = camPos.y - tmp.y, vz = camPos.z - tmp.z;
        if (nx.x * vx + nx.y * vy + nx.z * vz < 0) continue;
        const depth = Math.hypot(vx, vy, vz);
        tmp.project(camera);
        const sx = (tmp.x + 1) / 2 * W, sy = (1 - tmp.y) / 2 * H;
        const dd = Math.hypot(sx - px, sy - py);
        if (dd < thr && dd + depth * .5 < bestD) { bestD = dd + depth * .5; best = reg; }
      }
      if (best === null) return null;
      if (best === REG.neck && mode === 'face') return 'facelift';
      if (best === REG.head || best === REG.neck) return mode === 'face' ? null : 'face';
      const a = AREAS.find(x => x.lvl === 'body' && x.reg[0] === best);
      return a ? a.k : null;
    }

    let hoverK = null;
    function setHover(k){
      if (k === hoverK) return; hoverK = k;
      Object.values(mk).forEach(m => m.classList.remove('hov'));
      U.uHovA.value = U.uHovB.value = -1; fU.uHov.value = -1;
      stage.style.cursor = k ? 'pointer' : '';
      if (!k) return;
      const a = AREA[k];
      if (a.lvl === 'face') fU.uHov.value = FACE_KEYS.indexOf(k);
      else { U.uHovA.value = a.reg[0]; U.uHovB.value = a.reg[1] ?? -1; }
      mk[k] && mk[k].classList.add('hov');
    }

    /* ---- pointer ---- */
    let drag = null, hoverTimer = 0;
    on(stage, 'pointerdown', e => {
      if (e.button > 0) return;
      drag = { x: e.clientX, y: e.clientY, az: dragAz, el: dragEl, moved: false, id: e.pointerId };
      lastUser = performance.now();
    });
    on(window, 'pointermove', e => {
      if (drag && e.pointerId === drag.id) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 6) { drag.moved = true; stage.classList.add('drag'); try { stage.setPointerCapture(drag.id); } catch (er) { /* capture unsupported */ } autoSpin = false; }
        if (drag.moved) {
          dragAz = drag.az - dx * .008;
          if (e.pointerType === 'mouse') dragEl = Math.max(-.32, Math.min(.38, drag.el + dy * .004));
          if (mode !== 'body') dragAz = Math.max(-.9, Math.min(.9, dragAz));
          lastUser = performance.now();
        }
        return;
      }
      if (e.pointerType !== 'mouse' || !stage.contains(e.target)) return;
      const now = performance.now();
      if (now - hoverTimer < 60) return;
      hoverTimer = now;
      setHover(pick(e.clientX, e.clientY));
    });
    const end = e => {
      if (!drag || (e.pointerId !== undefined && e.pointerId !== drag.id)) return;
      const wasTap = !drag.moved && e.type === 'pointerup';
      stage.classList.remove('drag');
      drag = null;
      if (wasTap) { const k = pick(e.clientX, e.clientY); if (k) select(k); }
    };
    on(window, 'pointerup', end);
    on(window, 'pointercancel', end);
    on(stage, 'pointerleave', () => setHover(null));

    /* ---- sizing ---- */
    function resize(){
      railH();
      W = stage.clientWidth || 1; H = stage.clientHeight || 1;
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      camera.fov = W < 560 ? 34 : 30;
      camera.updateProjectionMatrix();
      if (mode === 'body') { const g = bodyGoal(); Object.assign(view, g); Object.assign(to, g); Object.assign(from, g); }
      else if (mode === 'face' && !sel) focusFace();
      else if (sel) focusArea(sel);
    }
    const ro = new ResizeObserver(() => resize());
    ro.observe(stage);
    let ph = 0;
    const pro = new ResizeObserver(() => {
      const h = panel.getBoundingClientRect().height;
      if (Math.abs(h - ph) < 8) return; ph = h;
      if (W < 880 && sel && mode !== 'body') focusArea(sel, true);
    });
    pro.observe(panel);
    cleanups.push(() => pro.disconnect());
    cleanups.push(() => ro.disconnect());
    W = stage.clientWidth || 1; H = stage.clientHeight || 1;
    resize();
    const g0 = bodyGoal(); Object.assign(view, g0); from = { ...view }; to = { ...view };

    /* ---- loop ---- */
    let raf = 0, visible = true, t0 = performance.now(), last = t0, introT = reduced ? 1 : 0;
    const io2 = new IntersectionObserver(([en]) => { visible = en.isIntersecting; kick(); }, { threshold: .02 });
    io2.observe(root);
    cleanups.push(() => io2.disconnect());
    const onVis = () => kick();
    on(document, 'visibilitychange', onVis);
    function kick(){ if (!raf && visible && !document.hidden && !destroyed) { last = performance.now(); raf = requestAnimationFrame(frame); } }

    const v3 = new THREE.Vector3();
    function frame(now){
      raf = 0;
      if (destroyed || !visible || document.hidden) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      const t = (now - t0) / 1000;
      U.uTime.value = t;
      if (introT < 1) { introT = Math.min(1, introT + dt / 2.4); U.uIntro.value = ease(introT); gU.uIntro.value = ease(introT); }
      for (const n in fades) { const o = fades[n]; o.v = lerp(o.f, o.t, ease((now - o.t0) / (o.dur || 900))); }
      U.uHide.value = 1 - fades.head.v;
      fU.uFace.value = fades.face.v;
      if (face) { face.grp.visible = fades.face.v > .01; }
      const prevM = U.uMorph.value;
      U.uMorph.value = fades.morph.v;
      if (mode === 'body' && prevM !== U.uMorph.value) { const g = bodyGoal(); Object.assign(view, g); from = { ...view }; to = { ...view }; tw0 = 0; }
      if (face) {
        const tm = mval();
        U.uCut.value = lerp(face.H.cutF, face.H.cutM, tm);
        const c = mixArr(face.hc.female, face.hc.male, tm); fU.uHC.value.set(c[0], c[1], c[2]);
      }

      // camera tween
      const k = ease((now - tw0) / twDur);
      for (const key in to) view[key] = lerp(from[key], to[key], k);
      if (mode === 'body' && autoSpin === false && !drag && now - lastUser > 4000 && !reduced && k >= 1) autoSpin = true;
      if (mode === 'body' && autoSpin && !drag) az += dt * .16;
      else if (k < 1 || mode !== 'body') az = lerp(azFrom, azTo, k);
      if (mode !== 'body' && !drag && now - lastUser > 6000) dragAz *= .97;
      dragAzS += (dragAz - dragAzS) * Math.min(1, dt * 10);
      dragElS += (dragEl - dragElS) * Math.min(1, dt * 10);
      const ang = az + dragAzS, el = Math.max(-.4, Math.min(.5, view.el + dragElS));
      camera.position.set(view.tx + Math.sin(ang) * Math.cos(el) * view.dist, view.ty + Math.sin(el) * view.dist, view.tz + Math.cos(ang) * Math.cos(el) * view.dist);
      camera.lookAt(view.tx, view.ty, view.tz);
      camera.setViewOffset(W, H, view.ox, view.oy, W, H);
      /* edge points join in as the camera closes in, so the net stays as open as the atlas */
      U.uE1.value = Math.max(0, Math.min(1, (30 - view.dist) / 16));
      U.uE2.value = Math.max(0, Math.min(1, (17 - view.dist) / 7));
      fU.uE1.value = Math.max(0, Math.min(1, (4.6 - view.dist) / 1.4));
      fU.uE2.value = Math.max(0, Math.min(1, (3.3 - view.dist) / 1));
      U.uDim.value = fades.dim.v;
      U.uFocus.value = view.dist;
      U.uDepthR.value = mode === 'body' ? 2.2 : 1.6;
      const lb = land();
      ground.position.y = lb.bottom - .02; dust.position.y = lb.bottom;

      renderer.render(scene, camera);
      updateMarkers(ang);
      raf = requestAnimationFrame(frame);
    }

    function updateMarkers(ang){
      const camDir = [Math.sin(ang), 0, Math.cos(ang)];
      const labs = [];
      for (const a of AREAS) {
        const el = mk[a.k];
        let show = false, lab = false, s = null;
        if (a.female && gender !== 'female') { el.classList.remove('vis'); el.classList.add('off'); continue; }
        if (a.lvl === 'body') {
          show = mode === 'body' || (mode === 'area' && sel === a.k);
          if (show) s = A(a.k);
          lab = mode === 'area' && sel === a.k;
        } else {
          show = mode === 'face' && !!face && fades.face.v > .6 && (!sel || sel === a.k);
          if (show) s = faceArea(a.k);
          lab = show;
        }
        if (!s) { el.classList.remove('vis'); el.classList.add('off'); continue; }
        v3.set(s.anc[0], s.anc[1], s.anc[2]);
        const facing = s.dir[0] * camDir[0] + s.dir[2] * camDir[2];
        v3.project(camera);
        const x = (v3.x + 1) / 2 * W, y = (1 - v3.y) / 2 * H;
        const inView = v3.z < 1 && x > 8 && x < W - 8 && y > 8 && y < H - 8;
        const vis = show && inView && facing > -.1;
        el.classList.toggle('vis', vis);
        el.classList.toggle('off', !vis);
        el.classList.toggle('on', sel === a.k);
        el.classList.toggle('lab', lab || hoverK === a.k);
        const bw = el._bw || (el._bw = el.querySelector('b').offsetWidth || 120);
        el.classList.toggle('lft', x + 34 + bw > W - 12 && x - 34 - bw > 12);
        if (vis) el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
        if (vis && el.classList.contains('lab')) labs.push({ el, x, y, w: bw, l: el.classList.contains('lft') });
        else el.style.removeProperty('--ly');
      }
      /* labels that would overlap slide down below the one above */
      labs.sort((p, q) => p.y - q.y);
      for (let i = 0; i < labs.length; i++) {
        const a = labs[i]; a.x0 = a.l ? a.x - 30 - a.w : a.x + 30; a.ly = a.y;
        for (let j = 0; j < i; j++) {
          const b = labs[j];
          if (a.x0 < b.x0 + b.w + 6 && b.x0 < a.x0 + a.w + 6 && a.ly - b.ly < 36) a.ly = b.ly + 36;
        }
        a.el.style.setProperty('--ly', (a.ly - a.y).toFixed(1) + 'px');
      }
    }

    kick();

    return {
      focusArea, focusFace, focusBody, setGender,
      dispose(){
        cancelAnimationFrame(raf); raf = 0;
        net.pg.dispose(); net.lg.dispose(); mat.dispose(); lmat.dispose(); ground.geometry.dispose(); ground.material.dispose(); dgeo.dispose(); dust.material.dispose();
        if (face) { face.geos.forEach(g => g.dispose()); face.mats.forEach(m => m.dispose()); }
        renderer.dispose();
        try { renderer.forceContextLoss(); } catch (e) { /* already lost */ }
      }
    };
  }

  const api = {
    destroy(){
      destroyed = true;
      cleanups.forEach(f => f());
      if (gl) gl.dispose();
      gl = null;
      root.remove();
      if (!--cssRefs && cssEl) { cssEl.remove(); cssEl = null; }
    }
  };
  return api;
}

