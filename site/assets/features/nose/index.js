/* Nose Preview
   A client takes or chooses photos of their own face and tries preset nose shapes on them
   in three views: front, 45 degrees and 90 degrees (profile).
   Everything runs in the browser. No photo leaves the device.

   mount(container, opts) -> {destroy()}
   opts: lang 'en' | 'th', base (assets/ URL), serviceUrl(key), onEvent(name, data)
   Testing only: mpBase (folder of @mediapipe/face_mesh) */

/* =====================================================================
   PRESETS
   Default common styles. Apex's surgeons will replace these with their own.
   Each value runs from -1 to 1 and is applied relative to the detected nose:
     bridge       bridge height: profile dorsum line and front shading (+ higher)
     hump         dorsal hump reduction (0 to 1, 1 lowers the whole bump)
     tipProj      tip projection (+ further out)
     tipRot       tip rotation (+ upturned)
     tipWidth     tip width and refinement (- narrower)
     alar         nostril (alar) width (- narrower)
     bridgeWidth  bridge width (- narrower)
     slope        supratip slope, a soft dip above the tip (+ deeper)
   ===================================================================== */
export const PRESETS = [
  {id:'natural', en:'Natural', th:'ทรงธรรมชาติ',
   desc:{en:'The bridge is a little higher and the shape stays close to the current nose.', th:'สันจมูกสูงขึ้นเล็กน้อย รูปทรงใกล้เคียงจมูกเดิม'},
   p:{bridge:.4, hump:.25, tipProj:.25, tipRot:.12, tipWidth:-.25, alar:-.12, bridgeWidth:-.2, slope:.1}},
  {id:'soft-slope', en:'Soft slope', th:'ทรงสโลป',
   desc:{en:'The bridge curves gently down to a slightly lifted tip.', th:'สันจมูกโค้งลาดลงสู่ปลายจมูกที่เชิดขึ้นเล็กน้อย'},
   p:{bridge:.6, hump:.6, tipProj:.45, tipRot:.45, tipWidth:-.4, alar:-.12, bridgeWidth:-.3, slope:.8}},
  {id:'straight', en:'Straight bridge', th:'ทรงสันตรง',
   desc:{en:'The bridge runs straight from between the eyes to the tip.', th:'สันจมูกตรงตั้งแต่หว่างคิ้วถึงปลายจมูก'},
   p:{bridge:.85, hump:.85, tipProj:.4, tipRot:.05, tipWidth:-.3, alar:-.08, bridgeWidth:-.4, slope:0}},
  {id:'refined-tip', en:'Refined tip', th:'ปลายหยดน้ำ',
   desc:{en:'The tip is narrower and rounded in a water-drop shape.', th:'ปลายจมูกเรียวและมนเป็นทรงหยดน้ำ'},
   p:{bridge:.35, hump:.25, tipProj:.6, tipRot:.18, tipWidth:-.85, alar:-.2, bridgeWidth:-.12, slope:.25}},
  {id:'upturned', en:'Upturned tip', th:'ปลายเชิด',
   desc:{en:'The tip turns slightly upward.', th:'ปลายจมูกเชิดขึ้นเล็กน้อย'},
   p:{bridge:.45, hump:.45, tipProj:.3, tipRot:.9, tipWidth:-.35, alar:-.08, bridgeWidth:-.18, slope:.45}},
  {id:'slim-nostrils', en:'Slim nostrils', th:'ปีกจมูกเล็ก',
   desc:{en:'The nostrils are narrower and the base looks slimmer.', th:'ปีกจมูกแคบลงและฐานจมูกดูเรียวขึ้น'},
   p:{bridge:.15, hump:0, tipProj:.1, tipRot:0, tipWidth:-.3, alar:-.9, bridgeWidth:-.05, slope:0}},
  {id:'hump-reduction', en:'Hump reduction', th:'ลดฮัมพ์',
   desc:{en:'The bump on the bridge is lowered for a smoother line.', th:'ส่วนนูนบนสันจมูกลดลง เส้นสันจมูกเรียบขึ้น'},
   p:{bridge:.1, hump:1, tipProj:.15, tipRot:.15, tipWidth:-.12, alar:0, bridgeWidth:-.12, slope:.1}},
];

/* Sample photos, one per view. Each sample carries hand-placed nose points and a crop,
   both as fractions of the full photo, so the sample opens with the points on the nose.
   Uploaded photos still use live face-mesh detection. */
const SAMPLES = {
  front:{src:'https://images.unsplash.com/photo-1589525231707-f2de2428f59c?w=1200&h=1500&fit=crop&crop=faces&q=85',
    crop:[.14, .14, .86, .78],
    h:{N:[.500, .398], D:[.4995, .455], T:[.4985, .507], C:[.4985, .522], AL:[.4335, .511], AR:[.5635, .511]}},
  '45':{src:'https://images.unsplash.com/photo-1641351841616-faa0d3760980?w=1200&q=85', side:-1,
    crop:[.12, .30, .82, .86],
    h:{N:[.462, .517], D:[.466, .553], T:[.472, .592], C:[.477, .611], AL:[.426, .602], AR:[.518, .597]}},
  '90':{src:'https://images.unsplash.com/photo-1736439538470-88b66bd307ce?w=1400&q=85', side:-1,
    crop:[.38, 0, .98, 1],
    h:{N:[.5805, .3931], D:[.5665, .455], T:[.5335, .526], C:[.5565, .583], A:[.5863, .5307]}},
};
const MP_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/';

/* one colour per point key, the same in every view. Each dot sits in a white ring with a dark
   shadow, so it reads on light skin, dark skin and the plum stage alike. */
const PT_COLOR = {N:'#FF4D85', D:'#FFB020', T:'#3FA9FF', C:'#B488FF', AL:'#22D3B6', AR:'#A3E635', A:'#FF7A3D'};

/* ---------- strings ---------- */
const VIEWS = [
  {id:'front', name:{en:'Front view', th:'มุมหน้าตรง'}, tab:{en:'Front', th:'หน้าตรง'},
   hint:{en:'Face the camera straight on.', th:'หันหน้าตรงเข้าหากล้อง'},
   empty:{en:'Take or choose a front photo.', th:'ถ่ายหรือเลือกรูปหน้าตรง'}},
  {id:'45', name:{en:'45° view', th:'มุม 45°'}, tab:{en:'45°', th:'45°'},
   hint:{en:'Turn your head halfway to one side.', th:'หันศีรษะไปด้านข้างครึ่งทาง'},
   empty:{en:'Take or choose a 45° photo.', th:'ถ่ายหรือเลือกรูปมุม 45°'}},
  {id:'90', name:{en:'90° view', th:'มุมข้าง 90°'}, tab:{en:'90°', th:'90°'},
   hint:{en:'Turn your head fully to the side.', th:'หันศีรษะไปด้านข้างจนสุด'},
   empty:{en:'Take or choose a side photo.', th:'ถ่ายหรือเลือกรูปด้านข้าง'}},
];
const STR = {
  en:{
    photo:'Photo', take:'Take photo', choose:'Choose photo', sample:'Sample face', privacy:'No photo uploaded.',
    adjust:'Adjust points', done:'Done', flip:'Flip', faceL:'Facing left', faceR:'Facing right', faceGroup:'Direction', manual:'Place points by hand',
    dragHint:'Drag a point to correct it.', placeHint:'Place the points on your nose.',
    busy:'Finding the nose', credit:'Sample photo: Unsplash', style:'Nose style', amount:'Amount',
    before:'Before', after:'After', sim:'Simulation only', compare:'Before and after',
    save:'Save', saveBtn:'Save to phone', plan:'Add rhinoplasty to My Plan', planned:'Added to My Plan',
    vary:'Results may vary from person to person.', service:'Rhinoplasty',
    camHint:'Line up your face with the outline.', shutter:'Take photo', cancel:'Cancel', views:'Views',
    brand:'Apex Surgery Hospital',
    err:{noFace:'No face found in this photo.', camera:'The camera could not be opened.', read:'The photo could not be read.',
         model:'The face model could not be loaded.', save:'The image could not be saved.',
         sample:name => `The ${name.toLowerCase()} sample photo could not be loaded.`},
    guide:'Where the points go', glow:'Soft light', zoom:'Zoom', zoomIn:'Zoom in', zoomOut:'Zoom out',
    pt:{N:'Top of the bridge', D:'Middle of the bridge', T:'Tip', C:'Base of the nose', A:'Nostril wing', AL:'Left nostril edge', AR:'Right nostril edge'},
  },
  th:{
    photo:'รูปภาพ', take:'ถ่ายรูป', choose:'เลือกรูป', sample:'ใบหน้าตัวอย่าง', privacy:'ไม่มีการอัปโหลดรูปภาพ',
    adjust:'ปรับจุด', done:'เสร็จ', flip:'กลับด้าน', faceL:'หันซ้าย', faceR:'หันขวา', faceGroup:'ทิศทาง', manual:'วางจุดเอง',
    dragHint:'ลากจุดเพื่อปรับตำแหน่ง', placeHint:'วางจุดให้ตรงกับจมูก',
    busy:'กำลังหาตำแหน่งจมูก', credit:'ภาพตัวอย่าง: Unsplash', style:'ทรงจมูก', amount:'ระดับ',
    before:'ก่อน', after:'หลัง', sim:'ภาพจำลองเท่านั้น', compare:'ก่อนและหลัง',
    save:'บันทึก', saveBtn:'บันทึกลงโทรศัพท์', plan:'เพิ่มเสริมจมูกในแผนของฉัน', planned:'เพิ่มในแผนแล้ว',
    vary:'ผลลัพธ์อาจแตกต่างกันในแต่ละบุคคล', service:'เสริมจมูก',
    camHint:'จัดใบหน้าให้อยู่ในเส้น', shutter:'ถ่ายรูป', cancel:'ยกเลิก', views:'มุมภาพ',
    brand:'Apex Surgery Hospital',
    err:{noFace:'ไม่พบใบหน้าในรูปนี้', camera:'เปิดกล้องไม่ได้', read:'อ่านรูปไม่ได้',
         model:'โหลดโมเดลใบหน้าไม่ได้', save:'บันทึกรูปไม่ได้',
         sample:name => `โหลดรูปตัวอย่าง${name}ไม่ได้`},
    guide:'ตำแหน่งของจุด', glow:'แสงนวล', zoom:'ซูม', zoomIn:'ซูมเข้า', zoomOut:'ซูมออก',
    pt:{N:'บนสุดของสันจมูก', D:'กลางสันจมูก', T:'ปลายจมูก', C:'ฐานจมูก', A:'ปีกจมูก', AL:'ขอบปีกจมูกซ้าย', AR:'ขอบปีกจมูกขวา'},
  },
};

