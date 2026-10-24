/* Filler simulator
   A visitor picks what bothers them (saggy cheeks, tear troughs, a recessed chin...) and sees which areas a doctor
   would usually treat, the amount for each, the total in mL and syringes, and a simulation on a front photo.
   Areas and amounts follow the MD Codes method (de Maio 2021, CC BY 4.0), see codes.js.
   Everything runs in the browser. No photo leaves the device.

   mount(container, opts) -> {destroy()}
   opts: lang 'en' | 'th', base (assets/ URL), serviceUrl(key), onEvent(name, data)
   Testing only: mpBase (folder of @mediapipe/face_mesh), sample (photo URL) */
import {CODES, CONCERNS, STEPS, PER_SESSION, planFor} from './codes.js';
import {warpInto} from '../proportions/warp.js';
import {V, clamp, smooth, frame} from '../proportions/geometry.js';
import {MP_CDN, loadMesh, find, frameFace, loadImage, toCanvas} from '../face/mesh.js';

const SAMPLE = 'https://images.unsplash.com/photo-1534751516642-a1af1ef26a56?w=1100&q=85';
const REF = 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8012343/';
const STEP_C = {foundation:'#E3B85C', contour:'#C9B3DD', refine:'#F49AC1'};

const STR = {
  en:{
    fx:{"cheeks": "Lifts and supports the midface so the cheeks look fuller.", "temples": "Fills the hollow at the side of the forehead.", "chin": "Brings the chin forward and lengthens it a little.", "jowls": "Sharpens the jawline and the angle of the jaw.", "forehead": "Rounds out a flat forehead.", "brows": "Supports the brows so they sit a little higher.", "orbit": "Fills the hollow beside the outer eye.", "tear": "Softens the shadow under the eyes.", "folds": "Softens the lines from the nose to the mouth.", "lips": "Adds volume and shape to the lips.", "corners": "Lifts the corners of the mouth.", "marionette": "Softens the lines below the corners of the mouth.", "nose": "Raises the bridge and lifts the tip without surgery."},
    change:'New photo', photo:'Photo', take:'Take photo', choose:'Choose photo', sample:'Sample face', privacy:'No photo uploaded.',
    hint:'Face the camera straight on, with your hair off your face.', emptyH:'Take or choose a front photo.',
    busy:'Finding your face', credit:'Sample photo: Unsplash', points:'Points',
    before:'Before', after:'After', sim:'Simulation only', compare:'Before and after',
    concerns:'What would you like to improve?', concernsP:'Pick one or more. The areas and amounts update as you go.',
    deep:'Deep folds', deepP:'Uses the amounts for deep nasolabial folds.',
    step:{foundation:'Foundation', contour:'Contour', refine:'Refinement'},
    stepP:{foundation:'Support for the midface comes first.', contour:'Then the outline of the face.', refine:'Finer details last.'},
    c:{cheeks:'Saggy cheeks or flat cheeks', temples:'Sunken temples', chin:'Small or recessed chin', jowls:'Jowls or double chin',
       forehead:'Flat forehead', brows:'Low brows', orbit:'Hollow outer eye area', tear:'Tear troughs', folds:'Deep nasolabial folds',
       lips:'Thin lips', corners:'Downturned mouth corners', marionette:'Marionette lines', nose:'Nose shape'},
    a:{Ck1:'Cheekbone arch', Ck2:'Cheekbone', Ck3:'Front of the cheek', Ck4:'Lower outer cheek', Ck5:'Below the cheekbone',
       T1:'Front of the temple', T2:'Back of the temple',
       C1:'Below the lower lip', C2:'Tip of the chin', C3:'Front of the chin', C4:'Centre of the chin', C5:'Lower side of the chin', C6:'Side of the chin',
       Jw1:'Angle of the jaw', Jw2:'In front of the ear', Jw3:'Jawline', Jw4:'Beside the chin', Jw5:'Under the front of the chin',
       F1:'Inner forehead', F2:'Outer forehead', F3:'Centre of the forehead',
       E1:'Tail of the brow', E2:'Centre of the brow', E3:'Head of the brow',
       O1:'Outer corner of the eye', O2:'Below the outer eye', O3:'Above the outer eye',
       Tt1:'Under the eye, centre', Tt2:'Under the eye, outer', Tt3:'Under the eye, inner',
       NL1:'Top of the fold', NL2:'Middle of the fold', NL3:'Bottom of the fold',
       M1:'Top of the line', M2:'Middle of the line', M3:'Bottom of the line',
       Lp1:'Body of the lips', Lp2:"Cupid's bow", Lp3:'Lip border', Lp4:'Centre of the upper lip', Lp5:'Sides of the lower lip',
       Lp6:'Corners of the mouth', Lp7:'Philtrum', Lp8:'Lines around the lips',
       N1:'Base of the nose', N2:'Between the nostrils', N3:'Top of the bridge', N4:'Upper bridge', N5:'Lower bridge'},
    total:'Estimated amount', totalP:'Both sides of the face, using the minimum amount for each area.',
    ml:'mL', syr:['syringe', 'syringes'], ses:['session', 'sessions'], sesP:'About {n} mL a session',
    each:'each side', mid:'centre', none:'Pick a concern to see the areas and amounts.',
    save:'Save', saveBtn:'Save to phone', plan:'Add to My Plan', planned:'Added to My Plan', consult:'Ask a doctor',
    vary:'Simulation only. Results may vary from person to person.',
    ref:'Areas and amounts follow the MD Codes™ method by Dr. Maurício de Maio, the minimum amount per area from his paper. Your doctor sets the real plan.',
    refLink:'de Maio M. Aesthetic Plastic Surgery 2021;45:690–709 (CC BY 4.0)',
    camHint:'Line up your face with the outline.', shutter:'Take photo', cancel:'Cancel', brand:'Apex Surgery Hospital',
    err:{noFace:'No face found in this photo. Try a closer photo taken from the front.', camera:'The camera could not be opened.', read:'The photo could not be read.',
         model:'The face model could not be loaded.', save:'The image could not be saved.', sample:'The sample photo could not be loaded.'},
  },
  th:{
    fx:{"cheeks": "ยกและพยุงช่วงกลางใบหน้า แก้มดูเต็มขึ้น", "temples": "เติมร่องขมับด้านข้างหน้าผาก", "chin": "คางยื่นขึ้นและยาวขึ้นเล็กน้อย", "jowls": "กรอบหน้าและมุมกรามชัดขึ้น", "forehead": "หน้าผากโค้งมนขึ้น", "brows": "พยุงคิ้วให้ยกขึ้นเล็กน้อย", "orbit": "เติมร่องลึกข้างหางตา", "tear": "ลดเงาใต้ตา", "folds": "ร่องจากข้างจมูกถึงมุมปากตื้นขึ้น", "lips": "ริมฝีปากอิ่มและได้รูปขึ้น", "corners": "ยกมุมปากขึ้น", "marionette": "ร่องใต้มุมปากตื้นขึ้น", "nose": "เสริมสันจมูกและยกปลายจมูกโดยไม่ผ่าตัด"},
    change:'เปลี่ยนรูป', photo:'รูปภาพ', take:'ถ่ายรูป', choose:'เลือกรูป', sample:'ใบหน้าตัวอย่าง', privacy:'ไม่มีการอัปโหลดรูปภาพ',
    hint:'หันหน้าตรงเข้าหากล้อง และเก็บผมไม่ให้ปิดใบหน้า', emptyH:'ถ่ายหรือเลือกรูปหน้าตรง',
    busy:'กำลังหาใบหน้า', credit:'ภาพตัวอย่าง: Unsplash', points:'จุดฉีด',
    before:'ก่อน', after:'หลัง', sim:'ภาพจำลองเท่านั้น', compare:'ก่อนและหลัง',
    concerns:'อยากแก้ไขตรงไหน', concernsP:'เลือกได้มากกว่าหนึ่งข้อ ตำแหน่งและปริมาณจะเปลี่ยนตามที่เลือก',
    deep:'ร่องลึก', deepP:'ใช้ปริมาณสำหรับร่องแก้มที่ลึก',
    step:{foundation:'วางโครงสร้าง', contour:'ปรับกรอบหน้า', refine:'เก็บรายละเอียด'},
    stepP:{foundation:'เริ่มจากการพยุงช่วงกลางใบหน้า', contour:'จากนั้นปรับกรอบหน้า', refine:'เก็บรายละเอียดเป็นลำดับสุดท้าย'},
    c:{cheeks:'แก้มตอบหรือแก้มหย่อน', temples:'ขมับตอบ', chin:'คางสั้นหรือคางถอย', jowls:'แก้มย้อยหรือเหนียง',
       forehead:'หน้าผากแบน', brows:'คิ้วตก', orbit:'ขอบตาด้านข้างลึก', tear:'ร่องใต้ตา', folds:'ร่องแก้มลึก',
       lips:'ปากบาง', corners:'มุมปากตก', marionette:'ร่องข้างมุมปาก', nose:'ทรงจมูก'},
    a:{Ck1:'โหนกแก้มด้านข้าง', Ck2:'โหนกแก้ม', Ck3:'แก้มด้านหน้า', Ck4:'แก้มด้านข้างล่าง', Ck5:'ใต้โหนกแก้ม',
       T1:'ขมับด้านหน้า', T2:'ขมับด้านหลัง',
       C1:'ร่องใต้ริมฝีปากล่าง', C2:'ปลายคาง', C3:'คางด้านหน้า', C4:'กึ่งกลางคาง', C5:'คางด้านข้างล่าง', C6:'คางด้านข้าง',
       Jw1:'มุมกราม', Jw2:'หน้าใบหู', Jw3:'แนวกราม', Jw4:'ข้างคาง', Jw5:'ใต้คางด้านหน้า',
       F1:'หน้าผากด้านใน', F2:'หน้าผากด้านข้าง', F3:'กลางหน้าผาก',
       E1:'หางคิ้ว', E2:'กลางคิ้ว', E3:'หัวคิ้ว',
       O1:'หางตา', O2:'ใต้หางตา', O3:'เหนือหางตา',
       Tt1:'ใต้ตาตรงกลาง', Tt2:'ใต้ตาด้านนอก', Tt3:'ใต้ตาด้านใน',
       NL1:'ร่องแก้มส่วนบน', NL2:'ร่องแก้มส่วนกลาง', NL3:'ร่องแก้มส่วนล่าง',
       M1:'ร่องส่วนบน', M2:'ร่องส่วนกลาง', M3:'ร่องส่วนล่าง',
       Lp1:'เนื้อริมฝีปาก', Lp2:'กระจับ', Lp3:'ขอบปาก', Lp4:'กลางปากบน', Lp5:'ปากล่างด้านข้าง',
       Lp6:'มุมปาก', Lp7:'ร่องเหนือริมฝีปากบน', Lp8:'ริ้วรอยรอบปาก',
       N1:'ฐานจมูก', N2:'แกนกลางรูจมูก', N3:'ดั้งจมูกช่วงบน', N4:'สันจมูกช่วงบน', N5:'สันจมูกช่วงล่าง'},
    total:'ปริมาณโดยประมาณ', totalP:'รวมทั้งสองข้างของใบหน้า ใช้ปริมาณขั้นต่ำของแต่ละตำแหน่ง',
    ml:'มล.', syr:'หลอด', ses:'ครั้ง', sesP:'ประมาณ {n} มล. ต่อครั้ง',
    each:'ข้างละ', mid:'กึ่งกลาง', none:'เลือกสิ่งที่อยากแก้ไขเพื่อดูตำแหน่งและปริมาณ',
    save:'บันทึก', saveBtn:'บันทึกลงโทรศัพท์', plan:'เพิ่มในแผนของฉัน', planned:'เพิ่มในแผนแล้ว', consult:'ปรึกษาแพทย์',
    vary:'ภาพจำลองเท่านั้น ผลลัพธ์อาจแตกต่างกันในแต่ละบุคคล',
    ref:'ตำแหน่งและปริมาณอ้างอิงตามวิธี MD Codes™ ของ นพ.เมาริซิโอ เด ไมโอ เป็นปริมาณขั้นต่ำของแต่ละตำแหน่งจากงานวิจัย แพทย์จะเป็นผู้วางแผนจริง',
    refLink:'de Maio M. Aesthetic Plastic Surgery 2021;45:690–709 (CC BY 4.0)',
    camHint:'จัดใบหน้าให้อยู่ในเส้น', shutter:'ถ่ายรูป', cancel:'ยกเลิก', brand:'Apex Surgery Hospital',
    err:{noFace:'ไม่พบใบหน้าในรูปนี้ ลองใช้รูปหน้าตรงที่ถ่ายใกล้ขึ้น', camera:'เปิดกล้องไม่ได้', read:'อ่านรูปไม่ได้',
         model:'โหลดโมเดลใบหน้าไม่ได้', save:'บันทึกรูปไม่ได้', sample:'โหลดรูปตัวอย่างไม่ได้'},
  },
};

