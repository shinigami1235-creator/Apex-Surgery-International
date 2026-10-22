/* Golden Proportions
   A visitor takes or chooses a front photo. The face is measured against classic proportions and the photo is
   warped toward them, changing only what treatment can change: chin length, nose width, lip fullness and the jawline.
   Everything runs in the browser. No photo leaves the device.

   mount(container, opts) -> {destroy()}
   opts: lang 'en' | 'th', base (assets/ URL), serviceUrl(key), onEvent(name, data)
   Testing only: mpBase (folder of @mediapipe/face_mesh), sample (photo URL) */
import {ROWS, I, V, clamp, measure, score, near, overall, checks, plan, moved, frame, spiral} from './geometry.js';
import {warpInto} from './warp.js';
import {MP_CDN, loadMesh, find, frameFace, loadImage, toCanvas} from '../face/mesh.js';

const SAMPLE = 'https://images.unsplash.com/photo-1534751516642-a1af1ef26a56?w=1100&q=85';
const GOLD = '#E3B85C';

const STR = {
  en:{
    change:'New photo', photo:'Photo', take:'Take photo', choose:'Choose photo', sample:'Sample face', privacy:'No photo uploaded.',
    hint:'Face the camera straight on with your lips closed.', emptyH:'Take or choose a front photo.',
    busy:'Measuring your face', credit:'Sample photo: Unsplash', rows:'Proportions', settings:'Settings',
    ideal:'Ideal for', women:'Women', men:'Men', amount:'Amount', guides:'Guides', spiral:'Spiral',
    before:'Before', after:'After', sim:'Simulation only', compare:'Before and after',
    now:'Now', then:'After', fine:'Already in proportion', apply:'Apply',
    save:'Save', saveBtn:'Save to phone', plan:'Add to My Plan', planned:'Added to My Plan', consult:'Ask a surgeon',
    vary:'Results may vary from person to person.', note:'Only what treatment can change is moved. Eye spacing and skull shape stay as they are.',
    camHint:'Line up your face with the outline.', shutter:'Take photo', cancel:'Cancel', brand:'Apex Surgery Hospital',
    warn:{turn:'Your head is turned. Face the camera for a truer measure.', mouth:'Your lips are apart. Close them for a truer measure.'},
    err:{noFace:'No face found in this photo. Try a closer photo taken from the front.', camera:'The camera could not be opened.', read:'The photo could not be read.',
         model:'The face model could not be loaded.', save:'The image could not be saved.', sample:'The sample photo could not be loaded.'},
    match:'Golden match', matchP:'How close the face sits to classic proportions, the golden ratio of mouth to nose included.',
    row:{thirds:'Chin length', nose:'Nose width', golden:'Golden ratio', lips:'Lip balance', jaw:'Jawline'},
    how:{thirds:'Middle and lower face the same length. Chin implant, filler or genioplasty.', nose:'Nose as wide as the gap between the eyes. Rhinoplasty.',
         golden:'Mouth 1.618 times as wide as the nose.', lips:'Lower lip 1.6 times the upper lip. Lip filler.', jaw:'Jaw narrower than the cheekbones. Face liposuction or jaw contouring.'},
    svc:{rhinoplasty:'Rhinoplasty', lipo:'Liposuction'},
  },
  th:{
    change:'เปลี่ยนรูป', photo:'รูปภาพ', take:'ถ่ายรูป', choose:'เลือกรูป', sample:'ใบหน้าตัวอย่าง', privacy:'ไม่มีการอัปโหลดรูปภาพ',
    hint:'หันหน้าตรงเข้าหากล้องและปิดปาก', emptyH:'ถ่ายหรือเลือกรูปหน้าตรง',
    busy:'กำลังวัดสัดส่วนใบหน้า', credit:'ภาพตัวอย่าง: Unsplash', rows:'สัดส่วน', settings:'การตั้งค่า',
    ideal:'สัดส่วนสำหรับ', women:'ผู้หญิง', men:'ผู้ชาย', amount:'ระดับ', guides:'เส้นสัดส่วน', spiral:'เกลียวทอง',
    before:'ก่อน', after:'หลัง', sim:'ภาพจำลองเท่านั้น', compare:'ก่อนและหลัง',
    now:'ตอนนี้', then:'หลังปรับ', fine:'ได้สัดส่วนแล้ว', apply:'ปรับ',
    save:'บันทึก', saveBtn:'บันทึกลงโทรศัพท์', plan:'เพิ่มในแผนของฉัน', planned:'เพิ่มในแผนแล้ว', consult:'ปรึกษาศัลยแพทย์',
    vary:'ผลลัพธ์อาจแตกต่างกันในแต่ละบุคคล', note:'ปรับเฉพาะส่วนที่การรักษาทำได้ ระยะห่างของดวงตาและโครงศีรษะคงเดิม',
    camHint:'จัดใบหน้าให้อยู่ในเส้น', shutter:'ถ่ายรูป', cancel:'ยกเลิก', brand:'Apex Surgery Hospital',
    warn:{turn:'ศีรษะหันไปด้านข้าง หันหน้าตรงเพื่อให้วัดได้แม่นขึ้น', mouth:'ริมฝีปากเปิดอยู่ ปิดปากเพื่อให้วัดได้แม่นขึ้น'},
    err:{noFace:'ไม่พบใบหน้าในรูปนี้ ลองใช้รูปหน้าตรงที่ถ่ายใกล้ขึ้น', camera:'เปิดกล้องไม่ได้', read:'อ่านรูปไม่ได้',
         model:'โหลดโมเดลใบหน้าไม่ได้', save:'บันทึกรูปไม่ได้', sample:'โหลดรูปตัวอย่างไม่ได้'},
    match:'ความใกล้สัดส่วนทองคำ', matchP:'ใบหน้าใกล้สัดส่วนมาตรฐานแค่ไหน รวมสัดส่วนทองคำของปากต่อจมูก',
    row:{thirds:'ความยาวคาง', nose:'ความกว้างจมูก', golden:'สัดส่วนทองคำ', lips:'สัดส่วนริมฝีปาก', jaw:'กรอบหน้า'},
    how:{thirds:'ใบหน้าส่วนกลางและส่วนล่างยาวเท่ากัน เสริมคาง ฟิลเลอร์ หรือเลื่อนกระดูกคาง', nose:'จมูกกว้างเท่าระยะระหว่างหัวตา เสริมจมูกและตัดปีกจมูก',
         golden:'ปากกว้างเป็น 1.618 เท่าของจมูก', lips:'ปากล่างหนาเป็น 1.6 เท่าของปากบน ฟิลเลอร์ปาก', jaw:'กรอบหน้าแคบกว่าโหนกแก้ม ดูดไขมันใบหน้าหรือปรับกรอบหน้า'},
    svc:{rhinoplasty:'เสริมจมูก', lipo:'ดูดไขมัน'},
  },
};