/* ---------- icons (lucide, same set as the site) ---------- */
const ICON = {
  camera:'<path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"/><circle cx="12" cy="13" r="3"/>',
  upload:'<path d="M12 3v12"/><path d="m17 8-5-5-5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>',
  image:'<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  download:'<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
  plus:'<path d="M5 12h14"/><path d="M12 5v14"/>',
  minus:'<path d="M5 12h14"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  arrow:'<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
  face:'<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/>',
  shield:'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  move:'<path d="m18 8 4 4-4 4"/><path d="M2 12h20"/><path d="m6 8-4 4 4 4"/>',
  flip:'<path d="m3 7 5-4v8z"/><path d="M8 7h8a5 5 0 0 1 0 10h-3"/>',
  faceL:'<path d="M15 4c-4 0-6 3-6 6l-3 4h3v3a2 2 0 0 0 2 2h2v2"/><path d="M15 4c3 0 5 2.5 5 6 0 2.5-1 4-2 5v6"/>',
  faceR:'<path d="M9 4c4 0 6 3 6 6l3 4h-3v3a2 2 0 0 1-2 2h-2v2"/><path d="M9 4c-3 0-5 2.5-5 6 0 2.5 1 4 2 5v6"/>',
  points:'<circle cx="6" cy="6" r="2"/><circle cx="18" cy="12" r="2"/><circle cx="8" cy="18" r="2"/><path d="M7.5 7.5 16.4 11"/><path d="m16.5 13.3-7 3.6"/>',
  alert:'<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
};
const ic = k => `<svg class="np-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;

/* camera guides, viewBox 0 0 100 130 */
const GUIDE = {
  front:'<ellipse cx="50" cy="60" rx="27" ry="36"/><path d="M50 40v34" class="np-g2"/>',
  '45':'<path d="M48 22c17 0 29 13 30 30 0 6 3 10 5 15 1 3-2 5-4 5 1 3 0 5-2 6 1 2 0 4-2 5-1 9-7 18-20 19-16 1-29-11-31-34-2-25 8-46 24-46z"/><path d="M64 28c6 14 9 28 7 44" class="np-g2"/>',
  '90':'<path d="M43 20c18-1 29 11 30 27 1 5 2 9 6 16 2 3-1 5-4 5 1 3 0 6-2 7 1 2 0 4-2 5 0 8-5 16-16 17-6 0-9 4-9 12M26 109c1-8 0-13-4-19-8-12-9-32-4-46 4-11 13-23 25-24"/>',
};

/* ---------- styles ---------- */
const CSS = `
.np{--np-plum:var(--plum,#6A388C);--np-plum-7:var(--plum-700,#55286F);--np-night:var(--night,#1F0A30);--np-night-2:var(--night-2,#2A0F40);
  --np-lilac:var(--lilac,#A886CD);--np-lilac-3:var(--lilac-300,#C9B3DD);--np-lilac-2:var(--lilac-200,#E4D8EE);--np-lilac-1:var(--lilac-100,#F1EAF7);
  --np-wash:var(--wash,#FBF3FB);--np-ink:var(--ink,#2A1F33);--np-ink-2:var(--ink-2,#5A4A66);--np-ink-3:var(--ink-3,#7C6A88);
  --np-on:var(--on-night,#F6EEFB);--np-on-2:var(--on-night-2,#CDB9DD);--np-rose:#CC3366;--np-ease:cubic-bezier(.23,1,.32,1);
  font-family:var(--font,"LINE Seed","Sarabun","Noto Sans Thai",system-ui,sans-serif);color:var(--np-ink);line-height:1.6;
  display:grid;gap:14px;min-width:0;-webkit-tap-highlight-color:transparent}
.np *,.np *::before,.np *::after{box-sizing:border-box}
.np :where(button){font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
.np [hidden]{display:none!important}
.np-i{width:1.15em;height:1.15em;flex:none;display:inline-block;vertical-align:-.18em}
.np-main{display:grid;gap:14px;min-width:0}
@media (min-width:960px){.np-main{grid-template-columns:minmax(0,1fr) 372px;gap:24px;align-items:start}}

/* stage */
.np-stage{position:relative;min-width:0;background:radial-gradient(120% 80% at 50% 0%,var(--np-night-2),var(--np-night) 70%);color:var(--np-on);
  border-radius:28px;padding:10px;display:grid;gap:10px}
.np-tabs{display:flex;gap:4px;padding:4px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(201,179,221,.18)}
.np-tab{flex:1;min-width:0;height:40px;border-radius:999px;color:var(--np-on-2);font-weight:700;font-size:15px;display:inline-flex;align-items:center;justify-content:center;gap:6px;
  transition:background-color .2s,color .2s}
.np-tab:hover{color:#fff}
.np-tab[aria-selected=true]{background:#fff;color:var(--np-plum)}
.np-tab .np-dot{width:7px;height:7px;border-radius:50%;background:var(--np-lilac);flex:none}
.np-tab[aria-selected=true] .np-dot{background:var(--np-rose)}
.np-view{--mh:60vh;position:relative;display:grid;place-items:center;min-height:min(64vh,460px);border-radius:20px;overflow:hidden}
@media (min-width:960px){.np-view{--mh:74vh;min-height:min(76vh,680px)}}
.np-view.fit{min-height:0}
.np-view.gd{gap:10px}
.np-fbox{position:relative;width:min(100%,calc(var(--mh) * var(--ar,.8)));aspect-ratio:var(--ar,.8)}
.np-frame{--x:50%;position:absolute;inset:0;border-radius:20px;overflow:hidden;
  background:#12051d;touch-action:pan-y;user-select:none;-webkit-user-select:none}
.np-frame.zm{touch-action:none;cursor:grab}
.np-knob{touch-action:none}
.np-frame.zm.pan{cursor:grabbing}
.np-zl{position:absolute;inset:0;transform-origin:0 0}
.np-frame canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.np-frame .np-after{clip-path:inset(0 0 0 var(--cx,50%))}
/* zoom */
.np-zui{position:absolute;right:10px;bottom:10px;z-index:4;display:flex;align-items:center;border-radius:999px;color:#fff;
  background:rgba(31,10,48,.72);border:1px solid rgba(201,179,221,.28);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.np-zui button{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-size:18px;color:#fff;transition:background-color .2s}
.np-zui button:hover:not(:disabled){background:rgba(255,255,255,.12)}
.np-zui button:disabled{opacity:.35;cursor:default}
.np-zui button:focus-visible{outline:2px solid var(--np-lilac);outline-offset:-3px}
.np-zui output{min-width:30px;text-align:center;font-size:13px;font-weight:700;font-variant-numeric:tabular-nums}
/* placement guide: the sample nose with its points, and a legend */
.np-gd{width:min(100%,max(320px,calc(var(--mh) * var(--ar,.8))));display:grid;gap:8px;padding:12px;border-radius:20px;
  background:rgba(255,255,255,.06);border:1px solid rgba(201,179,221,.18)}
.np-gd h4{margin:0;font-size:14px;line-height:1.3;font-weight:700;color:#fff}
.np-gd-b{display:grid;grid-template-columns:96px minmax(0,1fr);gap:12px;align-items:center}
.np-gd-b.solo{grid-template-columns:minmax(0,1fr)}
.np-gd canvas{width:100%;aspect-ratio:1;display:block;border-radius:12px;background:#12051d}
.np-legend{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:4px 12px}
.np-legend li{display:flex;align-items:center;gap:8px;font-size:13px;line-height:1.35;color:var(--np-on);min-width:0}
.np-legend li::before{content:"";flex:none;width:12px;height:12px;border-radius:50%;background:var(--c);box-shadow:0 0 0 2px #fff}
.np-legend li.on{font-weight:700;color:#fff}
@media (min-width:1200px){
  .np-view.gd{grid-template-columns:minmax(0,calc(var(--mh) * var(--ar,.8))) 216px;justify-content:center;gap:20px}
  .np-gd{width:100%}
  .np-gd-b,.np-legend{grid-template-columns:minmax(0,1fr)}
}
.np-line{position:absolute;top:0;bottom:0;left:var(--x);width:2px;margin-left:-1px;background:#fff;box-shadow:0 0 0 1px rgba(31,10,48,.18)}
/* a 56px strip around the line where a touch drags the slider and never scrolls the page */
.np-line::before{content:"";position:absolute;top:0;bottom:0;left:-27px;width:56px;touch-action:none}
.np-frame.pts .np-line::before{display:none}
.np-knob{position:absolute;top:50%;left:var(--x);width:42px;height:42px;margin:-21px 0 0 -21px;border-radius:50%;background:#fff;color:var(--np-plum);
  display:grid;place-items:center;box-shadow:0 10px 24px -8px rgba(20,6,31,.6);font-size:20px;cursor:ew-resize}
.np-frame:focus-visible{outline:2px solid var(--np-lilac);outline-offset:3px}
.np-tag{position:absolute;top:10px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:.02em;background:rgba(31,10,48,.62);color:#fff;
  backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);pointer-events:none}
.np-tag.l{left:10px}.np-tag.r{right:10px}
.np-tag.sim{top:auto;bottom:10px;left:10px;background:rgba(255,255,255,.9);color:var(--np-plum)}
.np-frame.pts .np-after,.np-frame.pts .np-line,.np-frame.pts .np-knob,.np-frame.pts .np-tag{display:none}
/* corner brackets: a viewfinder motif */
.np-corners{position:absolute;inset:8px;pointer-events:none;
  background:linear-gradient(var(--np-lilac-3),var(--np-lilac-3)) 0 0/18px 2px,linear-gradient(var(--np-lilac-3),var(--np-lilac-3)) 0 0/2px 18px,
  linear-gradient(var(--np-lilac-3),var(--np-lilac-3)) 100% 0/18px 2px,linear-gradient(var(--np-lilac-3),var(--np-lilac-3)) 100% 0/2px 18px,
  linear-gradient(var(--np-lilac-3),var(--np-lilac-3)) 0 100%/18px 2px,linear-gradient(var(--np-lilac-3),var(--np-lilac-3)) 0 100%/2px 18px,
  linear-gradient(var(--np-lilac-3),var(--np-lilac-3)) 100% 100%/18px 2px,linear-gradient(var(--np-lilac-3),var(--np-lilac-3)) 100% 100%/2px 18px;
  background-repeat:no-repeat;opacity:.55}
.np-outline{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:none}
.np-frame.pts .np-outline{display:block}
.np-outline path{fill:none;stroke:#fff;stroke-width:2;stroke-linejoin:round;stroke-linecap:round;vector-effect:non-scaling-stroke;opacity:.85}
.np-outline path.sh{stroke:rgba(31,10,48,.55);stroke-width:4}
.np-pt{position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;display:none;place-items:center;touch-action:none;cursor:grab;z-index:3}
.np-frame.pts .np-pt{display:grid}
.np-pt::before{content:"";width:18px;height:18px;border-radius:50%;background:var(--c,var(--np-plum));border:3px solid #fff;box-shadow:0 2px 8px rgba(20,6,31,.55);
  transition:transform .16s var(--np-ease)}
.np-pt.on::before,.np-pt:focus-visible::before{transform:scale(1.3);box-shadow:0 0 0 3px rgba(31,10,48,.55),0 2px 8px rgba(20,6,31,.55)}
.np-pt:focus-visible{outline:none}
.np-pt span{position:absolute;bottom:40px;left:50%;transform:translateX(-50%);white-space:nowrap;padding:2px 8px;border-radius:999px;background:#fff;color:var(--np-plum);
  font-size:12px;font-weight:700;opacity:0;pointer-events:none;transition:opacity .15s}
.np-pt span::before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--c);margin-right:6px;vertical-align:1px}
.np-pt.on span,.np-pt:focus-visible span{opacity:1}

.np-empty,.np-error{display:grid;justify-items:center;text-align:center;gap:12px;padding:28px 18px;max-width:420px}
.np-empty .np-big,.np-error .np-big{width:64px;height:64px;border-radius:20px;display:grid;place-items:center;background:rgba(255,255,255,.07);
  border:1px solid rgba(201,179,221,.22);color:var(--np-lilac-3);font-size:30px}
.np-error .np-big{color:#fff;background:rgba(204,51,102,.22);border-color:rgba(204,51,102,.5)}
.np-empty h3,.np-error h3{margin:0;font-size:20px;font-weight:700;color:#fff;line-height:1.35}
.np-empty p,.np-error p{margin:0;color:var(--np-on-2);font-size:15px}
.np-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}

.np-cam{position:absolute;inset:0;background:#000;display:grid}
.np-cam video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}
.np-cam .np-guide{position:absolute;left:50%;top:46%;height:78%;max-width:92%;transform:translate(-50%,-50%);overflow:visible}
.np-cam .np-guide *{fill:none;stroke:#fff;stroke-width:1.1;stroke-dasharray:3 2.2;vector-effect:non-scaling-stroke;opacity:.9}
.np-cam .np-guide .np-g2{opacity:.45}
.np-cam p{position:absolute;top:12px;left:12px;right:12px;margin:0;text-align:center;font-size:14px;font-weight:700;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.6)}
.np-cambar{position:absolute;left:0;right:0;bottom:16px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;padding:0 16px}
.np-cambar>:first-child{justify-self:end}
.np-shutter{width:68px;height:68px;border-radius:50%;background:#fff;color:var(--np-plum);display:grid;place-items:center;font-size:26px;
  box-shadow:0 0 0 4px rgba(255,255,255,.35);transition:transform .16s var(--np-ease)}
.np-shutter:active{transform:scale(.94)}

.np-busy{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:12px;background:rgba(31,10,48,.72);color:#fff;font-weight:700;z-index:5}
.np-spin{width:40px;height:40px;border-radius:50%;border:3px solid rgba(255,255,255,.22);border-top-color:#fff;animation:np-spin .8s linear infinite}
@keyframes np-spin{to{transform:rotate(360deg)}}

.np-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:space-between;padding:2px 4px 2px 8px;min-height:44px}
.np-bar p{margin:0;font-size:14px;color:var(--np-on-2);flex:1 1 160px}
.np-bar .np-row{justify-content:flex-end}
.np-cap{margin:0;font-size:14px;color:var(--np-on-2)}
.np-cap b{color:#fff;font-weight:700}
.np .np-glow{gap:10px;padding:0 10px 0 14px}
.np-sw{position:relative;flex:none;width:30px;height:18px;border-radius:999px;background:rgba(255,255,255,.2);transition:background-color .2s}
.np-sw::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:transform .2s var(--np-ease)}
.np-glow[aria-checked=true] .np-sw{background:var(--np-rose)}
.np-glow[aria-checked=true] .np-sw::after{transform:translateX(12px)}
.np-credit{margin:0;padding:0 8px 4px;font-size:12px;line-height:1.4;color:var(--np-on-2)}

/* buttons */
.np .np-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5em;height:44px;padding:0 18px;border-radius:999px;font-size:15px;font-weight:700;
  white-space:nowrap;transition:transform .16s var(--np-ease),background-color .2s,color .2s,border-color .2s}
.np .np-btn:active{transform:scale(.97)}
.np .np-btn:disabled{opacity:.45;cursor:not-allowed;transform:none}
.np .np-btn.pri{background:var(--np-plum);color:#fff;box-shadow:0 10px 24px -12px rgba(106,56,140,.8)}
.np .np-btn.pri:hover:not(:disabled){background:var(--np-plum-7)}
.np .np-btn.lt{background:#fff;color:var(--np-plum)}
.np .np-btn.lt:hover{background:var(--np-lilac-1)}
.np .np-btn.gh{border:1px solid rgba(201,179,221,.5);color:#fff}
.np .np-btn.gh:hover{background:rgba(255,255,255,.08)}
.np .np-btn.ol{border:1px solid var(--np-lilac-3);color:var(--np-plum);background:#fff}
.np .np-btn.ol:hover:not(:disabled){background:var(--np-lilac-1)}
.np .np-btn.ol[aria-pressed=true]{background:var(--np-lilac-1);border-color:var(--np-plum)}
.np .np-btn.sm{height:38px;padding:0 14px;font-size:14px}
.np .np-btn.wide{width:100%}

/* panel */
.np-panel{min-width:0;background:#fff;border:1px solid var(--np-lilac-2);border-radius:28px;padding:20px;display:grid;gap:22px}
@media (min-width:960px){.np-panel{position:sticky;top:96px}}
.np-sec{display:grid;gap:10px;min-width:0}
.np-sec h3{margin:0;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--np-plum);font-weight:700;display:flex;align-items:center;gap:8px}
.np-sec h3 i{font-style:normal;width:22px;height:22px;border-radius:50%;background:var(--np-lilac-1);display:grid;place-items:center;font-size:12px;letter-spacing:0}
.np-sec>p{margin:0;font-size:15px;color:var(--np-ink-2)}
.np-src{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.np-face{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;margin:0 0 10px;border-radius:999px;background:var(--np-lilac-1,#F1EAF7)}
.np-face[hidden]{display:none}
.np-fb{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 12px;border:0;border-radius:999px;background:transparent;color:var(--np-plum,#6A388C);font:inherit;font-weight:700;font-size:14.5px;cursor:pointer;transition:background .2s,color .2s}
.np-fb .np-i{width:20px;height:20px}
.np-fb[aria-pressed=true]{background:var(--np-plum,#6A388C);color:#fff;box-shadow:0 8px 18px -10px rgba(106,56,140,.8)}
.np-fb:focus-visible{outline:3px solid var(--np-lilac,#A886CD);outline-offset:2px}
.np-src .np-btn{padding:0 10px}
.np-src .full{grid-column:1/-1}
.np-priv{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--np-ink-2);margin:0}
.np-priv .np-i{color:var(--np-plum)}
.np-chips{display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x proximity;margin:0 -20px;padding:2px 20px 6px;scrollbar-width:none;overscroll-behavior-x:contain}
.np-chips::-webkit-scrollbar{display:none}
@media (min-width:960px){.np-chips{flex-wrap:wrap;overflow:visible;margin:0;padding:0}}
.np-chip{flex:none;scroll-snap-align:start;height:38px;padding:0 15px;border-radius:999px;border:1px solid var(--np-lilac-3);background:#fff;color:var(--np-ink-2);font-size:14px;font-weight:700;
  transition:background-color .2s,color .2s,border-color .2s,transform .16s var(--np-ease)}
.np-chip:hover{border-color:var(--np-plum);color:var(--np-plum)}
.np-chip:active{transform:scale(.97)}
.np-chip[aria-pressed=true]{background:var(--np-plum);border-color:var(--np-plum);color:#fff}
.np-desc{margin:0;font-size:15px;color:var(--np-ink-2);min-height:3.2em}
.np-amt{display:grid;gap:8px}
.np-amt div{display:flex;justify-content:space-between;font-size:14px;font-weight:700;color:var(--np-ink)}
.np-amt output{color:var(--np-plum);font-variant-numeric:tabular-nums}
.np input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:6px;margin:10px 0;
  background:linear-gradient(90deg,var(--np-plum) var(--v,70%),var(--np-lilac-2) var(--v,70%));outline-offset:8px}
.np input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:26px;height:26px;border-radius:50%;background:#fff;border:2px solid var(--np-plum);box-shadow:0 6px 16px -6px rgba(74,22,104,.5);cursor:pointer}
.np input[type=range]::-moz-range-thumb{width:24px;height:24px;border-radius:50%;background:#fff;border:2px solid var(--np-plum);cursor:pointer}
.np input[type=range]:disabled{opacity:.5}
.np-saves{display:grid;gap:8px}
.np-err{margin:0;font-size:14px;color:var(--np-rose)}

.np-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 16px;padding:14px 18px;border-radius:20px;background:var(--np-wash);border:1px solid var(--np-lilac-2)}
.np-foot p{margin:0;font-size:15px;color:var(--np-ink-2)}
.np-link{display:inline-flex;align-items:center;gap:.4em;font-weight:700;color:var(--np-plum);text-decoration:none;border-bottom:1px solid var(--np-lilac-3);padding-bottom:1px}
.np-link:hover{border-color:var(--np-plum)}
.np-link .np-i{transition:transform .25s var(--np-ease)}
.np-link:hover .np-i{transform:translate(2px,-2px)}
@media (prefers-reduced-motion:reduce){.np *{transition:none!important;animation-duration:1.6s!important}}
`;

/* ===================================================================== */
/* geometry                                                               */
const V = {
  add:(a, b) => ({x:a.x + b.x, y:a.y + b.y}), sub:(a, b) => ({x:a.x - b.x, y:a.y - b.y}), mul:(a, k) => ({x:a.x * k, y:a.y * k}),
  dot:(a, b) => a.x * b.x + a.y * b.y, len:a => Math.hypot(a.x, a.y), dist:(a, b) => Math.hypot(a.x - b.x, a.y - b.y),
  unit:a => { const l = Math.hypot(a.x, a.y) || 1; return {x:a.x / l, y:a.y / l}; }, perp:a => ({x:-a.y, y:a.x}),
  lerp:(a, b, t) => ({x:a.x + (b.x - a.x) * t, y:a.y + (b.y - a.y) * t}),
  rot:(p, c, ang) => { const s = Math.sin(ang), k = Math.cos(ang), dx = p.x - c.x, dy = p.y - c.y; return {x:c.x + dx * k - dy * s, y:c.y + dx * s + dy * k}; },
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ZERO = {x:0, y:0};

const KEYS = {front:['N', 'D', 'T', 'C', 'AL', 'AR'], '45':['N', 'D', 'T', 'C', 'AL', 'AR'], '90':['N', 'D', 'T', 'C', 'A']};
const MESH = {N:168, D:195, T:1, C:2, AL:129, AR:358};

/* nose frame for the front and 45 degree views */
function frameFront(h){
  const L = Math.max(6, V.dist(h.N, h.C)), u = V.unit(V.sub(h.C, h.N));
  let v = V.perp(u);
  if (V.dot(V.sub(h.AR, h.AL), v) < 0) v = V.mul(v, -1);
  const W = Math.max(.4 * L, V.dot(V.sub(h.AR, h.AL), v));
  const tT = clamp(V.dot(V.sub(h.T, h.N), u) / L, .5, .97);
  const tD = clamp(V.dot(V.sub(h.D, h.N), u) / L, .15, tT - .1);
  const tOff = V.dot(V.sub(h.T, h.N), v);
  const pos = (t, s) => V.add(h.N, V.add(V.mul(u, t * L), V.mul(v, s + tOff * clamp(t / tT, 0, 1))));
  const bw = t => (t <= tD ? lerp(.19, .125, t / tD) : lerp(.125, .14, clamp((t - tD) / (tT - tD), 0, 1))) * W;
  return {L, u, v, W, tT, tD, tOff, pos, bw};
}
/* nose frame for the profile: down runs nasion to columella base, n points out of the face */
function frameSide(h){
  const Ls = Math.max(6, V.dist(h.N, h.C)), down = V.unit(V.sub(h.C, h.N));
  let n = V.perp(down);
  if (V.dot(V.sub(h.T, h.N), n) < 0) n = V.mul(n, -1);
  return {Ls, down, n, out:V.dot(V.sub(h.T, h.N), n) / Ls};
}

/* control points: src positions and their displacements */
function Controls(){
  const P = [];
  return {
    P,
    add(p, d){
      for (const q of P) if (Math.abs(q.p.x - p.x) < 1.5 && Math.abs(q.p.y - p.y) < 1.5) { q.d = V.add(q.d, d); return; }
      P.push({p, d});
    },
  };
}

function genFront(C, h, P, k){
  const F = frameFront(h), {L, u, v, W, tT, tD, pos, bw} = F;
  for (const s of [-1, 1]) {
    const A = s < 0 ? h.AL : h.AR, vs = V.mul(v, s);
    const dA = V.mul(V.add(V.mul(vs, P.alar * .11 * W), V.mul(u, -P.tipRot * .012 * L)), k);
    C.add(A, dA);
    C.add(V.add(A, V.add(V.mul(u, .07 * L), V.mul(vs, -.06 * W))), V.mul(dA, .85));
    C.add(V.add(A, V.add(V.mul(u, -.09 * L), V.mul(vs, -.05 * W))), V.mul(dA, .5));
    C.add(V.add(A, V.mul(vs, -.14 * W)), V.mul(dA, .6));
    C.add(pos(tT, s * .15 * W), V.mul(V.add(V.mul(vs, P.tipWidth * .055 * W), V.mul(u, -P.tipRot * .035 * L)), k));
    for (const t of [.2, tD, (tD + tT) / 2]) { const b = bw(t); C.add(pos(t, s * b), V.mul(vs, P.bridgeWidth * .3 * b * k)); }
  }
  C.add(pos(0, 0), ZERO);
  C.add(pos(tD, 0), ZERO);
  C.add(h.T, V.mul(u, -P.tipRot * .045 * L * k));
  C.add(pos((tT + 1) / 2, 0), V.mul(u, -P.tipRot * .04 * L * k));
  C.add(h.C, V.mul(u, -P.tipRot * .03 * L * k));
  return F;
}

function genSide(C, h, P, k, extraAnchors){
  const S = frameSide(h), {Ls, down, n} = S;
  if (S.out < .04) return S;
  const s1 = V.dist(h.N, h.D), s2 = V.dist(h.D, h.T), tot = s1 + s2 || 1;
  const at = t => { const d = t * tot; return d <= s1 ? V.lerp(h.N, h.D, d / (s1 || 1)) : V.lerp(h.D, h.T, (d - s1) / (s2 || 1)); };
  let m = V.perp(V.unit(V.sub(h.T, h.N)));
  if (V.dot(m, n) < 0) m = V.mul(m, -1);
  const hump = p => Math.max(0, V.dot(V.sub(p, h.N), m));
  for (let i = 0; i <= 8; i++) {
    const t = i / 8 * .88, p = at(t);
    const fb = .55 + .45 * Math.sin(Math.PI * Math.min(1, t / .9));
    const g = Math.exp(-(((t - .74) / .1) ** 2));
    const d = V.mul(m, (P.bridge * .07 * Ls * fb - P.hump * hump(p) * .9 - P.slope * .03 * Ls * g) * k);
    C.add(p, d);
    C.add(V.add(p, V.mul(m, .1 * Ls)), V.mul(d, .85));
    C.add(V.add(p, V.mul(m, -.14 * Ls)), V.mul(d, .6));
  }
  // tip rotation turns the tip about the alar crease, upward toward the nasion
  let ang = P.tipRot * 10 * Math.PI / 180 * k;
  if (V.dot(V.sub(V.rot(h.T, h.A, ang), h.T), down) > 0) ang = -ang;
  const turn = p => V.sub(V.rot(p, h.A, ang), p);
  const dT = V.add(V.add(turn(h.T), V.mul(n, P.tipProj * .075 * Ls * k)), V.mul(m, P.bridge * .014 * Ls * k));
  C.add(h.T, dT);
  C.add(V.add(h.T, V.mul(n, .09 * Ls)), V.mul(dT, .9));
  C.add(V.add(h.T, V.mul(n, -.12 * Ls)), V.mul(dT, .55));
  const Q = V.lerp(h.T, h.C, .45);
  C.add(Q, V.add(V.mul(turn(Q), .9), V.mul(n, P.tipProj * .05 * Ls * k)));
  C.add(h.C, V.mul(turn(h.C), .3));
  const dAl = V.mul(V.unit(V.sub(h.T, h.A)), -P.alar * .035 * Ls * k);
  C.add(h.A, dAl);
  const A2 = V.lerp(h.A, h.T, .35);
  C.add(A2, V.add(V.mul(turn(A2), .5), V.mul(dAl, .6)));
  if (extraAnchors) {
    C.add(V.add(h.N, V.mul(n, -.32 * Ls)), ZERO);                         // eye
    C.add(V.add(h.N, V.mul(down, -.3 * Ls)), ZERO);                        // brow
    C.add(V.add(h.A, V.mul(n, -.28 * Ls)), ZERO);                          // cheek
    C.add(V.add(h.C, V.mul(down, .28 * Ls)), ZERO);                        // upper lip
    C.add(V.add(V.add(h.C, V.mul(down, .28 * Ls)), V.mul(n, .15 * Ls)), ZERO);
  }
  return S;
}

/* build every control point plus the feather ellipse for one view */
function buildControls(view, h, P){
  const C = Controls();
  let ell, F = null;
  if (view === 'front') {
    F = genFront(C, h, P, 1);
    ell = {c:F.pos(.55, 0), a:F.v, ra:.85 * F.W, b:F.u, rb:.8 * F.L};
  } else if (view === '90') {
    const S = genSide(C, h, P, 1, true);
    ell = {c:V.add(V.add(h.N, V.mul(S.down, .55 * S.Ls)), V.mul(S.n, .12 * S.Ls)), a:S.n, ra:Math.max(.62 * S.Ls, S.out * S.Ls + .16 * S.Ls), b:S.down, rb:.85 * S.Ls};
  } else {
    F = genFront(C, h, P, .7);
    const fr = frameSide({N:h.N, C:h.C, T:h.T});
    const near = V.dot(V.sub(h.AL, h.N), fr.n) < V.dot(V.sub(h.AR, h.N), fr.n) ? h.AL : h.AR;
    const S = genSide(C, {N:h.N, D:h.D, T:h.T, C:h.C, A:near}, P, .6, false);
    ell = {c:V.add(F.pos(.55, 0), V.mul(S.n, .06 * F.L)), a:F.v, ra:.95 * F.W, b:F.u, rb:.85 * F.L};
  }
  // ring of fixed anchors on the feather ellipse keeps the rest of the face still
  for (let i = 0; i < 24; i++) {
    const t = i / 24 * Math.PI * 2;
    C.add(V.add(ell.c, V.add(V.mul(ell.a, Math.cos(t) * ell.ra), V.mul(ell.b, Math.sin(t) * ell.rb))), ZERO);
  }
  return {pts:C.P, ell, F};
}

/* ===================================================================== */
/* the warp: backward rigid moving least squares on a coarse grid, feathered to zero
   at the ellipse edge, then bilinear resampling of the original pixels */
function warpInto(srcData, out, ctrl, grid){
  const W = srcData.width, H = srcData.height, {pts, ell} = ctrl;
  const live = pts.filter(q => Math.abs(q.d.x) + Math.abs(q.d.y) > .05);
  if (!live.length) return;
  const n = pts.length, Dx = new Float64Array(n), Dy = new Float64Array(n), Sx = new Float64Array(n), Sy = new Float64Array(n);
  pts.forEach((q, i) => { Sx[i] = q.p.x; Sy[i] = q.p.y; Dx[i] = q.p.x + q.d.x; Dy[i] = q.p.y + q.d.y; });
  // bounding box of the ellipse
  const ex = Math.hypot(ell.a.x * ell.ra, ell.b.x * ell.rb), ey = Math.hypot(ell.a.y * ell.ra, ell.b.y * ell.rb);
  const x0 = Math.max(0, Math.floor(ell.c.x - ex)), x1 = Math.min(W - 1, Math.ceil(ell.c.x + ex));
  const y0 = Math.max(0, Math.floor(ell.c.y - ey)), y1 = Math.min(H - 1, Math.ceil(ell.c.y + ey));
  if (x1 <= x0 || y1 <= y0) return;
  const w = x1 - x0 + 1, h = y1 - y0 + 1, G = grid || 4, gw = Math.ceil(w / G) + 2, gh = Math.ceil(h / G) + 2;
  const gx = new Float32Array(gw * gh), gy = new Float32Array(gw * gh), wt = new Float64Array(n);
  const mask = (x, y) => {
    const dx = x - ell.c.x, dy = y - ell.c.y;
    const a = (dx * ell.a.x + dy * ell.a.y) / ell.ra, b = (dx * ell.b.x + dy * ell.b.y) / ell.rb;
    return 1 - smooth(.62, 1, Math.sqrt(a * a + b * b));
  };
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const vx = x0 + i * G, vy = y0 + j * G, mk = mask(vx, vy);
    if (mk <= 0) continue;
    let sw = 0, px = 0, py = 0, qx = 0, qy = 0;
    for (let k = 0; k < n; k++) {
      const dx = Dx[k] - vx, dy = Dy[k] - vy, ww = 1 / (dx * dx + dy * dy + 1);
      wt[k] = ww; sw += ww; px += ww * Dx[k]; py += ww * Dy[k]; qx += ww * Sx[k]; qy += ww * Sy[k];
    }
    px /= sw; py /= sw; qx /= sw; qy /= sw;
    let mr = 0, mi = 0;
    for (let k = 0; k < n; k++) {
      const ax = Dx[k] - px, ay = Dy[k] - py, bx = Sx[k] - qx, by = Sy[k] - qy;
      mr += wt[k] * (ax * bx + ay * by); mi += wt[k] * (ax * by - ay * bx);
    }
    const nm = Math.hypot(mr, mi) || 1; mr /= nm; mi /= nm;
    const rx = vx - px, ry = vy - py;
    const fx = rx * mr - ry * mi + qx, fy = rx * mi + ry * mr + qy;
    gx[j * gw + i] = (fx - vx) * mk; gy[j * gw + i] = (fy - vy) * mk;
  }
  // the patch starts as the untouched photo, copied from the cached pixels rather than read back from the canvas
  const S = srcData.data, img = new ImageData(w, h), D = img.data;
  for (let y = 0; y < h; y++) D.set(S.subarray(((y0 + y) * W + x0) * 4, ((y0 + y) * W + x0 + w) * 4), y * w * 4);
  for (let y = 0; y < h; y++) {
    const fy = y / G, j = fy | 0, ty = fy - j;
    for (let x = 0; x < w; x++) {
      const fx = x / G, i = fx | 0, tx = fx - i, o = j * gw + i;
      const dx = (gx[o] * (1 - tx) + gx[o + 1] * tx) * (1 - ty) + (gx[o + gw] * (1 - tx) + gx[o + gw + 1] * tx) * ty;
      const dy = (gy[o] * (1 - tx) + gy[o + 1] * tx) * (1 - ty) + (gy[o + gw] * (1 - tx) + gy[o + gw + 1] * tx) * ty;
      if (dx * dx + dy * dy < .0004) continue;
      const sx = clamp(x0 + x + dx, 0, W - 1.001), sy = clamp(y0 + y + dy, 0, H - 1.001);
      const ix = sx | 0, iy = sy | 0, ax = sx - ix, ay = sy - iy;
      const p00 = (iy * W + ix) * 4, p10 = p00 + 4, p01 = p00 + W * 4, p11 = p01 + 4, d = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) D[d + c] = (S[p00 + c] * (1 - ax) + S[p10 + c] * ax) * (1 - ay) + (S[p01 + c] * (1 - ax) + S[p11 + c] * ax) * ay;
    }
  }
  out.getContext('2d').putImageData(img, x0, y0);
}

/* soft strokes drawn through a shadow, which blurs in every browser */
function soft(ctx, op, color, blur, draw){
  const OFF = 20000;
  ctx.save();
  ctx.globalCompositeOperation = op;
  ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.shadowOffsetX = OFF;
  ctx.translate(-OFF, 0);
  ctx.strokeStyle = ctx.fillStyle = '#000';
  draw();
  ctx.restore();
}
/* front shading: a highlight down the bridge and shadow along its sides read as height */
function shadeFront(ctx, F, P, k){
  const sh = clamp(P.bridge + Math.max(0, -P.bridgeWidth) * .35 + P.hump * .15, 0, 1.3) * k;
  const {pos, bw, tT, W, L, u} = F, sc = 1 + P.bridgeWidth * .3 * k;
  const path = (s, t0, t1, f) => { ctx.beginPath(); for (let i = 0; i <= 12; i++) { const t = lerp(t0, t1, i / 12), p = pos(t, s * bw(t) * sc * f); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } };
  if (sh > .01) {
    for (const s of [-1, 1]) soft(ctx, 'multiply', `rgba(112,72,62,${(.34 * sh).toFixed(3)})`, .07 * W, () => {
      ctx.lineWidth = .085 * W; ctx.lineCap = 'round'; path(s, .05, tT - .1, 1.3); ctx.stroke();
    });
    soft(ctx, 'screen', `rgba(255,244,236,${(.24 * sh).toFixed(3)})`, .05 * W, () => {
      ctx.lineWidth = .07 * W; ctx.lineCap = 'round'; path(0, .14, tT - .1, 0); ctx.stroke();
    });
  }
  const tp = (Math.max(0, P.tipProj) * .7 + Math.max(0, -P.tipWidth) * .4) * k;
  if (tp > .01) {
    const c = V.add(pos(tT - .05, 0), V.mul(u, -P.tipRot * .045 * L * k));
    soft(ctx, 'screen', `rgba(255,244,236,${(.18 * tp).toFixed(3)})`, .05 * W, () => { ctx.beginPath(); ctx.arc(c.x, c.y, .055 * W, 0, Math.PI * 2); ctx.fill(); });
  }
}

/* soft light for the after picture: slight warmth, a gentle bloom and a spotlight on the face
   that falls off toward the edges. It changes colour only, so nothing moves or changes shape. */
/* the soft bloom copy is made once per photo, since only the nose moves between renders */
const bloomCache = new WeakMap();
function bloomOf(base){
  let blur = bloomCache.get(base);
  if (blur) return blur;
  const W = base.width, H = base.height;
  // blur by shrinking and enlarging, which every browser supports
  const resize = (src, w, hh) => {
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(hh));
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, c.width, c.height); return c;
  };
  blur = resize(resize(resize(base, W / 4, H / 4), W / 14, H / 14), W / 4, H / 4);
  // squaring the soft copy keeps the bloom on the bright skin and away from eyes and hair
  const bg = blur.getContext('2d'); bg.globalCompositeOperation = 'multiply'; bg.drawImage(blur, 0, 0);
  bloomCache.set(base, blur);
  return blur;
}
function glowInto(out, view, h, base){
  const W = out.width, H = out.height, ctx = out.getContext('2d');
  const blur = bloomOf(base || out);
  const pts = Object.values(h), xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const L = Math.max(V.dist(h.N, h.C), .06 * Math.min(W, H));
  let c = {x:(Math.min(...xs) + Math.max(...xs)) / 2, y:(Math.min(...ys) + Math.max(...ys)) / 2 - .25 * L};
  if (view === '90') c = V.sub(c, V.mul(frameSide(h).n, .9 * L)); // the face sits behind the profile line
  const far = Math.hypot(Math.max(c.x, W - c.x), Math.max(c.y, H - c.y));
  ctx.save();
  ctx.imageSmoothingQuality = 'high';
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgb(255,246,235)'; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .24; ctx.drawImage(blur, 0, 0, W, H);
  ctx.globalAlpha = 1;
  let g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 2.6 * L);
  g.addColorStop(0, 'rgba(255,238,220,.16)'); g.addColorStop(.55, 'rgba(255,238,220,.08)'); g.addColorStop(1, 'rgba(255,238,220,0)');
  ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(c.x, c.y, 2.1 * L, c.x, c.y, Math.max(2.4 * L, far));
  g.addColorStop(0, 'rgba(70,36,52,0)'); g.addColorStop(1, 'rgba(70,36,52,.34)');
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/* the soft-light version of a photo is made once and reused, so the slider redraws only the nose */
const glowCache = new WeakMap();
function glowSource(base, view, h){
  const key = view + ':' + KEYS[view].map(k => h[k] ? Math.round(h[k].x / 8) + ',' + Math.round(h[k].y / 8) : '').join(';');
  const hit = glowCache.get(base);
  if (hit && hit.key === key) return hit;
  const c = document.createElement('canvas'); c.width = base.width; c.height = base.height;
  c.getContext('2d').drawImage(base, 0, 0);
  glowInto(c, view, h, base);
  const src = {key, canvas:c, data:c.getContext('2d', {willReadFrequently:true}).getImageData(0, 0, c.width, c.height)};
  glowCache.set(base, src);
  return src;
}

/* the part of the picture a warp and its shading can touch: the warp ellipse with room for the soft shading */
function warpRegion(ctrl, W, H){
  const ell = ctrl.ell;
  const ex = Math.hypot(ell.a.x * ell.ra, ell.b.x * ell.rb), ey = Math.hypot(ell.a.y * ell.ra, ell.b.y * ell.rb);
  const m = Math.max(40, .3 * Math.max(ex, ey));
  const x0 = Math.max(0, Math.floor(ell.c.x - ex - m)), y0 = Math.max(0, Math.floor(ell.c.y - ey - m));
  return {x0, y0, x1:Math.min(W, Math.ceil(ell.c.x + ex + m)), y1:Math.min(H, Math.ceil(ell.c.y + ey + m))};
}

/* one finished "after" picture for a view.
   Given a target canvas that already shows this photo, only the region the last warp touched and the region
   this warp touches are redrawn, which keeps the amount slider quick on tablets. */
function render(view, base, data, h, P, amt, glow, target, fast){
  const out = target || document.createElement('canvas');
  if (out.width !== base.width || out.height !== base.height) { out.width = base.width; out.height = base.height; out._src = null; }
  const W = out.width, H = out.height, ctx = out.getContext('2d');
  const src = glow ? glowSource(base, view, h) : {canvas:base, data};
  let ctrl = null, Q = null;
  if (amt > 0) { Q = {}; for (const k in P) Q[k] = P[k] * amt; ctrl = buildControls(view, h, Q); }
  const reg = ctrl ? warpRegion(ctrl, W, H) : null;
  const prev = out._src === src.canvas ? out._dirty : undefined;
  const put = r => { if (r && r.x1 > r.x0 && r.y1 > r.y0) ctx.drawImage(src.canvas, r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0, r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0); };
  // photos are opaque, so plain drawing replaces the pixels; 'copy' would clear everything outside the region
  ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.shadowColor = 'transparent';
  if (prev === undefined) ctx.drawImage(src.canvas, 0, 0);   // first draw of this photo, or the light changed
  else { put(prev); put(reg); }
  ctx.restore();
  if (ctrl) {
    warpInto(src.data, out, ctrl, fast ? 8 : 4);   // a coarser warp grid while the slider moves, full detail when it stops
    if (ctrl.F) {
      ctx.save(); ctx.beginPath(); ctx.rect(reg.x0, reg.y0, reg.x1 - reg.x0, reg.y1 - reg.y0); ctx.clip();
      shadeFront(ctx, ctrl.F, Q, view === 'front' ? 1 : .7);
      ctx.restore();
    }
  }
  out._src = src.canvas; out._dirty = reg;
  return out;
}

/* the lines joining the points, as an SVG path in image coordinates */
function outlineD(view, h){
  const M = p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  if (view === '90') return `M${M(h.N)} Q${M(V.add(h.D, V.sub(h.D, V.lerp(h.N, h.T, .5))))} ${M(h.T)} L${M(h.C)} M${M(h.A)} Q${M(V.lerp(V.lerp(h.A, h.T, .5), h.C, .5))} ${M(h.C)}`;
  return `M${M(h.N)} L${M(h.D)} L${M(h.T)} M${M(h.AL)} Q${M(V.lerp(h.T, h.C, .6))} ${M(h.AR)} M${M(h.T)} L${M(h.C)}`;
}

/* mirror a photo and its points left to right. AL and AR swap so each keeps its side of the picture */
function mirrorCanvas(c){
  const o = document.createElement('canvas'); o.width = c.width; o.height = c.height;
  const g = o.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return o;
}
function mirrorPoints(h, axis2){
  const o = {};
  for (const k in h) o[k === 'AL' ? 'AR' : k === 'AR' ? 'AL' : k] = {x:axis2 - h[k].x, y:h[k].y};
  return o;
}

/* placement guide: the sample photo cropped close around the nose, with its hand-placed points.
   flip draws it facing the other way, the same way the sample face is mirrored */
function drawGuide(cv, im, sm, view, flip){
  const W = im.naturalWidth || im.width, H = im.naturalHeight || im.height, S = cv.width;
  let h = {}; for (const k in sm.h) h[k] = {x:sm.h[k][0] * W, y:sm.h[k][1] * H};
  if (flip) { const m = document.createElement('canvas'); m.width = W; m.height = H; const mg = m.getContext('2d'); mg.translate(W, 0); mg.scale(-1, 1); mg.drawImage(im, 0, 0); im = m; h = mirrorPoints(h, W); }
  const xs = Object.values(h).map(p => p.x), ys = Object.values(h).map(p => p.y);
  const size = Math.min(W, H, Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 1.8);
  const x0 = clamp((Math.min(...xs) + Math.max(...xs) - size) / 2, 0, W - size), y0 = clamp((Math.min(...ys) + Math.max(...ys) - size) / 2, 0, H - size);
  const g = cv.getContext('2d'), k = S / size;
  g.clearRect(0, 0, S, S);
  g.drawImage(im, x0, y0, size, size, 0, 0, S, S);
  g.save();
  g.setTransform(k, 0, 0, k, -x0 * k, -y0 * k);
  const path = new Path2D(outlineD(view, h));
  g.lineJoin = g.lineCap = 'round';
  g.strokeStyle = 'rgba(31,10,48,.55)'; g.lineWidth = 9 / k; g.stroke(path);
  g.strokeStyle = '#fff'; g.lineWidth = 4.5 / k; g.stroke(path);
  g.restore();
  for (const key of KEYS[view]) {
    const x = (h[key].x - x0) * k, y = (h[key].y - y0) * k;
    g.beginPath(); g.arc(x, y, 16, 0, Math.PI * 2); g.fillStyle = 'rgba(31,10,48,.45)'; g.fill();
    g.beginPath(); g.arc(x, y, 14, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill();
    g.beginPath(); g.arc(x, y, 9.5, 0, Math.PI * 2); g.fillStyle = PT_COLOR[key]; g.fill();
  }
}

/* ===================================================================== */
/* landmarks                                                              */
let meshP = null, meshBase = '', queue = Promise.resolve();
function loadMesh(base){
  if (meshP && meshBase === base) return meshP;
  meshBase = base;
  meshP = new Promise((res, rej) => {
    const done = () => {
      try {
        const fm = new window.FaceMesh({locateFile:f => base + f});
        fm.setOptions({maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:.5, staticImageMode:true});
        res(fm);
      } catch (e) { rej(e); }
    };
    if (window.FaceMesh) return done();
    const s = document.createElement('script'); s.src = base + 'face_mesh.js'; s.crossOrigin = 'anonymous';
    s.onload = done; s.onerror = e => { meshP = null; rej(e); };
    document.head.append(s);
  });
  return meshP;
}
function detect(base, canvas){
  const run = async () => {
    const fm = await loadMesh(base);
    return new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error('timeout')), 25000);
      fm.onResults(r => { clearTimeout(t); res(r.multiFaceLandmarks && r.multiFaceLandmarks[0] || null); });
      // the model keeps tracking state from the last photo even in still-image mode, which makes it miss the next face
      try { fm.reset && fm.reset(); } catch (e) {}
      fm.send({image:canvas}).catch(e => { clearTimeout(t); rej(e); });
    });
  };
  const p = queue.then(run, run);
  queue = p.catch(() => {});
  return p;
}

/* profile fallback: on a plain background the face edge gives the nose outline */
function silhouette(data, sides){
  const W = data.width, H = data.height, D = data.data;
  const px = (x, y) => { const i = (y * W + x) * 4; return [D[i], D[i + 1], D[i + 2]]; };
  const far = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  for (const s of sides) {
    const bx = s > 0 ? W - 3 : 2, col = [];
    for (let y = Math.round(H * .15); y < H * .85; y += 4) col.push(px(bx, y));
    const mean = [0, 1, 2].map(c => col.reduce((a, p) => a + p[c], 0) / col.length);
    if (col.reduce((a, p) => a + far(p, mean), 0) / col.length > 30) continue;
    const y0 = Math.round(H * .12), y1 = Math.round(H * .88), edge = new Float32Array(H).fill(NaN);
    for (let y = y0; y < y1; y++) {
      for (let k = 3; k < W * .85; k++) {
        const x = s > 0 ? W - 1 - k : k;
        const xs = s > 0 ? [x, x - 1, x - 2] : [x, x + 1, x + 2];
        if (xs.every(q => far(px(q, y), mean) > 60)) { edge[y] = W - 1 - k; break; }
      }
    }
    const sm = y => { let a = 0, n = 0; for (let j = -3; j <= 3; j++) { const v = edge[y + j]; if (v === v) { a += v; n++; } } return n ? a / n : NaN; };
    let yt = -1, best = -1;
    for (let y = Math.round(H * .22); y < H * .78; y++) { const v = sm(y); if (v > best) { best = v; yt = y; } }
    if (yt < 0) continue;
    const argmin = (a, b) => { let m = 1e9, at = -1; for (let y = Math.max(y0 + 3, Math.round(a)); y < Math.min(y1 - 3, Math.round(b)); y++) { const v = sm(y); if (v === v && v < m) { m = v; at = y; } } return at; };
    const yn = argmin(yt - H * .26, yt - H * .04), yc = argmin(yt + H * .008, yt + H * .1);
    if (yn < 0 || yc < 0) continue;
    const Ls = yc - yn, pt = y => ({x:s > 0 ? sm(y) : W - 1 - sm(y), y});
    if (Ls < H * .07 || best - sm(yn) < .15 * Ls || best - sm(yc) < .08 * Ls) continue;
    const T = pt(yt), N = pt(yn), C = pt(yc), yd = Math.round((yn + yt) / 2);
    return {N, D:pt(yd), T, C, A:{x:T.x - s * .42 * Ls, y:T.y - .03 * Ls}};
  }
  return null;
}

function fromMesh(view, lm, W, H){
  const P = i => ({x:lm[i].x * W, y:lm[i].y * H});
  if (view !== '90') { const h = {}; for (const k of KEYS.front) h[k] = P(MESH[k]); return {h, auto:true}; }
  const h = {N:P(168), D:P(195), T:P(1), C:P(2), A:P((lm[129].z || 0) < (lm[358].z || 0) ? 129 : 358)};
  if (sideOk(h, lm, W, H)) return {h, auto:true};
  // mesh is unreliable here: the caller places a default outline facing this way
  let mx = 0; for (const p of lm) mx += p.x; mx /= lm.length;
  return {h:null, auto:false, side:lm[1].x >= mx ? 1 : -1};
}
function sideOk(h, lm, W, H){
  const S = frameSide(h);
  if (S.Ls < .05 * Math.min(W, H)) return false;
  if (S.out < .18 || S.out > .9) return false;
  const d = V.dot(V.sub(h.D, h.N), S.down) / S.Ls; if (d < .15 || d > .95) return false;
  if (V.dot(V.sub(h.A, h.N), S.n) / S.Ls > S.out * .6) return false;
  const a = Math.abs(lm[1].x - lm[234].x), b = Math.abs(lm[1].x - lm[454].x);
  return Math.max(a, b) / Math.max(1e-3, Math.min(a, b)) >= 2.2;
}
function defaultSide(x, y, Ls, s){
  const N = {x, y}, T = {x:x + .4 * Ls * s, y:y + .86 * Ls};
  return {N, D:V.add(V.lerp(N, T, .5), {x:.03 * Ls * s, y:0}), T, C:{x:x + .14 * Ls * s, y:y + Ls}, A:{x:x - .06 * Ls * s, y:y + .8 * Ls}};
}
function defaultHandles(view, W, H, data, side = 1){
  if (view === '90') {
    const sil = data && silhouette(data, [side, -side]);
    if (sil) return sil;
    const Ls = .2 * H; return defaultSide(W * .5 - .12 * Ls * side, H * .38, Ls, side);
  }
  const s = Math.min(W, H) * .3, x = W / 2, y = H * .4;
  return {N:{x, y}, D:{x, y:y + .42 * s}, T:{x, y:y + .86 * s}, C:{x, y:y + s}, AL:{x:x - .36 * s, y:y + .84 * s}, AR:{x:x + .36 * s, y:y + .84 * s}};
}

/* crop a sample photo to its set frame and move its hand-placed points into that frame */
function sampleCrop(canvas, sm){
  const W = canvas.width, H = canvas.height, [a, b, c, d] = sm.crop || [0, 0, 1, 1];
  const cx = a * W, cy = b * H, cw = (c - a) * W, ch = (d - b) * H;
  const r = Math.min(1, 1100 / Math.max(cw, ch));
  const out = document.createElement('canvas'); out.width = Math.round(cw * r); out.height = Math.round(ch * r);
  out.getContext('2d').drawImage(canvas, cx, cy, cw, ch, 0, 0, out.width, out.height);
  const h = {};
  for (const k in sm.h) h[k] = {x:(sm.h[k][0] * W - cx) * r, y:(sm.h[k][1] * H - cy) * r};
  return {base:out, h};
}

/* crop a wide shot to the face so the nose is large enough to work on */
function cropToFace(canvas, lm){
  const W = canvas.width, H = canvas.height;
  let a = 1, b = 1, c = 0, d = 0;
  for (const p of lm) { a = Math.min(a, p.x); b = Math.min(b, p.y); c = Math.max(c, p.x); d = Math.max(d, p.y); }
  const fw = (c - a) * W, fh = (d - b) * H;
  if (fw > .5 * W && fh > .45 * H) return {canvas, lm};
  const cw = Math.min(W, Math.max(fw, fh * .8) * 1.9), ch = Math.min(H, cw * 1.25);
  const cx = clamp((a + c) / 2 * W - cw / 2, 0, W - cw), cy = clamp((b + d) / 2 * H - ch / 2 - fh * .04, 0, H - ch);
  const out = document.createElement('canvas'); out.width = Math.round(cw); out.height = Math.round(ch);
  out.getContext('2d').drawImage(canvas, cx, cy, cw, ch, 0, 0, out.width, out.height);
  const r = Math.min(1, 1100 / Math.max(out.width, out.height));
  let fin = out;
  if (out.width < 700) { // upscale small crops so the warp has room
    const k = 700 / out.width; fin = document.createElement('canvas'); fin.width = 700; fin.height = Math.round(out.height * k);
    fin.getContext('2d').drawImage(out, 0, 0, fin.width, fin.height);
  } else if (r < 1) { fin = document.createElement('canvas'); fin.width = Math.round(out.width * r); fin.height = Math.round(out.height * r); fin.getContext('2d').drawImage(out, 0, 0, fin.width, fin.height); }
  return {canvas:fin, lm:lm.map(p => ({x:(p.x * W - cx) / cw, y:(p.y * H - cy) / ch, z:p.z}))};
}

const loadImage = src => new Promise((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = rej; im.src = src; });
/* sample photos load once and serve both the sample face and the placement guide */
const sampleImgs = new Map();
const sampleImage = src => {
  if (!sampleImgs.has(src)) sampleImgs.set(src, loadImage(src).catch(e => { sampleImgs.delete(src); throw e; }));
  return sampleImgs.get(src);
};
function toCanvas(im, max = 1100){
  const w0 = im.naturalWidth || im.videoWidth || im.width, h0 = im.naturalHeight || im.videoHeight || im.height, r = Math.min(1, max / Math.max(w0, h0));
  const c = document.createElement('canvas'); c.width = Math.round(w0 * r); c.height = Math.round(h0 * r);
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return c;
}

/* ===================================================================== */
/* mount                                                                  */
let styleRefs = 0, styleEl = null;

export function mount(container, opts = {}){
  const lang = opts.lang === 'th' ? 'th' : 'en', S = STR[lang];
  const mpBase = opts.mpBase || MP_CDN;
  const emit = (n, d) => { try { opts.onEvent && opts.onEvent(n, d); } catch (e) {} };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c]));
  if (!styleRefs++) { styleEl = document.createElement('style'); styleEl.dataset.feature = 'nose'; styleEl.textContent = CSS; document.head.append(styleEl); }

  /* which way the nose points in the picture for the turned views: -1 left, 1 right. Starts at the sample faces' direction */
  const state = {view:'front', preset:PRESETS[0].id, amt:.7, mode:'compare', stream:null, pending:null, planned:false, glow:false,
    face:{'45':SAMPLES['45'].side || -1, '90':SAMPLES['90'].side || -1},
    views:{front:{}, '45':{}, '90':{}}};
  let pref = null;
  try { pref = JSON.parse(localStorage.getItem('apex.nose') || 'null'); } catch (e) {}
  if (pref && PRESETS.some(p => p.id === pref.preset)) state.preset = pref.preset;
  if (pref && typeof pref.amt === 'number') state.amt = clamp(pref.amt, 0, 1);
  const remember = () => { try { localStorage.setItem('apex.nose', JSON.stringify({preset:state.preset, amt:state.amt})); } catch (e) {} };

  const root = document.createElement('div');
  root.className = 'np'; root.lang = lang;
  root.innerHTML = `
  <div class="np-main">
    <section class="np-stage" aria-label="${esc(S.compare)}">
      <div class="np-tabs" role="tablist" aria-label="${esc(S.views)}">
        ${VIEWS.map(v => `<button class="np-tab" role="tab" data-view="${v.id}" aria-label="${esc(v.name[lang])}"><span>${esc(v.tab[lang])}</span><span class="np-dot" hidden></span></button>`).join('')}
      </div>
      <div class="np-view">
        <div class="np-empty">
          <span class="np-big">${ic('face')}</span>
          <h3 data-r="ename"></h3>
          <p data-r="etext"></p>
          <div class="np-row">
            <button class="np-btn lt" data-act="take">${ic('camera')}${esc(S.take)}</button>
            <button class="np-btn gh" data-act="choose">${ic('upload')}${esc(S.choose)}</button>
            <button class="np-btn gh" data-act="sample">${ic('image')}${esc(S.sample)}</button>
          </div>
        </div>
        <div class="np-error" hidden>
          <span class="np-big">${ic('alert')}</span>
          <h3 data-r="emsg"></h3>
          <div class="np-row">
            <button class="np-btn lt" data-act="take">${ic('camera')}${esc(S.take)}</button>
            <button class="np-btn gh" data-act="choose">${ic('upload')}${esc(S.choose)}</button>
            <button class="np-btn gh" data-act="sample">${ic('image')}${esc(S.sample)}</button>
            <button class="np-btn gh" data-act="manual">${ic('points')}${esc(S.manual)}</button>
          </div>
        </div>
        <div class="np-fbox" hidden>
          <div class="np-frame" tabindex="0" role="slider" aria-label="${esc(S.compare)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">
            <div class="np-zl"><canvas class="np-before"></canvas><canvas class="np-after"></canvas></div>
            <span class="np-corners"></span>
            <span class="np-line"></span><span class="np-knob">${ic('move')}</span>
            <span class="np-tag l">${esc(S.before)}</span><span class="np-tag r">${esc(S.after)}</span><span class="np-tag sim">${esc(S.sim)}</span>
            <svg class="np-outline" preserveAspectRatio="none"><path class="sh"/><path class="ln"/></svg>
            <div class="np-pts"></div>
          </div>
          <div class="np-zui" role="group" aria-label="${esc(S.zoom)}">
            <button data-act="zout" aria-label="${esc(S.zoomOut)}">${ic('minus')}</button>
            <output data-r="zoomv">1×</output>
            <button data-act="zin" aria-label="${esc(S.zoomIn)}">${ic('plus')}</button>
          </div>
        </div>
        <div class="np-gd" hidden>
          <h4>${esc(S.guide)}</h4>
          <div class="np-gd-b"><canvas width="360" height="360" aria-hidden="true"></canvas><ul class="np-legend"></ul></div>
        </div>
        <div class="np-cam" hidden>
          <video playsinline muted autoplay></video>
          <svg class="np-guide" viewBox="0 0 100 130" aria-hidden="true"></svg>
          <p>${esc(S.camHint)}</p>
          <div class="np-cambar">
            <button class="np-btn gh sm" data-act="camcancel">${esc(S.cancel)}</button>
            <button class="np-shutter" data-act="shutter" aria-label="${esc(S.shutter)}">${ic('camera')}</button>
            <span></span>
          </div>
        </div>
        <div class="np-busy" hidden><span class="np-spin"></span><span>${esc(S.busy)}</span></div>
      </div>
      <div class="np-bar" hidden>
        <p data-r="bartext"></p>
        <div class="np-row">
          <button class="np-btn gh sm" data-act="flip" hidden>${ic('flip')}${esc(S.flip)}</button>
          <button class="np-btn lt sm" data-act="done">${ic('check')}${esc(S.done)}</button>
        </div>
      </div>
      <div class="np-bar np-cbar" hidden><p class="np-cap" data-r="cap"></p>
        <button class="np-btn gh sm np-glow" data-act="glow" role="switch" aria-checked="false">${esc(S.glow)}<span class="np-sw" aria-hidden="true"></span></button>
      </div>
      <p class="np-credit" data-r="credit" hidden>${esc(S.credit)}</p>
    </section>
    <aside class="np-panel">
      <div class="np-sec">
        <h3><i>1</i>${esc(S.photo)}</h3>
        <p data-r="hint"></p>
        <div class="np-face" role="group" aria-label="${esc(S.faceGroup)}" hidden>
          <button class="np-fb" data-act="face" data-f="-1" aria-pressed="true">${ic('faceL')}${esc(S.faceL)}</button>
          <button class="np-fb" data-act="face" data-f="1" aria-pressed="false">${ic('faceR')}${esc(S.faceR)}</button>
        </div>
        <div class="np-src">
          <button class="np-btn pri" data-act="take">${ic('camera')}${esc(S.take)}</button>
          <button class="np-btn ol" data-act="choose">${ic('upload')}${esc(S.choose)}</button>
          <button class="np-btn ol full" data-act="sample">${ic('image')}${esc(S.sample)}</button>
          <button class="np-btn ol full" data-act="adjust" aria-pressed="false" hidden>${ic('points')}${esc(S.adjust)}</button>
        </div>
        <p class="np-priv">${ic('shield')}${esc(S.privacy)}</p>
      </div>
      <div class="np-sec">
        <h3><i>2</i>${esc(S.style)}</h3>
        <div class="np-chips" role="group" aria-label="${esc(S.style)}">
          ${PRESETS.map(p => `<button class="np-chip" data-preset="${p.id}" aria-pressed="false">${esc(p[lang])}</button>`).join('')}
        </div>
        <p class="np-desc" data-r="desc"></p>
        <label class="np-amt"><div><span>${esc(S.amount)}</span><output data-r="amtv"></output></div>
          <input type="range" min="0" max="100" step="1" data-r="amt"></label>
      </div>
      <div class="np-sec">
        <h3><i>3</i>${esc(S.save)}</h3>
        <div class="np-saves">
          <button class="np-btn pri wide" data-act="save" disabled>${ic('download')}${esc(S.saveBtn)}</button>
          <button class="np-btn ol wide" data-act="plan">${ic('plus')}<span>${esc(S.plan)}</span></button>
        </div>
        <p class="np-err" data-r="saveerr" hidden></p>
      </div>
    </aside>
  </div>
  <div class="np-foot">
    <p>${esc(S.vary)}</p>
    <a class="np-link" data-r="svc">${esc(S.service)}${ic('arrow')}</a>
  </div>
  <input type="file" accept="image/*" hidden>`;
  container.append(root);

  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)], R = k => root.querySelector(`[data-r="${k}"]`);
  const view = $('.np-view'), fbox = $('.np-fbox'), frame = $('.np-frame'), zl = $('.np-zl'), cvB = $('.np-before'), cvA = $('.np-after'), ptsEl = $('.np-pts');
  const gd = $('.np-gd'), gdBody = $('.np-gd-b'), gdCv = $('.np-gd canvas'), legend = $('.np-legend');
  const empty = $('.np-empty'), errBox = $('.np-error'), cam = $('.np-cam'), video = $('video'), busy = $('.np-busy');
  const bar = $('.np-bar'), cbar = $('.np-cbar'), file = $('input[type=file]'), amt = R('amt');
  const svc = R('svc');
  try { svc.href = opts.serviceUrl ? opts.serviceUrl('rhinoplasty') : 'service.html?p=rhinoplasty'; } catch (e) { svc.href = 'service.html?p=rhinoplasty'; }

  const cur = () => state.views[state.view];
  const preset = () => PRESETS.find(p => p.id === state.preset) || PRESETS[0];
  const vinfo = id => VIEWS.find(v => v.id === id);
  const ready = v => v.base && v.h;

  /* ---------- drawing ---------- */
  /* One redraw per frame at most. Asking again while one is waiting only updates what it will draw, so a fast
     slider never keeps pushing the redraw back. While the slider moves the redraw uses the quick warp, and on a
     slow device it waits a frame between redraws so the slider itself keeps up with the finger. */
  let rq = 0, rqFast = false, lastCost = 0, lastAt = 0;
  function draw(fast){
    rqFast = rq ? rqFast && !!fast : !!fast;
    if (rq) return;
    const go = now => {
      if (rqFast && lastCost > 20 && now - lastAt < lastCost * 1.5) { rq = requestAnimationFrame(go); return; }
      rq = 0;
      const v = cur();
      if (!ready(v)) return;
      const t0 = performance.now();
      render(state.view, v.base, v.data, v.h, preset().p, state.amt, state.glow, cvA, rqFast);
      lastAt = performance.now(); lastCost = lastAt - t0;
    };
    rq = requestAnimationFrame(go);
  }
  function showPhoto(){
    const v = cur();
    cvB.width = cvA.width = v.base.width; cvB.height = cvA.height = v.base.height;
    cvB.getContext('2d').drawImage(v.base, 0, 0);
    cvA.getContext('2d').drawImage(v.base, 0, 0); cvA._src = null;
    view.style.setProperty('--ar', (v.base.width / v.base.height).toFixed(4));
    Z.z = 1; Z.ox = Z.oy = 0; // a new view or photo starts unzoomed
    buildPoints();
    applyZoom();
  }

  /* ---------- zoom ----------
     Z.z is the scale and (Z.ox, Z.oy) the top left of the visible window, both as fractions of the photo.
     The photo layer is transformed, while the points, slider line and labels stay in screen space,
     so the handles keep their 44px size and every pointer position converts through toImg(). */
  const ZMAX = 3, Z = {z:1, ox:0, oy:0};
  const toImg = (sx, sy) => ({x:Z.ox + sx / Z.z, y:Z.oy + sy / Z.z});
  const local = e => { const r = frame.getBoundingClientRect(); return {x:(e.clientX - r.left) / r.width, y:(e.clientY - r.top) / r.height, w:r.width, h:r.height}; };
  function applyZoom(){
    const {z, ox, oy} = Z, on = z > 1.001;
    zl.style.transform = on ? `scale(${z}) translate(${-ox * 100}%,${-oy * 100}%)` : '';
    frame.classList.toggle('zm', on);
    R('zoomv').textContent = Math.round(z * 10) / 10 + '×';
    $('[data-act="zout"]').disabled = !on;
    $('[data-act="zin"]').disabled = z >= ZMAX - .001;
    clipAfter(); placePoints();
  }
  /* zoom to z, keeping photo point (fx, fy) at screen point (sx, sy) */
  function setZoom(z, fx, fy, sx = .5, sy = .5){
    Z.z = clamp(z, 1, ZMAX);
    Z.ox = clamp(fx - sx / Z.z, 0, 1 - 1 / Z.z); Z.oy = clamp(fy - sy / Z.z, 0, 1 - 1 / Z.z);
    applyZoom();
  }
  function noseCentre(){
    const v = cur(); if (!ready(v)) return {x:.5, y:.5};
    const ps = Object.values(v.h), xs = ps.map(p => p.x), ys = ps.map(p => p.y);
    return {x:(Math.min(...xs) + Math.max(...xs)) / 2 / v.base.width, y:(Math.min(...ys) + Math.max(...ys)) / 2 / v.base.height};
  }
  const stepZoom = d => { const c = noseCentre(); setZoom(d > 0 ? Math.floor(Z.z + .001) + 1 : Math.ceil(Z.z - .001) - 1, c.x, c.y); };

  /* ---------- points ---------- */
  function buildPoints(){
    const keys = KEYS[state.view];
    ptsEl.innerHTML = keys.map(k => `<button class="np-pt" data-k="${k}" style="--c:${PT_COLOR[k]}" aria-label="${esc(S.pt[k])}"><span>${esc(S.pt[k])}</span></button>`).join('');
    placePoints();
  }
  function placePoints(){
    const v = cur(); if (!ready(v)) return;
    const W = v.base.width, H = v.base.height;
    $$('.np-pt').forEach(b => { const p = v.h[b.dataset.k]; b.style.left = (p.x / W - Z.ox) * Z.z * 100 + '%'; b.style.top = (p.y / H - Z.oy) * Z.z * 100 + '%'; });
    // the outline stays in screen space, so its viewBox is the visible window of the photo
    $('.np-outline').setAttribute('viewBox', `${(Z.ox * W).toFixed(2)} ${(Z.oy * H).toFixed(2)} ${(W / Z.z).toFixed(2)} ${(H / Z.z).toFixed(2)}`);
    const d = outlineD(state.view, v.h);
    $$('.np-outline path').forEach(p => p.setAttribute('d', d));
  }
  const mark = k => legend.querySelectorAll('li').forEach(li => li.classList.toggle('on', li.dataset.k === k));
  let drag = null;
  ptsEl.addEventListener('pointerdown', e => {
    if (!e.target.closest('.np-pt')) return;
    e.preventDefault(); e.stopPropagation();
    // the points sit close together, so take the one nearest the finger
    let b = null, bd = 1e9;
    $$('.np-pt').forEach(el => { const r = el.getBoundingClientRect(), d = Math.hypot(r.left + r.width / 2 - e.clientX, r.top + r.height / 2 - e.clientY); if (d < bd) { bd = d; b = el; } });
    drag = {k:b.dataset.k, el:b, id:e.pointerId};
    b.classList.add('on'); b.setPointerCapture(e.pointerId); mark(drag.k);
  });
  ptsEl.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const v = cur(), l = local(e), q = toImg(clamp(l.x, 0, 1), clamp(l.y, 0, 1));
    v.h[drag.k] = {x:clamp(q.x, 0, 1) * v.base.width, y:clamp(q.y, 0, 1) * v.base.height};
    placePoints();
  });
  const endDrag = () => { if (!drag) return; drag.el.classList.remove('on'); drag = null; mark(null); };
  ptsEl.addEventListener('pointerup', endDrag); ptsEl.addEventListener('pointercancel', endDrag);
  ptsEl.addEventListener('focusin', e => { const b = e.target.closest('.np-pt'); if (b) mark(b.dataset.k); });
  ptsEl.addEventListener('focusout', () => { if (!drag) mark(null); });
  ptsEl.addEventListener('keydown', e => {
    const b = e.target.closest('.np-pt'); if (!b) return;
    const v = cur(), st = Math.max(v.base.width, v.base.height) * .006 * (e.shiftKey ? 4 : 1) / Z.z;
    const m = {ArrowLeft:[-st, 0], ArrowRight:[st, 0], ArrowUp:[0, -st], ArrowDown:[0, st]}[e.key];
    if (!m) return;
    e.preventDefault();
    const p = v.h[b.dataset.k]; v.h[b.dataset.k] = {x:clamp(p.x + m[0], 0, v.base.width), y:clamp(p.y + m[1], 0, v.base.height)};
    placePoints();
  });

  /* ---------- compare slider, pan and pinch ---------- */
  let sx = 50, gest = null;
  const ptrs = new Map();
  // the line sits at screen position sx; the after picture is clipped at the matching photo position
  const clipAfter = () => frame.style.setProperty('--cx', clamp((Z.ox + sx / 100 / Z.z) * 100, 0, 100) + '%');
  const setX = x => { sx = clamp(x, 0, 100); frame.style.setProperty('--x', sx + '%'); frame.setAttribute('aria-valuenow', Math.round(sx)); clipAfter(); };
  const slideTo = e => setX(local(e).x * 100);
  const capture = id => { try { frame.setPointerCapture(id); } catch (er) {} };
  function pinchFrame(){
    const [a, b] = [...ptrs.values()], r = frame.getBoundingClientRect();
    return {d:Math.hypot(a.x - b.x, a.y - b.y) || 1, x:((a.x + b.x) / 2 - r.left) / r.width, y:((a.y + b.y) / 2 - r.top) / r.height};
  }
  frame.addEventListener('pointerdown', e => {
    if (e.target.closest('.np-pt') || (e.pointerType === 'mouse' && e.button !== 0)) return;
    ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if (ptrs.size === 2) { const p = pinchFrame(); frame.classList.remove('pan'); gest = {type:'pinch', d0:p.d, z0:Z.z, f:toImg(p.x, p.y)}; return; }
    if (ptrs.size > 2) return;
    const zoomed = Z.z > 1.001, l = local(e);
    const nearLine = Math.abs(l.x * 100 - sx) * l.w / 100 < 44 || !!e.target.closest('.np-knob');
    if (state.mode === 'compare' && (!zoomed || nearLine)) {
      // a touch on or near the line takes hold straight away; elsewhere at 1x it waits for a sideways move so the page can still scroll
      gest = {type:'slide', id:e.pointerId, x:e.clientX, y:e.clientY, on:e.pointerType === 'mouse' || zoomed || nearLine};
      if (gest.on) { capture(e.pointerId); slideTo(e); }
    } else if (zoomed) {
      gest = {type:'pan', id:e.pointerId, x:e.clientX, y:e.clientY, ox:Z.ox, oy:Z.oy};
      capture(e.pointerId); frame.classList.add('pan');
    } else gest = null;
  });
  frame.addEventListener('pointermove', e => {
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if (gest && gest.type === 'pinch') {
      if (ptrs.size === 2) { const p = pinchFrame(); setZoom(gest.z0 * p.d / gest.d0, gest.f.x, gest.f.y, p.x, p.y); }
      return;
    }
    if (!gest || e.pointerId !== gest.id) return;
    if (gest.type === 'pan') {
      const r = frame.getBoundingClientRect();
      Z.ox = clamp(gest.ox - (e.clientX - gest.x) / r.width / Z.z, 0, 1 - 1 / Z.z);
      Z.oy = clamp(gest.oy - (e.clientY - gest.y) / r.height / Z.z, 0, 1 - 1 / Z.z);
      applyZoom(); return;
    }
    if (!gest.on) {
      const dx = Math.abs(e.clientX - gest.x), dy = Math.abs(e.clientY - gest.y);
      if (dx > 4 && dx >= dy * .75) { gest.on = true; capture(e.pointerId); } else if (dy > 12 && dy > dx * 1.5) { gest = null; return; } else return;
    }
    slideTo(e);
  });
  const endGest = (e, up) => {
    ptrs.delete(e.pointerId);
    if (!gest) return;
    if (gest.type === 'pinch') { if (ptrs.size < 2) gest = null; return; }
    if (e.pointerId !== gest.id) return;
    if (up && gest.type === 'slide' && !gest.on) slideTo(e);
    gest = null; frame.classList.remove('pan');
  };
  frame.addEventListener('pointerup', e => endGest(e, true));
  frame.addEventListener('pointercancel', e => endGest(e, false));
  // trackpad pinch and ctrl + wheel zoom about the pointer; a plain wheel keeps scrolling the page
  frame.addEventListener('wheel', e => {
    if (!e.ctrlKey || !ready(cur())) return;
    e.preventDefault();
    const l = local(e), f = toImg(l.x, l.y);
    setZoom(Z.z * Math.exp(-clamp(e.deltaY, -50, 50) * .01), f.x, f.y, l.x, l.y);
  }, {passive:false});
  frame.addEventListener('keydown', e => {
    if (e.key === '+' || e.key === '=') { e.preventDefault(); stepZoom(1); return; }
    if (e.key === '-' || e.key === '_') { e.preventDefault(); stepZoom(-1); return; }
    if (state.mode !== 'compare') return;
    const x = sx;
    if (e.key === 'ArrowLeft') { e.preventDefault(); setX(x - 5); }
    if (e.key === 'ArrowRight') { e.preventDefault(); setX(x + 5); }
  });

  /* ---------- screen state ---------- */
  function setMode(m){
    state.mode = m;
    frame.classList.toggle('pts', m === 'points');
    $('[data-act="adjust"]').setAttribute('aria-pressed', m === 'points');
    sync();
    if (m === 'compare') draw();
  }
  function sync(){
    const v = cur(), info = vinfo(state.view), has = ready(v), camOn = !!state.stream;
    $$('.np-tab').forEach(t => {
      const on = t.dataset.view === state.view;
      t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
      t.querySelector('.np-dot').hidden = !ready(state.views[t.dataset.view]);
    });
    R('ename').textContent = info.name[lang];
    R('etext').textContent = info.empty[lang];
    R('hint').textContent = info.hint[lang];
    const hasSample = !!SAMPLES[state.view];
    $$('[data-act="sample"]').forEach(b => b.hidden = !hasSample);
    $('.np-error [data-act="manual"]').hidden = v.err === 'sample';
    R('credit').hidden = !(has && v.sample && !camOn && !v.err);
    cam.hidden = !camOn;
    errBox.hidden = camOn || !v.err;
    empty.hidden = camOn || has || !!v.err;
    fbox.hidden = camOn || !has || !!v.err;
    view.classList.toggle('fit', !fbox.hidden);
    const pts = has && !camOn && !v.err && state.mode === 'points';
    syncGuide(pts);
    $('[data-act="glow"]').setAttribute('aria-checked', state.glow);
    bar.hidden = !pts;
    cbar.hidden = !(has && !camOn && !v.err && state.mode === 'compare');
    R('bartext').textContent = v.auto === false ? S.placeHint : S.dragHint;
    $('[data-act="flip"]').hidden = true;
    const turned = state.view !== 'front';
    $('.np-face').hidden = !turned;
    if (turned) $$('.np-fb').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.f === state.face[state.view])));
    const gsv = cam.querySelector('.np-guide'); if (gsv) gsv.style.transform = turned && state.face[state.view] < 0 ? 'translate(-50%,-50%) scaleX(-1)' : '';
    $('[data-act="adjust"]').hidden = !has;
    R('cap').innerHTML = `<b>${esc(info.name[lang])}</b> · ${esc(preset()[lang])}`;
    const em = v.err && S.err[v.err];
    R('emsg').textContent = typeof em === 'function' ? em(info.name[lang]) : (em || '');
    $$('.np-chip').forEach(c => c.setAttribute('aria-pressed', c.dataset.preset === state.preset));
    R('desc').textContent = preset().desc[lang];
    amt.value = Math.round(state.amt * 100);
    amt.style.setProperty('--v', amt.value + '%');
    R('amtv').textContent = amt.value + '%';
    const anyReady = Object.values(state.views).some(ready);
    $('[data-act="save"]').disabled = !anyReady;
    const plan = $('[data-act="plan"]');
    plan.innerHTML = (state.planned ? ic('check') : ic('plus')) + `<span>${esc(state.planned ? S.planned : S.plan)}</span>`;
  }
  const setBusy = on => { busy.hidden = !on; };

  /* ---------- placement guide ---------- */
  let gdView = null;
  function syncGuide(show){
    gd.hidden = !show; view.classList.toggle('gd', show);
    const gk = state.view + (state.view !== 'front' ? state.face[state.view] : '');
    if (!show || gdView === gk) return;
    gdView = gk; const vid = state.view, sm = SAMPLES[vid];
    legend.innerHTML = KEYS[vid].map(k => `<li data-k="${k}" style="--c:${PT_COLOR[k]}">${esc(S.pt[k])}</li>`).join('');
    gdCv.hidden = true; gdBody.classList.add('solo');
    if (!sm) return;
    // reuses the sample photo when it is already loaded; without it the legend stands alone
    sampleImage(sm.src).then(im => {
      if (gdView !== gk) return;
      drawGuide(gdCv, im, sm, vid, vid !== 'front' && state.face[vid] !== (sm.side || -1));
      gdCv.hidden = false; gdBody.classList.remove('solo');
    }).catch(() => {});
  }

  /* ---------- photos ---------- */
  async function usePhoto(canvas, sample){
    const vid = state.view, v = state.views[vid], isSample = !!sample;
    stopCam();
    v.err = null; setBusy(true); sync();
    let lm = null, err = null;
    try { lm = await detect(mpBase, canvas); } catch (e) { err = 'model'; }
    setBusy(false);
    if (vid !== state.view) return;
    if (!lm && vid !== '90') {
      Object.assign(v, {base:null, h:null, sample:false, err:err || 'noFace'}); state.pending = canvas; state.pendingSample = isSample;
      emit('nose:error', {view:vid, error:v.err}); sync(); return;
    }
    let base = canvas, res;
    if (lm) { const c = cropToFace(canvas, lm); base = c.canvas; res = fromMesh(vid, c.lm, base.width, base.height); }
    if (!res || !res.h) {
      if (res && vid === '90') base = canvas; // keep the full frame when the mesh is unreliable
      const data = base.getContext('2d').getImageData(0, 0, base.width, base.height);
      res = {h:defaultHandles(vid, base.width, base.height, data, res && res.side ? res.side : (state.face[vid] || 1)), auto:false};
    }
    setPhoto(v, base, res.h, res.auto, isSample);
  }
  function setPhoto(v, base, h, auto, sample){
    Object.assign(v, {base, h, auto, sample:!!sample, err:null, data:base.getContext('2d').getImageData(0, 0, base.width, base.height)});
    // on a profile the tip sits ahead of the bridge, which tells which way the photo faces
    if (state.view === '90' && !sample && h && h.T && h.N && Math.abs(h.T.x - h.N.x) > 1) state.face['90'] = h.T.x < h.N.x ? -1 : 1;
    showPhoto(); setX(50);
    emit('nose:photo', {view:state.view, auto});
    setMode('points');
  }
  async function useFile(f){
    if (!f) return;
    const v = cur();
    if (!/^image\//.test(f.type)) { v.err = 'read'; v.base = null; sync(); return; }
    const url = URL.createObjectURL(f);
    try { const im = await loadImage(url); await usePhoto(toCanvas(im)); }
    catch (e) { v.err = 'read'; v.base = null; v.h = null; v.sample = false; setBusy(false); sync(); }
    URL.revokeObjectURL(url);
  }
  let loadingSample = false;
  async function useSample(){
    const vid = state.view, sm = SAMPLES[vid]; if (!sm || loadingSample) return;
    const v = cur(); loadingSample = true; setBusy(true);
    try {
      let im = null;
      try { im = await sampleImage(sm.src); } catch (e) { /* named below */ }
      if (!im) { setBusy(false); Object.assign(v, {base:null, h:null, sample:false, err:'sample'}); emit('nose:error', {view:vid, error:'sample'}); sync(); return; }
      if (sm.h) {
        setBusy(false); stopCam();
        let c = sampleCrop(toCanvas(im, 2400), sm);
        if (vid !== 'front' && state.face[vid] !== (sm.side || -1)) c = {base:mirrorCanvas(c.base), h:mirrorPoints(c.h, c.base.width)};
        setPhoto(v, c.base, c.h, true, true);
      }
      else await usePhoto(toCanvas(im), sm);
      emit('nose:sample', {view:vid});
    } catch (e) { setBusy(false); Object.assign(v, {base:null, h:null, sample:false, err:'read'}); sync(); }
    finally { loadingSample = false; }
  }

  /* ---------- camera ---------- */
  async function startCam(){
    const v = cur();
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('no camera');
      state.stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user', width:{ideal:1280}, height:{ideal:1280}}, audio:false});
      video.srcObject = state.stream;
      cam.querySelector('.np-guide').innerHTML = GUIDE[state.view];
      v.err = null; sync();
      await video.play().catch(() => {});
    } catch (e) {
      stopCam(); v.err = 'camera'; v.base = null; v.h = null; sync();
    }
  }
  function stopCam(){
    if (state.stream) { state.stream.getTracks().forEach(t => t.stop()); state.stream = null; }
    video.srcObject = null;
  }
  function shoot(){
    if (!video.videoWidth) return;
    const c = document.createElement('canvas'); c.width = video.videoWidth; c.height = video.videoHeight;
    const x = c.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(video, 0, 0);
    usePhoto(toCanvas(c));
  }

  /* ---------- save ---------- */
  async function save(){
    const err = R('saveerr'); err.hidden = true;
    const done = VIEWS.filter(x => ready(state.views[x.id]));
    if (!done.length) return;
    try {
      const font = getComputedStyle(root).fontFamily;
      try { await document.fonts.load(`700 20px ${font}`); } catch (e) {}
      const rowH = 620, gap = 12, pad = 32, head = 64, P = preset();
      const rows = done.map(x => { const v = state.views[x.id]; return {x, v, w:Math.round(v.base.width * rowH / v.base.height), after:render(x.id, v.base, v.data, v.h, P.p, state.amt, state.glow)}; });
      const W = Math.max(...rows.map(r => r.w * 2 + gap)) + pad * 2, H = pad + rows.length * (head + rowH + 28) + 40;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      g.fillStyle = '#1F0A30'; g.fillRect(0, 0, W, H);
      let y = pad;
      const pill = (t, x, yy, bg, fg) => {
        g.font = `700 20px ${font}`; const tw = g.measureText(t).width + 24;
        g.fillStyle = bg; g.beginPath(); g.roundRect ? g.roundRect(x, yy, tw, 34, 17) : g.rect(x, yy, tw, 34); g.fill();
        g.fillStyle = fg; g.textBaseline = 'middle'; g.fillText(t, x + 12, yy + 18); return tw;
      };
      for (const r of rows) {
        g.fillStyle = '#fff'; g.font = `700 30px ${font}`; g.textBaseline = 'alphabetic';
        g.fillText(r.x.name[lang], pad, y + 38);
        const nw = g.measureText(r.x.name[lang]).width;
        g.fillStyle = '#CDB9DD'; g.font = `400 26px ${font}`; g.fillText('  ·  ' + P[lang], pad + nw, y + 38);
        y += head;
        const x0 = pad + (W - pad * 2 - (r.w * 2 + gap)) / 2;
        const clip = (x, img) => { g.save(); g.beginPath(); g.roundRect ? g.roundRect(x, y, r.w, rowH, 20) : g.rect(x, y, r.w, rowH); g.clip(); g.drawImage(img, x, y, r.w, rowH); g.restore(); };
        clip(x0, r.v.base); clip(x0 + r.w + gap, r.after);
        pill(S.before, x0 + 12, y + 12, 'rgba(31,10,48,.7)', '#fff');
        pill(S.after, x0 + r.w + gap + 12, y + 12, 'rgba(31,10,48,.7)', '#fff');
        pill(S.sim, x0 + r.w + gap + 12, y + rowH - 46, 'rgba(255,255,255,.9)', '#6A388C');
        y += rowH + 28;
      }
      g.font = `400 20px ${font}`; g.fillStyle = '#CDB9DD'; g.textBaseline = 'alphabetic';
      g.fillText(S.sim, pad, H - 28);
      const bw = g.measureText(S.brand).width; g.fillText(S.brand, W - pad - bw, H - 28);
      const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', .9));
      if (!blob) throw new Error('blob');
      const name = `apex-nose-preview-${P.id}.jpg`, f = new File([blob], name, {type:'image/jpeg'});
      let shared = false;
      if (navigator.canShare && navigator.share) {
        try { if (navigator.canShare({files:[f]})) { await navigator.share({files:[f], title:S.brand}); shared = true; } }
        catch (e) { if (e && e.name === 'AbortError') shared = true; }
      }
      if (!shared) {
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
        document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
      emit('nose:saved', {views:done.map(x => x.id), preset:P.id});
    } catch (e) { err.textContent = S.err.save; err.hidden = false; }
  }

  /* ---------- events ---------- */
  function onClick(e){
    const tab = e.target.closest('.np-tab');
    if (tab) { if (tab.dataset.view !== state.view) { stopCam(); state.view = tab.dataset.view; const v = cur(); if (ready(v)) { showPhoto(); setMode(v.auto === false ? 'points' : 'compare'); } else sync(); emit('nose:view', {view:state.view}); } return; }
    const chip = e.target.closest('.np-chip');
    if (chip) { state.preset = chip.dataset.preset; remember(); emit('nose:preset', {preset:state.preset}); if (ready(cur())) setMode('compare'); else sync(); return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'take') startCam();
    else if (a === 'choose') file.click();
    else if (a === 'sample') useSample();
    else if (a === 'camcancel') { stopCam(); sync(); }
    else if (a === 'shutter') shoot();
    else if (a === 'done') setMode('compare');
    else if (a === 'adjust') setMode(state.mode === 'points' ? 'compare' : 'points');
    else if (a === 'manual') { const v = cur(), c = state.pending; if (c) { v.err = null; setPhoto(v, c, defaultHandles(state.view, c.width, c.height, c.getContext('2d').getImageData(0, 0, c.width, c.height)), false, state.pendingSample); } else file.click(); }
    else if (a === 'face') {
      const vid = state.view, f = +b.dataset.f; if (vid === 'front' || state.face[vid] === f) return;
      state.face[vid] = f;
      const v = cur();
      emit('nose:face', {view:vid, face:f < 0 ? 'left' : 'right'});
      if (ready(v) && v.sample) { useSample(); return; }
      if (ready(v)) {
        const xs = Object.values(v.h).map(p => p.x);
        v.h = mirrorPoints(v.h, Math.min(...xs) + Math.max(...xs));
        placePoints(); setMode('points');
      }
      sync();
    }
    else if (a === 'flip') {
      const v = cur(); if (!ready(v)) return;
      const xs = Object.values(v.h).map(p => p.x), mid = (Math.min(...xs) + Math.max(...xs)) / 2;
      for (const k in v.h) v.h[k] = {x:2 * mid - v.h[k].x, y:v.h[k].y};
      placePoints();
    }
    else if (a === 'zin') stepZoom(1);
    else if (a === 'zout') stepZoom(-1);
    else if (a === 'glow') { state.glow = !state.glow; emit('nose:glow', {on:state.glow}); sync(); if (state.mode === 'compare') draw(); }
    else if (a === 'save') save();
    else if (a === 'plan') { state.planned = true; emit('plan:add', {procedure:'rhinoplasty'}); sync(); }
  }
  root.addEventListener('click', onClick);
  $('.np-tabs').addEventListener('keydown', e => {
    const i = VIEWS.findIndex(v => v.id === state.view), d = {ArrowRight:1, ArrowLeft:-1}[e.key];
    if (!d) return;
    e.preventDefault();
    const t = $$('.np-tab')[(i + d + VIEWS.length) % VIEWS.length]; t.click(); t.focus();
  });
  file.addEventListener('change', () => { const f = file.files[0]; file.value = ''; useFile(f); });
  amt.addEventListener('input', () => { state.amt = amt.value / 100; amt.style.setProperty('--v', amt.value + '%'); R('amtv').textContent = amt.value + '%'; if (state.mode === 'compare') draw(true); });
  amt.addEventListener('change', () => { remember(); if (state.mode === 'compare') draw(false); });
  view.addEventListener('dragover', e => e.preventDefault());
  view.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) useFile(f); });

  sync();
  // load the model in the background once the page is idle
  const idle = setTimeout(() => loadMesh(mpBase).catch(() => {}), 2500);

  return {
    destroy(){
      clearTimeout(idle); cancelAnimationFrame(rq); stopCam();
      root.removeEventListener('click', onClick);
      root.remove();
      if (!--styleRefs && styleEl) { styleEl.remove(); styleEl = null; }
    },
    /* for tests */
    _state:state,
    _setHandles(h){ const v = cur(); if (!ready(v)) return; Object.assign(v.h, h); placePoints(); if (state.mode === 'compare') draw(); },
  };
}
