/* Online consultation form.
   mount(container, {lang, base, serviceUrl, onEvent}) -> {destroy()}
   With no backend yet, a valid form shows a summary with WhatsApp and LINE buttons and emits consult:submit.
   Photos are previewed in the page and kept out of the payload until send() posts to a real endpoint. */

import * as store from '../plan/store.js';
import { PROC_KEYS, BRANCHES, BRANCH_KEYS, t, procName } from '../plan/procedures.js';

const WHATSAPP = '66850002001';
const LINE_OA = '@apexsurgery';

/* ------------------------------------------------------------------------------------------
   send(payload): the one place a real backend plugs in.
   Today it resolves at once and the summary screen hands the enquiry to WhatsApp or LINE.
   When the clinic system is connected, replace the body with something like:

     const fd = new FormData();
     fd.append('enquiry', JSON.stringify(payload.fields));
     payload.photos.forEach(p => fd.append('photo_' + p.view, p.file, p.file.name));
     const r = await fetch('https://<clinic-endpoint>/consult', { method: 'POST', body: fd });
     if (!r.ok) throw new Error('HTTP ' + r.status);
     return { sent: true, id: (await r.json()).id };

   and change PHOTO_NOTE below, since photos will then go with the enquiry.
   ------------------------------------------------------------------------------------------ */
export async function send(payload) {
  return { sent: false, preview: true, fields: payload.fields };
}

const T = {
  title: { en: 'Online consultation', th: 'ปรึกษาแพทย์ออนไลน์' },
  intro: { en: 'Send your questions and photos to the Apex surgeons before you travel.', th: 'ส่งคำถามและรูปถ่ายถึงศัลยแพทย์ Apex ก่อนเดินทาง' },
  proc: { en: 'Procedure', th: 'หัตถการ' },
  procHint: { en: 'Which procedures are you asking about?', th: 'ต้องการปรึกษาหัตถการอะไร' },
  branch: { en: 'Branch', th: 'สาขา' },
  dates: { en: 'Travel dates', th: 'ช่วงเดินทาง' },
  datesHint: { en: 'When will you be in Thailand? Leave blank if you are not sure yet.', th: 'จะอยู่ในประเทศไทยช่วงไหน เว้นว่างได้ถ้ายังไม่แน่ใจ' },
  from: { en: 'Arrival', th: 'วันเดินทางถึง' },
  to: { en: 'Departure', th: 'วันเดินทางกลับ' },
  name: { en: 'Name', th: 'ชื่อ' },
  namePh: { en: 'Example: Sarah Collins', th: 'ตัวอย่าง: สมหญิง ใจดี' },
  country: { en: 'Country', th: 'ประเทศ' },
  countryPh: { en: 'Example: Australia', th: 'ตัวอย่าง: ออสเตรเลีย' },
  method: { en: 'Contact method', th: 'ช่องทางติดต่อกลับ' },
  methodHint: { en: 'How should the clinic reply to you?', th: 'ให้คลินิกตอบกลับทางไหน' },
  wa: { en: 'WhatsApp', th: 'WhatsApp' },
  line: { en: 'LINE', th: 'LINE' },
  email: { en: 'Email', th: 'อีเมล' },
  waNum: { en: 'WhatsApp number', th: 'หมายเลข WhatsApp' },
  waPh: { en: 'Example: +61 412 345 678', th: 'ตัวอย่าง: +66 81 234 5678' },
  lineId: { en: 'LINE ID', th: 'LINE ID' },
  linePh: { en: 'Example: sarah.c', th: 'ตัวอย่าง: somying.j' },
  emailAddr: { en: 'Email address', th: 'อีเมล' },
  emailPh: { en: 'Example: sarah@example.com', th: 'ตัวอย่าง: somying@example.com' },
  q: { en: 'Questions', th: 'คำถาม' },
  qHint: { en: 'What would you like the surgeon to know or answer?', th: 'อยากให้ศัลยแพทย์ทราบหรือตอบเรื่องอะไร' },
  qPh: { en: 'Example: I had rhinoplasty 5 years ago. Can the tip be revised?', th: 'ตัวอย่าง: เคยเสริมจมูกเมื่อ 5 ปีก่อน แก้ปลายจมูกได้ไหม' },
  photos: { en: 'Photos', th: 'รูปถ่าย' },
  photosHint: { en: 'Take each photo in daylight with your hair pulled back.', th: 'ถ่ายในที่แสงธรรมชาติและรวบผมให้เห็นใบหน้า' },
  photoNote: { en: 'Photos are sent once the clinic system is connected.', th: 'รูปถ่ายจะถูกส่งเมื่อเชื่อมต่อระบบของคลินิกแล้ว' },
  front: { en: 'Front', th: 'ด้านหน้า' },
  angle: { en: '45 degrees', th: 'มุม 45 องศา' },
  profile: { en: 'Profile', th: 'ด้านข้าง' },
  addPhoto: { en: 'Add photo', th: 'เพิ่มรูป' },
  change: { en: 'Change', th: 'เปลี่ยน' },
  remove: { en: 'Remove', th: 'ลบ' },
  photoErr: { en: 'The photo could not be read.', th: 'อ่านไฟล์รูปไม่ได้' },
  consent: { en: 'I agree to Apex Surgery Hospital using these details and photos to answer my enquiry.', th: 'ข้าพเจ้ายินยอมให้โรงพยาบาลศัลยกรรมตกแต่งเอเพ็กซ์ใช้ข้อมูลและรูปถ่ายนี้เพื่อตอบคำถามของข้าพเจ้า' },
  submit: { en: 'Send enquiry', th: 'ส่งคำถาม' },
  sending: { en: 'Sending', th: 'กำลังส่ง' },
  errs: { en: 'Check these fields:', th: 'ตรวจสอบช่องต่อไปนี้' },
  eProc: { en: 'Procedure: choose at least one.', th: 'หัตถการ: เลือกอย่างน้อยหนึ่งรายการ' },
  eBranch: { en: 'Branch: choose one.', th: 'สาขา: เลือกหนึ่งสาขา' },
  eDates: { en: 'Travel dates: the departure is before the arrival.', th: 'ช่วงเดินทาง: วันเดินทางกลับอยู่ก่อนวันเดินทางถึง' },
  eName: { en: 'Name: enter your name.', th: 'ชื่อ: กรอกชื่อของคุณ' },
  eCountry: { en: 'Country: enter your country.', th: 'ประเทศ: กรอกประเทศของคุณ' },
  eMethod: { en: 'Contact method: choose one.', th: 'ช่องทางติดต่อกลับ: เลือกหนึ่งช่องทาง' },
  eWa: { en: 'WhatsApp number: enter the number with its country code.', th: 'หมายเลข WhatsApp: กรอกหมายเลขพร้อมรหัสประเทศ' },
  eLine: { en: 'LINE ID: enter your LINE ID.', th: 'LINE ID: กรอก LINE ID ของคุณ' },
  eEmail: { en: 'Email address: the address is not valid.', th: 'อีเมล: รูปแบบอีเมลไม่ถูกต้อง' },
  eConsent: { en: 'Consent: tick the box to send the enquiry.', th: 'ความยินยอม: ทำเครื่องหมายในช่องเพื่อส่งคำถาม' },
  doneH: { en: 'Enquiry summary', th: 'สรุปคำถาม' },
  doneP: { en: 'Send this summary to the clinic on WhatsApp or LINE.', th: 'ส่งสรุปนี้ถึงคลินิกทาง WhatsApp หรือ LINE' },
  sendWa: { en: 'Send to WhatsApp', th: 'ส่งทาง WhatsApp' },
  sendLine: { en: 'Send to LINE', th: 'ส่งทาง LINE' },
  edit: { en: 'Edit enquiry', th: 'แก้ไขคำถาม' },
  textHead: { en: 'Online consultation: Apex Surgery Hospital', th: 'ปรึกษาแพทย์ออนไลน์: โรงพยาบาลศัลยกรรมตกแต่งเอเพ็กซ์' },
  contact: { en: 'Contact', th: 'ติดต่อกลับ' },
  photoCount: { en: 'Photos ready', th: 'รูปถ่ายที่เตรียมไว้' },
  none: { en: 'None', th: 'ไม่มี' }
};