const ICON = {
  camera:'<path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"/><circle cx="12" cy="13" r="3"/>',
  upload:'<path d="M12 3v12"/><path d="m17 8-5-5-5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>',
  image:'<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  download:'<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
  plus:'<path d="M5 12h14"/><path d="M12 5v14"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  face:'<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/>',
  shield:'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  move:'<path d="m18 8 4 4-4 4"/><path d="M2 12h20"/><path d="m6 8-4 4 4 4"/>',
  alert:'<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  msg:'<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  drop:'<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  book:'<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
};
const ic = k => `<svg class="ff-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;

const CSS = `
.ff{--ff-plum:var(--plum,#6A388C);--ff-plum-7:var(--plum-700,#55286F);--ff-night:var(--night,#1F0A30);--ff-night-2:var(--night-2,#2A0F40);
  --ff-lilac:var(--lilac,#A886CD);--ff-lilac-3:var(--lilac-300,#C9B3DD);--ff-lilac-2:var(--lilac-200,#E4D8EE);--ff-lilac-1:var(--lilac-100,#F1EAF7);
  --ff-wash:var(--wash,#FBF3FB);--ff-ink:var(--ink,#2A1F33);--ff-ink-2:var(--ink-2,#5A4A66);--ff-ink-3:var(--ink-3,#7C6A88);
  --ff-on:var(--on-night,#F6EEFB);--ff-on-2:var(--on-night-2,#CDB9DD);--ff-gold:#E3B85C;--ff-gold-d:#9A6B12;--ff-ease:cubic-bezier(.23,1,.32,1);
  font-family:var(--font,"LINE Seed","Sarabun","Noto Sans Thai",system-ui,sans-serif);color:var(--ff-ink);line-height:1.6;display:grid;gap:14px;min-width:0;-webkit-tap-highlight-color:transparent}
.ff *,.ff *::before,.ff *::after{box-sizing:border-box}
.ff :where(button){font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
.ff [hidden]{display:none!important}
.ff-i{width:1.15em;height:1.15em;flex:none;display:inline-block;vertical-align:-.18em}
.ff-main{display:grid;gap:14px;min-width:0}
@media (min-width:960px){.ff-main{grid-template-columns:minmax(0,1fr) 360px;grid-template-areas:"stage panel" "props panel";gap:24px;align-items:start}
  .ff-stage{grid-area:stage}.ff-props{grid-area:props}.ff-panel{grid-area:panel}}
.ff-props{display:grid;gap:12px;min-width:0}
.ff-sum{display:flex;align-items:center;justify-content:space-between;gap:12px 20px;flex-wrap:wrap;padding:16px 20px;border-radius:22px;
  background:linear-gradient(135deg,#FFFBF0,#FFF0CF);border:1px solid #EAD5A2}
.ff-sum b{font-size:17px;color:var(--ff-ink)}
.ff-sum p{margin:2px 0 0;font-size:13.5px;line-height:1.45;color:var(--ff-ink-2);max-width:46ch}
.ff-sum-n{display:flex;align-items:center;gap:10px;font-size:30px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--ff-ink-3);line-height:1}
.ff-sum-n .ff-i{width:20px;height:20px;color:var(--ff-gold-d);transform:rotate(45deg)}
.ff-sum-n .a{color:var(--ff-gold-d);font-size:38px}
@media (min-width:700px){.ff-rows{grid-template-columns:1fr 1fr}}
.ff-stage{position:relative;min-width:0;background:radial-gradient(120% 80% at 50% 0%,var(--ff-night-2),var(--ff-night) 70%);color:var(--ff-on);border-radius:28px;padding:10px;display:grid;gap:10px}
.ff-view{--mh:62vh;position:relative;display:grid;place-items:center;min-height:min(64vh,460px);border-radius:20px;overflow:hidden}
@media (min-width:960px){.ff-view{--mh:76vh;min-height:min(76vh,680px)}}
.ff-view.fit{min-height:0}
.ff-fbox{position:relative;width:min(100%,calc(var(--mh) * var(--ar,.8)));aspect-ratio:var(--ar,.8)}
.ff-frame{--x:50%;position:absolute;inset:0;border-radius:20px;overflow:hidden;background:#12051d;touch-action:pan-y;user-select:none;-webkit-user-select:none}
.ff-frame canvas,.ff-frame svg.ff-g{position:absolute;inset:0;width:100%;height:100%;display:block}
.ff-frame .ff-after,.ff-frame .ff-ga{clip-path:inset(0 0 0 var(--x))}
.ff-frame .ff-gb{clip-path:inset(0 calc(100% - var(--x)) 0 0)}
.ff-g{pointer-events:none;overflow:hidden}
.ff.noguides .ff-g .gd,.ff.nospiral .ff-g .sp{opacity:0}
.ff-g g{transition:opacity .25s}
.ff-g .sq{fill:none;stroke:var(--ff-gold);stroke-width:.9;opacity:.45;vector-effect:non-scaling-stroke}
.ff-g .spl{fill:none;stroke:var(--ff-gold);stroke-width:2.2;vector-effect:non-scaling-stroke;stroke-linecap:round;stroke-linejoin:round}
.ff-g .sps{fill:none;stroke:rgba(20,6,31,.5);stroke-width:4.4;vector-effect:non-scaling-stroke;stroke-linecap:round;stroke-linejoin:round}
.ff-g .sh{fill:none;stroke:rgba(20,6,31,.55);stroke-width:3.2;vector-effect:non-scaling-stroke;stroke-linecap:round}
.ff-g .ln{fill:none;stroke:var(--ff-gold);stroke-width:1.3;opacity:.92;vector-effect:non-scaling-stroke;stroke-linecap:round}
.ff-g .dsh{stroke-dasharray:4 4}
.ff-g .dot{fill:var(--ff-gold);stroke:rgba(20,6,31,.6);stroke-width:1;vector-effect:non-scaling-stroke}
.ff-line{position:absolute;top:0;bottom:0;left:var(--x);width:2px;margin-left:-1px;background:#fff;box-shadow:0 0 0 1px rgba(31,10,48,.18)}
.ff-line::before{content:"";position:absolute;top:0;bottom:0;left:-27px;width:56px;touch-action:none}
.ff-knob{position:absolute;top:50%;left:var(--x);width:42px;height:42px;margin:-21px 0 0 -21px;border-radius:50%;background:#fff;color:var(--ff-plum);
  display:grid;place-items:center;box-shadow:0 10px 24px -8px rgba(20,6,31,.6);font-size:20px;cursor:ew-resize;touch-action:none}
.ff-frame:focus-visible{outline:2px solid var(--ff-lilac);outline-offset:3px}
.ff-tag{position:absolute;top:10px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;background:rgba(31,10,48,.62);color:#fff;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);pointer-events:none}
.ff-tag.l{left:10px}.ff-tag.r{right:10px}
.ff-tag.sim{top:auto;bottom:10px;left:10px;background:rgba(255,255,255,.9);color:var(--ff-plum)}
.ff-corners{position:absolute;inset:8px;pointer-events:none;opacity:.55;background-repeat:no-repeat;
  background:linear-gradient(var(--ff-gold),var(--ff-gold)) 0 0/18px 2px no-repeat,linear-gradient(var(--ff-gold),var(--ff-gold)) 0 0/2px 18px no-repeat,
  linear-gradient(var(--ff-gold),var(--ff-gold)) 100% 0/18px 2px no-repeat,linear-gradient(var(--ff-gold),var(--ff-gold)) 100% 0/2px 18px no-repeat,
  linear-gradient(var(--ff-gold),var(--ff-gold)) 0 100%/18px 2px no-repeat,linear-gradient(var(--ff-gold),var(--ff-gold)) 0 100%/2px 18px no-repeat,
  linear-gradient(var(--ff-gold),var(--ff-gold)) 100% 100%/18px 2px no-repeat,linear-gradient(var(--ff-gold),var(--ff-gold)) 100% 100%/2px 18px no-repeat}
.ff-empty,.ff-error{display:grid;justify-items:center;text-align:center;gap:12px;padding:28px 18px;max-width:440px}
.ff-big{width:64px;height:64px;border-radius:20px;display:grid;place-items:center;background:rgba(255,255,255,.07);border:1px solid rgba(201,179,221,.22);color:var(--ff-gold);font-size:30px}
.ff-error .ff-big{color:#fff;background:rgba(204,51,102,.22);border-color:rgba(204,51,102,.5)}
.ff-empty h3,.ff-error h3{margin:0;font-size:20px;font-weight:700;color:#fff;line-height:1.35}
.ff-empty p{margin:0;color:var(--ff-on-2);font-size:15px}
.ff-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.ff-cam{position:absolute;inset:0;background:#000;display:grid}
.ff-cam video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}
.ff-cam svg{position:absolute;left:50%;top:46%;height:78%;max-width:92%;transform:translate(-50%,-50%);overflow:visible}
.ff-cam svg *{fill:none;stroke:#fff;stroke-width:1.1;stroke-dasharray:3 2.2;vector-effect:non-scaling-stroke;opacity:.9}
.ff-cam p{position:absolute;top:12px;left:12px;right:12px;margin:0;text-align:center;font-size:14px;font-weight:700;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.6)}
.ff-cambar{position:absolute;left:0;right:0;bottom:16px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;padding:0 16px}
.ff-cambar>:first-child{justify-self:end}
.ff-shutter{width:68px;height:68px;border-radius:50%;background:#fff;color:var(--ff-plum);display:grid;place-items:center;font-size:26px;box-shadow:0 0 0 4px rgba(255,255,255,.35);transition:transform .16s var(--ff-ease)}
.ff-shutter:active{transform:scale(.94)}
.ff-busy{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:12px;background:rgba(31,10,48,.72);color:#fff;font-weight:700;z-index:5}
.ff-spin{width:40px;height:40px;border-radius:50%;border:3px solid rgba(255,255,255,.22);border-top-color:var(--ff-gold);animation:ff-spin .8s linear infinite}
@keyframes ff-spin{to{transform:rotate(360deg)}}
.ff-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:space-between;padding:2px 4px 2px 8px;min-height:44px}
.ff-bar{align-items:end;gap:10px 18px;padding:2px 8px 4px}
.ff-bar .ff-amt{flex:1 1 220px;color:#fff}
.ff-bar .ff-amt div{color:#fff}
.ff-bar .ff-amt output{color:var(--ff-gold)}
.ff .ff-bar input[type=range]{background:linear-gradient(90deg,var(--ff-gold) var(--v,70%),rgba(255,255,255,.2) var(--v,70%))}
.ff .ff-bar input[type=range]::-webkit-slider-thumb{border-color:var(--ff-gold-d)}
.ff-bar-r{display:flex;gap:8px;align-items:center;margin-bottom:6px}
@media (max-width:420px){.ff-hide-s{display:none}}
.ff-hint{margin:0;font-size:14.5px;color:var(--ff-ink-2)}
.ff-credit{margin:0;padding:0 8px 4px;font-size:12px;line-height:1.4;color:var(--ff-on-2)}
.ff .ff-sw-b{white-space:nowrap;display:inline-flex;align-items:center;gap:10px;height:38px;padding:0 10px 0 14px;border-radius:999px;border:1px solid rgba(201,179,221,.5);color:#fff;font-size:14px;font-weight:700}
.ff-sw{position:relative;flex:none;width:30px;height:18px;border-radius:999px;background:rgba(255,255,255,.2);transition:background-color .2s}
.ff-sw::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:transform .2s var(--ff-ease)}
[aria-checked=true]>.ff-sw{background:var(--ff-gold-d)}
[aria-checked=true]>.ff-sw::after{transform:translateX(12px)}
.ff .ff-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5em;height:44px;padding:0 18px;border-radius:999px;font-size:15px;font-weight:700;white-space:nowrap;
  transition:transform .16s var(--ff-ease),background-color .2s,color .2s,border-color .2s;text-decoration:none}
.ff .ff-btn:active{transform:scale(.97)}
.ff .ff-btn:disabled{opacity:.45;cursor:not-allowed;transform:none}
.ff .ff-btn.pri{background:var(--ff-plum);color:#fff;box-shadow:0 10px 24px -12px rgba(106,56,140,.8)}
.ff .ff-btn.pri:hover:not(:disabled){background:var(--ff-plum-7)}
.ff .ff-btn.lt{background:#fff;color:var(--ff-plum)}
.ff .ff-btn.gh{border:1px solid rgba(201,179,221,.5);color:#fff}
.ff .ff-btn.gh:hover{background:rgba(255,255,255,.08)}
.ff .ff-btn.ol{border:1px solid var(--ff-lilac-3);color:var(--ff-plum);background:#fff}
.ff .ff-btn.ol:hover:not(:disabled){background:var(--ff-lilac-1)}
.ff .ff-btn.sm{height:38px;padding:0 14px;font-size:14px}
.ff .ff-btn.wide{width:100%}
.ff-panel{min-width:0;background:#fff;border:1px solid var(--ff-lilac-2);border-radius:28px;padding:20px;display:grid;gap:22px}
@media (min-width:960px){.ff-panel{position:sticky;top:96px}}
.ff-sec{display:grid;gap:10px;min-width:0}
.ff-sec h3{margin:0;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--ff-plum);font-weight:700;display:flex;align-items:center;gap:8px}
.ff-sec h3 i{font-style:normal;width:22px;height:22px;border-radius:50%;background:var(--ff-lilac-1);display:grid;place-items:center;font-size:12px;letter-spacing:0}
.ff-sec>p{margin:0;font-size:15px;color:var(--ff-ink-2)}
.ff-src{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ff-src .ff-btn{padding:0 10px}
.ff-src .full{grid-column:1/-1}
.ff-priv{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--ff-ink-2);margin:0}
.ff-priv .ff-i{color:var(--ff-plum)}
.ff-warn{margin:0;display:flex;gap:8px;align-items:flex-start;font-size:14px;line-height:1.45;color:#7A4A00;background:#FFF6E0;border:1px solid #F0D9A0;border-radius:14px;padding:10px 12px}
.ff-warn .ff-i{margin-top:2px}
/* proportion rows */
.ff-rows{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.ff-r{display:grid;gap:8px;padding:12px 14px;border-radius:18px;border:1px solid var(--ff-lilac-2);background:#fff;transition:border-color .2s,background-color .2s}
.ff-r.on{border-color:var(--ff-lilac-3);background:var(--ff-wash)}
.ff-r.gold{background:linear-gradient(135deg,#FFFBF0,#FFF4DC);border-color:#EAD5A2}
.ff-rh{display:flex;align-items:center;gap:10px;min-width:0}
.ff-rh b{font-size:15.5px;line-height:1.3;flex:1;min-width:0}
.ff-rh .ff-tg{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--ff-plum);padding:4px 6px 4px 10px;border-radius:999px;min-height:36px}
.ff-rh .ff-tg:focus-visible{outline:2px solid var(--ff-lilac);outline-offset:2px}
.ff-tg .ff-sw{background:var(--ff-lilac-2)}
.ff-tg[aria-checked=true] .ff-sw{background:var(--ff-plum)}
.ff-r p{margin:0;font-size:13.5px;line-height:1.45;color:var(--ff-ink-2)}
.ff-meter{position:relative;height:22px;margin:2px 4px}
.ff-meter::before{content:"";position:absolute;left:0;right:0;top:10px;height:3px;border-radius:3px;background:linear-gradient(90deg,var(--ff-lilac-2),#F2DFAE 42%,var(--ff-gold) 50%,#F2DFAE 58%,var(--ff-lilac-2))}
.ff-meter .ideal{position:absolute;left:50%;top:3px;width:2px;height:17px;margin-left:-1px;background:var(--ff-gold-d);border-radius:2px}
.ff-meter .mk{position:absolute;top:5px;width:13px;height:13px;margin-left:-6.5px;border-radius:50%;transition:left .35s var(--ff-ease)}
.ff-meter .mk.b{background:#fff;border:2px solid var(--ff-ink-3)}
.ff-meter .mk.a{background:var(--ff-plum);border:2px solid #fff;box-shadow:0 0 0 1px var(--ff-plum)}
.ff-nums{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:13px;color:var(--ff-ink-2);font-variant-numeric:tabular-nums}
.ff-nums b{color:var(--ff-ink);font-weight:700}
.ff-nums .a b{color:var(--ff-plum)}
.ff-nums .ok{color:var(--ff-gold-d);font-weight:700}
.ff-svc{font-size:13px;font-weight:700;color:var(--ff-plum);text-decoration:none;display:inline-flex;align-items:center;gap:4px}
.ff-svc:hover{text-decoration:underline}
.ff-seg{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:999px;background:var(--ff-lilac-1)}
.ff-seg button{min-height:40px;border-radius:999px;font-weight:700;font-size:14.5px;color:var(--ff-plum);transition:background-color .2s,color .2s}
.ff-seg button[aria-pressed=true]{background:var(--ff-plum);color:#fff;box-shadow:0 8px 18px -10px rgba(106,56,140,.8)}
.ff-seg button:focus-visible{outline:2px solid var(--ff-lilac);outline-offset:2px}
.ff-lab{font-size:14px;font-weight:700;color:var(--ff-ink)}
.ff-amt{display:grid;gap:6px}
.ff-amt div{display:flex;justify-content:space-between;font-size:14px;font-weight:700;color:var(--ff-ink)}
.ff-amt output{color:var(--ff-plum);font-variant-numeric:tabular-nums}
.ff input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:6px;margin:10px 0;
  background:linear-gradient(90deg,var(--ff-plum) var(--v,70%),var(--ff-lilac-2) var(--v,70%));outline-offset:8px}
.ff input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:26px;height:26px;border-radius:50%;background:#fff;border:2px solid var(--ff-plum);box-shadow:0 6px 16px -6px rgba(74,22,104,.5);cursor:pointer}
.ff input[type=range]::-moz-range-thumb{width:24px;height:24px;border-radius:50%;background:#fff;border:2px solid var(--ff-plum);cursor:pointer}
.ff-note{margin:0;font-size:13px;line-height:1.45;color:var(--ff-ink-3)}
.ff-saves{display:grid;gap:8px}
.ff-err{margin:0;font-size:14px;color:#CC3366}
.ff-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 16px;padding:14px 18px;border-radius:20px;background:var(--ff-wash);border:1px solid var(--ff-lilac-2)}
.ff-foot p{margin:0;font-size:15px;color:var(--ff-ink-2)}
@media (prefers-reduced-motion:reduce){.ff *{transition:none!important;animation-duration:1.6s!important}}

@media (max-width:959px){.ff-props{order:2}}
.ff-tot{display:grid;gap:14px;padding:18px 20px;border-radius:22px;background:linear-gradient(135deg,#FFFBF0,#FFF0CF);border:1px solid #EAD5A2}
.ff-tot-h{display:flex;align-items:flex-start;justify-content:space-between;gap:12px 20px;flex-wrap:wrap}
.ff-tot-h b{font-size:17px}
.ff-tot-h p{margin:2px 0 0;font-size:13.5px;line-height:1.45;color:var(--ff-ink-2);max-width:44ch}
.ff-ml{font-size:40px;font-weight:700;line-height:1;color:var(--ff-gold-d);font-variant-numeric:tabular-nums;white-space:nowrap}
.ff-ml small{font-size:17px;margin-left:4px}
.ff-kpis{display:flex;flex-wrap:wrap;gap:8px}
.ff-kpis span{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 14px;border-radius:999px;background:#fff;border:1px solid #EAD5A2;font-size:14px;font-weight:700;color:var(--ff-ink)}
.ff-kpis .ff-i{color:var(--ff-gold-d)}
.ff-kpis em{font-style:normal;font-weight:400;color:var(--ff-ink-2)}
.ff-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
@media (min-width:700px){.ff-list{grid-template-columns:1fr 1fr}}
.ff-area{padding:12px 14px;border-radius:18px;border:1px solid var(--ff-lilac-2);background:#fff;display:grid;gap:8px;align-content:start}
.ff-area-h{display:flex;align-items:center;gap:10px}
.ff-area-h b{flex:1;font-size:15.5px;line-height:1.3}
.ff-area-h span{font-weight:700;color:var(--ff-plum);font-variant-numeric:tabular-nums;white-space:nowrap}
.ff-dot{width:10px;height:10px;border-radius:50%;flex:none;box-shadow:0 0 0 2px #fff,0 0 0 3px rgba(31,10,48,.18)}
.ff-fx{margin:0;font-size:14px;line-height:1.45;color:var(--ff-ink-2)}
.ff-tags{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:5px}
.ff-tags li{font-size:12.5px;line-height:1.3;padding:4px 10px;border-radius:999px;background:var(--ff-lilac-1);color:var(--ff-plum-7)}
.ff-none{margin:0;padding:18px;border-radius:18px;border:1px dashed var(--ff-lilac-3);color:var(--ff-ink-2);font-size:15px;text-align:center}
.ff-ref{display:flex;gap:10px;align-items:flex-start;margin:0;font-size:13px;line-height:1.5;color:var(--ff-ink-3)}
.ff-ref .ff-i{color:var(--ff-plum);margin-top:2px}
.ff-ref a{color:var(--ff-plum)}
.ff-step{display:grid;gap:8px}
.ff-step+.ff-step{margin-top:6px}
.ff-step-h{display:flex;align-items:baseline;gap:8px;font-size:13px;font-weight:700;color:var(--ff-ink)}
.ff-step-h small{font-weight:400;color:var(--ff-ink-3);font-size:12.5px}
.ff-chips{display:flex;flex-wrap:wrap;gap:6px}
.ff .ff-chip{display:inline-flex;align-items:center;gap:7px;min-height:38px;padding:6px 14px 6px 10px;border-radius:999px;border:1px solid var(--ff-lilac-3);background:#fff;font-size:14px;font-weight:700;color:var(--ff-ink-2);text-align:left;line-height:1.25;transition:background-color .2s,border-color .2s,color .2s}
.ff .ff-chip .ff-dot{width:9px;height:9px;opacity:.35;transition:opacity .2s}
.ff .ff-chip[aria-pressed=true]{background:var(--ff-plum);border-color:var(--ff-plum);color:#fff}
.ff .ff-chip[aria-pressed=true] .ff-dot{opacity:1;box-shadow:0 0 0 2px var(--ff-plum),0 0 0 3px rgba(255,255,255,.5)}
.ff .ff-chip:hover:not([aria-pressed=true]){background:var(--ff-lilac-1)}
.ff .ff-chip:focus-visible{outline:2px solid var(--ff-lilac);outline-offset:2px}
.ff-deep{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:14px;background:var(--ff-wash);border:1px solid var(--ff-lilac-2)}
.ff-deep span{font-size:13.5px;color:var(--ff-ink-2);line-height:1.4}
.ff-deep b{display:block;color:var(--ff-ink);font-size:14px}
.ff-deep .ff-tg{display:inline-flex;align-items:center;min-height:36px;padding:0 4px}
.ff-tg .ff-sw{background:var(--ff-lilac-2)}
.ff-tg[aria-checked=true] .ff-sw{background:var(--ff-plum)}
.ff-g .pt{stroke:rgba(20,6,31,.65);stroke-width:1.2;vector-effect:non-scaling-stroke}
.ff-g .halo{fill:none;stroke:#fff;stroke-width:1;opacity:.6;vector-effect:non-scaling-stroke}
.ff.nopoints .ff-g{opacity:0}
.ff-g{transition:opacity .25s}
`;

/* ---------- where each code sits on this face ---------- */
function geom(L){
  const F = frame(L), cx = V.mid(L[234], L[454]), W = V.dist(L[234], L[454]);
  return {...F, cx, W};
}
// every injection point of a code: {p, side (-1 right, 1 left, 0 centre), part}
function pointsOf(k, L, G){
  const d = CODES[k], out = [];
  d.at.forEach((a, part) => {
    if (a.length === 1) { out.push({p:L[a[0]], side:0, part}); return; }
    [a[0], a[1]].forEach((i, s) => {
      const side = s ? 1 : -1;
      let p = L[i];
      if (a[2]) p = V.add(p, V.mul(G.v, side * a[2] * G.W));
      out.push({p, side, part});
    });
  });
  return out;
}

/* ---------- the simulation: skin moves for volume, shadows lift where hollows fill ---------- */
const MOVE_R = .075;   // how far a moved point pulls the skin around it, share of face width
const MOVE_K = 1.3, FILL_R = 1.9;   // overall strength of the moves and size of the lifted shadows
function effects(L, plan){
  const G = geom(L), D = new Float64Array(L.length * 2), fills = [], lits = [];
  for (const x of plan.list) {
    const d = CODES[x.k], k = clamp(x.vol / d.vol || 1, .5, 1.6), parts = d.parts || 1;
    for (const q of pointsOf(x.k, L, G)) {
      const fx = d.fx;
      if (fx.mv) {
        const u = Array.isArray(fx.mv.u) ? fx.mv.u[q.part] : (fx.mv.u || 0), v = fx.mv.v || 0;
        const out = q.side ? q.side : 0;
        const dv = V.add(V.mul(G.u, u * MOVE_K * G.W * k), V.mul(G.v, out * v * MOVE_K * G.W * k));
        const R = MOVE_R * G.W;
        for (let i = 0; i < 468; i++) {
          const r = V.dist(L[i], q.p);
          if (r > R) continue;
          const w = 1 - smooth(0, 1, r / R);
          D[i * 2] += dv.x * w; D[i * 2 + 1] += dv.y * w;
        }
      }
      if (fx.fill) fills.push({p:q.p, r:fx.fill * FILL_R * G.W * Math.sqrt(k), k:Math.min(1, .6 + .3 * k)});
      if (fx.lit) lits.push({p:q.p, r:fx.lit * 1.5 * G.W, k:.5 + .3 * k});
    }
  }
  // the warp moves the face mesh points; every unmoved point holds still so the change stays local
  const pts = [];
  for (let i = 0; i < 468; i++) pts.push({i, p:L[i], d:{x:D[i * 2], y:D[i * 2 + 1]}});
  const fc = V.mid(L[10], L[152]), R = G.W * .62, H = V.dist(L[10], L[152]) * .66;
  for (let j = 0; j < 28; j++) {
    const a = j / 28 * Math.PI * 2;
    pts.push({i:-1, p:V.add(fc, V.add(V.mul(G.v, Math.cos(a) * R * 1.32), V.mul(G.u, Math.sin(a) * H * 1.3))), d:{x:0, y:0}});
  }
  const ell = {c:V.add(fc, V.mul(G.u, .06 * H)), a:G.v, ra:R * 1.5, b:G.u, rb:H * 1.48};
  return {warp:{pts, ell}, fills, lits, G};
}

/* a blurred copy of the brightness, a quarter of the size: what a hollow is lifted toward */
function blurLum(img, rad){
  const W = img.width, H = img.height, s = 4, w = Math.ceil(W / s), h = Math.ceil(H / s), S = img.data;
  let a = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (Math.min(H - 1, y * s) * W + Math.min(W - 1, x * s)) * 4;
    a[y * w + x] = .299 * S[o] + .587 * S[o + 1] + .114 * S[o + 2];
  }
  const r = Math.max(1, Math.round(rad / s)), b = new Float32Array(w * h);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++) { let acc = 0, n = 0; for (let x = -r; x < w + r; x++) { if (x + r < w) { acc += a[y * w + x + r]; n++; } if (x - r - 1 >= 0) { acc -= a[y * w + x - r - 1]; n--; } if (x >= 0 && x < w) b[y * w + x] = acc / n; } }
    for (let x = 0; x < w; x++) { let acc = 0, n = 0; for (let y = -r; y < h + r; y++) { if (y + r < h) { acc += b[(y + r) * w + x]; n++; } if (y - r - 1 >= 0) { acc -= b[(y - r - 1) * w + x]; n--; } if (y >= 0 && y < h) a[y * w + x] = acc / n; } }
  }
  return {a, w, h, s};
}
function shade(ctx, W, H, E){
  if (!E.fills.length && !E.lits.length) return;
  const img = ctx.getImageData(0, 0, W, H), P = img.data, B = blurLum(img, E.G.W * .09);
  const at = (x, y) => B.a[Math.min(B.h - 1, (y / B.s) | 0) * B.w + Math.min(B.w - 1, (x / B.s) | 0)];
  const spot = (s, fn) => {
    const x0 = Math.max(0, Math.floor(s.p.x - s.r)), x1 = Math.min(W - 1, Math.ceil(s.p.x + s.r));
    const y0 = Math.max(0, Math.floor(s.p.y - s.r)), y1 = Math.min(H - 1, Math.ceil(s.p.y + s.r));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const r = Math.hypot(x - s.p.x, y - s.p.y) / s.r;
      if (r >= 1) continue;
      fn((y * W + x) * 4, (1 - smooth(.25, 1, r)) * s.k, x, y);
    }
  };
  for (const s of E.fills) spot(s, (o, w, x, y) => {
    const Y = .299 * P[o] + .587 * P[o + 1] + .114 * P[o + 2], t = at(x, y) * 1.02;
    if (Y >= t || Y < 1) return;
    const m = (Y + (t - Y) * w * .9) / Y;
    P[o] = Math.min(255, P[o] * m); P[o + 1] = Math.min(255, P[o + 1] * m); P[o + 2] = Math.min(255, P[o + 2] * m);
  });
  for (const s of E.lits) spot(s, (o, w) => {
    const m = 1 + .08 * w;
    P[o] = Math.min(255, P[o] * m); P[o + 1] = Math.min(255, P[o + 1] * m); P[o + 2] = Math.min(255, P[o + 2] * m);
  });
  ctx.putImageData(img, 0, 0);
}
function render(base, data, L, plan, out, grid){
  const g = out.getContext('2d', {willReadFrequently:true});
  g.drawImage(base, 0, 0);
  if (!plan.list.length) return null;
  const E = effects(L, plan);
  warpInto(data, out, E.warp, grid);
  shade(g, out.width, out.height, E);
  return E;
}
function drawPoints(svg, L, plan, W, H){
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const G = geom(L), r = Math.max(3, G.W * .011);
  svg.innerHTML = plan.list.map(x => pointsOf(x.k, L, G).map(q => `<circle class="pt" cx="${q.p.x.toFixed(1)}" cy="${q.p.y.toFixed(1)}" r="${r.toFixed(1)}" fill="${STEP_C[x.step]}"/>`).join('')).join('');
}

/* ===================================================================== */
let styleRefs = 0, styleEl = null;

export function mount(container, opts = {}){
  const lang = opts.lang === 'th' ? 'th' : 'en', S = STR[lang];
  const mpBase = opts.mpBase || MP_CDN, sampleSrc = opts.sample || SAMPLE;
  const emit = (n, d) => { try { opts.onEvent && opts.onEvent(n, d); } catch (e) {} };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c]));
  const n2 = x => (Math.round(x * 100) / 100).toLocaleString(lang === 'th' ? 'th-TH' : 'en-GB', {maximumFractionDigits:2});
  const plural = (w, n) => Array.isArray(w) ? w[n === 1 ? 0 : 1] : w;
  if (!styleRefs++) { styleEl = document.createElement('style'); styleEl.dataset.feature = 'filler'; styleEl.textContent = CSS; document.head.append(styleEl); }

  const state = {base:null, data:null, L:null, sample:false, err:null, stream:null, on:new Set(['cheeks']), deep:false, points:true, planned:false};
  try {
    const p = JSON.parse(localStorage.getItem('apex.filler') || 'null');
    if (p) { if (Array.isArray(p.on)) state.on = new Set(p.on.filter(k => CONCERNS.some(c => c.k === k))); state.deep = !!p.deep; if (p.points === false) state.points = false; }
  } catch (e) {}
  const remember = () => { try { localStorage.setItem('apex.filler', JSON.stringify({on:[...state.on], deep:state.deep, points:state.points})); } catch (e) {} };

  const chip = c => `<button type="button" class="ff-chip" data-c="${c.k}" aria-pressed="false"><span class="ff-dot" style="background:${STEP_C[c.step]}"></span>${esc(S.c[c.k])}</button>`;
  const root = document.createElement('div');
  root.className = 'ff'; root.lang = lang;
  root.innerHTML = `
  <div class="ff-main">
    <section class="ff-stage" aria-label="${esc(S.compare)}">
      <div class="ff-view">
        <div class="ff-empty">
          <span class="ff-big">${ic('face')}</span>
          <h3>${esc(S.emptyH)}</h3><p>${esc(S.hint)}</p>
          <div class="ff-row">
            <button class="ff-btn lt" data-act="take">${ic('camera')}${esc(S.take)}</button>
            <button class="ff-btn gh" data-act="choose">${ic('upload')}${esc(S.choose)}</button>
            <button class="ff-btn gh" data-act="sample">${ic('image')}${esc(S.sample)}</button>
          </div>
        </div>
        <div class="ff-error" hidden>
          <span class="ff-big">${ic('alert')}</span><h3 data-r="emsg"></h3>
          <div class="ff-row">
            <button class="ff-btn lt" data-act="take">${ic('camera')}${esc(S.take)}</button>
            <button class="ff-btn gh" data-act="choose">${ic('upload')}${esc(S.choose)}</button>
            <button class="ff-btn gh" data-act="sample">${ic('image')}${esc(S.sample)}</button>
          </div>
        </div>
        <div class="ff-fbox" hidden>
          <div class="ff-frame" tabindex="0" role="slider" aria-label="${esc(S.compare)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">
            <canvas class="ff-before"></canvas><canvas class="ff-after"></canvas>
            <svg class="ff-g ff-ga" aria-hidden="true"></svg>
            <span class="ff-corners"></span>
            <span class="ff-line"></span><span class="ff-knob">${ic('move')}</span>
            <span class="ff-tag l">${esc(S.before)}</span><span class="ff-tag r">${esc(S.after)}</span><span class="ff-tag sim">${esc(S.sim)}</span>
          </div>
        </div>
        <div class="ff-cam" hidden>
          <video playsinline muted autoplay></video>
          <svg viewBox="0 0 100 130" aria-hidden="true"><ellipse cx="50" cy="60" rx="27" ry="36"/></svg>
          <p>${esc(S.camHint)}</p>
          <div class="ff-cambar">
            <button class="ff-btn gh sm" data-act="camcancel">${esc(S.cancel)}</button>
            <button class="ff-shutter" data-act="shutter" aria-label="${esc(S.shutter)}">${ic('camera')}</button><span></span>
          </div>
        </div>
        <div class="ff-busy" hidden><span class="ff-spin"></span><span>${esc(S.busy)}</span></div>
      </div>
      <div class="ff-bar" hidden>
        <span></span>
        <div class="ff-bar-r">
          <button class="ff-sw-b" data-act="points" role="switch" aria-checked="true">${esc(S.points)}<span class="ff-sw" aria-hidden="true"></span></button>
          <button class="ff-btn gh sm" data-act="choose" aria-label="${esc(S.choose)}">${ic('upload')}<span class="ff-hide-s">${esc(S.change)}</span></button>
        </div>
      </div>
      <p class="ff-credit" hidden>${esc(S.credit)}</p>
    </section>
    <section class="ff-props" aria-live="polite">
      <div class="ff-tot">
        <div class="ff-tot-h"><div><b>${esc(S.total)}</b><p>${esc(S.totalP)}</p></div><div class="ff-ml"><span data-r="ml">0</span><small>${esc(S.ml)}</small></div></div>
        <div class="ff-kpis" data-r="kpis"></div>
      </div>
      <div data-r="areas"></div>
      <p class="ff-ref">${ic('book')}<span>${esc(S.ref)} <a href="${REF}" target="_blank" rel="noopener">${esc(S.refLink)}</a></span></p>
    </section>
    <aside class="ff-panel">
      <div class="ff-sec">
        <h3><i>1</i>${esc(S.concerns)}</h3>
        <p>${esc(S.concernsP)}</p>
        ${STEPS.map(st => `<div class="ff-step"><div class="ff-step-h">${esc(S.step[st])}<small>${esc(S.stepP[st])}</small></div>
          <div class="ff-chips">${CONCERNS.filter(c => c.step === st).map(chip).join('')}</div></div>`).join('')}
        <div class="ff-deep" data-r="deep" hidden><span><b>${esc(S.deep)}</b>${esc(S.deepP)}</span>
          <button class="ff-tg" data-act="deep" role="switch" aria-checked="false" aria-label="${esc(S.deep)}"><span class="ff-sw" aria-hidden="true"></span></button></div>
      </div>
      <div class="ff-sec">
        <h3><i>2</i>${esc(S.photo)}</h3>
        <div class="ff-src">
          <button class="ff-btn pri" data-act="take">${ic('camera')}${esc(S.take)}</button>
          <button class="ff-btn ol" data-act="choose">${ic('upload')}${esc(S.choose)}</button>
          <button class="ff-btn ol full" data-act="sample">${ic('image')}${esc(S.sample)}</button>
        </div>
        <p class="ff-priv">${ic('shield')}${esc(S.privacy)}</p>
      </div>
      <div class="ff-sec">
        <h3><i>3</i>${esc(S.save)}</h3>
        <div class="ff-saves">
          <button class="ff-btn pri wide" data-act="save" disabled>${ic('download')}${esc(S.saveBtn)}</button>
          <button class="ff-btn ol wide" data-act="plan">${ic('plus')}<span>${esc(S.plan)}</span></button>
          <a class="ff-btn ol wide" href="consult.html">${ic('msg')}${esc(S.consult)}</a>
        </div>
        <p class="ff-err" data-r="saveerr" hidden></p>
      </div>
    </aside>
  </div>
  <div class="ff-foot"><p>${esc(S.vary)}</p></div>
  <input type="file" accept="image/*" hidden>`;
  container.append(root);

  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)], R = k => root.querySelector(`[data-r="${k}"]`);
  const view = $('.ff-view'), fbox = $('.ff-fbox'), frameEl = $('.ff-frame'), cvB = $('.ff-before'), cvA = $('.ff-after');
  const gA = $('.ff-ga'), empty = $('.ff-empty'), errBox = $('.ff-error'), cam = $('.ff-cam'), video = $('video'), busy = $('.ff-busy');
  const bar = $('.ff-bar'), file = $('input[type=file]');
  const has = () => !!(state.base && state.L);
  const curPlan = () => planFor([...state.on], state.deep);

  /* ---------- drawing ---------- */
  let rq = 0;
  function draw(){
    if (rq) return;
    rq = requestAnimationFrame(() => {
      rq = 0;
      const P = curPlan();
      panel(P);
      if (!has()) return;
      render(state.base, state.data, state.L, P, cvA, 4);
      drawPoints(gA, state.L, P, cvA.width, cvA.height);
    });
  }
  function showPhoto(){
    const W = state.base.width, H = state.base.height;
    cvB.width = cvA.width = W; cvB.height = cvA.height = H;
    cvB.getContext('2d').drawImage(state.base, 0, 0);
    cvA.getContext('2d').drawImage(state.base, 0, 0);
    view.style.setProperty('--ar', (W / H).toFixed(4));
    setX(50);
  }

  /* ---------- the plan ---------- */
  function panel(P){
    R('ml').textContent = n2(P.total);
    R('kpis').innerHTML = P.list.length ? `<span>${ic('drop')}${P.syringes} ${esc(plural(S.syr, P.syringes))}</span>`
      + `<span>${ic('check')}${P.sessions} ${esc(plural(S.ses, P.sessions))} <em>· ${esc(S.sesP.replace('{n}', PER_SESSION))}</em></span>` : '';
    R('areas').innerHTML = P.list.length ? `<ul class="ff-list">${CONCERNS.filter(c => P.byConcern[c.k]).map(c => {
      const b = P.byConcern[c.k];
      return `<li class="ff-area"><div class="ff-area-h"><span class="ff-dot" style="background:${STEP_C[c.step]}"></span><b>${esc(S.c[c.k])}</b><span>${n2(b.total)} ${esc(S.ml)}</span></div>
        <p class="ff-fx">${esc(S.fx[c.k])}</p>
        <ul class="ff-tags">${b.codes.map(x => `<li>${esc(S.a[x.k])}</li>`).join('')}</ul></li>`;
    }).join('')}</ul>` : `<p class="ff-none">${esc(S.none)}</p>`;
  }
  function sync(){
    const ready = has(), camOn = !!state.stream;
    cam.hidden = !camOn;
    errBox.hidden = camOn || !state.err;
    empty.hidden = camOn || ready || !!state.err;
    fbox.hidden = camOn || !ready || !!state.err;
    view.classList.toggle('fit', !fbox.hidden);
    bar.hidden = !(ready && !camOn && !state.err);
    $('.ff-credit').hidden = !(ready && state.sample && !camOn && !state.err);
    R('emsg').textContent = state.err ? S.err[state.err] || '' : '';
    $$('[data-c]').forEach(b => b.setAttribute('aria-pressed', String(state.on.has(b.dataset.c))));
    R('deep').hidden = !state.on.has('folds');
    $('[data-act="deep"]').setAttribute('aria-checked', String(state.deep));
    $('[data-act="points"]').setAttribute('aria-checked', String(state.points));
    root.classList.toggle('nopoints', !state.points);
    $('[data-act="save"]').disabled = !ready;
    const pl = $('[data-act="plan"]');
    pl.innerHTML = (state.planned ? ic('check') : ic('plus')) + `<span>${esc(state.planned ? S.planned : S.plan)}</span>`;
  }
  const setBusy = on => { busy.hidden = !on; };

  /* ---------- compare slider ---------- */
  let sx = 50, gest = null;
  const local = e => { const r = frameEl.getBoundingClientRect(); return {x:(e.clientX - r.left) / r.width, w:r.width}; };
  const setX = x => { sx = clamp(x, 0, 100); frameEl.style.setProperty('--x', sx + '%'); frameEl.setAttribute('aria-valuenow', Math.round(sx)); };
  frameEl.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const l = local(e), near = Math.abs(l.x * 100 - sx) * l.w / 100 < 44 || !!e.target.closest('.ff-knob');
    gest = {id:e.pointerId, x:e.clientX, y:e.clientY, on:e.pointerType === 'mouse' || near};
    if (gest.on) { try { frameEl.setPointerCapture(e.pointerId); } catch (er) {} setX(l.x * 100); }
  });
  frameEl.addEventListener('pointermove', e => {
    if (!gest || e.pointerId !== gest.id) return;
    if (!gest.on) {
      const dx = Math.abs(e.clientX - gest.x), dy = Math.abs(e.clientY - gest.y);
      if (dx > 4 && dx >= dy * .75) { gest.on = true; try { frameEl.setPointerCapture(e.pointerId); } catch (er) {} } else if (dy > 12 && dy > dx * 1.5) { gest = null; return; } else return;
    }
    setX(local(e).x * 100);
  });
  const endG = (e, up) => { if (!gest || e.pointerId !== gest.id) return; if (up && !gest.on) setX(local(e).x * 100); gest = null; };
  frameEl.addEventListener('pointerup', e => endG(e, true));
  frameEl.addEventListener('pointercancel', e => endG(e, false));
  frameEl.addEventListener('keydown', e => { const d = {ArrowLeft:-5, ArrowRight:5}[e.key]; if (d) { e.preventDefault(); setX(sx + d); } });

  /* ---------- photos ---------- */
  async function usePhoto(canvas, sample){
    stopCam();
    state.err = null; setBusy(true); sync();
    let hit = null, err = null;
    try { hit = await find(mpBase, canvas); } catch (e) { err = 'model'; }
    setBusy(false);
    if (!hit) { Object.assign(state, {base:null, L:null, data:null, sample:false, err:err || 'noFace'}); emit('filler:error', {error:state.err}); sync(); return; }
    const f = frameFace(hit.canvas, hit.lm);
    Object.assign(state, {base:f.base, L:f.L, sample:!!sample, err:null, data:f.base.getContext('2d', {willReadFrequently:true}).getImageData(0, 0, f.base.width, f.base.height)});
    showPhoto(); sync(); draw();
    emit('filler:photo', {sample:!!sample});
  }
  async function useFile(f){
    if (!f) return;
    if (!/^image\//.test(f.type)) { state.err = 'read'; state.base = null; sync(); return; }
    const url = URL.createObjectURL(f);
    try { const im = await loadImage(url); await usePhoto(toCanvas(im)); }
    catch (e) { Object.assign(state, {err:'read', base:null, L:null}); setBusy(false); sync(); }
    URL.revokeObjectURL(url);
  }
  let loadingSample = false;
  async function useSample(){
    if (loadingSample) return;
    loadingSample = true; setBusy(true);
    try { const im = await loadImage(sampleSrc); await usePhoto(toCanvas(im), true); emit('filler:sample', {}); }
    catch (e) { setBusy(false); Object.assign(state, {err:'sample', base:null, L:null}); sync(); }
    finally { loadingSample = false; }
  }
  async function startCam(){
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('no camera');
      state.stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user', width:{ideal:1280}, height:{ideal:1280}}, audio:false});
      video.srcObject = state.stream; state.err = null; sync();
      await video.play().catch(() => {});
    } catch (e) { stopCam(); Object.assign(state, {err:'camera', base:null, L:null}); sync(); }
  }
  function stopCam(){ if (state.stream) { state.stream.getTracks().forEach(t => t.stop()); state.stream = null; } video.srcObject = null; }
  function shoot(){
    if (!video.videoWidth) return;
    const c = document.createElement('canvas'); c.width = video.videoWidth; c.height = video.videoHeight;
    const x = c.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(video, 0, 0);
    usePhoto(toCanvas(c));
  }

  /* ---------- save: before and after with the areas and amounts underneath ---------- */
  async function save(){
    const err = R('saveerr'); err.hidden = true;
    if (!has()) return;
    try {
      const P = curPlan(), font = getComputedStyle(root).fontFamily;
      try { await document.fonts.load(`700 20px ${font}`); } catch (e) {}
      const rowH = 760, w = Math.round(state.base.width * rowH / state.base.height), gap = 12, pad = 32;
      const after = document.createElement('canvas'); after.width = state.base.width; after.height = state.base.height;
      render(state.base, state.data, state.L, P, after, 3);
      const rows = CONCERNS.filter(c => P.byConcern[c.k]);
      const W = w * 2 + gap + pad * 2, H = pad + rowH + 30 + (rows.length + 1) * 44 + 110;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      g.fillStyle = '#1F0A30'; g.fillRect(0, 0, W, H);
      const clip = (x, img) => { g.save(); g.beginPath(); g.roundRect ? g.roundRect(x, pad, w, rowH, 20) : g.rect(x, pad, w, rowH); g.clip(); g.drawImage(img, x, pad, w, rowH); g.restore(); };
      clip(pad, state.base); clip(pad + w + gap, after);
      const pill = (t, x, y, bg, fg) => { g.font = `700 20px ${font}`; const tw = g.measureText(t).width + 24; g.fillStyle = bg; g.beginPath(); g.roundRect ? g.roundRect(x, y, tw, 34, 17) : g.rect(x, y, tw, 34); g.fill(); g.fillStyle = fg; g.textBaseline = 'middle'; g.fillText(t, x + 12, y + 18); };
      pill(S.before, pad + 12, pad + 12, 'rgba(31,10,48,.7)', '#fff');
      pill(S.after, pad + w + gap + 12, pad + 12, 'rgba(31,10,48,.7)', '#fff');
      pill(S.sim, pad + w + gap + 12, pad + rowH - 46, 'rgba(255,255,255,.9)', '#6A388C');
      let y = pad + rowH + 50;
      g.textBaseline = 'alphabetic';
      g.font = `700 26px ${font}`; g.fillStyle = '#E3B85C'; g.fillText(S.total, pad, y);
      const mt = `${n2(P.total)} ${S.ml} · ${P.syringes} ${plural(S.syr, P.syringes)}`;
      g.fillText(mt, W - pad - g.measureText(mt).width, y);
      y += 44;
      for (const r of rows) {
        g.font = `700 24px ${font}`; g.fillStyle = '#fff'; g.fillText(S.c[r.k], pad, y);
        g.font = `400 22px ${font}`; g.fillStyle = '#CDB9DD';
        const txt = `${n2(P.byConcern[r.k].total)} ${S.ml}`;
        g.fillText(txt, W - pad - g.measureText(txt).width, y);
        y += 44;
      }
      g.font = `400 18px ${font}`; g.fillStyle = '#CDB9DD';
      g.fillText(S.refLink, pad, H - 60);
      g.font = `400 20px ${font}`;
      g.fillText(S.vary, pad, H - 28);
      const bw = g.measureText(S.brand).width; g.fillText(S.brand, W - pad - bw, H - 28);
      const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', .9));
      if (!blob) throw new Error('blob');
      const name = 'apex-filler-simulation.jpg', fl = new File([blob], name, {type:'image/jpeg'});
      let shared = false;
      if (navigator.canShare && navigator.share) {
        try { if (navigator.canShare({files:[fl]})) { await navigator.share({files:[fl], title:S.brand}); shared = true; } }
        catch (e) { if (e && e.name === 'AbortError') shared = true; }
      }
      if (!shared) {
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
        document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
      emit('filler:saved', {on:[...state.on], total:P.total});
    } catch (e) { err.textContent = S.err.save; err.hidden = false; }
  }

  /* ---------- events ---------- */
  function onClick(e){
    const cb = e.target.closest('[data-c]');
    if (cb) { const k = cb.dataset.c; state.on.has(k) ? state.on.delete(k) : state.on.add(k); remember(); emit('filler:concern', {concern:k, on:state.on.has(k)}); sync(); draw(); return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'take') startCam();
    else if (a === 'choose') file.click();
    else if (a === 'sample') useSample();
    else if (a === 'camcancel') { stopCam(); sync(); }
    else if (a === 'shutter') shoot();
    else if (a === 'points') { state.points = !state.points; remember(); sync(); }
    else if (a === 'deep') { state.deep = !state.deep; remember(); sync(); draw(); }
    else if (a === 'save') save();
    else if (a === 'plan') { state.planned = true; emit('plan:add', {procedure:'consult', source:'filler', concerns:[...state.on], ml:curPlan().total}); sync(); }
  }
  root.addEventListener('click', onClick);
  file.addEventListener('change', () => { const f = file.files[0]; file.value = ''; useFile(f); });
  view.addEventListener('dragover', e => e.preventDefault());
  view.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) useFile(f); });

  sync(); draw();
  const idle = setTimeout(() => loadMesh(mpBase).catch(() => {}), 2500);
  return {
    destroy(){
      clearTimeout(idle); cancelAnimationFrame(rq); stopCam();
      root.removeEventListener('click', onClick); root.remove();
      if (!--styleRefs && styleEl) { styleEl.remove(); styleEl = null; }
    },
    _state:state, _plan:curPlan,
  };
}
