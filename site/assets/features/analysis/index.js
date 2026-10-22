/* Face analysis: a light skin and face reading from a front photo, with two optional side photos.
   mount(container, opts) -> {destroy}
   opts: lang 'en' | 'th', mpBase (MediaPipe files), faBase (face-api files for skin age), sample (photo URL),
         serviceUrl(key), links {consult, proportions}, onEvent(name, data)
   Everything runs on the phone. No photo leaves it. */
import {MP_CDN, loadMesh, find, frameFace, loadImage, toCanvas} from '../face/mesh.js';
import {workImage, read, readSide, quality, LINES_AT} from './skin.js';
import {factors, skinAge, LEVELS} from './factors.js';
import {measure, overall} from '../proportions/geometry.js';

const FA_CDN = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/';
const SAMPLE = 'https://images.unsplash.com/photo-1774437895887-d1e801bae1a9?w=1600&q=85';
const GOLD = '#E3B85C';
const ORDER = ['lines', 'texture', 'spots', 'redness', 'under', 'sag', 'shine'];
const FACE = ['lid', 'balance'];
const SVC = {under:'eyelid', lid:'eyelid'};

const STR = {
  en:{
    emptyH:'Take or choose a front photo.', hint:'Face the camera in even light, with no makeup and beauty mode off.', privacy:'No photo uploaded.',
    take:'Take photo', choose:'Choose photo', sample:'Sample face', change:'New photo', busy:'Reading your skin', credit:'Sample photo: Unsplash',
    photo:'Photo', sides:'Side photos', sidesP:'Optional. A photo with your head turned halfway on each side adds the jawline and the folds beside the nose.',
    left:'Left side', right:'Right side', add:'Add', remove:'Remove', ideal:'Golden match for', women:'Women', men:'Men',
    save:'Save', saveBtn:'Save to phone', plan:'Add to My Plan', planned:'Added to My Plan', consult:'Ask a surgeon',
    skin:'Skin', face:'Face', score:'Skin score', scoreP:'From the readings below. 100 is clear skin.',
    age:'Skin age', ageP:'The age a face model guesses from this photo, weighed with the skin readings.', about:n => `about ${n}`, aboutH:n => `<small>about</small> ${n}`,
    golden:'Golden match', goldenP:'How close your face is to classic proportions.', see:'See it',
    levels:['Minimal', 'Mild', 'Moderate', 'Marked'], most:'Most at', guide:'Guide only', show:'Show on photo',
    name:{lines:'Fine lines and wrinkles', texture:'Texture and pores', spots:'Spots and evenness', redness:'Redness', under:'Under the eyes',
      sag:'Sagging and folds', shine:'Shine', lid:'Upper lids', balance:'Balance'},
    short:{lines:'Lines', texture:'Texture', spots:'Spots', redness:'Redness', under:'Under eyes', sag:'Sagging', shine:'Shine', lid:'Lids', balance:'Balance'},
    desc:{lines:'Lines on the forehead, between the brows, at the corners of the eyes and under them.', texture:'Fine grain and pores on the cheeks, nose and forehead.',
      spots:'Dark spots and how evenly colour spreads.', redness:'Red patches on the cheeks and nose.', under:'Darkness and hollows under the eyes against the cheek.',
      sag:'The folds beside the nose, lines below the mouth corners, the mouth corners and brow height.', shine:'Highlights on the forehead, nose and chin.',
      lid:'Whether a fold shows on the upper lid.', balance:'How closely the left and right sides match.'},
    area:{forehead:'the forehead', glabella:'between the brows', crows:'the corners of the eyes', under:'under the eyes', cheeks:'the cheeks',
      tzone:'the forehead, nose and chin', folds:'the folds beside the nose', mouth:'the mouth corners', brows:'the brows', jaw:'the jawline'},
    lid:{clear:'Fold shows clearly', faint:'Fold is faint', none:'No fold seen'}, turned:'Face the camera to read this.', withSides:'Includes your side photos.',
    svc:{facelift:'Facelift', browlift:'Brow lift', eyelid:'Eyelid surgery'},
    note:'A guide from one photo and not a skin exam. Light, makeup and phone filters change what it reads.', vary:'Results may vary from person to person.',
    camHint:'Line up your face with the outline.', camSide:'Turn your head halfway and keep your face in the outline.', shutter:'Take photo', cancel:'Cancel',
    brand:'Apex Surgery Hospital',
    warn:{small:'The face is small in this photo. A closer photo reads skin better.', smooth:'This photo looks smoothed. Turn off beauty mode for a truer reading.',
      soft:'This photo is soft or blurred. A sharper photo reads skin better.', dark:'The light is dim. Face a window for a truer reading.',
      uneven:'One side of the face is in shadow. Face the light for a truer reading.', turn:'Your head is turned. Face the camera for a truer reading.'},
    err:{noFace:'No face found in this photo. Try a closer photo taken from the front.', camera:'The camera could not be opened.', read:'The photo could not be read.',
      model:'The face model could not be loaded.', save:'The image could not be saved.', sample:'The sample photo could not be loaded.',
      side:'Turn your head about halfway for a side photo.', front:'This looks like a side photo. Use a front photo here and add this one under side photos.'},
  },
  th:{
    emptyH:'ถ่ายหรือเลือกรูปหน้าตรง', hint:'หันหน้าตรงเข้าหากล้องในที่แสงสม่ำเสมอ ไม่แต่งหน้า และปิดโหมดบิวตี้', privacy:'ไม่มีการอัปโหลดรูปภาพ',
    take:'ถ่ายรูป', choose:'เลือกรูป', sample:'ใบหน้าตัวอย่าง', change:'เปลี่ยนรูป', busy:'กำลังอ่านผิวของคุณ', credit:'ภาพตัวอย่าง: Unsplash',
    photo:'รูปภาพ', sides:'รูปด้านข้าง', sidesP:'ไม่บังคับ รูปที่หันศีรษะไปครึ่งทางทั้งสองข้างช่วยอ่านกรอบหน้าและร่องข้างจมูก',
    left:'ด้านซ้าย', right:'ด้านขวา', add:'เพิ่ม', remove:'ลบ', ideal:'สัดส่วนทองคำสำหรับ', women:'ผู้หญิง', men:'ผู้ชาย',
    save:'บันทึก', saveBtn:'บันทึกลงโทรศัพท์', plan:'เพิ่มในแผนของฉัน', planned:'เพิ่มในแผนแล้ว', consult:'ปรึกษาศัลยแพทย์',
    skin:'ผิว', face:'ใบหน้า', score:'คะแนนผิว', scoreP:'คำนวณจากผลด้านล่าง 100 คือผิวที่ไม่มีปัญหา',
    age:'อายุผิว', ageP:'อายุที่โมเดลใบหน้าประเมินจากรูปนี้ ร่วมกับผลการอ่านผิว', about:n => `ประมาณ ${n} ปี`, aboutH:n => `<small>ประมาณ</small> ${n} <small>ปี</small>`,
    golden:'ความใกล้สัดส่วนทองคำ', goldenP:'ใบหน้าของคุณใกล้สัดส่วนมาตรฐานแค่ไหน', see:'ดูเลย',
    levels:['น้อยมาก', 'เล็กน้อย', 'ปานกลาง', 'ชัดเจน'], most:'ชัดที่สุดที่', guide:'เป็นแนวทางเท่านั้น', show:'แสดงบนรูป',
    name:{lines:'ริ้วรอย', texture:'ผิวและรูขุมขน', spots:'จุดด่างดำและสีผิว', redness:'รอยแดง', under:'ใต้ตา',
      sag:'ความหย่อนคล้อยและร่องแก้ม', shine:'ความมัน', lid:'ชั้นตาบน', balance:'ความสมมาตร'},
    short:{lines:'ริ้วรอย', texture:'ผิว', spots:'จุดด่างดำ', redness:'รอยแดง', under:'ใต้ตา', sag:'หย่อนคล้อย', shine:'ความมัน', lid:'ชั้นตา', balance:'สมมาตร'},
    desc:{lines:'ริ้วรอยบนหน้าผาก ระหว่างคิ้ว หางตา และใต้ตา', texture:'ความเรียบของผิวและรูขุมขนบนแก้ม จมูก และหน้าผาก',
      spots:'จุดด่างดำและความสม่ำเสมอของสีผิว', redness:'รอยแดงบนแก้มและจมูก', under:'ความคล้ำและร่องใต้ตาเทียบกับแก้ม',
      sag:'ร่องข้างจมูก ร่องใต้มุมปาก มุมปาก และระดับคิ้ว', shine:'ความมันบนหน้าผาก จมูก และคาง',
      lid:'ชั้นตาบนเห็นชัดแค่ไหน', balance:'ใบหน้าซ้ายและขวาใกล้เคียงกันแค่ไหน'},
    area:{forehead:'หน้าผาก', glabella:'ระหว่างคิ้ว', crows:'หางตา', under:'ใต้ตา', cheeks:'แก้ม', tzone:'หน้าผาก จมูก และคาง',
      folds:'ร่องข้างจมูก', mouth:'มุมปาก', brows:'คิ้ว', jaw:'กรอบหน้า'},
    lid:{clear:'เห็นชั้นตาชัด', faint:'ชั้นตาบาง', none:'ไม่เห็นชั้นตา'}, turned:'หันหน้าตรงเพื่ออ่านค่านี้', withSides:'รวมรูปด้านข้างแล้ว',
    svc:{facelift:'ดึงหน้า', browlift:'ยกคิ้ว', eyelid:'ศัลยกรรมตา'},
    note:'เป็นแนวทางจากรูปเดียว ไม่ใช่การตรวจผิว แสง การแต่งหน้า และฟิลเตอร์ในโทรศัพท์ทำให้ผลเปลี่ยนได้', vary:'ผลลัพธ์อาจแตกต่างกันในแต่ละบุคคล',
    camHint:'จัดใบหน้าให้อยู่ในเส้น', camSide:'หันศีรษะไปครึ่งทาง และให้ใบหน้าอยู่ในเส้น', shutter:'ถ่ายรูป', cancel:'ยกเลิก',
    brand:'Apex Surgery Hospital',
    warn:{small:'ใบหน้าในรูปเล็กไป รูปที่ถ่ายใกล้ขึ้นจะอ่านผิวได้ดีกว่า', smooth:'รูปนี้ดูเหมือนผ่านการปรับผิว ปิดโหมดบิวตี้เพื่อให้อ่านได้แม่นขึ้น',
      soft:'รูปนี้เบลอหรือไม่คม รูปที่คมกว่าจะอ่านผิวได้ดีกว่า', dark:'แสงน้อยไป หันหน้าเข้าหาหน้าต่างเพื่อให้อ่านได้แม่นขึ้น',
      uneven:'ใบหน้าด้านหนึ่งอยู่ในเงา หันเข้าหาแสงเพื่อให้อ่านได้แม่นขึ้น', turn:'ศีรษะหันไปด้านข้าง หันหน้าตรงเพื่อให้อ่านได้แม่นขึ้น'},
    err:{noFace:'ไม่พบใบหน้าในรูปนี้ ลองใช้รูปหน้าตรงที่ถ่ายใกล้ขึ้น', camera:'เปิดกล้องไม่ได้', read:'อ่านรูปไม่ได้',
      model:'โหลดโมเดลใบหน้าไม่ได้', save:'บันทึกรูปไม่ได้', sample:'โหลดรูปตัวอย่างไม่ได้',
      side:'หันศีรษะไปครึ่งทางสำหรับรูปด้านข้าง', front:'รูปนี้ดูเป็นรูปด้านข้าง ใช้รูปหน้าตรงที่นี่ และเพิ่มรูปนี้ในรูปด้านข้าง'},
  },
};