const COUNTRIES = {
  en: ['Australia', 'United Kingdom', 'United States', 'Singapore', 'Hong Kong', 'China', 'Japan', 'South Korea', 'Philippines', 'United Arab Emirates', 'Germany', 'France', 'Myanmar', 'Cambodia', 'Thailand'],
  th: ['ออสเตรเลีย', 'สหราชอาณาจักร', 'สหรัฐอเมริกา', 'สิงคโปร์', 'ฮ่องกง', 'จีน', 'ญี่ปุ่น', 'เกาหลีใต้', 'ฟิลิปปินส์', 'สหรัฐอาหรับเอมิเรตส์', 'เยอรมนี', 'ฝรั่งเศส', 'เมียนมา', 'กัมพูชา', 'ไทย']
};

const VIEWS = ['front', 'angle', 'profile'];
/* Guide art in the empty photo boxes: the clinic's own face line drawings (front, 45 degrees, side), loaded on demand. */
const FACE_KEY = { front: 'FACE_FRONT', angle: 'FACE_45', profile: 'FACE_SIDE' };
const FACE_BOX = { front: '40 40 520 640', angle: '30 40 540 640', profile: '30 40 540 640' };
let facesP = null;
const loadFaces = () => facesP || (facesP = import('./faces.js').catch(() => null));
const CAM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4a2 2 0 0 1 1.76 1.05l.49.9A2 2 0 0 0 18 7h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2a2 2 0 0 0 1.76-1.05l.49-.9A2 2 0 0 1 10 4z"/><circle cx="12" cy="13" r="3.2"/></svg>';
const UP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4"/><path d="m7 9 5-5 5 5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>';