const ICON = {
  camera:'<path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"/><circle cx="12" cy="13" r="3"/>',
  upload:'<path d="M12 3v12"/><path d="m17 8-5-5-5 5"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>',
  image:'<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  download:'<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
  plus:'<path d="M5 12h14"/><path d="M12 5v14"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  arrow:'<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
  face:'<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/>',
  shield:'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  move:'<path d="m18 8 4 4-4 4"/><path d="M2 12h20"/><path d="m6 8-4 4 4 4"/>',
  alert:'<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  msg:'<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
};
const ic = k => `<svg class="fp-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;

const CSS = `
.fp{--fp-plum:var(--plum,#6A388C);--fp-plum-7:var(--plum-700,#55286F);--fp-night:var(--night,#1F0A30);--fp-night-2:var(--night-2,#2A0F40);
  --fp-lilac:var(--lilac,#A886CD);--fp-lilac-3:var(--lilac-300,#C9B3DD);--fp-lilac-2:var(--lilac-200,#E4D8EE);--fp-lilac-1:var(--lilac-100,#F1EAF7);
  --fp-wash:var(--wash,#FBF3FB);--fp-ink:var(--ink,#2A1F33);--fp-ink-2:var(--ink-2,#5A4A66);--fp-ink-3:var(--ink-3,#7C6A88);
  --fp-on:var(--on-night,#F6EEFB);--fp-on-2:var(--on-night-2,#CDB9DD);--fp-gold:${GOLD};--fp-gold-d:#9A6B12;--fp-ease:cubic-bezier(.23,1,.32,1);
  font-family:var(--font,"LINE Seed","Sarabun","Noto Sans Thai",system-ui,sans-serif);color:var(--fp-ink);line-height:1.6;display:grid;gap:14px;min-width:0;-webkit-tap-highlight-color:transparent}
.fp *,.fp *::before,.fp *::after{box-sizing:border-box}
.fp :where(button){font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
.fp [hidden]{display:none!important}
.fp-i{width:1.15em;height:1.15em;flex:none;display:inline-block;vertical-align:-.18em}
.fp-main{display:grid;gap:14px;min-width:0}
@media (min-width:960px){.fp-main{grid-template-columns:minmax(0,1fr) 360px;grid-template-areas:"stage panel" "props panel";gap:24px;align-items:start}
  .fp-stage{grid-area:stage}.fp-props{grid-area:props}.fp-panel{grid-area:panel}}
.fp-props{display:grid;gap:12px;min-width:0}
.fp-sum{display:flex;align-items:center;justify-content:space-between;gap:12px 20px;flex-wrap:wrap;padding:16px 20px;border-radius:22px;
  background:linear-gradient(135deg,#FFFBF0,#FFF0CF);border:1px solid #EAD5A2}
.fp-sum b{font-size:17px;color:var(--fp-ink)}
.fp-sum p{margin:2px 0 0;font-size:13.5px;line-height:1.45;color:var(--fp-ink-2);max-width:46ch}
.fp-sum-n{display:flex;align-items:center;gap:10px;font-size:30px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--fp-ink-3);line-height:1}
.fp-sum-n .fp-i{width:20px;height:20px;color:var(--fp-gold-d);transform:rotate(45deg)}
.fp-sum-n .a{color:var(--fp-gold-d);font-size:38px}
@media (min-width:700px){.fp-rows{grid-template-columns:1fr 1fr}}
.fp-stage{position:relative;min-width:0;background:radial-gradient(120% 80% at 50% 0%,var(--fp-night-2),var(--fp-night) 70%);color:var(--fp-on);border-radius:28px;padding:10px;display:grid;gap:10px}
.fp-view{--mh:62vh;position:relative;display:grid;place-items:center;min-height:min(64vh,460px);border-radius:20px;overflow:hidden}
@media (min-width:960px){.fp-view{--mh:76vh;min-height:min(76vh,680px)}}
.fp-view.fit{min-height:0}
.fp-fbox{position:relative;width:min(100%,calc(var(--mh) * var(--ar,.8)));aspect-ratio:var(--ar,.8)}
.fp-frame{--x:50%;position:absolute;inset:0;border-radius:20px;overflow:hidden;background:#12051d;touch-action:pan-y;user-select:none;-webkit-user-select:none}
.fp-frame canvas,.fp-frame svg.fp-g{position:absolute;inset:0;width:100%;height:100%;display:block}
.fp-frame .fp-after,.fp-frame .fp-ga{clip-path:inset(0 0 0 var(--x))}
.fp-frame .fp-gb{clip-path:inset(0 calc(100% - var(--x)) 0 0)}
.fp-g{pointer-events:none;overflow:hidden}
.fp.noguides .fp-g .gd,.fp.nospiral .fp-g .sp{opacity:0}
.fp-g g{transition:opacity .25s}
.fp-g .sq{fill:none;stroke:var(--fp-gold);stroke-width:.9;opacity:.45;vector-effect:non-scaling-stroke}
.fp-g .spl{fill:none;stroke:var(--fp-gold);stroke-width:2.2;vector-effect:non-scaling-stroke;stroke-linecap:round;stroke-linejoin:round}
.fp-g .sps{fill:none;stroke:rgba(20,6,31,.5);stroke-width:4.4;vector-effect:non-scaling-stroke;stroke-linecap:round;stroke-linejoin:round}
.fp-g .sh{fill:none;stroke:rgba(20,6,31,.55);stroke-width:3.2;vector-effect:non-scaling-stroke;stroke-linecap:round}
.fp-g .ln{fill:none;stroke:var(--fp-gold);stroke-width:1.3;opacity:.92;vector-effect:non-scaling-stroke;stroke-linecap:round}
.fp-g .dsh{stroke-dasharray:4 4}
.fp-g .dot{fill:var(--fp-gold);stroke:rgba(20,6,31,.6);stroke-width:1;vector-effect:non-scaling-stroke}
.fp-line{position:absolute;top:0;bottom:0;left:var(--x);width:2px;margin-left:-1px;background:#fff;box-shadow:0 0 0 1px rgba(31,10,48,.18)}
.fp-line::before{content:"";position:absolute;top:0;bottom:0;left:-27px;width:56px;touch-action:none}
.fp-knob{position:absolute;top:50%;left:var(--x);width:42px;height:42px;margin:-21px 0 0 -21px;border-radius:50%;background:#fff;color:var(--fp-plum);
  display:grid;place-items:center;box-shadow:0 10px 24px -8px rgba(20,6,31,.6);font-size:20px;cursor:ew-resize;touch-action:none}
.fp-frame:focus-visible{outline:2px solid var(--fp-lilac);outline-offset:3px}
.fp-tag{position:absolute;top:10px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;background:rgba(31,10,48,.62);color:#fff;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);pointer-events:none}
.fp-tag.l{left:10px}.fp-tag.r{right:10px}
.fp-tag.sim{top:auto;bottom:10px;left:10px;background:rgba(255,255,255,.9);color:var(--fp-plum)}
.fp-corners{position:absolute;inset:8px;pointer-events:none;opacity:.55;background-repeat:no-repeat;
  background:linear-gradient(var(--fp-gold),var(--fp-gold)) 0 0/18px 2px no-repeat,linear-gradient(var(--fp-gold),var(--fp-gold)) 0 0/2px 18px no-repeat,
  linear-gradient(var(--fp-gold),var(--fp-gold)) 100% 0/18px 2px no-repeat,linear-gradient(var(--fp-gold),var(--fp-gold)) 100% 0/2px 18px no-repeat,
  linear-gradient(var(--fp-gold),var(--fp-gold)) 0 100%/18px 2px no-repeat,linear-gradient(var(--fp-gold),var(--fp-gold)) 0 100%/2px 18px no-repeat,
  linear-gradient(var(--fp-gold),var(--fp-gold)) 100% 100%/18px 2px no-repeat,linear-gradient(var(--fp-gold),var(--fp-gold)) 100% 100%/2px 18px no-repeat}
.fp-empty,.fp-error{display:grid;justify-items:center;text-align:center;gap:12px;padding:28px 18px;max-width:440px}
.fp-big{width:64px;height:64px;border-radius:20px;display:grid;place-items:center;background:rgba(255,255,255,.07);border:1px solid rgba(201,179,221,.22);color:var(--fp-gold);font-size:30px}
.fp-error .fp-big{color:#fff;background:rgba(204,51,102,.22);border-color:rgba(204,51,102,.5)}
.fp-empty h3,.fp-error h3{margin:0;font-size:20px;font-weight:700;color:#fff;line-height:1.35}
.fp-empty p{margin:0;color:var(--fp-on-2);font-size:15px}
.fp-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.fp-cam{position:absolute;inset:0;background:#000;display:grid}
.fp-cam video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}
.fp-cam svg{position:absolute;left:50%;top:46%;height:78%;max-width:92%;transform:translate(-50%,-50%);overflow:visible}
.fp-cam svg *{fill:none;stroke:#fff;stroke-width:1.1;stroke-dasharray:3 2.2;vector-effect:non-scaling-stroke;opacity:.9}
.fp-cam p{position:absolute;top:12px;left:12px;right:12px;margin:0;text-align:center;font-size:14px;font-weight:700;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.6)}
.fp-cambar{position:absolute;left:0;right:0;bottom:16px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;padding:0 16px}
.fp-cambar>:first-child{justify-self:end}
.fp-shutter{width:68px;height:68px;border-radius:50%;background:#fff;color:var(--fp-plum);display:grid;place-items:center;font-size:26px;box-shadow:0 0 0 4px rgba(255,255,255,.35);transition:transform .16s var(--fp-ease)}
.fp-shutter:active{transform:scale(.94)}
.fp-busy{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:12px;background:rgba(31,10,48,.72);color:#fff;font-weight:700;z-index:5}
.fp-spin{width:40px;height:40px;border-radius:50%;border:3px solid rgba(255,255,255,.22);border-top-color:var(--fp-gold);animation:fp-spin .8s linear infinite}
@keyframes fp-spin{to{transform:rotate(360deg)}}
.fp-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:space-between;padding:2px 4px 2px 8px;min-height:44px}
.fp-bar{align-items:end;gap:10px 18px;padding:2px 8px 4px}
.fp-bar .fp-amt{flex:1 1 220px;color:#fff}
.fp-bar .fp-amt div{color:#fff}
.fp-bar .fp-amt output{color:var(--fp-gold)}
.fp .fp-bar input[type=range]{background:linear-gradient(90deg,var(--fp-gold) var(--v,70%),rgba(255,255,255,.2) var(--v,70%))}
.fp .fp-bar input[type=range]::-webkit-slider-thumb{border-color:var(--fp-gold-d)}
.fp-bar-r{display:flex;gap:8px;align-items:center;margin-bottom:6px}
@media (max-width:420px){.fp-hide-s{display:none}}
.fp-hint{margin:0;font-size:14.5px;color:var(--fp-ink-2)}
.fp-credit{margin:0;padding:0 8px 4px;font-size:12px;line-height:1.4;color:var(--fp-on-2)}
.fp .fp-sw-b{white-space:nowrap;display:inline-flex;align-items:center;gap:10px;height:38px;padding:0 10px 0 14px;border-radius:999px;border:1px solid rgba(201,179,221,.5);color:#fff;font-size:14px;font-weight:700}
.fp-sw{position:relative;flex:none;width:30px;height:18px;border-radius:999px;background:rgba(255,255,255,.2);transition:background-color .2s}
.fp-sw::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:transform .2s var(--fp-ease)}
[aria-checked=true]>.fp-sw{background:var(--fp-gold-d)}
[aria-checked=true]>.fp-sw::after{transform:translateX(12px)}
.fp .fp-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5em;height:44px;padding:0 18px;border-radius:999px;font-size:15px;font-weight:700;white-space:nowrap;
  transition:transform .16s var(--fp-ease),background-color .2s,color .2s,border-color .2s;text-decoration:none}
.fp .fp-btn:active{transform:scale(.97)}
.fp .fp-btn:disabled{opacity:.45;cursor:not-allowed;transform:none}
.fp .fp-btn.pri{background:var(--fp-plum);color:#fff;box-shadow:0 10px 24px -12px rgba(106,56,140,.8)}
.fp .fp-btn.pri:hover:not(:disabled){background:var(--fp-plum-7)}
.fp .fp-btn.lt{background:#fff;color:var(--fp-plum)}
.fp .fp-btn.gh{border:1px solid rgba(201,179,221,.5);color:#fff}
.fp .fp-btn.gh:hover{background:rgba(255,255,255,.08)}
.fp .fp-btn.ol{border:1px solid var(--fp-lilac-3);color:var(--fp-plum);background:#fff}
.fp .fp-btn.ol:hover:not(:disabled){background:var(--fp-lilac-1)}
.fp .fp-btn.sm{height:38px;padding:0 14px;font-size:14px}
.fp .fp-btn.wide{width:100%}
.fp-panel{min-width:0;background:#fff;border:1px solid var(--fp-lilac-2);border-radius:28px;padding:20px;display:grid;gap:22px}
@media (min-width:960px){.fp-panel{position:sticky;top:96px}}
.fp-sec{display:grid;gap:10px;min-width:0}
.fp-sec h3{margin:0;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--fp-plum);font-weight:700;display:flex;align-items:center;gap:8px}
.fp-sec h3 i{font-style:normal;width:22px;height:22px;border-radius:50%;background:var(--fp-lilac-1);display:grid;place-items:center;font-size:12px;letter-spacing:0}
.fp-sec>p{margin:0;font-size:15px;color:var(--fp-ink-2)}
.fp-src{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.fp-src .fp-btn{padding:0 10px}
.fp-src .full{grid-column:1/-1}
.fp-priv{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--fp-ink-2);margin:0}
.fp-priv .fp-i{color:var(--fp-plum)}
.fp-warn{margin:0;display:flex;gap:8px;align-items:flex-start;font-size:14px;line-height:1.45;color:#7A4A00;background:#FFF6E0;border:1px solid #F0D9A0;border-radius:14px;padding:10px 12px}
.fp-warn .fp-i{margin-top:2px}
/* proportion rows */
.fp-rows{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.fp-r{display:grid;gap:8px;padding:12px 14px;border-radius:18px;border:1px solid var(--fp-lilac-2);background:#fff;transition:border-color .2s,background-color .2s}
.fp-r.on{border-color:var(--fp-lilac-3);background:var(--fp-wash)}
.fp-r.gold{background:linear-gradient(135deg,#FFFBF0,#FFF4DC);border-color:#EAD5A2}
.fp-rh{display:flex;align-items:center;gap:10px;min-width:0}
.fp-rh b{font-size:15.5px;line-height:1.3;flex:1;min-width:0}
.fp-rh .fp-tg{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--fp-plum);padding:4px 6px 4px 10px;border-radius:999px;min-height:36px}
.fp-rh .fp-tg:focus-visible{outline:2px solid var(--fp-lilac);outline-offset:2px}
.fp-tg .fp-sw{background:var(--fp-lilac-2)}
.fp-tg[aria-checked=true] .fp-sw{background:var(--fp-plum)}
.fp-r p{margin:0;font-size:13.5px;line-height:1.45;color:var(--fp-ink-2)}
.fp-meter{position:relative;height:22px;margin:2px 4px}
.fp-meter::before{content:"";position:absolute;left:0;right:0;top:10px;height:3px;border-radius:3px;background:linear-gradient(90deg,var(--fp-lilac-2),#F2DFAE 42%,var(--fp-gold) 50%,#F2DFAE 58%,var(--fp-lilac-2))}
.fp-meter .ideal{position:absolute;left:50%;top:3px;width:2px;height:17px;margin-left:-1px;background:var(--fp-gold-d);border-radius:2px}
.fp-meter .mk{position:absolute;top:5px;width:13px;height:13px;margin-left:-6.5px;border-radius:50%;transition:left .35s var(--fp-ease)}
.fp-meter .mk.b{background:#fff;border:2px solid var(--fp-ink-3)}
.fp-meter .mk.a{background:var(--fp-plum);border:2px solid #fff;box-shadow:0 0 0 1px var(--fp-plum)}
.fp-nums{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:13px;color:var(--fp-ink-2);font-variant-numeric:tabular-nums}
.fp-nums b{color:var(--fp-ink);font-weight:700}
.fp-nums .a b{color:var(--fp-plum)}
.fp-nums .ok{color:var(--fp-gold-d);font-weight:700}
.fp-svc{font-size:13px;font-weight:700;color:var(--fp-plum);text-decoration:none;display:inline-flex;align-items:center;gap:4px}
.fp-svc:hover{text-decoration:underline}
.fp-seg{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:999px;background:var(--fp-lilac-1)}
.fp-seg button{min-height:40px;border-radius:999px;font-weight:700;font-size:14.5px;color:var(--fp-plum);transition:background-color .2s,color .2s}
.fp-seg button[aria-pressed=true]{background:var(--fp-plum);color:#fff;box-shadow:0 8px 18px -10px rgba(106,56,140,.8)}
.fp-seg button:focus-visible{outline:2px solid var(--fp-lilac);outline-offset:2px}
.fp-lab{font-size:14px;font-weight:700;color:var(--fp-ink)}
.fp-amt{display:grid;gap:6px}
.fp-amt div{display:flex;justify-content:space-between;font-size:14px;font-weight:700;color:var(--fp-ink)}
.fp-amt output{color:var(--fp-plum);font-variant-numeric:tabular-nums}
.fp input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:6px;margin:10px 0;
  background:linear-gradient(90deg,var(--fp-plum) var(--v,70%),var(--fp-lilac-2) var(--v,70%));outline-offset:8px}
.fp input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:26px;height:26px;border-radius:50%;background:#fff;border:2px solid var(--fp-plum);box-shadow:0 6px 16px -6px rgba(74,22,104,.5);cursor:pointer}
.fp input[type=range]::-moz-range-thumb{width:24px;height:24px;border-radius:50%;background:#fff;border:2px solid var(--fp-plum);cursor:pointer}
.fp-note{margin:0;font-size:13px;line-height:1.45;color:var(--fp-ink-3)}
.fp-saves{display:grid;gap:8px}
.fp-err{margin:0;font-size:14px;color:#CC3366}
.fp-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 16px;padding:14px 18px;border-radius:20px;background:var(--fp-wash);border:1px solid var(--fp-lilac-2)}
.fp-foot p{margin:0;font-size:15px;color:var(--fp-ink-2)}
@media (prefers-reduced-motion:reduce){.fp *{transition:none!important;animation-duration:1.6s!important}}
`;

/* ---------- guides: the lines the ratios are measured on ---------- */
function guidesD(L){
  const F = frame(L), {u, v} = F, M = measure(L);
  const cx = V.mid(L[I.bzA], L[I.bzB]), half = M.d.bz * .5;
  const across = (p, w = half) => { const c = V.add(cx, V.mul(u, V.dot(V.sub(p, cx), u))); return [V.add(c, V.mul(v, -w)), V.add(c, V.mul(v, w))]; };
  const seg = ([a, b]) => `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  const lines = [across(L[I.gl]), across(L[I.sn]), across(L[I.me])].map(seg).join('');
  // the bracket on the left marks the two thirds being compared
  const bx = (p, k) => V.add(V.add(cx, V.mul(u, V.dot(V.sub(p, cx), u))), V.mul(v, -half - k));
  const br = seg([bx(L[I.gl], M.d.bz * .06), bx(L[I.me], M.d.bz * .06)]);
  // nose width against the inner corners of the eyes
  const down = (p, to) => seg([p, V.add(p, V.mul(u, V.dot(V.sub(to, p), u)))]);
  const nose = down(L[I.icdA], L[I.alA]) + down(L[I.icdB], L[I.alB]);
  const jaw = seg([L[I.jawA], L[I.jawB]]);
  const dots = [I.gl, I.sn, I.me, I.alA, I.alB, I.icdA, I.icdB, I.jawA, I.jawB, I.mA, I.mB, I.ulTop, I.llBot].map(i => L[i]);
  return {solid:lines + br, dash:nose + jaw, dots};
}
const poly = (pts, close) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('') + (close ? 'Z' : '');
function spiralD(L){
  const S = spiral(L);
  return {sq:S.boxes.map((b, i) => poly(b, !i)).join(''), arc:poly(S.arc)};
}
function drawGuides(svg, L, W, H){
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const g = guidesD(L), sp = spiralD(L), r = Math.max(W, H) * .0045;
  svg.innerHTML = `<g class="sp"><path class="sq" d="${sp.sq}"/><path class="sps" d="${sp.arc}"/><path class="spl" d="${sp.arc}"/></g>`
    + `<g class="gd"><path class="sh" d="${g.solid}"/><path class="ln" d="${g.solid}"/><path class="sh" d="${g.dash}"/><path class="ln dsh" d="${g.dash}"/>`
    + g.dots.map(p => `<circle class="dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r.toFixed(1)}"/>`).join('') + '</g>';
}
/* the spiral painted onto a canvas for the saved image; k scales photo pixels to the canvas */
function paintSpiral(g, L, ox, oy, k, lw){
  const sp = spiral(L), P = p => [ox + p.x * k, oy + p.y * k];
  const path = (pts, close) => { g.beginPath(); pts.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](...P(p))); if (close) g.closePath(); };
  g.save(); g.lineCap = g.lineJoin = 'round';
  g.strokeStyle = 'rgba(227,184,92,.45)'; g.lineWidth = lw * .45;
  sp.boxes.forEach((b, i) => { path(b, !i); g.stroke(); });
  path(sp.arc); g.strokeStyle = 'rgba(20,6,31,.5)'; g.lineWidth = lw * 2; g.stroke();
  g.strokeStyle = GOLD; g.lineWidth = lw; g.stroke();
  g.restore();
}

/* ===================================================================== */
let styleRefs = 0, styleEl = null;

export function mount(container, opts = {}){
  const lang = opts.lang === 'th' ? 'th' : 'en', S = STR[lang];
  const mpBase = opts.mpBase || MP_CDN, sampleSrc = opts.sample || SAMPLE;
  const emit = (n, d) => { try { opts.onEvent && opts.onEvent(n, d); } catch (e) {} };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c]));
  const svcHref = k => { try { return opts.serviceUrl ? opts.serviceUrl(k) : 'service.html?p=' + k; } catch (e) { return 'service.html?p=' + k; } };
  if (!styleRefs++) { styleEl = document.createElement('style'); styleEl.dataset.feature = 'proportions'; styleEl.textContent = CSS; document.head.append(styleEl); }

  const state = {base:null, data:null, L:null, sample:false, err:null, stream:null, amt:.7, sex:'women', guides:false, spiral:true, planned:false,
    on:{thirds:true, nose:true, lips:true, jaw:true}};
  try {
    const p = JSON.parse(localStorage.getItem('apex.proportions') || 'null');
    if (p) { if (typeof p.amt === 'number') state.amt = clamp(p.amt, 0, 1); if (p.sex === 'men') state.sex = 'men'; if (typeof p.guides === 'boolean') state.guides = p.guides; if (p.spiral === false) state.spiral = false; }
  } catch (e) {}
  const remember = () => { try { localStorage.setItem('apex.proportions', JSON.stringify({amt:state.amt, sex:state.sex, guides:state.guides, spiral:state.spiral})); } catch (e) {} };

  const root = document.createElement('div');
  root.className = 'fp'; root.lang = lang;
  root.innerHTML = `
  <div class="fp-main">
    <section class="fp-stage" aria-label="${esc(S.compare)}">
      <div class="fp-view">
        <div class="fp-empty">
          <span class="fp-big">${ic('face')}</span>
          <h3>${esc(S.emptyH)}</h3><p>${esc(S.hint)}</p>
          <div class="fp-row">
            <button class="fp-btn lt" data-act="take">${ic('camera')}${esc(S.take)}</button>
            <button class="fp-btn gh" data-act="choose">${ic('upload')}${esc(S.choose)}</button>
            <button class="fp-btn gh" data-act="sample">${ic('image')}${esc(S.sample)}</button>
          </div>
        </div>
        <div class="fp-error" hidden>
          <span class="fp-big">${ic('alert')}</span><h3 data-r="emsg"></h3>
          <div class="fp-row">
            <button class="fp-btn lt" data-act="take">${ic('camera')}${esc(S.take)}</button>
            <button class="fp-btn gh" data-act="choose">${ic('upload')}${esc(S.choose)}</button>
            <button class="fp-btn gh" data-act="sample">${ic('image')}${esc(S.sample)}</button>
          </div>
        </div>
        <div class="fp-fbox" hidden>
          <div class="fp-frame" tabindex="0" role="slider" aria-label="${esc(S.compare)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">
            <canvas class="fp-before"></canvas><canvas class="fp-after"></canvas>
            <svg class="fp-g fp-gb" aria-hidden="true"></svg><svg class="fp-g fp-ga" aria-hidden="true"></svg>
            <span class="fp-corners"></span>
            <span class="fp-line"></span><span class="fp-knob">${ic('move')}</span>
            <span class="fp-tag l">${esc(S.before)}</span><span class="fp-tag r">${esc(S.after)}</span><span class="fp-tag sim">${esc(S.sim)}</span>
          </div>
        </div>
        <div class="fp-cam" hidden>
          <video playsinline muted autoplay></video>
          <svg viewBox="0 0 100 130" aria-hidden="true"><ellipse cx="50" cy="60" rx="27" ry="36"/></svg>
          <p>${esc(S.camHint)}</p>
          <div class="fp-cambar">
            <button class="fp-btn gh sm" data-act="camcancel">${esc(S.cancel)}</button>
            <button class="fp-shutter" data-act="shutter" aria-label="${esc(S.shutter)}">${ic('camera')}</button><span></span>
          </div>
        </div>
        <div class="fp-busy" hidden><span class="fp-spin"></span><span>${esc(S.busy)}</span></div>
      </div>
      <div class="fp-bar" hidden>
        <label class="fp-amt"><div><span>${esc(S.amount)}</span><output data-r="amtv"></output></div><input type="range" min="0" max="100" step="1" data-r="amt"></label>
        <div class="fp-bar-r">
          <button class="fp-sw-b" data-act="spiral" role="switch" aria-checked="true">${esc(S.spiral)}<span class="fp-sw" aria-hidden="true"></span></button>
          <button class="fp-sw-b" data-act="guides" role="switch" aria-checked="false">${esc(S.guides)}<span class="fp-sw" aria-hidden="true"></span></button>
          <button class="fp-btn gh sm" data-act="choose" aria-label="${esc(S.choose)}">${ic('upload')}<span class="fp-hide-s">${esc(S.change)}</span></button>
        </div>
      </div>
      <p class="fp-credit" hidden>${esc(S.credit)}</p>
    </section>
    <section class="fp-props" aria-label="${esc(S.rows)}">
      <div class="fp-sum" aria-live="polite"><div><b>${esc(S.match)}</b><p>${esc(S.matchP)}</p></div>
        <div class="fp-sum-n"><span data-r="m0">–</span>${ic('arrow')}<span class="a" data-r="m1">–</span></div></div>
      <ul class="fp-rows">${ROWS.filter(r => r.change).map(r => `<li class="fp-r" data-row="${r.id}">
        <div class="fp-rh"><b>${esc(S.row[r.id])}</b><button class="fp-tg" data-tog="${r.id}" role="switch" aria-checked="true" aria-label="${esc(S.apply + ': ' + S.row[r.id])}">${esc(S.apply)}<span class="fp-sw" aria-hidden="true"></span></button></div>
        <p>${esc(S.how[r.id])}</p>
        <div class="fp-meter" aria-hidden="true"><span class="ideal"></span><span class="mk b"></span><span class="mk a"></span></div>
        <div class="fp-nums"></div>
        ${r.svc ? `<a class="fp-svc" href="${esc(svcHref(r.svc))}">${esc(S.svc[r.svc])}${ic('arrow')}</a>` : ''}
      </li>`).join('')}</ul>
      <p class="fp-note">${esc(S.note)}</p>
    </section>
    <aside class="fp-panel">
      <div class="fp-sec">
        <h3><i>1</i>${esc(S.photo)}</h3>
        <div class="fp-src">
          <button class="fp-btn pri" data-act="take">${ic('camera')}${esc(S.take)}</button>
          <button class="fp-btn ol" data-act="choose">${ic('upload')}${esc(S.choose)}</button>
          <button class="fp-btn ol full" data-act="sample">${ic('image')}${esc(S.sample)}</button>
        </div>
        <p class="fp-hint">${esc(S.hint)}</p>
        <p class="fp-priv">${ic('shield')}${esc(S.privacy)}</p>
        <div data-r="warns"></div>
      </div>
      <div class="fp-sec">
        <h3><i>2</i>${esc(S.settings)}</h3>
        <span class="fp-lab" id="fp-ideal">${esc(S.ideal)}</span>
        <div class="fp-seg" role="group" aria-labelledby="fp-ideal">
          <button data-sex="women" aria-pressed="true">${esc(S.women)}</button><button data-sex="men" aria-pressed="false">${esc(S.men)}</button>
        </div>
      </div>
      <div class="fp-sec">
        <h3><i>3</i>${esc(S.save)}</h3>
        <div class="fp-saves">
          <button class="fp-btn pri wide" data-act="save" disabled>${ic('download')}${esc(S.saveBtn)}</button>
          <button class="fp-btn ol wide" data-act="plan" disabled>${ic('plus')}<span>${esc(S.plan)}</span></button>
          <a class="fp-btn ol wide" data-r="consult" href="consult.html">${ic('msg')}${esc(S.consult)}</a>
        </div>
        <p class="fp-err" data-r="saveerr" hidden></p>
      </div>
    </aside>
  </div>
  <div class="fp-foot"><p>${esc(S.vary)}</p></div>
  <input type="file" accept="image/*" hidden>`;
  container.append(root);

  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)], R = k => root.querySelector(`[data-r="${k}"]`);
  const view = $('.fp-view'), fbox = $('.fp-fbox'), frameEl = $('.fp-frame'), cvB = $('.fp-before'), cvA = $('.fp-after');
  const gB = $('.fp-gb'), gA = $('.fp-ga'), empty = $('.fp-empty'), errBox = $('.fp-error'), cam = $('.fp-cam'), video = $('video'), busy = $('.fp-busy');
  const bar = $('.fp-bar'), file = $('input[type=file]'), amt = R('amt');
  const has = () => !!(state.base && state.L);

  /* ---------- drawing ---------- */
  let cur = null; // the latest plan, so the panel and the guides agree with the picture
  function compute(){
    if (!has()) return null;
    const P = plan(state.L, state.on, state.amt, state.sex);
    cur = {P, L2:moved(state.L, P), M0:measure(state.L)};
    cur.M1 = measure(cur.L2);
    return cur;
  }
  let rq = 0, rqFast = false, lastCost = 0, lastAt = 0;
  function draw(fast){
    rqFast = rq ? rqFast && !!fast : !!fast;
    if (rq) return;
    const go = now => {
      if (rqFast && lastCost > 24 && now - lastAt < lastCost * 1.5) { rq = requestAnimationFrame(go); return; }
      rq = 0;
      if (!has()) return;
      const t0 = performance.now();
      const C = compute();
      const g = cvA.getContext('2d'); g.drawImage(state.base, 0, 0);
      warpInto(state.data, cvA, C.P, rqFast ? 8 : 4);
      drawGuides(gA, C.L2, cvA.width, cvA.height);
      panel();
      lastAt = performance.now(); lastCost = lastAt - t0;
    };
    rq = requestAnimationFrame(go);
  }
  function showPhoto(){
    const W = state.base.width, H = state.base.height;
    cvB.width = cvA.width = W; cvB.height = cvA.height = H;
    cvB.getContext('2d').drawImage(state.base, 0, 0);
    cvA.getContext('2d').drawImage(state.base, 0, 0);
    view.style.setProperty('--ar', (W / H).toFixed(4));
    drawGuides(gB, state.L, W, H);
    setX(50);
  }

  /* ---------- the panel ---------- */
  const fmt = x => x.toFixed(2);
  function panel(){
    if (!cur) return;
    const {M0, M1} = cur;
    R('m0').textContent = overall(M0, state.sex) + '%';
    R('m1').textContent = overall(M1, state.sex) + '%';
    ROWS.filter(r => r.change).forEach(r => {
      const li = $(`[data-row="${r.id}"]`), t = r.target(state.sex), a = M0[r.id], b = M1[r.id];
      const pos = x => clamp(50 + Math.log(x / t) * 160, 3, 97) + '%';
      li.querySelector('.mk.b').style.left = pos(a);
      li.querySelector('.mk.a').style.left = pos(b);
      const ok = near(a, t), changed = Math.abs(b - a) > .004;
      li.classList.toggle('on', changed);
      li.querySelector('.fp-nums').innerHTML = ok ? `<span class="ok">${esc(S.fine)}</span><span>${fmt(a)} / ${fmt(t)}</span>`
        : `<span>${esc(S.now)} <b>${fmt(a)}</b> · ${score(a, t)}%</span><span class="a">${esc(S.then)} <b>${fmt(b)}</b> · ${score(b, t)}%</span><span>/ ${fmt(t)}</span>`;
      const tg = li.querySelector('.fp-tg');
      if (tg) { tg.setAttribute('aria-checked', String(!!state.on[r.id])); tg.hidden = ok; }
    });
  }
  function sync(){
    const ready = has(), camOn = !!state.stream;
    cam.hidden = !camOn;
    errBox.hidden = camOn || !state.err;
    empty.hidden = camOn || ready || !!state.err;
    fbox.hidden = camOn || !ready || !!state.err;
    view.classList.toggle('fit', !fbox.hidden);
    bar.hidden = !(ready && !camOn && !state.err);
    $('.fp-credit').hidden = !(ready && state.sample && !camOn && !state.err);
    R('emsg').textContent = state.err ? S.err[state.err] || '' : '';
    $('[data-act="guides"]').setAttribute('aria-checked', String(state.guides));
    root.classList.toggle('noguides', !state.guides);
    $('[data-act="spiral"]').setAttribute('aria-checked', String(state.spiral));
    root.classList.toggle('nospiral', !state.spiral);
    $$('.fp-seg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sex === state.sex)));
    amt.value = Math.round(state.amt * 100); amt.style.setProperty('--v', amt.value + '%'); R('amtv').textContent = amt.value + '%';
    $('[data-act="save"]').disabled = !ready;
    const pl = $('[data-act="plan"]'); pl.disabled = !ready;
    pl.innerHTML = (state.planned ? ic('check') : ic('plus')) + `<span>${esc(state.planned ? S.planned : S.plan)}</span>`;
    const w = ready && !state.err ? checks(state.L) : [];
    R('warns').innerHTML = w.map(k => `<p class="fp-warn">${ic('alert')}<span>${esc(S.warn[k])}</span></p>`).join('');
    if (!ready) { R('m0').textContent = R('m1').textContent = '–'; }
    if (!ready) ROWS.filter(r => r.change).forEach(r => { const li = $(`[data-row="${r.id}"]`); li.classList.remove('on'); li.querySelector('.fp-nums').innerHTML = ''; li.querySelectorAll('.mk').forEach(m => m.style.left = '50%'); });
  }
  const setBusy = on => { busy.hidden = !on; };

  /* ---------- compare slider ---------- */
  let sx = 50, gest = null;
  const local = e => { const r = frameEl.getBoundingClientRect(); return {x:(e.clientX - r.left) / r.width, w:r.width}; };
  const setX = x => { sx = clamp(x, 0, 100); frameEl.style.setProperty('--x', sx + '%'); frameEl.setAttribute('aria-valuenow', Math.round(sx)); };
  frameEl.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const l = local(e), near = Math.abs(l.x * 100 - sx) * l.w / 100 < 44 || !!e.target.closest('.fp-knob');
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
    if (!hit) { Object.assign(state, {base:null, L:null, data:null, sample:false, err:err || 'noFace'}); cur = null; emit('proportions:error', {error:state.err}); sync(); return; }
    const f = frameFace(hit.canvas, hit.lm);
    Object.assign(state, {base:f.base, L:f.L, sample:!!sample, err:null, data:f.base.getContext('2d', {willReadFrequently:true}).getImageData(0, 0, f.base.width, f.base.height)});
    showPhoto(); sync(); draw();
    emit('proportions:photo', {sample:!!sample, checks:checks(f.L)});
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
    try { const im = await loadImage(sampleSrc); await usePhoto(toCanvas(im), true); emit('proportions:sample', {}); }
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

  /* ---------- save: before and after with the proportions underneath ---------- */
  async function save(){
    const err = R('saveerr'); err.hidden = true;
    if (!has() || !cur) return;
    try {
      const font = getComputedStyle(root).fontFamily;
      try { await document.fonts.load(`700 20px ${font}`); } catch (e) {}
      const rowH = 760, w = Math.round(state.base.width * rowH / state.base.height), gap = 12, pad = 32;
      const after = document.createElement('canvas'); after.width = state.base.width; after.height = state.base.height;
      after.getContext('2d').drawImage(state.base, 0, 0); warpInto(state.data, after, cur.P, 3);
      const rows = ROWS.filter(r => r.change && !near(cur.M0[r.id], r.target(state.sex)));
      const W = w * 2 + gap + pad * 2, H = pad + rowH + 30 + (rows.length + 1) * 44 + 70;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      g.fillStyle = '#1F0A30'; g.fillRect(0, 0, W, H);
      const clip = (x, img) => { g.save(); g.beginPath(); g.roundRect ? g.roundRect(x, pad, w, rowH, 20) : g.rect(x, pad, w, rowH); g.clip(); g.drawImage(img, x, pad, w, rowH); g.restore(); };
      clip(pad, state.base); clip(pad + w + gap, after);
      if (state.spiral) {
        const k = rowH / state.base.height;
        g.save(); g.beginPath(); g.rect(pad, pad, w * 2 + gap, rowH); g.clip();
        g.save(); g.beginPath(); g.rect(pad, pad, w, rowH); g.clip(); paintSpiral(g, state.L, pad, pad, k, 3); g.restore();
        g.save(); g.beginPath(); g.rect(pad + w + gap, pad, w, rowH); g.clip(); paintSpiral(g, cur.L2, pad + w + gap, pad, k, 3); g.restore();
        g.restore();
      }
      const pill = (t, x, y, bg, fg) => { g.font = `700 20px ${font}`; const tw = g.measureText(t).width + 24; g.fillStyle = bg; g.beginPath(); g.roundRect ? g.roundRect(x, y, tw, 34, 17) : g.rect(x, y, tw, 34); g.fill(); g.fillStyle = fg; g.textBaseline = 'middle'; g.fillText(t, x + 12, y + 18); };
      pill(S.before, pad + 12, pad + 12, 'rgba(31,10,48,.7)', '#fff');
      pill(S.after, pad + w + gap + 12, pad + 12, 'rgba(31,10,48,.7)', '#fff');
      pill(S.sim, pad + w + gap + 12, pad + rowH - 46, 'rgba(255,255,255,.9)', '#6A388C');
      let y = pad + rowH + 50;
      g.textBaseline = 'alphabetic';
      g.font = `700 26px ${font}`; g.fillStyle = GOLD; g.fillText(S.match, pad, y);
      const mt = `${overall(cur.M0, state.sex)}% → ${overall(cur.M1, state.sex)}%`;
      g.fillText(mt, W - pad - g.measureText(mt).width, y);
      y += 44;
      for (const r of rows) {
        const t = r.target(state.sex);
        g.font = `700 24px ${font}`; g.fillStyle = '#fff'; g.fillText(S.row[r.id], pad, y);
        g.font = `400 22px ${font}`; g.fillStyle = '#CDB9DD';
        const txt = `${fmt(cur.M0[r.id])} → ${fmt(cur.M1[r.id])}   ${score(cur.M0[r.id], t)}% → ${score(cur.M1[r.id], t)}%`;
        g.fillText(txt, W - pad - g.measureText(txt).width, y);
        y += 44;
      }
      g.font = `400 20px ${font}`; g.fillStyle = '#CDB9DD';
      g.fillText(S.sim, pad, H - 28);
      const bw = g.measureText(S.brand).width; g.fillText(S.brand, W - pad - bw, H - 28);
      const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', .9));
      if (!blob) throw new Error('blob');
      const name = 'apex-golden-proportions.jpg', fl = new File([blob], name, {type:'image/jpeg'});
      let shared = false;
      if (navigator.canShare && navigator.share) {
        try { if (navigator.canShare({files:[fl]})) { await navigator.share({files:[fl], title:S.brand}); shared = true; } }
        catch (e) { if (e && e.name === 'AbortError') shared = true; }
      }
      if (!shared) {
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
        document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
      emit('proportions:saved', {on:state.on});
    } catch (e) { err.textContent = S.err.save; err.hidden = false; }
  }

  /* ---------- events ---------- */
  function onClick(e){
    const tg = e.target.closest('[data-tog]');
    if (tg) { const k = tg.dataset.tog; state.on[k] = !state.on[k]; emit('proportions:toggle', {row:k, on:state.on[k]}); draw(); return; }
    const sb = e.target.closest('[data-sex]');
    if (sb) { state.sex = sb.dataset.sex; remember(); sync(); draw(); return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'take') startCam();
    else if (a === 'choose') file.click();
    else if (a === 'sample') useSample();
    else if (a === 'camcancel') { stopCam(); sync(); }
    else if (a === 'shutter') shoot();
    else if (a === 'guides') { state.guides = !state.guides; remember(); sync(); }
    else if (a === 'spiral') { state.spiral = !state.spiral; remember(); sync(); emit('proportions:spiral', {on:state.spiral}); }
    else if (a === 'save') save();
    else if (a === 'plan') {
      state.planned = true;
      const procs = [state.on.nose && cur && cur.P.info.nose ? 'rhinoplasty' : null, state.on.jaw && cur && cur.P.info.jaw ? 'lipo' : null].filter(Boolean);
      (procs.length ? procs : ['consult']).forEach(p => emit('plan:add', {procedure:p, source:'proportions'}));
      sync();
    }
  }
  root.addEventListener('click', onClick);
  file.addEventListener('change', () => { const f = file.files[0]; file.value = ''; useFile(f); });
  amt.addEventListener('input', () => { state.amt = amt.value / 100; amt.style.setProperty('--v', amt.value + '%'); R('amtv').textContent = amt.value + '%'; draw(true); });
  amt.addEventListener('change', () => { remember(); draw(false); });
  view.addEventListener('dragover', e => e.preventDefault());
  view.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) useFile(f); });

  sync();
  const idle = setTimeout(() => loadMesh(mpBase).catch(() => {}), 2500);
  return {
    destroy(){
      clearTimeout(idle); cancelAnimationFrame(rq); stopCam();
      root.removeEventListener('click', onClick); root.remove();
      if (!--styleRefs && styleEl) { styleEl.remove(); styleEl = null; }
    },
    _state:state, _cur:() => cur,
  };
}