const ICON = {
  camera:'<path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"/><circle cx="12" cy="13" r="3"/>',
  upload:'<path d="M12 3v12"/><path d="m17 8-5-5-5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>',
  image:'<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  download:'<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
  plus:'<path d="M5 12h14"/><path d="M12 5v14"/>', check:'<path d="M20 6 9 17l-5-5"/>', x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  arrow:'<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
  scan:'<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/>',
  shield:'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  alert:'<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>', msg:'<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  turnL:'<path d="M15 21v-3.6A6.6 6.6 0 0 0 18.6 11.6V9.4a6.6 6.6 0 0 0-13.2 0L4 13h1.6v2.4A1.6 1.6 0 0 0 7.2 17H9v4"/><path d="M9.6 9.2h.01"/>',
  turnR:'<path d="M9 21v-3.6A6.6 6.6 0 0 1 5.4 11.6V9.4a6.6 6.6 0 0 1 13.2 0L20 13h-1.6v2.4a1.6 1.6 0 0 1-1.6 1.6H15v4"/><path d="M14.4 9.2h.01"/>',
};
const ic = k => `<svg class="fa-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;

const CSS = `
.fa{--fa-plum:var(--plum,#6A388C);--fa-plum-7:var(--plum-700,#55286F);--fa-night:var(--night,#1F0A30);--fa-night-2:var(--night-2,#2A0F40);
  --fa-lilac:var(--lilac,#A886CD);--fa-lilac-3:var(--lilac-300,#C9B3DD);--fa-lilac-2:var(--lilac-200,#E4D8EE);--fa-lilac-1:var(--lilac-100,#F1EAF7);
  --fa-wash:var(--wash,#FBF3FB);--fa-ink:var(--ink,#2A1F33);--fa-ink-2:var(--ink-2,#5A4A66);--fa-ink-3:var(--ink-3,#7C6A88);
  --fa-on:var(--on-night,#F6EEFB);--fa-on-2:var(--on-night-2,#CDB9DD);--fa-gold:${GOLD};--fa-gold-d:#9A6B12;--fa-ease:cubic-bezier(.23,1,.32,1);
  --l0:#3F7A5C;--l1:#8A6A10;--l2:#A84A17;--l3:#A32E52;
  font-family:var(--font,"LINE Seed","Sarabun","Noto Sans Thai",system-ui,sans-serif);color:var(--fa-ink);line-height:1.6;display:grid;gap:14px;min-width:0;-webkit-tap-highlight-color:transparent}
.fa *,.fa *::before,.fa *::after{box-sizing:border-box}
.fa :where(button){font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
.fa [hidden]{display:none!important}
.fa-i{width:1.15em;height:1.15em;flex:none;display:inline-block;vertical-align:-.18em}
.fa-main{display:grid;gap:14px;min-width:0}
@media (min-width:960px){.fa-main{grid-template-columns:minmax(0,1fr) 360px;grid-template-areas:"stage panel" "res panel";gap:24px;align-items:start}
  .fa-stage{grid-area:stage}.fa-res{grid-area:res}.fa-panel{grid-area:panel}}
.fa-stage{position:relative;min-width:0;background:radial-gradient(120% 80% at 50% 0%,var(--fa-night-2),var(--fa-night) 70%);color:var(--fa-on);border-radius:28px;padding:10px;display:grid;gap:10px}
.fa-view{--mh:62vh;position:relative;display:grid;place-items:center;min-height:min(64vh,460px);border-radius:20px;overflow:hidden}
@media (min-width:960px){.fa-view{--mh:72vh;min-height:min(72vh,640px)}}
.fa-view.fit{min-height:0}
.fa-fbox{position:relative;width:min(100%,calc(var(--mh) * var(--ar,.75)));aspect-ratio:var(--ar,.75);border-radius:20px;overflow:hidden;background:#12051d}
.fa-fbox canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.fa-ov{transition:opacity .3s}
.fa-tag{position:absolute;bottom:10px;left:10px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;background:rgba(255,255,255,.9);color:var(--fa-plum);pointer-events:none}
.fa-corners{position:absolute;inset:8px;pointer-events:none;opacity:.55;
  background:linear-gradient(var(--fa-gold),var(--fa-gold)) 0 0/18px 2px no-repeat,linear-gradient(var(--fa-gold),var(--fa-gold)) 0 0/2px 18px no-repeat,
  linear-gradient(var(--fa-gold),var(--fa-gold)) 100% 0/18px 2px no-repeat,linear-gradient(var(--fa-gold),var(--fa-gold)) 100% 0/2px 18px no-repeat,
  linear-gradient(var(--fa-gold),var(--fa-gold)) 0 100%/18px 2px no-repeat,linear-gradient(var(--fa-gold),var(--fa-gold)) 0 100%/2px 18px no-repeat,
  linear-gradient(var(--fa-gold),var(--fa-gold)) 100% 100%/18px 2px no-repeat,linear-gradient(var(--fa-gold),var(--fa-gold)) 100% 100%/2px 18px no-repeat}
.fa-empty,.fa-error{display:grid;justify-items:center;text-align:center;gap:12px;padding:28px 18px;max-width:440px}
.fa-big{width:64px;height:64px;border-radius:20px;display:grid;place-items:center;background:rgba(255,255,255,.07);border:1px solid rgba(201,179,221,.22);color:var(--fa-gold);font-size:30px}
.fa-error .fa-big{color:#fff;background:rgba(204,51,102,.22);border-color:rgba(204,51,102,.5)}
.fa-empty h3,.fa-error h3{margin:0;font-size:20px;font-weight:700;color:#fff;line-height:1.35}
.fa-empty p{margin:0;color:var(--fa-on-2);font-size:15px}
.fa-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.fa-cam{position:absolute;inset:0;background:#000;display:grid}
.fa-cam video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}
.fa-cam svg{position:absolute;left:50%;top:46%;height:78%;max-width:92%;transform:translate(-50%,-50%);overflow:visible}
.fa-cam svg *{fill:none;stroke:#fff;stroke-width:1.1;stroke-dasharray:3 2.2;vector-effect:non-scaling-stroke;opacity:.9}
.fa-cam p{position:absolute;top:12px;left:12px;right:12px;margin:0;text-align:center;font-size:14px;font-weight:700;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.6)}
.fa-cambar{position:absolute;left:0;right:0;bottom:16px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;padding:0 16px}
.fa-cambar>:first-child{justify-self:end}
.fa-shutter{width:68px;height:68px;border-radius:50%;background:#fff;color:var(--fa-plum);display:grid;place-items:center;font-size:26px;box-shadow:0 0 0 4px rgba(255,255,255,.35);transition:transform .16s var(--fa-ease)}
.fa-shutter:active{transform:scale(.94)}
.fa-busy{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:12px;background:rgba(31,10,48,.72);color:#fff;font-weight:700;z-index:5}
.fa-spin{width:40px;height:40px;border-radius:50%;border:3px solid rgba(255,255,255,.22);border-top-color:var(--fa-gold);animation:fa-spin .8s linear infinite}
@keyframes fa-spin{to{transform:rotate(360deg)}}
.fa-scanline{position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--fa-gold),transparent);top:0;animation:fa-scan 1.6s var(--fa-ease) infinite;opacity:.9}
@keyframes fa-scan{0%{top:6%}50%{top:92%}100%{top:6%}}
.fa-chips{display:flex;gap:6px;overflow-x:auto;padding:2px 4px 4px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.fa-chips::-webkit-scrollbar{display:none}
.fa-chip{flex:none;display:inline-flex;align-items:center;gap:7px;height:36px;padding:0 13px;border-radius:999px;border:1px solid rgba(201,179,221,.4);color:#fff;font-size:13.5px;font-weight:700;white-space:nowrap;transition:background-color .2s,border-color .2s,color .2s}
.fa-chip i{width:8px;height:8px;border-radius:50%;background:var(--c,var(--l0))}
.fa-chip[aria-pressed=true]{background:#fff;color:var(--fa-plum);border-color:#fff}
.fa-chip:focus-visible{outline:2px solid var(--fa-gold);outline-offset:2px}
.fa-credit{margin:0;padding:0 8px 4px;font-size:12px;line-height:1.4;color:var(--fa-on-2)}
.fa-res{display:grid;gap:12px;min-width:0}
.fa-sum{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.fa-card{display:grid;align-content:start;gap:2px;padding:14px 16px;border-radius:20px;border:1px solid var(--fa-lilac-2);background:#fff;min-width:0}
.fa-card.g{background:linear-gradient(135deg,#FFFBF0,#FFF0CF);border-color:#EAD5A2}
.fa-card b{font-size:13.5px;color:var(--fa-ink-2);font-weight:700;line-height:1.35}
.fa-card .n{font-size:34px;font-weight:700;line-height:1.15;color:var(--fa-plum);font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.fa-card.g .n{color:var(--fa-gold-d)}
.fa-card .n small{font-size:15px;color:var(--fa-ink-3);font-weight:700}
.fa-card p{margin:2px 0 0;font-size:12.5px;line-height:1.4;color:var(--fa-ink-3)}
.fa-card a{font-size:13px;font-weight:700;color:var(--fa-plum);text-decoration:none;display:inline-flex;align-items:center;gap:4px;margin-top:2px}
@media (max-width:620px){.fa-sum{grid-template-columns:1fr 1fr}.fa-card.g{grid-column:1/-1;grid-template-columns:1fr auto;align-items:center;column-gap:16px}.fa-card.g>*{grid-column:1}.fa-card.g .n{grid-row:1/5;grid-column:2}.fa-card .n{font-size:30px}}
.fa-h{margin:6px 2px 0;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--fa-plum);font-weight:700}
.fa-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
@media (min-width:700px){.fa-list{grid-template-columns:1fr 1fr}}
.fa-f{display:grid;gap:6px;align-content:start;padding:12px 14px;border-radius:18px;border:1px solid var(--fa-lilac-2);background:#fff;transition:border-color .2s,background-color .2s,box-shadow .2s}
.fa-f:hover{border-color:var(--fa-lilac-3)}
.fa-f:has(.fa-fs[aria-pressed=true]){border-color:var(--fa-plum);background:var(--fa-wash);box-shadow:0 0 0 1px var(--fa-plum)}
.fa .fa-fs{display:grid;gap:7px;width:100%;text-align:left;border-radius:10px}
.fa-fs:focus-visible{outline:2px solid var(--fa-lilac);outline-offset:4px}
.fa-fh{display:flex;align-items:center;gap:10px}
.fa-bar>span{display:block}
.fa-fh b{flex:1;min-width:0;font-size:15.5px;line-height:1.3}
.fa-lv{flex:none;font-size:12.5px;font-weight:700;padding:3px 10px;border-radius:999px;color:#fff;background:var(--c,var(--l0))}
.fa-bar{height:6px;border-radius:6px;background:var(--fa-lilac-1);overflow:hidden}
.fa-bar span{display:block;height:100%;width:var(--w,0%);border-radius:6px;background:var(--c,var(--l0));transition:width .6s var(--fa-ease)}
.fa-f .fa-d{font-size:13.5px;line-height:1.45;color:var(--fa-ink-2)}
.fa-f .at{font-size:13px;line-height:1.45;color:var(--fa-ink)}
.fa-f .at b{font-weight:700}
.fa-svc{font-size:13px;font-weight:700;color:var(--fa-plum);text-decoration:none;display:inline-flex;align-items:center;gap:4px;width:max-content}
.fa-svc:hover{text-decoration:underline}
.fa-note{margin:0;font-size:13px;line-height:1.45;color:var(--fa-ink-3)}
.fa-panel{min-width:0;background:#fff;border:1px solid var(--fa-lilac-2);border-radius:28px;padding:20px;display:grid;gap:22px}
@media (min-width:960px){.fa-panel{position:sticky;top:96px}}
.fa-sec{display:grid;gap:10px;min-width:0}
.fa-sec h3{margin:0;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--fa-plum);font-weight:700;display:flex;align-items:center;gap:8px}
.fa-sec h3 i{font-style:normal;width:22px;height:22px;border-radius:50%;background:var(--fa-lilac-1);display:grid;place-items:center;font-size:12px;letter-spacing:0}
.fa-sec>p{margin:0;font-size:14px;line-height:1.5;color:var(--fa-ink-2)}
.fa-src{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.fa-src .fa-btn{padding:0 10px}
.fa-src .full{grid-column:1/-1}
.fa-priv{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--fa-ink-2);margin:0}
.fa-priv .fa-i{color:var(--fa-plum)}
.fa-warn{margin:0;display:flex;gap:8px;align-items:flex-start;font-size:14px;line-height:1.45;color:#7A4A00;background:#FFF6E0;border:1px solid #F0D9A0;border-radius:14px;padding:10px 12px}
.fa-warn .fa-i{margin-top:2px}
.fa-sides{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.fa-side{position:relative;display:grid;place-items:center;gap:4px;aspect-ratio:3/4;border-radius:16px;border:1.5px dashed var(--fa-lilac-3);background:var(--fa-wash);color:var(--fa-plum);font-size:13.5px;font-weight:700;overflow:hidden;text-align:center;padding:8px}
.fa-side .fa-i{font-size:26px}
.fa-side img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.fa-side.has{border-style:solid;border-color:var(--fa-plum)}
.fa-side .rm{position:absolute;top:6px;right:6px;width:32px;height:32px;border-radius:50%;background:rgba(31,10,48,.7);color:#fff;display:grid;place-items:center;z-index:1}
.fa-side .lb{position:absolute;left:6px;bottom:6px;padding:2px 8px;border-radius:999px;background:rgba(255,255,255,.92);color:var(--fa-plum);font-size:12px;z-index:1}
.fa-side:disabled{opacity:.5;cursor:not-allowed}
.fa-seg{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:999px;background:var(--fa-lilac-1)}
.fa-seg button{min-height:40px;border-radius:999px;font-weight:700;font-size:14.5px;color:var(--fa-plum);transition:background-color .2s,color .2s}
.fa-seg.sm{margin:6px 0 2px;max-width:220px}.fa-seg.sm button{min-height:32px;font-size:13px}
.fa-seg button[aria-pressed=true]{background:var(--fa-plum);color:#fff;box-shadow:0 8px 18px -10px rgba(106,56,140,.8)}
.fa-lab{font-size:14px;font-weight:700;color:var(--fa-ink)}
.fa .fa-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5em;height:44px;padding:0 18px;border-radius:999px;font-size:15px;font-weight:700;white-space:nowrap;
  transition:transform .16s var(--fa-ease),background-color .2s,color .2s,border-color .2s;text-decoration:none}
.fa .fa-btn:active{transform:scale(.97)}
.fa .fa-btn:disabled{opacity:.45;cursor:not-allowed;transform:none}
.fa .fa-btn.pri{background:var(--fa-plum);color:#fff;box-shadow:0 10px 24px -12px rgba(106,56,140,.8)}
.fa .fa-btn.pri:hover:not(:disabled){background:var(--fa-plum-7)}
.fa .fa-btn.lt{background:#fff;color:var(--fa-plum)}
.fa .fa-btn.gh{border:1px solid rgba(201,179,221,.5);color:#fff}
.fa .fa-btn.gh:hover{background:rgba(255,255,255,.08)}
.fa .fa-btn.ol{border:1px solid var(--fa-lilac-3);color:var(--fa-plum);background:#fff}
.fa .fa-btn.ol:hover:not(:disabled){background:var(--fa-lilac-1)}
.fa .fa-btn.sm{height:38px;padding:0 14px;font-size:14px}
.fa .fa-btn.wide{width:100%}
.fa-saves{display:grid;gap:8px}
.fa-err{margin:0;font-size:14px;color:#CC3366}
.fa-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 16px;padding:14px 18px;border-radius:20px;background:var(--fa-wash);border:1px solid var(--fa-lilac-2)}
.fa-foot p{margin:0;font-size:15px;color:var(--fa-ink-2)}
.fa-bar2{display:flex;justify-content:flex-end;padding:0 4px}
@media (prefers-reduced-motion:reduce){.fa *{transition:none!important;animation:none!important}}
`;

/* ---------- skin age model ---------- */
let faP = null;
function loadAge(base){
  if (faP) return faP;
  faP = (async () => {
    const fa = await import(base + 'dist/face-api.esm.js');
    try { await fa.tf.setBackend('webgl'); await fa.tf.ready(); } catch (e) { await fa.tf.setBackend('cpu'); await fa.tf.ready(); }
    await fa.nets.ageGenderNet.loadFromUri(base + 'model/');
    return fa;
  })();
  faP.catch(() => { faP = null; });
  return faP;
}
async function guessAge(base, work){
  const fa = await loadAge(base), L = work.L;
  const ov = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const i of ov) { const p = L[i]; x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  const ages = [];
  for (const pad of [1, 1.15]) {
    const s = Math.max(x1 - x0, y1 - y0) * pad, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const c = document.createElement('canvas'); c.width = c.height = 112;
    c.getContext('2d').drawImage(work.canvas, cx - s / 2, cy - s / 2, s, s, 0, 0, 112, 112);
    ages.push((await fa.nets.ageGenderNet.predictAgeAndGender(c)).age);
  }
  return ages.reduce((a, b) => a + b, 0) / ages.length;
}

/* ---------- the reading, in a worker when the browser allows it ---------- */
let worker = null, wid = 0;
const waiting = new Map();
function getWorker(){
  if (worker !== null) return worker;
  try {
    if (typeof OffscreenCanvas === 'undefined') throw new Error('no OffscreenCanvas');
    worker = new Worker(new URL('./worker.js', import.meta.url), {type:'module'});
    worker.onmessage = e => { const w = waiting.get(e.data.id); if (!w) return; waiting.delete(e.data.id); e.data.error ? w.rej(new Error(e.data.error)) : w.res(e.data.r); };
    worker.onerror = () => { waiting.forEach(w => w.rej(new Error('worker'))); waiting.clear(); worker = false; };
  } catch (e) { worker = false; }
  return worker;
}
async function readWork(work, side){
  const w = getWorker();
  if (w) {
    try {
      const img = work.canvas.getContext('2d', {willReadFrequently:true}).getImageData(0, 0, work.canvas.width, work.canvas.height);
      return await new Promise((res, rej) => { const id = ++wid; waiting.set(id, {res, rej}); w.postMessage({id, img, L:work.L, side}, [img.data.buffer]); });
    } catch (e) { worker = false; }
  }
  return side ? readSide(work) : read(work);
}

/* ---------- the overlay for one factor ---------- */
const LV = ['#3F7A5C', '#8A6A10', '#A84A17', '#A32E52'];
function paint(cv, work, raw, key, sides){
  const {W, H} = raw, g = cv.getContext('2d'), L = work.L;
  cv.width = W; cv.height = H; g.clearRect(0, 0, W, H);
  const img = g.createImageData(W, H), d = img.data, M = raw.masks;
  const set = (i, r, gg, b, a) => { const o = i * 4; d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = a; };
  const T = 2.2;
  if (key === 'lines' || key === 'under') {
    const area = key === 'lines' ? (i => M.forehead[i] || M.glabella[i] || M.crows[i] || M.unders[i]) : (i => M.unders[i]);
    for (let i = 0; i < W * H; i++) {
      if (key === 'under' && M.unders[i]) set(i, 168, 134, 205, 60);
      if (area(i) && raw.lineStr[i] > T * 1.1) set(i, 247, 210, 120, Math.min(255, 90 + (raw.lineStr[i] - T) * 26));
    }
  } else if (key === 'texture') {
    for (let i = 0; i < W * H; i++) if (raw.grain[i]) set(i, 214, 196, 236, 170);
  } else if (key === 'redness') {
    for (let i = 0; i < W * H; i++) if (raw.redMap[i]) set(i, 255, 60, 110, Math.min(150, 40 + raw.redMap[i]));
  } else if (key === 'shine') {
    for (let i = 0; i < W * H; i++) if (raw.shineMap[i]) set(i, 255, 246, 214, 190);
  }
  g.putImageData(img, 0, 0);
  g.lineCap = g.lineJoin = 'round';
  const line = (pts, w, col) => { if (pts.length < 2) return; g.beginPath(); pts.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p.x, p.y)); g.lineWidth = w + 3; g.strokeStyle = 'rgba(20,6,31,.45)'; g.stroke(); g.lineWidth = w; g.strokeStyle = col; g.stroke(); };
  const P = ix => ix.map(i => L[i]);
  if (key === 'spots') {
    const s = raw.spots.slice().sort((a, b) => b.d - a.d).slice(0, 160);
    for (const p of s) { g.beginPath(); g.arc(p.x, p.y, 5 + Math.min(6, p.d), 0, Math.PI * 2); g.lineWidth = 3.5; g.strokeStyle = 'rgba(20,6,31,.4)'; g.stroke(); g.lineWidth = 1.8; g.strokeStyle = GOLD; g.stroke(); }
  } else if (key === 'sag') {
    const {FOLD, MARIONETTE, BROW_LO} = LINES_AT;
    [0, 1].forEach(s => {
      line(P(FOLD[s]), 2 + raw.sag.folds[s] * 14, GOLD);
      line(P(MARIONETTE[s]), 2 + raw.sag.marios[s] * 12, GOLD);
      line(P(BROW_LO[s]), 2, 'rgba(214,196,236,.95)');
    });
    for (const i of [61, 291]) { g.beginPath(); g.arc(L[i].x, L[i].y, 5, 0, Math.PI * 2); g.fillStyle = GOLD; g.fill(); }
  } else if (key === 'lid') {
    const {LID_UP} = LINES_AT;
    [0, 1].forEach(s => { line(P(LID_UP[s]), 1.6, 'rgba(214,196,236,.9)'); line(raw.lid.pts[s], 2.6, GOLD); });
  } else if (key === 'balance') {
    const {c, d: ax} = raw.axis, k = raw.H;
    line([{x:c.x - ax.x * k, y:c.y - ax.y * k}, {x:c.x + ax.x * k, y:c.y + ax.y * k}], 1.6, 'rgba(214,196,236,.9)');
    const refl = p => { const v = {x:p.x - c.x, y:p.y - c.y}, a = v.x * ax.x + v.y * ax.y; return {x:c.x + 2 * a * ax.x - v.x, y:c.y + 2 * a * ax.y - v.y}; };
    for (const [a, b] of LINES_AT.PAIRS) {
      const q = refl(L[a]), p = L[b];
      line([q, p], 1.4, GOLD);
      g.beginPath(); g.arc(p.x, p.y, 3.4, 0, Math.PI * 2); g.fillStyle = GOLD; g.fill();
      g.beginPath(); g.arc(q.x, q.y, 3.4, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill();
    }
  }
}

/* ===================================================================== */
let styleRefs = 0, styleEl = null;

export function mount(container, opts = {}){
  const lang = opts.lang === 'th' ? 'th' : 'en', S = STR[lang];
  const mpBase = opts.mpBase || MP_CDN, faBase = opts.faBase || FA_CDN, sampleSrc = opts.sample || SAMPLE;
  const links = Object.assign({consult:'consult.html', proportions:'proportions.html'}, opts.links || {});
  const emit = (n, d) => { try { opts.onEvent && opts.onEvent(n, d); } catch (e) {} };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c]));
  const svcHref = k => { try { return opts.serviceUrl ? opts.serviceUrl(k) : 'service.html?p=' + k; } catch (e) { return 'service.html?p=' + k; } };
  if (!styleRefs++) { styleEl = document.createElement('style'); styleEl.dataset.feature = 'analysis'; styleEl.textContent = CSS; document.head.append(styleEl); }

  const state = {front:null, sides:[null, null], sex:'women', sel:null, err:null, stream:null, camFor:'front', sample:false, planned:false, age:null, busy:false};
  try { const p = JSON.parse(localStorage.getItem('apex.analysis') || 'null'); if (p && p.sex === 'men') state.sex = 'men'; } catch (e) {}
  const remember = () => { try { localStorage.setItem('apex.analysis', JSON.stringify({sex:state.sex})); } catch (e) {} };

  const root = document.createElement('div');
  root.className = 'fa'; root.lang = lang;
  root.innerHTML = `
  <div class="fa-main">
    <section class="fa-stage" aria-label="${esc(S.photo)}">
      <div class="fa-view">
        <div class="fa-empty">
          <span class="fa-big">${ic('scan')}</span>
          <h3>${esc(S.emptyH)}</h3><p>${esc(S.hint)}</p>
          <div class="fa-row">
            <button class="fa-btn lt" data-act="take">${ic('camera')}${esc(S.take)}</button>
            <button class="fa-btn gh" data-act="choose">${ic('upload')}${esc(S.choose)}</button>
            <button class="fa-btn gh" data-act="sample">${ic('image')}${esc(S.sample)}</button>
          </div>
        </div>
        <div class="fa-error" hidden>
          <span class="fa-big">${ic('alert')}</span><h3 data-r="emsg"></h3>
          <div class="fa-row">
            <button class="fa-btn lt" data-act="take">${ic('camera')}${esc(S.take)}</button>
            <button class="fa-btn gh" data-act="choose">${ic('upload')}${esc(S.choose)}</button>
            <button class="fa-btn gh" data-act="sample">${ic('image')}${esc(S.sample)}</button>
          </div>
        </div>
        <div class="fa-fbox" hidden>
          <canvas class="fa-photo"></canvas><canvas class="fa-ov"></canvas>
          <span class="fa-corners"></span><span class="fa-tag">${esc(S.guide)}</span>
        </div>
        <div class="fa-cam" hidden>
          <video playsinline muted autoplay></video>
          <svg viewBox="0 0 100 130" aria-hidden="true"><ellipse cx="50" cy="60" rx="27" ry="36"/></svg>
          <p data-r="camhint"></p>
          <div class="fa-cambar">
            <button class="fa-btn gh sm" data-act="camcancel">${esc(S.cancel)}</button>
            <button class="fa-shutter" data-act="shutter" aria-label="${esc(S.shutter)}">${ic('camera')}</button><span></span>
          </div>
        </div>
        <div class="fa-busy" hidden><span class="fa-scanline"></span><span class="fa-spin"></span><span>${esc(S.busy)}</span></div>
      </div>
      <div class="fa-chips" role="group" aria-label="${esc(S.show)}" hidden></div>
      <div class="fa-bar2" hidden><button class="fa-btn gh sm" data-act="choose">${ic('upload')}${esc(S.change)}</button></div>
      <p class="fa-credit" hidden>${esc(S.credit)}</p>
    </section>
    <section class="fa-res" hidden>
      <div class="fa-sum">
        <div class="fa-card"><b>${esc(S.score)}</b><span class="n" data-r="score">–</span><p>${esc(S.scoreP)}</p></div>
        <div class="fa-card"><b>${esc(S.age)}</b><span class="n" data-r="age">–</span><p>${esc(S.ageP)}</p></div>
        <div class="fa-card g"><b>${esc(S.golden)}</b><span class="n" data-r="gold">–</span><p>${esc(S.goldenP)}</p>
          <div class="fa-seg sm" role="group" aria-label="${esc(S.ideal)}"><button data-sex="women" aria-pressed="true">${esc(S.women)}</button><button data-sex="men" aria-pressed="false">${esc(S.men)}</button></div>
          <a href="${esc(links.proportions)}">${esc(S.see)}${ic('arrow')}</a></div>
      </div>
      <h3 class="fa-h">${esc(S.skin)}</h3><ul class="fa-list" data-r="skin"></ul>
      <h3 class="fa-h">${esc(S.face)}</h3><ul class="fa-list" data-r="face"></ul>
      <p class="fa-note">${esc(S.note)}</p>
    </section>
    <aside class="fa-panel">
      <div class="fa-sec">
        <h3><i>1</i>${esc(S.photo)}</h3>
        <div class="fa-src">
          <button class="fa-btn pri" data-act="take">${ic('camera')}${esc(S.take)}</button>
          <button class="fa-btn ol" data-act="choose">${ic('upload')}${esc(S.choose)}</button>
          <button class="fa-btn ol full" data-act="sample">${ic('image')}${esc(S.sample)}</button>
        </div>
        <p class="fa-priv">${ic('shield')}${esc(S.privacy)}</p>
        <div data-r="warns"></div>
      </div>
      <div class="fa-sec">
        <h3><i>2</i>${esc(S.sides)}</h3>
        <p>${esc(S.sidesP)}</p>
        <div class="fa-sides">${[0, 1].map(s => `<button class="fa-side" data-side="${s}" disabled></button>`).join('')}</div>
        <p class="fa-err" data-r="sideerr" hidden></p>
      </div>
      <div class="fa-sec">
        <h3><i>3</i>${esc(S.save)}</h3>
        <div class="fa-saves">
          <button class="fa-btn pri wide" data-act="save" disabled>${ic('download')}${esc(S.saveBtn)}</button>
          <button class="fa-btn ol wide" data-act="plan" disabled>${ic('plus')}<span>${esc(S.plan)}</span></button>
          <a class="fa-btn ol wide" href="${esc(links.consult)}">${ic('msg')}${esc(S.consult)}</a>
        </div>
        <p class="fa-err" data-r="saveerr" hidden></p>
      </div>
    </aside>
  </div>
  <div class="fa-foot"><p>${esc(S.vary)}</p></div>
  <input type="file" accept="image/*" hidden>`;
  container.append(root);

  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)], R = k => root.querySelector(`[data-r="${k}"]`);
  const view = $('.fa-view'), fbox = $('.fa-fbox'), cvP = $('.fa-photo'), cvO = $('.fa-ov'), empty = $('.fa-empty'), errBox = $('.fa-error');
  const cam = $('.fa-cam'), video = $('video'), busy = $('.fa-busy'), file = $('input[type=file]'), chips = $('.fa-chips'), res = $('.fa-res');
  const ready = () => !!(state.front && state.front.res);

  /* ---------- results ---------- */
  function compute(){
    const f = state.front; if (!f) return;
    const sides = state.sides.filter(Boolean);
    f.res = factors(f.raw, sides);
    f.gold = overall(measure(f.work.L), state.sex);
  }
  const lvColor = l => `--c:${LV[l]}`;
  function rowHTML(k){
    const F = state.front.res.F[k];
    let lv, extra = '', w = Math.round(F.v * 100);
    if (k === 'lid') lv = `<span class="fa-lv" style="--c:${F.state === 'clear' ? LV[0] : F.state === 'faint' ? LV[1] : LV[2]}">${esc(S.lid[F.state])}</span>`;
    else if (k === 'balance' && state.front.raw.turn > .12) { lv = `<span class="fa-lv" style="--c:#6E5F7A">–</span>`; extra = `<span class="at">${esc(S.turned)}</span>`; w = 0; }
    else lv = `<span class="fa-lv" style="${lvColor(F.level)}">${esc(S.levels[F.level])}</span>`;
    if (F.area && F.level >= 1 && S.area[F.area]) extra += `<span class="at">${esc(S.most)} <b>${esc(S.area[F.area])}</b></span>`;
    if (k === 'sag' && F.sides) extra += `<span class="at">${esc(S.withSides)}</span>`;
    let svc = SVC[k];
    if (k === 'lines') svc = F.area === 'forehead' || F.area === 'glabella' ? 'browlift' : null;
    if (k === 'sag') svc = F.area === 'brows' ? 'browlift' : 'facelift';
    if (k === 'lid' ? F.state === 'clear' : F.level < 1) svc = null;
    const link = svc ? `<a class="fa-svc" href="${esc(svcHref(svc))}">${esc(S.svc[svc])}${ic('arrow')}</a>` : '';
    const col = k === 'lid' ? `--c:${LV[F.state === 'clear' ? 0 : F.state === 'faint' ? 1 : 2]}` : lvColor(F.level);
    return `<li class="fa-f"><button class="fa-fs" data-f="${k}" aria-pressed="${state.sel === k}">
      <span class="fa-fh"><b>${esc(S.name[k])}</b>${lv}</span>
      <span class="fa-bar" style="${col}"><span style="--w:${w}%"></span></span>
      <span class="fa-d">${esc(S.desc[k])}</span>${extra}</button>${link}</li>`;
  }
  function results(){
    const f = state.front;
    R('skin').innerHTML = ORDER.map(rowHTML).join('');
    R('face').innerHTML = FACE.map(rowHTML).join('');
    R('score').innerHTML = `${f.res.score}<small>/100</small>`;
    R('age').innerHTML = state.age === null ? '…' : S.aboutH(skinAge(state.age === undefined ? null : state.age, f.res.concern));
    R('gold').textContent = f.gold + '%';
    chips.innerHTML = [...ORDER, ...FACE].map(k => { const F = f.res.F[k], l = k === 'lid' ? (F.state === 'clear' ? 0 : F.state === 'faint' ? 1 : 2) : F.level;
      return `<button class="fa-chip" data-f="${k}" aria-pressed="${state.sel === k}" style="--c:${LV[l]}"><i></i>${esc(S.short[k])}</button>`; }).join('');
    select(state.sel || worst(), false);
  }
  const worst = () => state.front.res.F.lines.level >= 1 ? 'lines' : ORDER.reduce((a, k) => state.front.res.F[k].v > state.front.res.F[a].v ? k : a, ORDER[0]);
  function select(k, fromUser = true){
    state.sel = k;
    $$('[data-f]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === k)));
    paint(cvO, state.front.work, state.front.raw, k, state.sides);
    if (fromUser) {
      emit('analysis:factor', {factor:k});
      const chip = chips.querySelector(`[data-f="${k}"]`); if (chip) chip.scrollIntoView({block:'nearest', inline:'center', behavior:'smooth'});
    }
  }

  function sync(){
    const camOn = !!state.stream, ok = ready();
    cam.hidden = !camOn;
    R('camhint').textContent = state.camFor === 'front' ? S.camHint : S.camSide;
    errBox.hidden = camOn || !state.err;
    empty.hidden = camOn || ok || !!state.err;
    fbox.hidden = camOn || !ok || !!state.err;
    view.classList.toggle('fit', !fbox.hidden);
    chips.hidden = $('.fa-bar2').hidden = !(ok && !camOn && !state.err);
    res.hidden = !ok;
    $('.fa-credit').hidden = !(ok && state.sample && !camOn && !state.err);
    R('emsg').textContent = state.err ? S.err[state.err] || '' : '';
    $$('.fa-seg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sex === state.sex)));
    $('[data-act="save"]').disabled = !ok;
    const pl = $('[data-act="plan"]'); pl.disabled = !ok;
    pl.innerHTML = (state.planned ? ic('check') : ic('plus')) + `<span>${esc(state.planned ? S.planned : S.plan)}</span>`;
    R('warns').innerHTML = ok ? state.front.issues.map(k => `<p class="fa-warn">${ic('alert')}<span>${esc(S.warn[k])}</span></p>`).join('') : '';
    $$('.fa-side').forEach(b => {
      const s = +b.dataset.side, sd = state.sides[s];
      b.disabled = !ok; b.classList.toggle('has', !!sd);
      b.innerHTML = sd ? `<img src="${sd.thumb}" alt=""><span class="lb">${esc(s ? S.right : S.left)}</span><span class="rm" data-rm="${s}" aria-label="${esc(S.remove)}">${ic('x')}</span>`
        : `${ic(s ? 'turnR' : 'turnL')}<span>${esc(s ? S.right : S.left)}</span><span style="font-weight:400;font-size:12.5px">${ic('plus')} ${esc(S.add)}</span>`;
      b.setAttribute('aria-label', (s ? S.right : S.left) + (sd ? '' : ': ' + S.add));
    });
  }
  const setBusy = on => { busy.hidden = !on; state.busy = on; };
  const tick = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));

  /* ---------- photos ---------- */
  async function prepare(canvas){
    const hit = await find(mpBase, canvas);
    if (!hit) return null;
    const f = frameFace(hit.canvas, hit.lm, 2.1, 900, 2000);
    return workImage(f.base, f.L);
  }
  async function useFront(canvas, sample){
    stopCam();
    state.err = null; setBusy(true); sync(); await tick();
    let work = null, err = null;
    try { work = await prepare(canvas); } catch (e) { err = 'model'; }
    if (!work) { setBusy(false); Object.assign(state, {front:null, err:err || 'noFace'}); emit('analysis:error', {error:state.err}); sync(); return; }
    await tick();
    let raw;
    try { raw = await readWork(work, false); } catch (e) { setBusy(false); Object.assign(state, {front:null, err:'read'}); sync(); return; }
    if (raw.turn > .5) { setBusy(false); Object.assign(state, {front:null, err:'front'}); sync(); return; }
    state.front = {work, raw, issues:quality(work, raw)};
    state.sample = !!sample; state.sel = null; state.age = null; state.planned = false;
    compute();
    const W = raw.W, H = raw.H;
    cvP.width = W; cvP.height = H; cvP.getContext('2d').drawImage(work.canvas, 0, 0);
    view.style.setProperty('--ar', (W / H).toFixed(4));
    setBusy(false); sync(); results();
    emit('analysis:photo', {sample:!!sample, score:state.front.res.score, issues:state.front.issues});
    const mine = state.front;
    guessAge(faBase, work).then(a => { if (state.front === mine) { state.age = a; results(); } }).catch(() => { if (state.front === mine) { state.age = undefined; results(); } });
  }
  async function useSide(canvas, s){
    stopCam();
    const err = R('sideerr'); err.hidden = true;
    setBusy(true); sync(); await tick();
    let work = null;
    try { work = await prepare(canvas); } catch (e) {}
    if (!work) { setBusy(false); err.textContent = S.err.noFace; err.hidden = false; sync(); return; }
    await tick();
    let r;
    try { r = await readWork(work, true); } catch (e) { setBusy(false); err.textContent = S.err.read; err.hidden = false; sync(); return; }
    setBusy(false);
    if (r.turn < .22) { err.textContent = S.err.side; err.hidden = false; sync(); return; }
    const t = document.createElement('canvas'), k = 240 / work.canvas.height; t.width = Math.round(work.canvas.width * k); t.height = 240;
    t.getContext('2d').drawImage(work.canvas, 0, 0, t.width, t.height);
    state.sides[s] = {...r, thumb:t.toDataURL('image/jpeg', .8)};
    compute(); sync(); results();
    emit('analysis:side', {side:s ? 'right' : 'left'});
  }
  async function useFile(f, target){
    if (!f) return;
    if (!/^image\//.test(f.type)) { if (target === 'front') { state.err = 'read'; state.front = null; sync(); } return; }
    const url = URL.createObjectURL(f);
    try { const im = await loadImage(url), c = toCanvas(im, 2000); target === 'front' ? await useFront(c) : await useSide(c, target); }
    catch (e) { setBusy(false); if (target === 'front') { Object.assign(state, {err:'read', front:null}); sync(); } }
    URL.revokeObjectURL(url);
  }
  let loadingSample = false;
  async function useSample(){
    if (loadingSample) return;
    loadingSample = true; setBusy(true);
    try { const im = await loadImage(sampleSrc); await useFront(toCanvas(im, 2000), true); emit('analysis:sample', {}); }
    catch (e) { setBusy(false); Object.assign(state, {err:'sample', front:null}); sync(); }
    finally { loadingSample = false; }
  }
  async function startCam(target){
    state.camFor = target;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('no camera');
      state.stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user', width:{ideal:1920}, height:{ideal:1920}}, audio:false});
      video.srcObject = state.stream; if (target === 'front') state.err = null; sync();
      await video.play().catch(() => {});
    } catch (e) { stopCam(); if (target === 'front') { Object.assign(state, {err:'camera', front:null}); } else { R('sideerr').textContent = S.err.camera; R('sideerr').hidden = false; } sync(); }
  }
  function stopCam(){ if (state.stream) { state.stream.getTracks().forEach(t => t.stop()); state.stream = null; } video.srcObject = null; }
  function shoot(){
    if (!video.videoWidth) return;
    const c = document.createElement('canvas'); c.width = video.videoWidth; c.height = video.videoHeight;
    const x = c.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(video, 0, 0);
    const t = state.camFor;
    t === 'front' ? useFront(toCanvas(c, 2000)) : useSide(toCanvas(c, 2000), t);
  }

  /* ---------- save: the photo with the selected reading and every level beside it ---------- */
  async function save(){
    const err = R('saveerr'); err.hidden = true;
    if (!ready()) return;
    try {
      const f = state.front, font = getComputedStyle(root).fontFamily;
      try { await document.fonts.load(`700 20px ${font}`); } catch (e) {}
      const pad = 36, ph = 860, pw = Math.round(f.raw.W * ph / f.raw.H), colW = 520, W = pad * 3 + pw + colW, H = ph + pad * 2 + 60;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      g.fillStyle = '#1F0A30'; g.fillRect(0, 0, W, H);
      g.save(); g.beginPath(); g.roundRect ? g.roundRect(pad, pad, pw, ph, 22) : g.rect(pad, pad, pw, ph); g.clip();
      g.drawImage(cvP, pad, pad, pw, ph); g.drawImage(cvO, pad, pad, pw, ph); g.restore();
      const x = pad * 2 + pw; let y = pad + 34;
      g.textBaseline = 'alphabetic';
      const big = (label, val, col) => { g.font = `700 20px ${font}`; g.fillStyle = '#CDB9DD'; g.fillText(label, x, y); y += 46; g.font = `700 44px ${font}`; g.fillStyle = col; g.fillText(val, x, y); y += 34; };
      big(S.score, `${f.res.score}/100`, '#fff');
      const ageTxt = S.about(skinAge(state.age == null ? null : state.age, f.res.concern));
      big(S.age, ageTxt, '#fff');
      big(S.golden, f.gold + '%', GOLD);
      y += 6;
      for (const k of [...ORDER, 'lid']) {
        const F = f.res.F[k];
        const t = k === 'lid' ? S.lid[F.state] : S.levels[F.level], col = k === 'lid' ? LV[F.state === 'clear' ? 0 : F.state === 'faint' ? 1 : 2] : LV[F.level];
        g.font = `700 21px ${font}`; g.fillStyle = '#fff'; g.fillText(S.name[k], x, y);
        g.font = `700 17px ${font}`; const tw = g.measureText(t).width + 22;
        g.fillStyle = col; g.beginPath(); g.roundRect ? g.roundRect(x + colW - tw, y - 22, tw, 30, 15) : g.rect(x + colW - tw, y - 22, tw, 30); g.fill();
        g.fillStyle = '#fff'; g.fillText(t, x + colW - tw + 11, y - 2);
        y += 46;
      }
      g.font = `400 18px ${font}`; g.fillStyle = '#CDB9DD';
      g.fillText(S.guide + ' · ' + S.name[state.sel], pad, H - 30);
      const bw = g.measureText(S.brand).width; g.fillText(S.brand, W - pad - bw, H - 30);
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .9));
      if (!blob) throw new Error('blob');
      const name = 'apex-face-analysis.jpg', fl = new File([blob], name, {type:'image/jpeg'});
      let shared = false;
      if (navigator.canShare && navigator.share) {
        try { if (navigator.canShare({files:[fl]})) { await navigator.share({files:[fl], title:S.brand}); shared = true; } }
        catch (e) { if (e && e.name === 'AbortError') shared = true; }
      }
      if (!shared) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
      emit('analysis:saved', {score:f.res.score});
    } catch (e) { err.textContent = S.err.save; err.hidden = false; }
  }

  /* ---------- events ---------- */
  let fileFor = 'front';
  const pick = t => { fileFor = t; file.click(); };
  function onClick(e){
    const rm = e.target.closest('[data-rm]');
    if (rm) { e.stopPropagation(); state.sides[+rm.dataset.rm] = null; compute(); sync(); results(); return; }
    const sd = e.target.closest('[data-side]');
    if (sd && !sd.disabled) { const s = +sd.dataset.side; if (!state.sides[s]) pick(s); return; }
    const fb = e.target.closest('[data-f]');
    if (fb && ready()) { select(fb.dataset.f); return; }
    const sb = e.target.closest('[data-sex]');
    if (sb) { state.sex = sb.dataset.sex; remember(); if (ready()) { compute(); results(); } sync(); return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'take') startCam('front');
    else if (a === 'choose') pick('front');
    else if (a === 'sample') useSample();
    else if (a === 'camcancel') { stopCam(); sync(); }
    else if (a === 'shutter') shoot();
    else if (a === 'save') save();
    else if (a === 'plan') {
      state.planned = true;
      const F = state.front.res.F, procs = new Set();
      if (F.sag.level >= 2) procs.add(F.sag.area === 'brows' ? 'browlift' : 'facelift');
      if (F.lines.level >= 2 && (F.lines.area === 'forehead' || F.lines.area === 'glabella')) procs.add('browlift');
      if (F.under.level >= 2 || F.lid.state !== 'clear') procs.add('eyelid');
      (procs.size ? [...procs] : ['consult']).forEach(p => emit('plan:add', {procedure:p, source:'analysis'}));
      sync();
    }
  }
  root.addEventListener('click', onClick);
  file.addEventListener('change', () => { const f = file.files[0]; file.value = ''; useFile(f, fileFor); });
  view.addEventListener('dragover', e => e.preventDefault());
  view.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) useFile(f, 'front'); });

  sync();
  const idle = setTimeout(() => { loadMesh(mpBase).catch(() => {}); }, 2500);
  return {
    destroy(){
      clearTimeout(idle); stopCam();
      root.removeEventListener('click', onClick); root.remove();
      if (!--styleRefs && styleEl) { styleEl.remove(); styleEl = null; }
    },
    _state:state,
  };
}