const CSS = `
.apxc{--c-plum:var(--plum,#6A388C);--c-plum7:var(--plum-700,#55286F);--c-night:var(--night,#1F0A30);--c-night2:var(--night-2,#2A0F40);
  --c-lilac:var(--lilac,#A886CD);--c-l3:var(--lilac-300,#C9B3DD);--c-l2:var(--lilac-200,#E4D8EE);--c-l1:var(--lilac-100,#F1EAF7);--c-wash:var(--wash,#FBF3FB);
  --c-ink:var(--ink,#2A1F33);--c-ink2:var(--ink-2,#5A4A66);--c-on:var(--on-night,#F6EEFB);--c-on2:var(--on-night-2,#CDB9DD);--c-rose:#CC3366;--c-err:#9E2050;
  --c-ease:cubic-bezier(.23,1,.32,1);
  font-family:"LINE Seed","Sarabun","Noto Sans Thai",system-ui,sans-serif;color:var(--c-ink);font-size:16px;line-height:1.6;-webkit-text-size-adjust:100%}
.apxc *,.apxc *::before,.apxc *::after{box-sizing:border-box}
.apxc button,.apxc input,.apxc textarea{font:inherit;color:inherit}
.apxc h2,.apxc h3,.apxc h4,.apxc p{margin:0}
.apxc .c-wrap{max-width:860px;margin:0 auto;padding:24px 16px 56px}
.apxc .c-wrap>h2{font-size:clamp(30px,6vw,44px);font-weight:800;letter-spacing:-.015em;line-height:1.1}
.apxc .c-intro{color:var(--c-ink2);margin-top:6px;max-width:56ch}
.apxc form{margin-top:22px;border-radius:28px;padding:22px 18px;background:radial-gradient(80% 50% at 100% 0%,rgba(201,179,221,.28),transparent 60%),linear-gradient(170deg,#fff,#fff 60%,var(--c-wash));box-shadow:0 1px 0 #fff inset,0 0 0 1px rgba(106,56,140,.1),0 40px 70px -46px rgba(63,27,85,.55)}
@media (min-width:700px){.apxc form{padding:30px 32px}}
.apxc fieldset{border:0;margin:0;padding:0;min-width:0}
.apxc .c-f{margin-top:22px}
.apxc form>.c-f:first-child{margin-top:0}
.apxc legend,.apxc .c-lab{display:block;padding:0;font-weight:800;font-size:17px}
.apxc label.c-lab{margin-bottom:6px}
.apxc .c-hint{display:block;font-size:14px;color:var(--c-ink2);margin:2px 0 10px}
.apxc legend+.c-opts,.apxc legend+.c-two{margin-top:10px}
.apxc .c-req{color:var(--c-rose);font-weight:800;margin-left:2px}
.apxc .c-opts{display:flex;flex-wrap:wrap;gap:8px}
.apxc .c-opt{position:relative}
.apxc .c-opt input{position:absolute;opacity:0;inset:0;margin:0;cursor:pointer}
.apxc .c-opt span{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;border-radius:999px;border:1.5px solid var(--c-l3);background:#fff;color:var(--c-plum7);font-weight:700;font-size:15px;transition:background-color .2s,border-color .2s,color .2s}
.apxc .c-opt span::before{content:"";width:16px;height:16px;border-radius:5px;border:1.5px solid var(--c-l3);background:#fff;flex:none}
.apxc .c-opt input[type=radio]+span::before{border-radius:50%}
.apxc .c-opt input:checked+span{background:var(--c-plum);border-color:var(--c-plum);color:#fff}
.apxc .c-opt input:checked+span::before{border-color:#fff;background:#fff;box-shadow:inset 0 0 0 4px var(--c-plum)}
.apxc .c-opt input[type=checkbox]:checked+span::before{box-shadow:none;background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3.5 8.5l3 3 6-7' fill='none' stroke='%236A388C' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/14px no-repeat}
.apxc .c-opt input:focus-visible+span{outline:3px solid var(--c-lilac);outline-offset:2px}
.apxc .c-two{display:grid;gap:12px}
@media (min-width:560px){.apxc .c-two{grid-template-columns:1fr 1fr}}
.apxc .c-sub{display:block;font-size:14px;font-weight:700;color:var(--c-ink2);margin-bottom:4px}
.apxc input[type=text],.apxc input[type=email],.apxc input[type=tel],.apxc input[type=date],.apxc textarea{width:100%;min-height:48px;border:1.5px solid var(--c-l3);border-radius:12px;padding:0 12px;background:var(--c-wash);font-size:16px}
.apxc textarea{min-height:120px;padding:10px 12px;line-height:1.5;resize:vertical}
.apxc input:focus,.apxc textarea:focus{outline:none;border-color:var(--c-plum);box-shadow:0 0 0 3px rgba(168,134,205,.35)}
.apxc [aria-invalid=true]{border-color:var(--c-err)!important;background:#FFF5F8!important}
.apxc .c-err{color:var(--c-err);font-size:14px;font-weight:700;margin-top:6px}
.apxc .c-err::before{content:"";display:inline-block;width:8px;height:8px;margin-right:8px;background:var(--c-err);transform:rotate(45deg);border-radius:1px;vertical-align:1px}
.apxc .c-contact{margin-top:12px}
.apxc .c-photos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;max-width:600px}
.apxc .c-ph{display:flex;flex-direction:column;gap:8px;min-width:0}
.apxc .c-slot{--ang:0deg;position:relative;isolation:isolate;aspect-ratio:3/4;border-radius:22px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:0 8px 14px;color:var(--c-plum);overflow:hidden;cursor:pointer;
  background:radial-gradient(90% 60% at 50% 0%,rgba(201,179,221,.55),transparent 70%),radial-gradient(70% 50% at 100% 100%,rgba(204,51,102,.14),transparent 70%),linear-gradient(170deg,#fff 0%,var(--c-wash) 45%,var(--c-l1) 100%);
  box-shadow:0 1px 0 rgba(255,255,255,.9) inset,0 22px 40px -26px rgba(63,27,85,.55),0 6px 14px -8px rgba(63,27,85,.2);
  transition:transform .4s var(--c-ease),box-shadow .4s var(--c-ease)}
.apxc .c-slot::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1.5px;z-index:3;pointer-events:none;
  background:conic-gradient(from var(--ang),rgba(201,179,221,.5),#fff 8%,var(--c-l3) 14%,rgba(142,45,207,.7) 24%,rgba(204,51,102,.55) 32%,rgba(201,179,221,.45) 44%,rgba(201,179,221,.45) 70%,#fff 78%,rgba(201,179,221,.5));
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
.apxc .c-slot::after{content:"";position:absolute;inset:7px;border-radius:16px;border:1px dashed rgba(106,56,140,.22);pointer-events:none;z-index:1;transition:border-color .3s}
@property --ang{syntax:"<angle>";inherits:false;initial-value:0deg}
@keyframes apxcSpin{to{--ang:360deg}}
@media (hover:hover){.apxc .c-slot:hover{transform:translateY(-4px);box-shadow:0 1px 0 rgba(255,255,255,.9) inset,0 34px 54px -28px rgba(63,27,85,.6),0 10px 20px -10px rgba(63,27,85,.24)}
  .apxc .c-slot:hover::before{animation:apxcSpin 3.2s linear infinite}
  .apxc .c-slot:hover .c-cam{transform:translateY(-3px) scale(1.06)}}
.apxc .c-slot:active{transform:scale(.97);transition-duration:.12s}
.apxc .c-slot.drag{transform:scale(1.02)}
.apxc .c-slot.drag::before{animation:apxcSpin 1.4s linear infinite}
.apxc .c-slot.drag::after{border-color:var(--c-plum)}
.apxc .c-guide{position:absolute;inset:6% 9% 33%;z-index:0;display:grid;place-items:center;color:var(--c-plum);opacity:.62;transition:opacity .3s}
.apxc .c-guide svg{width:100%;height:100%;overflow:visible}
.apxc .c-guide svg:empty{display:none}
.apxc .c-scan{position:absolute;left:-6%;right:-6%;top:0;height:22%;background:linear-gradient(180deg,transparent,rgba(204,51,102,.0) 30%,rgba(204,51,102,.28) 92%,rgba(255,255,255,.95) 96%,transparent 100%);mix-blend-mode:multiply;border-radius:4px;animation:apxcScan 3.6s cubic-bezier(.77,0,.175,1) infinite;pointer-events:none;opacity:.8}
@keyframes apxcScan{0%{transform:translateY(-30%);opacity:0}12%{opacity:.85}88%{opacity:.85}100%{transform:translateY(420%);opacity:0}}
.apxc .c-ph:nth-child(2) .c-scan{animation-delay:.5s}.apxc .c-ph:nth-child(3) .c-scan{animation-delay:1s}
.apxc .c-cnr{position:absolute;inset:14px;z-index:1;pointer-events:none;background:
  linear-gradient(var(--c-plum),var(--c-plum)) left top/16px 2px no-repeat,linear-gradient(var(--c-plum),var(--c-plum)) left top/2px 16px no-repeat,
  linear-gradient(var(--c-plum),var(--c-plum)) right top/16px 2px no-repeat,linear-gradient(var(--c-plum),var(--c-plum)) right top/2px 16px no-repeat,
  linear-gradient(var(--c-plum),var(--c-plum)) left bottom/16px 2px no-repeat,linear-gradient(var(--c-plum),var(--c-plum)) left bottom/2px 16px no-repeat,
  linear-gradient(var(--c-plum),var(--c-plum)) right bottom/16px 2px no-repeat,linear-gradient(var(--c-plum),var(--c-plum)) right bottom/2px 16px no-repeat;opacity:.45}
.apxc .c-cam{position:relative;z-index:2;width:48px;height:48px;border-radius:50%;display:grid;place-items:center;color:#fff;margin-bottom:8px;
  background:linear-gradient(150deg,var(--c-plum),#8a3fa8 60%,var(--c-rose) 140%);box-shadow:0 12px 22px -10px rgba(106,56,140,.85),inset 0 1px 0 rgba(255,255,255,.35);transition:transform .35s var(--c-ease)}
.apxc .c-cam svg{width:22px;height:22px}
.apxc .c-cam::after{content:"";position:absolute;inset:-6px;border-radius:50%;border:2px solid rgba(106,56,140,.45);animation:apxcPulse 2.2s var(--c-ease) infinite}
@keyframes apxcPulse{from{transform:scale(.85);opacity:.9}to{transform:scale(1.35);opacity:0}}
.apxc .c-slot b{position:relative;z-index:2;display:inline-flex;align-items:center;gap:6px;min-height:28px;padding:0 12px;border-radius:999px;background:rgba(255,255,255,.88);box-shadow:0 0 0 1px rgba(106,56,140,.14);font-size:13px;color:var(--c-plum);text-align:center;line-height:1.2}
.apxc .c-slot b svg{width:14px;height:14px}
.apxc .c-slot input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;z-index:4}
.apxc .c-slot:focus-within{outline:3px solid var(--c-lilac);outline-offset:3px}
.apxc .c-slot img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;animation:apxcIn .5s var(--c-ease) both}
@keyframes apxcIn{from{opacity:0;transform:scale(1.04);filter:blur(6px)}}
.apxc .c-slot.has .c-guide,.apxc .c-slot.has .c-cnr,.apxc .c-slot.has::after{opacity:0}
.apxc .c-slot.has .c-cam{width:38px;height:38px;position:absolute;top:10px;right:10px;margin:0}
.apxc .c-slot.has .c-cam::after{display:none}
.apxc .c-slot.has .c-cam svg{width:18px;height:18px}
.apxc .c-slot.has b{background:rgba(31,10,48,.72);color:#fff;box-shadow:none}
.apxc .c-ph>span{font-size:14px;font-weight:800;text-align:center;color:var(--c-ink)}
.apxc .c-rm{min-height:36px;border-radius:999px;border:1.5px solid var(--c-l2);background:#fff;color:var(--c-ink2);font-size:13px;font-weight:700;cursor:pointer;transition:background-color .2s,transform .16s var(--c-ease)}
.apxc .c-rm:hover{background:var(--c-l1)}
.apxc .c-rm:active{transform:scale(.97)}
@media (max-width:420px){.apxc .c-photos{gap:8px}.apxc .c-cam{width:40px;height:40px}.apxc .c-cam svg{width:18px;height:18px}.apxc .c-slot{border-radius:18px;padding-bottom:10px}.apxc .c-slot b{font-size:12px;padding:0 8px}.apxc .c-cnr{inset:10px}}
@media (prefers-reduced-motion:reduce){.apxc .c-scan,.apxc .c-cam::after,.apxc .c-slot:hover::before,.apxc .c-slot.drag::before{animation:none!important}.apxc .c-scan{display:none}}
.apxc .c-note{margin-top:10px;font-size:14px;color:var(--c-plum7);font-weight:700}
.apxc .c-consent{display:flex;gap:12px;align-items:flex-start;padding:14px;border-radius:12px;background:var(--c-l1);cursor:pointer}
.apxc .c-consent input{width:22px;height:22px;margin:2px 0 0;flex:none;accent-color:var(--c-plum)}
.apxc .c-consent span{font-size:15px}
.apxc .c-sum{margin-top:22px;border:1.5px solid var(--c-err);background:#FFF5F8;border-radius:12px;padding:12px 14px}
.apxc .c-sum p{font-weight:800;color:var(--c-err)}
.apxc .c-sum ul{margin:4px 0 0;padding-left:20px}
.apxc .c-sum a{color:var(--c-err);font-weight:700}
.apxc .c-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;padding:0 24px;border-radius:999px;border:2px solid transparent;font-weight:700;font-size:16px;cursor:pointer;text-decoration:none;transition:transform .16s var(--c-ease),background-color .2s,border-color .2s}
.apxc .c-btn:active{transform:scale(.97)}
.apxc .c-btn svg{width:22px;height:22px;flex:none}
.apxc .c-btn.plum{background:var(--c-plum);color:#fff}
.apxc .c-btn.plum:hover{background:var(--c-plum7)}
.apxc .c-btn.rose{background:var(--c-rose);color:#fff}
.apxc .c-btn.wa{background:#1F8F4E;color:#fff}
.apxc .c-btn.line{background:#06A33C;color:#fff}
.apxc .c-btn.ghost{background:#fff;color:var(--c-plum);border-color:var(--c-l3)}
.apxc .c-btn[disabled]{opacity:.5;cursor:progress}
.apxc .c-submit{margin-top:24px;width:100%}
@media (min-width:560px){.apxc .c-submit{width:auto;min-width:240px}}
.apxc :is(a,button,input,textarea):focus-visible{outline:3px solid var(--c-lilac);outline-offset:2px}
.apxc .c-done{margin-top:22px;background:#fff;border:1px solid var(--c-l2);border-radius:28px;overflow:hidden}
.apxc .c-done-h{padding:22px 20px;background:linear-gradient(155deg,var(--c-night2),var(--c-plum7));color:var(--c-on)}
.apxc .c-done-h h3{font-size:24px;font-weight:800;color:#fff}
.apxc .c-done-h p{color:var(--c-on2);margin-top:4px}
.apxc .c-done dl{margin:0;padding:18px 20px;display:grid;grid-template-columns:minmax(120px,auto) 1fr;gap:8px 18px;font-size:15px}
.apxc .c-done dt{color:var(--c-ink2)}
.apxc .c-done dd{margin:0;font-weight:700;white-space:pre-wrap;word-break:break-word}
@media (max-width:480px){.apxc .c-done dl{grid-template-columns:1fr;gap:0}.apxc .c-done dd{margin-bottom:10px}}
.apxc .c-thumbs{display:flex;gap:8px;padding:0 20px 8px}
.apxc .c-thumbs img{width:64px;height:84px;object-fit:cover;border-radius:12px;border:1px solid var(--c-l2)}
.apxc .c-done .c-acts{display:grid;gap:10px;padding:8px 20px 22px}
@media (min-width:640px){.apxc .c-done .c-acts{grid-template-columns:1fr 1fr 1fr}}
.apxc [hidden]{display:none!important}
.apxc .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (prefers-reduced-motion:reduce){.apxc *{transition:none!important}}
`;

const ICON = {
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.2-.2-.4-.3z"/></svg>',
  line: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3C6.5 3 2 6.6 2 11c0 4 3.6 7.3 8.4 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6A7.5 7.5 0 0 0 22 11c0-4.4-4.5-8-10-8z"/></svg>'
};

function injectCSS() {
  if (document.getElementById('apxc-css')) return;
  const s = document.createElement('style'); s.id = 'apxc-css'; s.textContent = CSS; document.head.append(s);
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
const fmtDate = (iso, lang) => !iso ? '' : new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)))
  .toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });

export function mount(container, opts = {}) {
  injectCSS();
  const lang = opts.lang === 'th' ? 'th' : 'en';
  const L = o => t(o, lang);
  const emit = (n, d) => { try { opts.onEvent && opts.onEvent(n, d); } catch (e) { /* host handler error */ } };
  const uid = 'apxc' + Math.random().toString(36).slice(2, 7);
  const id = s => `${uid}-${s}`;
  const urls = [];

  /* prefill from My Plan */
  const plan = store.get();
  const pre = {
    procs: (plan.trip && plan.trip.procedures) || [...new Set(plan.procedures.map(p => p.key))],
    branch: (plan.trip && plan.trip.branch) || '',
    from: (plan.trip && plan.trip.arrival) || '',
    to: (plan.trip && plan.trip.flyHome) || ''
  };

  const root = h('div', { class: 'apxc', lang });
  const wrap = h('div', { class: 'c-wrap' }, h('h2', null, L(T.title)), h('p', { class: 'c-intro' }, L(T.intro)));
  root.append(wrap);
  container.append(root);

  const req = () => h('span', { class: 'c-req', 'aria-hidden': 'true' }, '*');
  const err = key => h('p', { class: 'c-err', id: id('e-' + key), hidden: true });
  const photos = {};

  /* ----- fields ----- */
  const fProc = h('fieldset', { class: 'c-f', id: id('proc'), 'aria-describedby': `${id('h-proc')} ${id('e-proc')}` },
    h('legend', null, L(T.proc), req()),
    h('span', { class: 'c-hint', id: id('h-proc') }, L(T.procHint)),
    h('div', { class: 'c-opts' }, PROC_KEYS.map(k => h('label', { class: 'c-opt' },
      h('input', { type: 'checkbox', name: 'procedure', value: k, checked: pre.procs.includes(k) }), h('span', null, procName(k, lang))))),
    err('proc'));
  const fBranch = h('fieldset', { class: 'c-f', id: id('branch'), 'aria-describedby': id('e-branch') },
    h('legend', null, L(T.branch), req()),
    h('div', { class: 'c-opts' }, BRANCH_KEYS.map(k => h('label', { class: 'c-opt' },
      h('input', { type: 'radio', name: uid + '-branch', value: k, checked: pre.branch === k }), h('span', null, L(BRANCHES[k]))))),
    err('branch'));
  const dFrom = h('input', { type: 'date', id: id('from'), name: 'from', value: pre.from });
  const dTo = h('input', { type: 'date', id: id('to'), name: 'to', value: pre.to, 'aria-describedby': id('e-dates') });
  const fDates = h('fieldset', { class: 'c-f', 'aria-describedby': id('h-dates') },
    h('legend', null, L(T.dates)),
    h('span', { class: 'c-hint', id: id('h-dates') }, L(T.datesHint)),
    h('div', { class: 'c-two' },
      h('div', null, h('label', { class: 'c-sub', for: id('from') }, L(T.from)), dFrom),
      h('div', null, h('label', { class: 'c-sub', for: id('to') }, L(T.to)), dTo)),
    err('dates'));
  const iName = h('input', { type: 'text', id: id('name'), name: 'name', autocomplete: 'name', placeholder: L(T.namePh), maxlength: '80', 'aria-describedby': id('e-name') });
  const iCountry = h('input', { type: 'text', id: id('country'), name: 'country', autocomplete: 'country-name', list: id('cl'), placeholder: L(T.countryPh), maxlength: '60', 'aria-describedby': id('e-country') });
  const fWho = h('div', { class: 'c-f c-two' },
    h('div', null, h('label', { class: 'c-lab', for: id('name') }, L(T.name), req()), iName, err('name')),
    h('div', null, h('label', { class: 'c-lab', for: id('country') }, L(T.country), req()), iCountry, err('country'),
      h('datalist', { id: id('cl') }, COUNTRIES[lang].map(c => h('option', { value: c })))));

  const METHOD = {
    whatsapp: { lab: T.waNum, ph: T.waPh, type: 'tel', ac: 'tel', err: T.eWa, short: T.wa },
    line: { lab: T.lineId, ph: T.linePh, type: 'text', ac: 'off', err: T.eLine, short: T.line },
    email: { lab: T.emailAddr, ph: T.emailPh, type: 'email', ac: 'email', err: T.eEmail, short: T.email }
  };
  const contactVals = { whatsapp: '', line: '', email: '' };
  let method = '';
  const cLab = h('label', { class: 'c-lab', for: id('contact') });
  const cIn = h('input', { id: id('contact'), name: 'contact', 'aria-describedby': id('e-contact') });
  const cBox = h('div', { class: 'c-contact', hidden: true }, cLab, cIn, err('contact'));
  const fMethod = h('fieldset', { class: 'c-f', id: id('method'), 'aria-describedby': `${id('h-method')} ${id('e-method')}` },
    h('legend', null, L(T.method), req()),
    h('span', { class: 'c-hint', id: id('h-method') }, L(T.methodHint)),
    h('div', { class: 'c-opts' }, Object.keys(METHOD).map(k => h('label', { class: 'c-opt' },
      h('input', { type: 'radio', name: uid + '-method', value: k }), h('span', null, L(METHOD[k].short))))),
    err('method'), cBox);
  fMethod.addEventListener('change', e => {
    if (e.target.name !== uid + '-method') return;
    if (method) contactVals[method] = cIn.value;
    method = e.target.value;
    const M = METHOD[method];
    cLab.textContent = ''; cLab.append(L(M.lab), req());
    cIn.type = M.type; cIn.autocomplete = M.ac; cIn.placeholder = L(M.ph);
    cIn.inputMode = M.type === 'tel' ? 'tel' : M.type === 'email' ? 'email' : 'text';
    cIn.value = contactVals[method];
    cBox.hidden = false;
    setErr('method', null); setErr('contact', null);
  });

  const iQ = h('textarea', { id: id('q'), name: 'questions', maxlength: '2000', placeholder: L(T.qPh), 'aria-describedby': id('h-q') });
  const fQ = h('div', { class: 'c-f' }, h('label', { class: 'c-lab', for: id('q') }, L(T.q)), h('span', { class: 'c-hint', id: id('h-q') }, L(T.qHint)), iQ);

  const slots = VIEWS.map(v => {
    const input = h('input', { type: 'file', accept: 'image/*', id: id('ph-' + v), 'aria-label': `${L(T.photos)}: ${L(T[v])}` });
    const label = h('b', { html: UP }, L(T.addPhoto));
    const guide = h('span', { class: 'c-guide', 'aria-hidden': 'true' }, h('span', { class: 'c-scan' }));
    const slot = h('label', { class: 'c-slot', 'data-view': v }, guide, h('span', { class: 'c-cnr', 'aria-hidden': 'true' }), h('span', { class: 'c-cam', 'aria-hidden': 'true', html: CAM }), label, input);
    loadFaces().then(F => { if (F && F[FACE_KEY[v]]) guide.insertAdjacentHTML('afterbegin', `<svg viewBox="${FACE_BOX[v]}" preserveAspectRatio="xMidYMid meet">${F[FACE_KEY[v]]}</svg>`); });
    ['dragenter', 'dragover'].forEach(n => slot.addEventListener(n, () => slot.classList.add('drag')));
    ['dragleave', 'drop'].forEach(n => slot.addEventListener(n, () => slot.classList.remove('drag')));
    const rm = h('button', { type: 'button', class: 'c-rm', hidden: true }, L(T.remove));
    const perr = h('p', { class: 'c-err', hidden: true, role: 'alert' });
    const set = file => {
      slot.querySelector('img') && slot.querySelector('img').remove();
      perr.hidden = true;
      if (!file) { delete photos[v]; slot.classList.remove('has'); rm.hidden = true; label.innerHTML = UP; label.append(L(T.addPhoto)); input.value = ''; return; }
      const url = URL.createObjectURL(file); urls.push(url);
      const img = h('img', { alt: `${L(T[v])}`, src: url });
      img.onerror = () => { set(null); perr.textContent = L(T.photoErr); perr.hidden = false; };
      slot.insertBefore(img, input);
      photos[v] = { file, url };
      slot.classList.add('has'); rm.hidden = false; label.textContent = L(T.change);
    };
    input.addEventListener('change', () => {
      const f = input.files && input.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type)) { set(null); perr.textContent = L(T.photoErr); perr.hidden = false; return; }
      set(f);
    });
    rm.addEventListener('click', () => { set(null); input.focus(); });
    return h('div', { class: 'c-ph' }, slot, h('span', null, L(T[v])), rm, perr);
  });
  const fPhotos = h('fieldset', { class: 'c-f', 'aria-describedby': `${id('h-ph')} ${id('n-ph')}` },
    h('legend', null, L(T.photos)),
    h('span', { class: 'c-hint', id: id('h-ph') }, L(T.photosHint)),
    h('div', { class: 'c-photos' }, slots),
    h('p', { class: 'c-note', id: id('n-ph') }, L(T.photoNote)));

  const consent = h('input', { type: 'checkbox', id: id('consent'), name: 'consent', 'aria-describedby': id('e-consent') });
  const fConsent = h('div', { class: 'c-f' }, h('label', { class: 'c-consent', for: id('consent') }, consent, h('span', null, L(T.consent), req())), err('consent'));

  const summary = h('div', { class: 'c-sum', hidden: true, tabindex: '-1', role: 'alert' });
  const submit = h('button', { type: 'submit', class: 'c-btn rose c-submit' }, L(T.submit));
  const form = h('form', { novalidate: true }, fProc, fBranch, fDates, fWho, fMethod, fQ, fPhotos, fConsent, summary, submit);
  wrap.append(form);

  /* ----- validation ----- */
  const ERRKEYS = {};
  function setErr(key, msg, target) {
    const e = form.querySelector('#' + id('e-' + key));
    if (!e) return;
    e.hidden = !msg; e.textContent = msg || '';
    if (target) target.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (msg) ERRKEYS[key] = msg; else delete ERRKEYS[key];
  }
  const values = () => ({
    procedures: [...fProc.querySelectorAll('input:checked')].map(i => i.value),
    branch: (fBranch.querySelector('input:checked') || {}).value || '',
    from: dFrom.value, to: dTo.value,
    name: iName.value.trim(), country: iCountry.value.trim(),
    method, contact: cIn.value.trim(),
    questions: iQ.value.trim(),
    consent: consent.checked
  });
  function validate() {
    const v = values();
    const out = [];
    const chk = (key, bad, msg, target, focus) => { setErr(key, bad ? L(msg) : null, target); if (bad) out.push({ key, msg: L(msg), focus: focus || target }); };
    chk('proc', !v.procedures.length, T.eProc, null, fProc.querySelector('input'));
    chk('branch', !v.branch, T.eBranch, null, fBranch.querySelector('input'));
    chk('dates', v.from && v.to && v.to < v.from, T.eDates, dTo);
    chk('name', v.name.length < 2, T.eName, iName);
    chk('country', v.country.length < 2, T.eCountry, iCountry);
    chk('method', !v.method, T.eMethod, null, fMethod.querySelector('input'));
    if (v.method) {
      const bad = v.method === 'whatsapp' ? v.contact.replace(/\D/g, '').length < 8
        : v.method === 'email' ? !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.contact) : v.contact.length < 2;
      chk('contact', bad, METHOD[v.method].err, cIn);
    }
    chk('consent', !v.consent, T.eConsent, consent);
    return out;
  }
  let tried = false;
  form.addEventListener('input', () => { if (tried) { const e = validate(); renderSummary(e); } });
  form.addEventListener('change', () => { if (tried) { const e = validate(); renderSummary(e); } });
  function renderSummary(errs) {
    summary.textContent = '';
    summary.hidden = !errs.length;
    if (!errs.length) return;
    summary.append(h('p', null, L(T.errs)), h('ul', null, errs.map(e => h('li', null,
      h('a', { href: '#', onclick: ev => { ev.preventDefault(); e.focus && e.focus.focus(); } }, e.msg)))));
  }

  /* ----- submit ----- */
  form.addEventListener('submit', async e => {
    e.preventDefault();
    tried = true;
    const errs = validate();
    renderSummary(errs);
    if (errs.length) {
      emit('consult:invalid', { fields: errs.map(x => x.key) });
      errs[0].focus && errs[0].focus.focus();
      return;
    }
    const v = values();
    const payload = {
      fields: { ...v, lang, photoViews: VIEWS.filter(x => photos[x]) },
      photos: VIEWS.filter(x => photos[x]).map(x => ({ view: x, file: photos[x].file }))
    };
    submit.disabled = true; submit.textContent = L(T.sending);
    let res;
    try { res = await send(payload); } catch (er) { res = { sent: false, error: String(er && er.message || er) }; }
    submit.disabled = false; submit.textContent = L(T.submit);
    emit('consult:submit', { ...payload.fields, consent: true, sent: !!(res && res.sent) });
    showDone(v);
  });

  function summaryText(v) {
    const lines = [L(T.textHead),
      `${L(T.proc)}: ${v.procedures.map(k => procName(k, lang)).join(', ')}`,
      `${L(T.branch)}: ${L(BRANCHES[v.branch])}`];
    if (v.from || v.to) lines.push(`${L(T.dates)}: ${[fmtDate(v.from, lang), fmtDate(v.to, lang)].filter(Boolean).join(lang === 'th' ? ' ถึง ' : ' to ')}`);
    lines.push(`${L(T.name)}: ${v.name}`, `${L(T.country)}: ${v.country}`, `${L(T.contact)}: ${L(METHOD[v.method].short)} ${v.contact}`);
    const pv = VIEWS.filter(x => photos[x]);
    if (pv.length) lines.push(`${L(T.photoCount)}: ${pv.map(x => L(T[x])).join(', ')}`);
    if (v.questions) lines.push('', `${L(T.q)}:`, v.questions);
    return lines.join('\n');
  }

  let done = null;
  function showDone(v) {
    const txt = summaryText(v);
    const pv = VIEWS.filter(x => photos[x]);
    const rows = [
      [L(T.proc), v.procedures.map(k => procName(k, lang)).join(', ')],
      [L(T.branch), L(BRANCHES[v.branch])],
      (v.from || v.to) ? [L(T.dates), [fmtDate(v.from, lang), fmtDate(v.to, lang)].filter(Boolean).join(lang === 'th' ? ' ถึง ' : ' to ')] : null,
      [L(T.name), v.name], [L(T.country), v.country],
      [L(T.contact), `${L(METHOD[v.method].short)} ${v.contact}`],
      v.questions ? [L(T.q), v.questions] : null,
      [L(T.photoCount), pv.length ? pv.map(x => L(T[x])).join(', ') : L(T.none)]
    ].filter(Boolean);
    done = h('section', { class: 'c-done', tabindex: '-1', 'aria-labelledby': id('dh') },
      h('div', { class: 'c-done-h' }, h('h3', { id: id('dh') }, L(T.doneH)), h('p', null, L(T.doneP))),
      h('dl', null, rows.map(r => [h('dt', null, r[0]), h('dd', null, r[1])])),
      pv.length ? h('div', { class: 'c-thumbs' }, pv.map(x => h('img', { src: photos[x].url, alt: L(T[x]) }))) : null,
      h('div', { class: 'c-acts' },
        h('a', { class: 'c-btn wa', 'data-act': 'wa', target: '_blank', rel: 'noopener', href: `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(txt)}`, html: ICON.wa + `<span>${L(T.sendWa)}</span>` }),
        h('a', { class: 'c-btn line', 'data-act': 'line', target: '_blank', rel: 'noopener', href: `https://line.me/R/oaMessage/${LINE_OA}/?${encodeURIComponent(txt)}`, html: ICON.line + `<span>${L(T.sendLine)}</span>` }),
        h('button', { type: 'button', class: 'c-btn ghost', 'data-act': 'edit', onclick: () => { done.remove(); done = null; form.hidden = false; iName.focus(); } }, L(T.edit))));
    done.querySelectorAll('a[data-act]').forEach(a => a.addEventListener('click', () => emit('consult:send', { channel: a.dataset.act })));
    form.hidden = true;
    wrap.append(done);
    done.focus({ preventScroll: false });
  }

  return {
    destroy() { urls.forEach(u => URL.revokeObjectURL(u)); root.remove(); },
    summaryText: () => summaryText(values())
  };
}
