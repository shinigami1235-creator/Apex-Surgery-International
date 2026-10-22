/* Apex games hub: games grid, daily tries, play flow, results, prize claim and vouchers.
   mount(container, {lang, base, serviceUrl, onEvent}) -> {destroy()} */
import { css, h, tx, fmt, store, bkkDay, bkkMonth, msToBkkMidnight, makeRng, newSeed, sfx, music, reduced, pop, GRAIN, LATTICE, SILK } from './framework.js';
import { GAMES, GAME_IDS, DAILY_TRIES, LEARN_BONUS_TRIES, LEARN_SET_SIZE, VOUCHER_DAYS, CODE_PREFIX, tierFor, nextTier } from './config.js';
import { mountLearn } from './learn.js';
import { artSVG } from './art.js';
import factrush from './factrush.js';
import recoverysort from './recoverysort.js';
import memorymatch from './memorymatch.js';

const BUILT_IN = { factrush, recoverysort, memorymatch };
const EXTERNAL = { steady: './steady.js', proportion: './proportion.js' };

/* ---------------- strings ---------------- */
const T = {
  games: { en: 'Games', th: 'เกม' },
  intro: { en: 'Reach a prize score in a scored run to claim an Apex voucher.', th: 'ทำคะแนนถึงเกณฑ์รางวัลในรอบนับคะแนนเพื่อรับบัตรกำนัลจาก Apex' },
  tries: { en: n => n === 1 ? '1 try left today' : `${n} tries left today`, th: n => `วันนี้เหลือ ${n} สิทธิ์` },
  music: { en: 'Music', th: 'เพลง' },
  effects: { en: 'Sound effects', th: 'เสียงประกอบ' },
  best: { en: 'Personal best', th: 'คะแนนสูงสุดของคุณ' },
  noBest: { en: 'No score yet', th: 'ยังไม่มีคะแนน' },
  prizes: { en: 'Prizes', th: 'รางวัล' },
  prize: { en: 'Prize', th: 'รางวัล' },
  pts: { en: 'points', th: 'คะแนน' },
  ptsCol: { en: 'Points', th: 'คะแนน' },
  from: { en: 'Prizes from {s} points', th: 'รางวัลเริ่มที่ {s} คะแนน' },
  topMonth: { en: 'No. 1', th: 'อันดับ 1' },
  play: { en: 'Play', th: 'เล่น' },
  soon: { en: 'Coming soon', th: 'เร็ว ๆ นี้' },
  learn: { en: 'Learn', th: 'เรียนรู้' },
  learnHow: { en: 'Eight fact or myth questions at your own pace.', th: 'คำถามจริงหรือเข้าใจผิด 8 ข้อ ทำได้ตามจังหวะของคุณ' },
  learnDone: { en: 'Extra try added today', th: 'วันนี้ได้รับสิทธิ์เพิ่มแล้ว' },
  lQuestions: { en: 'Questions', th: 'จำนวนข้อ' },
  lTimer: { en: 'Timer', th: 'เวลา' },
  lNoTimer: { en: 'None', th: 'ไม่จับเวลา' },
  lReward: { en: 'Reward', th: 'รางวัล' },
  lRewardV: { en: '+1 scored try today', th: '+1 สิทธิ์นับคะแนนวันนี้' },
  start: { en: 'Start', th: 'เริ่ม' },
  vouchers: { en: 'My vouchers', th: 'บัตรกำนัลของฉัน' },
  noVouchers: { en: 'No vouchers yet.', th: 'ยังไม่มีบัตรกำนัล' },
  show: { en: 'Show', th: 'เปิดดู' },
  validUntil: { en: 'Valid until', th: 'ใช้ได้ถึง' },
  expired: { en: 'Expired', th: 'หมดอายุ' },
  back: { en: 'Games', th: 'เกม' },
  practice: { en: 'Practice', th: 'ฝึกเล่น' },
  practiceNote: { en: 'Practice runs are unlimited and do not win prizes.', th: 'เล่นฝึกได้ไม่จำกัดจำนวนครั้งและไม่มีรางวัล' },
  scored: { en: 'Scored run', th: 'เล่นนับคะแนน' },
  scoredNote: { en: 'Scored runs count toward prizes and the monthly board.', th: 'รอบนับคะแนนใช้ชิงรางวัลและขึ้นกระดานคะแนนประจำเดือน' },
  resetNote: { en: 'Tries reset at midnight, Bangkok time.', th: 'สิทธิ์รีเซ็ตเวลาเที่ยงคืนตามเวลากรุงเทพฯ' },
  board: { en: 'Monthly board', th: 'กระดานคะแนนประจำเดือน' },
  you: { en: 'You', th: 'คุณ' },
  noOthers: { en: 'No other scores yet this month.', th: 'เดือนนี้ยังไม่มีคะแนนของผู้เล่นอื่น' },
  noScores: { en: 'No scores yet this month.', th: 'เดือนนี้ยังไม่มีคะแนน' },
  quit: { en: 'Quit', th: 'ออก' },
  quitSure: { en: 'Tap again', th: 'แตะอีกครั้ง' },
  score: { en: 'Score', th: 'คะแนน' },
  level: { en: 'Level', th: 'ระดับ' },
  lives: { en: 'Lives', th: 'ชีวิต' },
  time: { en: 'Time', th: 'เวลา' },
  tagPractice: { en: 'Practice', th: 'ฝึกเล่น' },
  tagScored: { en: 'Scored', th: 'นับคะแนน' },
  levelReached: { en: 'Level reached', th: 'ระดับที่ไปถึง' },
  newBest: { en: 'New personal best', th: 'สถิติใหม่ของคุณ' },
  prizeReached: { en: 'Prize reached', th: 'รางวัลที่ได้' },
  nextPrize: { en: 'Next prize: {p} at {s} points.', th: 'รางวัลถัดไป: {p} ที่ {s} คะแนน' },
  allPrizes: { en: 'All prize tiers reached.', th: 'ได้ครบทุกระดับรางวัลแล้ว' },
  practiceNoPrize: { en: 'Practice runs do not win prizes.', th: 'รอบฝึกเล่นไม่มีรางวัล' },
  claim: { en: 'Claim voucher', th: 'รับบัตรกำนัล' },
  showVoucher: { en: 'Show voucher', th: 'เปิดดูบัตรกำนัล' },
  again: { en: 'Play again', th: 'เล่นอีกครั้ง' },
  signIn: { en: 'Sign in to claim {p}.', th: 'เข้าสู่ระบบเพื่อรับ{p}' },
  line: { en: 'Continue with LINE', th: 'ดำเนินการต่อด้วย LINE' },
  email: { en: 'Email', th: 'อีเมล' },
  whatsapp: { en: 'WhatsApp', th: 'WhatsApp' },
  previewSignIn: { en: 'Sign-in is not connected in this preview.', th: 'ตัวอย่างนี้ยังไม่ได้เชื่อมต่อระบบเข้าสู่ระบบ' },
  details: { en: 'Your details', th: 'ข้อมูลของคุณ' },
  name: { en: 'Name on voucher', th: 'ชื่อบนบัตรกำนัล' },
  namePh: { en: 'e.g. Anna Lee', th: 'เช่น สมหญิง ใจดี' },
  consent: { en: 'I agree to Apex Surgery Hospital contacting me about this voucher.', th: 'ฉันยินยอมให้โรงพยาบาลศัลยกรรมตกแต่งเอเพ็กซ์ติดต่อฉันเกี่ยวกับบัตรกำนัลนี้' },
  remind: { en: 'Remind me on LINE', th: 'แจ้งเตือนฉันทาง LINE' },
  freq: { en: 'How often', th: 'ความถี่' },
  f1: { en: 'When my daily tries reset', th: 'เมื่อสิทธิ์รายวันรีเซ็ต' },
  f2: { en: 'Once a week', th: 'สัปดาห์ละครั้ง' },
  f3: { en: 'Only before a voucher expires', th: 'เฉพาะก่อนบัตรกำนัลหมดอายุ' },
  create: { en: 'Create voucher', th: 'สร้างบัตรกำนัล' },
  cancel: { en: 'Back', th: 'ย้อนกลับ' },
  hospital: { en: 'Apex Surgery Hospital', th: 'โรงพยาบาลศัลยกรรมตกแต่งเอเพ็กซ์' },
  voucher: { en: 'Voucher', th: 'บัตรกำนัล' },
  vName: { en: 'Name', th: 'ชื่อ' },
  vCode: { en: 'Code', th: 'รหัส' },
  reception: { en: 'Show this at reception.', th: 'แสดงบัตรนี้ที่แผนกต้อนรับ' },
  previewTag: { en: 'Preview', th: 'ตัวอย่าง' },
  save: { en: 'Save to phone', th: 'บันทึกลงโทรศัพท์' },
  saved: { en: 'Saved', th: 'บันทึกแล้ว' },
  saveFail: { en: 'The image could not be saved.', th: 'บันทึกรูปภาพไม่สำเร็จ' },
  plan: { en: 'Add to My Plan', th: 'เพิ่มในแผนของฉัน' },
  planned: { en: 'Added to My Plan', th: 'เพิ่มในแผนของฉันแล้ว' },
  done: { en: 'Done', th: 'เสร็จสิ้น' },
  qrFail: { en: 'The QR code could not be drawn.', th: 'สร้างคิวอาร์โค้ดไม่สำเร็จ' },
  startFail: { en: 'The game could not start.', th: 'เริ่มเกมไม่สำเร็จ' }
};
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);

const ICON = {
  music: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></svg>',
  sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 1-13.4 7.9L3 21l1.2-4.4A9 9 0 1 1 21 12z"/><path d="M9 9c0 3.3 2.7 6 6 6l1-1.6-2-1-1 1c-1-.4-2-1.4-2.4-2.4l1-1-1-2z"/></svg>',
  line: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="6" fill="#06C755"/><path d="M12 6.2c-3.6 0-6.5 2.3-6.5 5.2 0 2.6 2.3 4.7 5.4 5.1.4.1.3.4.2 1.2 0 .3-.2.9.7.5s4.6-2.8 5.9-4.6c.5-.7.8-1.4.8-2.2 0-2.9-2.9-5.2-6.5-5.2z" fill="#fff"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/></svg>',
  plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M12 13v5M9.5 15.5h5"/></svg>',
  scored: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.8l3.2 5.4 6 .9-4.4 4.2 1 6-5.8-3-5.8 3 1-6L2.8 9.1l6-.9z"/></svg>',
  practice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4h4"/></svg>',
  board: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 6h3a3 3 0 0 1-3 4M7 6H4a3 3 0 0 0 3 4"/></svg>'
};

/* ---------------- styles ---------------- */
const MESH = {
  steady: 'radial-gradient(90% 120% at 0% 0%,rgba(204,51,102,.55),transparent 55%),radial-gradient(80% 100% at 100% 100%,rgba(168,134,205,.6),transparent 60%),linear-gradient(150deg,#3A1556,#1F0A30)',
  proportion: 'radial-gradient(90% 110% at 100% 0%,rgba(241,234,247,.32),transparent 55%),radial-gradient(80% 110% at 0% 100%,rgba(204,51,102,.42),transparent 60%),linear-gradient(160deg,#55286F,#24093A)',
  factrush: 'radial-gradient(80% 120% at 85% 10%,rgba(168,134,205,.65),transparent 55%),radial-gradient(70% 90% at 5% 95%,rgba(106,56,140,.9),transparent 60%),linear-gradient(140deg,#2A0F40,#43195F)',
  recoverysort: 'radial-gradient(100% 90% at 50% 0%,rgba(168,134,205,.45),transparent 60%),radial-gradient(70% 100% at 100% 100%,rgba(204,51,102,.4),transparent 60%),linear-gradient(180deg,#341451,#1A0629)',
  memorymatch: 'radial-gradient(90% 110% at 0% 100%,rgba(168,134,205,.5),transparent 55%),radial-gradient(80% 100% at 100% 0%,rgba(204,51,102,.35),transparent 60%),linear-gradient(160deg,#2A0F40,#4A1E66)',
  learn: 'radial-gradient(90% 110% at 100% 0%,rgba(255,255,255,.35),transparent 55%),radial-gradient(90% 110% at 0% 100%,rgba(204,51,102,.35),transparent 60%),linear-gradient(150deg,#8B5CB0,#55286F)'
};
const CSS = `
.apxg{--g-plum:var(--plum,#6A388C);--g-plum7:var(--plum-700,#55286F);--g-night:var(--night,#1F0A30);--g-night2:var(--night-2,#2A0F40);
  --g-lilac:var(--lilac,#A886CD);--g-l3:var(--lilac-300,#C9B3DD);--g-l2:var(--lilac-200,#E4D8EE);--g-l1:var(--lilac-100,#F1EAF7);--g-wash:var(--wash,#FBF3FB);
  --g-ink:var(--ink,#2A1F33);--g-ink2:var(--ink-2,#5A4A66);--g-on:var(--on-night,#F6EEFB);--g-on2:var(--on-night-2,#CDB9DD);--g-rose:#CC3366;
  --g-ease:cubic-bezier(.23,1,.32,1);--g-grain:${GRAIN};--g-lattice:${LATTICE()};--g-silk:${SILK()};
  --g-shadow:0 1px 1px rgba(42,15,64,.06),0 10px 24px -10px rgba(42,15,64,.22),0 30px 60px -30px rgba(42,15,64,.3);
  font-family:"LINE Seed","Sarabun","Noto Sans Thai",system-ui,sans-serif;color:var(--g-ink);line-height:1.55;font-size:16px;-webkit-text-size-adjust:100%}
.apxg *,.apxg *::before,.apxg *::after{box-sizing:border-box}
.apxg button{font:inherit}
.apxg ::selection{background:var(--g-l3);color:var(--g-night)}
.apxg .g-wrap{max-width:1180px;margin:0 auto;padding:20px 16px 56px}
.apxg h2,.apxg h3,.apxg h4{margin:0;line-height:1.2;color:inherit;letter-spacing:-.01em}
.apxg .num{font-variant-numeric:tabular-nums lining-nums}
.apxg .gx-tex{position:relative;isolation:isolate}
.apxg .gx-tex::before{content:"";position:absolute;inset:0;border-radius:inherit;background:var(--g-grain);mix-blend-mode:overlay;opacity:.5;pointer-events:none;z-index:0}

/* header banner */
.apxg .g-head{position:relative;overflow:hidden;border-radius:28px;padding:28px 22px 22px;color:#fff;margin-bottom:22px;
  background:var(--g-silk) 0 0/240px 120px,radial-gradient(70% 140% at 100% 0%,rgba(204,51,102,.45),transparent 60%),radial-gradient(60% 120% at 0% 100%,rgba(168,134,205,.5),transparent 60%),linear-gradient(150deg,#3A1556,#1F0A30);
  box-shadow:0 30px 60px -36px rgba(31,10,48,.9);display:grid;gap:18px}
.apxg .g-head>*{position:relative;z-index:1}
.apxg .g-head h2{font-size:clamp(30px,6vw,46px);font-weight:800;letter-spacing:-.02em}
.apxg .g-head p{margin:8px 0 0;color:var(--g-on2);max-width:46ch;font-size:16px}
.apxg .g-facets{position:absolute;right:-30px;top:-40px;width:300px;height:220px;z-index:0;opacity:.55;pointer-events:none}
.apxg .g-facets path{fill:none;stroke:rgba(241,234,247,.35);stroke-width:1}
.apxg .g-facets .f2{animation:gFloat 9s ease-in-out infinite}
.apxg .g-facets .f3{animation:gFloat 12s ease-in-out -4s infinite reverse}
@keyframes gFloat{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(-8px,10px,0)}}
@media (min-width:760px){.apxg .g-head{grid-template-columns:1fr auto;align-items:end;padding:34px 32px 30px}}
.apxg .g-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.apxg .g-pill{display:inline-flex;align-items:center;gap:10px;min-height:44px;padding:0 16px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(241,234,247,.28);color:#fff;font-weight:700;font-size:15px;line-height:1;white-space:nowrap}
.apxg .g-pill i{width:9px;height:9px;transform:rotate(45deg);background:var(--g-l3);border-radius:2px;flex:none;box-shadow:0 0 10px rgba(201,179,221,.8)}
.apxg .g-pill.zero i{background:var(--g-rose);box-shadow:0 0 10px rgba(204,51,102,.8)}
.apxg .g-pill.light{background:var(--g-l1);border-color:var(--g-l2);color:var(--g-plum7)}
.apxg .g-pill.light i{background:var(--g-plum);box-shadow:none}
.apxg .g-tog{display:inline-flex;align-items:center;gap:10px;min-height:44px;padding:0 8px 0 14px;border-radius:999px;border:1px solid rgba(241,234,247,.28);background:rgba(255,255,255,.08);color:#fff;cursor:pointer;font-weight:700;font-size:15px;line-height:1;transition:background-color .2s,border-color .2s,transform .14s var(--g-ease)}
.apxg .g-tog:hover{background:rgba(255,255,255,.14)}
.apxg .g-tog:active{transform:scale(.97)}
.apxg .g-tog svg{width:18px;height:18px;flex:none}
.apxg .g-tog .sw{position:relative;width:34px;height:20px;border-radius:999px;background:rgba(255,255,255,.18);flex:none;transition:background-color .2s}
.apxg .g-tog .sw::after{content:"";position:absolute;left:3px;top:3px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.4);transition:transform .22s var(--g-ease)}
.apxg .g-tog[aria-pressed="true"] .sw{background:var(--g-rose)}
.apxg .g-tog[aria-pressed="true"] .sw::after{transform:translateX(14px)}
.apxg .g-tog:focus-visible,.apxg .g-btn:focus-visible,.apxg .g-icon:focus-visible,.apxg .g-backbtn:focus-visible{outline:3px solid var(--g-lilac);outline-offset:2px}
@media (max-width:480px){.apxg .g-tools{display:grid;grid-template-columns:1fr}.apxg .g-tools .g-pill{justify-content:center}.apxg .g-tog{justify-content:flex-start;padding-right:10px}.apxg .g-tog .sw{margin-left:auto}}

/* buttons */
.apxg .g-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:50px;padding:0 24px;border-radius:999px;border:1.5px solid transparent;font-weight:700;font-size:16px;line-height:1;cursor:pointer;text-decoration:none;transition:transform .14s var(--g-ease),background-color .2s,color .2s,border-color .2s,box-shadow .2s;white-space:nowrap;overflow:hidden}
.apxg .g-btn:active{transform:scale(.97)}
.apxg .g-btn svg{width:18px;height:18px;flex:none}
.apxg .g-btn.plum{background:linear-gradient(180deg,#7A44A0,var(--g-plum) 55%,var(--g-plum7));color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 12px 24px -12px rgba(106,56,140,.9)}
.apxg .g-btn.plum:hover{box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 16px 30px -12px rgba(106,56,140,.95)}
.apxg .g-btn.rose{background:linear-gradient(180deg,#DC4A7A,var(--g-rose) 55%,#B02654);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 12px 24px -12px rgba(204,51,102,.9)}
.apxg .g-btn.ghost{background:#fff;color:var(--g-plum);border-color:var(--g-l3)}
.apxg .g-btn.ghost:hover{border-color:var(--g-plum)}
.apxg .g-btn.light{background:#fff;color:var(--g-plum)}
.apxg .g-btn.onnight{background:rgba(255,255,255,.1);color:#fff;border-color:rgba(201,179,221,.4)}
.apxg .g-btn[disabled]{opacity:.45;cursor:not-allowed;box-shadow:none}
.apxg .g-btn.sm{min-height:44px;padding:0 18px;font-size:15px}
.apxg .g-btn.block{width:100%}
.apxg .g-icon{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-width:44px;min-height:44px;padding:0 14px;border-radius:999px;border:1px solid var(--g-l3);background:#fff;color:var(--g-plum);cursor:pointer;font-weight:700;font-size:15px;line-height:1}
.apxg .g-icon svg{width:20px;height:20px}

/* game cards */
.apxg .g-grid{display:grid;grid-template-columns:1fr;gap:18px}
@media (min-width:640px){.apxg .g-grid{grid-template-columns:repeat(2,1fr)}}
@media (min-width:1000px){.apxg .g-grid{grid-template-columns:repeat(3,1fr)}}
.apxg .g-card{position:relative;display:flex;flex-direction:column;border-radius:24px;background:#fff;box-shadow:var(--g-shadow);
  transition:transform .35s var(--g-ease),box-shadow .35s var(--g-ease);--mx:0;--my:0}
.apxg .g-card::after{content:"";position:absolute;inset:0;border-radius:inherit;border:1px solid rgba(106,56,140,.1);pointer-events:none}
@media (hover:hover){.apxg .g-card:hover{transform:translateY(-6px);box-shadow:0 2px 2px rgba(42,15,64,.06),0 22px 40px -16px rgba(42,15,64,.35),0 50px 80px -40px rgba(42,15,64,.4)}}
.apxg .g-card:active{transform:translateY(-2px) scale(.99)}
.apxg .g-art{position:relative;height:184px;border-radius:24px 24px 0 0;overflow:hidden;isolation:isolate;background:var(--mesh)}
.apxg .g-art::before{content:"";position:absolute;inset:0;background:var(--g-grain);mix-blend-mode:overlay;opacity:.55;z-index:2;pointer-events:none}
.apxg .g-art::after{content:"";position:absolute;inset:-40% -60%;z-index:3;pointer-events:none;
  background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.16) 50%,transparent 60%);transform:translateX(calc(var(--mx) * 18%));transition:transform .5s var(--g-ease)}
.apxg .g-art svg{position:absolute;inset:0;width:100%;height:100%;z-index:1;overflow:visible}
.apxg .g-art .l1,.apxg .g-art .l2,.apxg .g-art .l3{transition:transform .5s var(--g-ease)}
.apxg .g-card .g-art .l1{transform:translate(calc(var(--mx) * -3px),calc(var(--my) * -2px))}
.apxg .g-card .g-art .l2{transform:translate(calc(var(--mx) * 4px),calc(var(--my) * 3px))}
.apxg .g-card .g-art .l3{transform:translate(calc(var(--mx) * 9px),calc(var(--my) * 6px))}
.apxg .g-ribbon{position:absolute;left:-8px;top:16px;z-index:4;display:flex;align-items:center;gap:8px;height:32px;padding:0 16px 0 18px;
  background:linear-gradient(90deg,#B02654,var(--g-rose) 60%,#DC4A7A);color:#fff;font-size:13px;font-weight:700;line-height:1;white-space:nowrap;
  clip-path:polygon(0 0,100% 0,calc(100% - 10px) 50%,100% 100%,0 100%);box-shadow:0 8px 16px -6px rgba(0,0,0,.4)}
.apxg .g-ribbon::before{content:"";width:8px;height:8px;transform:rotate(45deg);background:#fff;border-radius:1.5px;flex:none}
.apxg .g-ribbon-fold{position:absolute;left:-8px;top:48px;width:8px;height:8px;background:#6E1434;clip-path:polygon(0 0,100% 0,100% 100%);z-index:3}
.apxg .g-tag{position:absolute;top:14px;right:14px;z-index:4;display:inline-flex;align-items:center;height:26px;font-size:12px;font-weight:700;line-height:1;padding:0 12px;border-radius:999px;background:rgba(31,10,48,.45);color:#fff;border:1px solid rgba(255,255,255,.3);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.apxg .g-tag.rose{background:var(--g-rose);border-color:transparent}
.apxg .g-body{position:relative;padding:20px 20px 20px;display:flex;flex-direction:column;gap:14px;flex:1;border-radius:0 0 24px 24px;
  background:linear-gradient(180deg,#fff,#FCF8FD)}
.apxg .g-body h3{font-size:22px;font-weight:800;color:var(--g-ink)}
.apxg .g-how{margin:-6px 0 0;color:var(--g-ink2);font-size:15px;line-height:1.5}
.apxg .g-kv{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:12px 14px;border-radius:14px;background:var(--g-wash);font-size:14px;color:var(--g-ink2);line-height:1.3}
.apxg .g-kv b{font-size:18px;color:var(--g-plum7);font-weight:800}
.apxg .g-kv .muted{color:var(--g-ink2);font-weight:700}
.apxg .g-tt{display:grid;gap:0;margin:0;padding:0;list-style:none;font-size:14px;line-height:1.35}
.apxg .g-tt.info li:first-child{border-top:0}
.apxg .g-tt li{display:grid;grid-template-columns:22px 1fr auto;column-gap:10px;align-items:center;padding:9px 2px;border-top:1px solid var(--g-l1)}
.apxg .g-tt li.hd{border-top:0;padding:0 2px 6px;font-size:12px;font-weight:700;color:var(--g-ink2);letter-spacing:.02em}
.apxg .g-tt li.hd span:first-child{grid-column:2}
.apxg .g-tt .p{color:var(--g-ink);min-width:0}
.apxg .g-tt .n{font-weight:800;color:var(--g-plum7);text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.apxg .g-tt li.top .p{color:var(--g-ink2)}
.apxg .g-tt li.top .n{font-weight:700;color:var(--g-ink2)}
.apxg .g-dia{width:12px;height:12px;justify-self:center;transform:rotate(45deg);border-radius:2.5px;border:1.5px solid var(--t,#A886CD);background:transparent}
.apxg .g-dia.t0{--t:#A886CD}.apxg .g-dia.t1{--t:#6A388C}.apxg .g-dia.t2{--t:#CC3366}
.apxg .g-dia.top{--t:#5A4A66;border-style:dashed}
.apxg li.hit .g-dia{background:var(--t);box-shadow:0 0 0 3px color-mix(in srgb,var(--t) 22%,transparent)}
.apxg .g-card .g-btn{margin-top:auto}
.apxg .g-card.soon{filter:saturate(.6)}
.apxg .g-card.learn .g-body{gap:12px}
@media (prefers-reduced-motion:no-preference){
  .apxg [data-scene=steady] .needle{offset-rotate:auto;animation:gNeedle 6s var(--g-ease) infinite}
  .apxg [data-scene=steady] .thread{stroke-dasharray:100 100;animation:gThread 6s var(--g-ease) infinite}
  .apxg [data-scene=steady] .st{opacity:0;animation:gStitch 6s linear infinite;animation-delay:calc(var(--i) * .5s + .5s)}
  .apxg [data-scene=proportion] .ey{animation:gDrift 5s var(--g-ease) infinite}
  .apxg [data-scene=proportion] .lp{animation:gDrift2 5s var(--g-ease) infinite}
  .apxg [data-scene=proportion] .guides{animation:gGuides 5s ease infinite}
  .apxg [data-scene=factrush] .swing{transform-box:fill-box;transform-origin:50% 100%;animation:gSwing 4.2s var(--g-ease) infinite}
  .apxg [data-scene=factrush] .ok{transform-box:fill-box;transform-origin:center;animation:gOk 4.2s var(--g-ease) infinite}
  .apxg [data-scene=recoverysort] .ribs{animation:gRibs 1.6s linear infinite}
  .apxg [data-scene=recoverysort] .ride{animation:gRide 5s cubic-bezier(.45,0,.55,1) infinite}
  .apxg [data-scene=recoverysort] .cap{transform-box:fill-box;transform-origin:center;animation:gCap 5s var(--g-ease) infinite;animation-delay:calc(var(--i) * -1.6s)}
  .apxg [data-scene=memorymatch] .fl{animation:gFlip 4.8s var(--g-ease) infinite;animation-delay:calc(var(--i) * .25s)}
  .apxg [data-scene=memorymatch] .fl .face{animation:gFace 4.8s step-end infinite;animation-delay:calc(var(--i) * .25s)}
  .apxg [data-scene=learn] .ok{transform-box:fill-box;transform-origin:center;animation:gOk 4.2s var(--g-ease) infinite}
}
.apxg [data-scene=steady] .needle{offset-distance:62%;offset-rotate:auto}
.apxg [data-scene=steady] .thread{stroke-dasharray:62 100}
.apxg [data-scene=memorymatch] .fl .face{opacity:1}
@keyframes gNeedle{0%{offset-distance:0%;opacity:0}6%{opacity:1}88%{offset-distance:100%;opacity:1}100%{offset-distance:100%;opacity:0}}
@keyframes gThread{0%{stroke-dasharray:0 100}88%{stroke-dasharray:100 100}100%{stroke-dasharray:100 100;opacity:.4}}
@keyframes gStitch{0%{opacity:0}2%,90%{opacity:1}100%{opacity:0}}
@keyframes gDrift{0%,15%{transform:translate(0,0)}35%,55%{transform:translate(6px,-5px)}80%,100%{transform:translate(0,0)}}
@keyframes gDrift2{0%,20%{transform:translate(0,0)}40%,60%{transform:translate(-4px,7px)}82%,100%{transform:translate(0,0)}}
@keyframes gGuides{0%,70%{opacity:.25}82%,92%{opacity:1}100%{opacity:.25}}
@keyframes gSwing{0%,20%{transform:rotate(0) translateX(0)}45%,62%{transform:rotate(8deg) translateX(16px)}85%,100%{transform:rotate(0) translateX(0)}}
@keyframes gOk{0%,30%{transform:scale(0);opacity:0}42%{transform:scale(1.15);opacity:1}50%,75%{transform:scale(1);opacity:1}88%,100%{transform:scale(0);opacity:0}}
@keyframes gRibs{to{transform:translate(24px,46px)}}
@keyframes gRide{0%{transform:translate(250px,44px);opacity:0}8%{opacity:1}55%{transform:translate(128px,44px)}75%{transform:translate(128px,118px) scale(.5);opacity:0}100%{transform:translate(128px,118px) scale(.5);opacity:0}}
@keyframes gCap{0%,60%{transform:translateY(0)}68%{transform:translateY(3px) scale(1.04)}78%,100%{transform:translateY(0)}}
@keyframes gFlip{0%,30%{transform:scaleX(1)}38%{transform:scaleX(0)}46%,80%{transform:scaleX(1)}88%{transform:scaleX(0)}96%,100%{transform:scaleX(1)}}
@keyframes gFace{0%{opacity:0}38%{opacity:1}88%{opacity:0}}

/* vouchers list */
.apxg .g-sec{margin-top:40px}
.apxg .g-sec h3{font-size:24px;font-weight:800;margin-bottom:14px}
.apxg .g-vlist{display:grid;gap:12px}
@media (min-width:800px){.apxg .g-vlist{grid-template-columns:repeat(2,1fr)}}
.apxg .g-vrow{position:relative;display:grid;grid-template-columns:52px 1fr auto;align-items:center;gap:14px;background:#fff;border-radius:18px;padding:12px 14px 12px 12px;box-shadow:var(--g-shadow)}
.apxg .g-vrow .stub{width:52px;height:52px;border-radius:12px;background:var(--g-lattice) center/14px 14px,linear-gradient(150deg,var(--g-plum),var(--g-night2));display:grid;place-items:center}
.apxg .g-vrow .stub i{width:14px;height:14px;transform:rotate(45deg);border:2px solid #fff;border-radius:3px}
.apxg .g-vrow.exp .stub{filter:grayscale(1);opacity:.6}
.apxg .g-vrow .m{min-width:0;display:grid;gap:2px}
.apxg .g-vrow b{display:block;font-size:16px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.apxg .g-vrow .meta{font-size:13px;color:var(--g-ink2);line-height:1.4}
.apxg .g-vrow .code{font-weight:800;color:var(--g-plum);letter-spacing:.06em;font-variant-numeric:tabular-nums}
.apxg .g-empty{color:var(--g-ink2);margin:0;padding:18px 20px;border-radius:18px;background:#fff;border:1px dashed var(--g-l3)}

/* detail */
.apxg .g-backbtn{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 16px 0 10px;margin:0 0 14px;border:1px solid var(--g-l2);background:#fff;color:var(--g-plum);font-weight:700;line-height:1;cursor:pointer;border-radius:999px;box-shadow:0 4px 10px -6px rgba(42,15,64,.3)}
.apxg .g-backbtn svg{width:20px;height:20px}
.apxg .g-detail{display:grid;gap:18px}
@media (min-width:900px){.apxg .g-detail{grid-template-columns:1.25fr 1fr;align-items:start}}
.apxg .g-dhero{border-radius:24px;overflow:hidden;background:#fff;box-shadow:var(--g-shadow)}
.apxg .g-dhero .g-art{height:200px;border-radius:24px 24px 0 0}
.apxg .g-dhero .txt{padding:18px 20px 20px}
.apxg .g-dhero h2{font-size:clamp(26px,5vw,34px);font-weight:800}
.apxg .g-dhero p{margin:6px 0 0;color:var(--g-ink2)}
.apxg .g-modes{display:grid;gap:14px}
@media (min-width:560px){.apxg .g-modes{grid-template-columns:1fr 1fr}}
.apxg .g-mode{position:relative;display:flex;flex-direction:column;gap:10px;padding:20px;border-radius:24px;background:#fff;box-shadow:var(--g-shadow);overflow:hidden;isolation:isolate}
.apxg .g-mode>*{position:relative;z-index:1}
.apxg .g-mode .ic{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:var(--g-l1);color:var(--g-plum)}
.apxg .g-mode .ic svg{width:22px;height:22px}
.apxg .g-mode.sc{color:#fff;background:var(--g-silk) 0 0/240px 120px,radial-gradient(90% 90% at 100% 0%,rgba(204,51,102,.5),transparent 60%),linear-gradient(160deg,#3A1556,#1F0A30)}
.apxg .g-mode.sc::before{content:"";position:absolute;inset:0;background:var(--g-grain);mix-blend-mode:overlay;opacity:.5;z-index:0}
.apxg .g-mode.sc .ic{background:rgba(255,255,255,.12);color:#fff}
.apxg .g-mode h4{font-size:19px;font-weight:800}
.apxg .g-mode p{margin:0;font-size:14px;color:var(--g-ink2);line-height:1.5}
.apxg .g-mode.sc p{color:var(--g-on2)}
.apxg .g-mode .g-btn{margin-top:auto}
.apxg .g-panelbox{background:#fff;border-radius:24px;padding:20px;box-shadow:var(--g-shadow)}
.apxg .g-panelbox h4{display:flex;align-items:center;gap:10px;font-size:18px;font-weight:800;margin-bottom:14px}
.apxg .g-panelbox h4 svg{width:22px;height:22px;color:var(--g-plum)}
.apxg .g-panelbox .sub{font-size:13px;color:var(--g-ink2);margin:-8px 0 12px}
.apxg .g-panelbox .g-kv{margin-bottom:14px}
.apxg .g-board{width:100%;border-collapse:collapse;font-size:15px}
.apxg .g-board td{padding:10px 4px;border-bottom:1px solid var(--g-l1)}
.apxg .g-board td:first-child{width:36px;color:var(--g-ink2);font-weight:700}
.apxg .g-board td:last-child{text-align:right;font-weight:800;font-variant-numeric:tabular-nums}
.apxg .g-board + p,.apxg .g-panelbox>p.note{margin:12px 0 0;font-size:14px;color:var(--g-ink2)}

/* play overlay */
.apxg .g-play{position:fixed;inset:0;z-index:9000;color:#fff;display:flex;flex-direction:column;overscroll-behavior:contain;
  background:radial-gradient(70% 50% at 50% 0%,rgba(106,56,140,.55),transparent 70%),radial-gradient(60% 50% at 100% 100%,rgba(204,51,102,.22),transparent 70%),var(--g-night)}
.apxg .g-play::before{content:"";position:absolute;inset:0;background:var(--g-grain);mix-blend-mode:overlay;opacity:.35;pointer-events:none}
.apxg .g-hud{position:relative;z-index:2;flex:none;display:flex;align-items:center;gap:8px;padding:6px 10px;padding-top:max(6px,env(safe-area-inset-top));min-height:62px;
  background:linear-gradient(180deg,rgba(42,15,64,.92),rgba(31,10,48,.8));border-bottom:1px solid rgba(201,179,221,.14);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.apxg .g-hud .g-icon{background:rgba(255,255,255,.06);color:#fff;border-color:rgba(201,179,221,.3);padding:0 10px}
.apxg .g-hud .g-icon[aria-pressed="true"]{background:var(--g-plum);border-color:var(--g-lilac)}
.apxg .g-hud .g-icon[aria-pressed="false"] svg{opacity:.55}
.apxg .g-quit{min-width:64px}
.apxg .g-quit.sure{background:var(--g-rose)!important;border-color:var(--g-rose)!important}
.apxg .g-stats{flex:1;display:flex;justify-content:center;gap:clamp(10px,4vw,34px);min-width:0}
.apxg .g-stat{display:grid;justify-items:center;gap:3px;line-height:1}
.apxg .g-stat small{font-size:11px;color:var(--g-on2);font-weight:700;letter-spacing:.04em}
.apxg .g-stat b{font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;display:inline-block;min-width:2ch;text-align:center}
.apxg .g-stat.low b{color:#FF8FB3}
.apxg .g-pips{display:flex;gap:6px;height:20px;align-items:center}
.apxg .g-pips i{width:11px;height:11px;transform:rotate(45deg);border-radius:2.5px;background:linear-gradient(135deg,#F06A95,var(--g-rose));display:block;box-shadow:0 0 8px rgba(204,51,102,.6);transition:background .2s,box-shadow .2s}
.apxg .g-pips i.off{background:transparent;box-shadow:inset 0 0 0 1.5px rgba(201,179,221,.45)}
.apxg .g-modetag{font-size:11px;font-weight:800;line-height:22px;padding:0 10px;border-radius:999px;background:rgba(255,255,255,.1);color:var(--g-on2);white-space:nowrap}
.apxg .g-modetag.sc{background:var(--g-rose);color:#fff}
@media (max-width:440px){.apxg .g-modetag{display:none}.apxg .g-stat b{font-size:17px}.apxg .g-stats{gap:10px}.apxg .g-hud{gap:5px;padding-left:6px;padding-right:6px}.apxg .g-hud .g-icon{min-width:40px;padding:0 6px}.apxg .g-hud .g-quit{min-width:52px;padding:0 10px;font-size:14px}.apxg .g-pips{gap:4px}.apxg .g-pips i{width:8px;height:8px;border-radius:2px}}
.apxg .g-area{position:relative;z-index:1;flex:1;min-height:0;display:flex;align-items:center;justify-content:center}
.apxg .g-stage{position:relative;overflow:hidden;background:var(--g-night)}
@media (min-width:700px){.apxg .g-stage{border-radius:24px;box-shadow:0 40px 90px -30px rgba(0,0,0,.85),0 0 0 1px rgba(201,179,221,.14)}}
.apxg .g-host{position:absolute;inset:0}
.apxg .g-count{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;z-index:50;text-align:center;padding:24px;
  background:radial-gradient(60% 50% at 50% 45%,rgba(106,56,140,.5),transparent 70%),rgba(31,10,48,.88);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
.apxg .g-count .ring{position:relative;width:150px;height:150px;display:grid;place-items:center}
.apxg .g-count .ring svg{position:absolute;inset:0;width:100%;height:100%}
.apxg .g-count .ring b{font-size:84px;line-height:1;font-weight:800;font-variant-numeric:tabular-nums}
@media (prefers-reduced-motion:no-preference){.apxg .g-count .ring svg{animation:gSpin 6s linear infinite}}
@keyframes gSpin{to{transform:rotate(360deg)}}
.apxg .g-count h3{color:#fff;font-size:26px;font-weight:800}
.apxg .g-count p{margin:0;color:var(--g-on2);font-size:17px;max-width:30ch}

/* result and claim sheets */
.apxg .g-panel{position:absolute;inset:0;overflow-y:auto;padding:20px 16px calc(28px + env(safe-area-inset-bottom));z-index:60;background:radial-gradient(70% 50% at 50% 0%,rgba(106,56,140,.45),transparent 70%),rgba(24,7,38,.82);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.apxg .g-sheet{position:relative;max-width:520px;margin:0 auto;background:#fff;color:var(--g-ink);border-radius:28px;padding:22px 20px;box-shadow:0 40px 90px -30px rgba(0,0,0,.85)}
.apxg .g-sheet h3{font-size:24px;font-weight:800}
.apxg .g-sheet .lead{margin:6px 0 0;color:var(--g-ink2)}
.apxg .g-rhead{position:relative;margin:-22px -20px 0;height:132px;border-radius:28px 28px 0 0;overflow:hidden;isolation:isolate;background:var(--mesh)}
.apxg .g-rhead::before{content:"";position:absolute;inset:0;background:var(--g-grain);mix-blend-mode:overlay;opacity:.55;z-index:2}
.apxg .g-rhead svg{position:absolute;top:0;right:-4%;width:56%;height:100%;z-index:1;opacity:.9}
.apxg .g-rhead::after{content:"";position:absolute;inset:0;z-index:2;background:linear-gradient(90deg,rgba(31,10,48,.55),transparent 55%),linear-gradient(0deg,rgba(31,10,48,.5),transparent 50%)}
.apxg .g-rhead .cap{position:absolute;left:20px;right:20px;bottom:14px;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:10px}
.apxg .g-rhead .cap h3{color:#fff;font-size:22px;text-shadow:0 2px 12px rgba(0,0,0,.4);max-width:58%}
.apxg .g-chip{display:inline-flex;align-items:center;height:26px;padding:0 12px;border-radius:999px;font-size:12px;font-weight:800;line-height:1;white-space:nowrap;background:rgba(255,255,255,.18);color:#fff;border:1px solid rgba(255,255,255,.35);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
.apxg .g-chip.sc{background:var(--g-rose);border-color:transparent}
.apxg .g-big{display:flex;align-items:baseline;justify-content:center;gap:10px;margin:22px 0 4px}
.apxg .g-big b{font-size:64px;line-height:1;font-weight:800;color:var(--g-plum7);font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.apxg .g-big span{font-size:16px;color:var(--g-ink2);font-weight:700}
.apxg .g-track{position:relative;margin:18px 4px 6px;height:58px}
.apxg .g-track .bar{position:absolute;left:0;right:0;top:12px;height:6px;border-radius:6px;background:var(--g-l1);overflow:hidden}
.apxg .g-track .bar i{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:6px;background:linear-gradient(90deg,var(--g-lilac),var(--g-plum),var(--g-rose))}
.apxg .g-medal{position:absolute;top:0;transform:translateX(-50%);display:grid;justify-items:center;gap:6px}
.apxg .g-medal .gem{position:relative;width:30px;height:30px;display:grid;place-items:center}
.apxg .g-medal .gem::before{content:"";width:20px;height:20px;transform:rotate(45deg);border-radius:4px;background:#fff;border:2px solid var(--g-l3);transition:background .3s,border-color .3s,box-shadow .3s}
.apxg .g-medal .gem::after{content:"";position:absolute;inset:-6px;border-radius:50%;border:2px solid var(--t);opacity:0;transform:scale(.4)}
.apxg .g-medal small{font-size:12px;font-weight:800;color:var(--g-ink2);font-variant-numeric:tabular-nums;line-height:1}
.apxg .g-medal.on .gem::before{background:var(--t);border-color:var(--t);box-shadow:0 0 0 4px color-mix(in srgb,var(--t) 20%,transparent),0 6px 14px -4px var(--t)}
.apxg .g-medal.on small{color:var(--g-ink)}
.apxg .g-medal.burst .gem::after{animation:gBurst .7s var(--g-ease) forwards}
@keyframes gBurst{0%{opacity:.9;transform:scale(.4)}100%{opacity:0;transform:scale(1.6)}}
.apxg .g-rows{margin:16px 0 0;display:grid}
.apxg .g-rows div{display:grid;grid-template-columns:1fr auto;align-items:baseline;gap:12px;padding:12px 2px;border-top:1px solid var(--g-l1);font-size:15px;line-height:1.35}
.apxg .g-rows dt{color:var(--g-ink2)}
.apxg .g-rows dd{margin:0;font-weight:800;text-align:right;font-variant-numeric:tabular-nums}
.apxg .g-badge{display:inline-flex;align-items:center;height:22px;margin-left:8px;font-size:12px;line-height:1;padding:0 9px;border-radius:999px;background:var(--g-rose);color:#fff;font-weight:800;vertical-align:1px}
.apxg .g-prize{position:relative;overflow:hidden;isolation:isolate;margin-top:14px;padding:16px 18px;border-radius:20px;color:#fff;display:grid;grid-template-columns:44px 1fr;column-gap:14px;align-items:center;
  background:var(--g-lattice) center/22px 22px,linear-gradient(150deg,var(--g-plum),var(--g-night2))}
.apxg .g-prize::after{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,.22) 45%,transparent 60%);transform:translateX(-120%);z-index:0}
.apxg .g-prize.in::after{animation:gSheen 1.4s var(--g-ease) .1s}
@keyframes gSheen{to{transform:translateX(120%)}}
.apxg .g-prize>*{position:relative;z-index:1}
.apxg .g-prize .gem{width:44px;height:44px;border-radius:14px;background:rgba(255,255,255,.14);display:grid;place-items:center}
.apxg .g-prize .gem i{width:16px;height:16px;transform:rotate(45deg);border-radius:3px;background:#fff;box-shadow:0 0 0 3px var(--t,#CC3366),0 0 18px 2px rgba(255,255,255,.6)}
.apxg .g-prize small{display:block;font-size:12px;font-weight:700;color:var(--g-on2);line-height:1.3}
.apxg .g-prize b{display:block;font-size:19px;line-height:1.3}
.apxg .g-next{margin:14px 0 0;font-size:15px;color:var(--g-ink2);line-height:1.5}
.apxg .g-acts{display:grid;gap:10px;margin-top:18px}
.apxg .g-acts.two{grid-template-columns:1fr 1fr}
.apxg .g-acts.fit{grid-template-columns:repeat(auto-fit,minmax(210px,1fr))}
.apxg .g-sheet .g-pill{margin-top:16px}
.apxg .g-signs{display:grid;gap:10px;margin:18px 0 6px}
.apxg .g-signs .g-btn{justify-content:flex-start;padding-left:18px}
.apxg .g-signs .g-btn.line{background:#00843A;color:#fff}
.apxg .g-note{font-size:13px;color:var(--g-ink2);margin:10px 0 0;line-height:1.5}
.apxg .g-note .g-tagi{display:inline-flex;align-items:center;height:22px;padding:0 9px;margin-right:8px;border-radius:999px;background:var(--g-rose);color:#fff;font-size:12px;font-weight:800;vertical-align:1px}
.apxg .g-field{display:grid;gap:6px;margin-top:18px}
.apxg .g-field label{font-weight:700;font-size:15px}
.apxg .g-field input[type=text]{min-height:50px;border:1.5px solid var(--g-l3);border-radius:14px;padding:0 14px;font:inherit;font-size:16px;color:var(--g-ink);background:#fff}
.apxg .g-field input[type=text]:focus{outline:none;border-color:var(--g-plum);box-shadow:0 0 0 4px var(--g-l1)}
.apxg .g-check{display:grid;grid-template-columns:24px 1fr;gap:12px;align-items:start;margin-top:16px;cursor:pointer;font-size:15px;line-height:1.5}
.apxg .g-check input{width:24px;height:24px;margin:0;accent-color:var(--g-plum);cursor:pointer}
.apxg .g-check.opt{padding-top:16px;border-top:1px solid var(--g-l1)}
.apxg .g-freq{display:grid;gap:8px;margin:10px 0 0 36px;border:0;padding:0}
.apxg .g-freq legend{font-size:13px;font-weight:700;color:var(--g-ink2);padding:0;margin-bottom:6px}
.apxg .g-freq label{display:flex;gap:10px;align-items:center;min-height:46px;padding:0 14px;border-radius:14px;border:1.5px solid var(--g-l2);cursor:pointer;font-size:15px;line-height:1.3}
.apxg .g-freq label:has(input:checked){border-color:var(--g-plum);background:var(--g-l1)}
.apxg .g-freq input{width:20px;height:20px;margin:0;accent-color:var(--g-plum);flex:none}
.apxg .g-err{color:#9E2050;font-size:14px;margin:8px 0 0}

/* voucher */
.apxg .g-vc{position:relative;border-radius:28px;overflow:hidden;background:#fff;box-shadow:0 30px 70px -30px rgba(0,0,0,.8);color:var(--g-ink)}
.apxg .g-vc-tag{position:absolute;top:16px;right:16px;z-index:3;display:inline-flex;align-items:center;height:24px;font-size:11px;font-weight:800;line-height:1;padding:0 10px;border-radius:999px;background:var(--g-rose);color:#fff;letter-spacing:.03em}
.apxg .g-vc-top{position:relative;isolation:isolate;overflow:hidden;padding:24px 22px 26px;color:#fff;
  background:var(--g-lattice) center/22px 22px,radial-gradient(80% 120% at 100% 0%,rgba(204,51,102,.55),transparent 60%),linear-gradient(150deg,var(--g-plum),var(--g-night2))}
.apxg .g-vc-top::before{content:"";position:absolute;inset:0;background:var(--g-grain);mix-blend-mode:overlay;opacity:.5;z-index:-1}
.apxg .g-vc-top::after{content:"";position:absolute;inset:-20% -60%;background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.2) 50%,transparent 60%);transform:translateX(-60%);pointer-events:none}
@media (prefers-reduced-motion:no-preference){.apxg .g-vc-top::after{animation:gFoil 5s var(--g-ease) .4s infinite}}
@keyframes gFoil{0%{transform:translateX(-60%)}40%,100%{transform:translateX(60%)}}
.apxg .g-vc-top small{display:block;font-size:12px;font-weight:700;color:var(--g-on2);line-height:1.3}
.apxg .g-vc-label{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:800;color:var(--g-l3);margin-top:16px;line-height:1}
.apxg .g-vc-label::before{content:"";width:8px;height:8px;transform:rotate(45deg);background:var(--g-l3);border-radius:1.5px}
.apxg .g-vc-prize{font-size:28px;line-height:1.2;font-weight:800;margin-top:8px;max-width:20ch}
.apxg .g-vc-meta{font-size:14px;color:var(--g-on2);margin-top:10px;line-height:1.3}
.apxg .g-vc-perf{position:relative;height:24px;background:#fff}
.apxg .g-vc-perf::before{content:"";position:absolute;left:22px;right:22px;top:50%;border-top:2px dashed var(--g-l3)}
.apxg .g-vc-perf i{position:absolute;top:0;width:24px;height:24px;border-radius:50%;background:var(--g-night)}
.apxg .g-vc-perf i:first-child{left:-12px}.apxg .g-vc-perf i:last-child{right:-12px}
.apxg .g-vc-body{display:grid;grid-template-columns:1fr auto;gap:16px;padding:6px 22px 10px;align-items:center}
.apxg .g-vc-body dl{margin:0;display:grid;gap:12px}
.apxg .g-vc-body dl div{display:grid;gap:2px}
.apxg .g-vc-body dt{font-size:12px;font-weight:700;color:var(--g-ink2);line-height:1.3}
.apxg .g-vc-body dd{margin:0;font-weight:800;font-size:16px;line-height:1.3;word-break:break-word}
.apxg .g-vc-body dd.code{font-size:20px;letter-spacing:.06em;color:var(--g-plum);font-variant-numeric:tabular-nums;white-space:nowrap;word-break:normal}
@media (max-width:400px){.apxg .g-vc-body dd.code{font-size:17px;letter-spacing:.03em}}
.apxg .g-vc-qr{width:128px;height:128px;background:#fff;border-radius:14px;border:1px solid var(--g-l2);padding:6px;box-shadow:0 6px 16px -10px rgba(42,15,64,.5)}
.apxg .g-vc-qr svg{width:100%;height:100%;display:block}
.apxg .g-vc-foot{display:flex;align-items:center;gap:10px;margin:0;padding:12px 22px 22px;font-weight:700;color:var(--g-plum7);font-size:15px;line-height:1.4}
.apxg .g-vc-foot::before{content:"";width:8px;height:8px;transform:rotate(45deg);background:var(--g-rose);border-radius:1.5px;flex:none}
@media (max-width:360px){.apxg .g-vc-qr{width:108px;height:108px}}
.apxg [hidden]{display:none!important}
.apxg .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (prefers-reduced-motion:reduce){.apxg *{transition:none!important}.apxg .g-card .g-art .l1,.apxg .g-card .g-art .l2,.apxg .g-card .g-art .l3{transform:none}}
`;

/* ---------------- storage helpers ---------------- */
const K = { tries: 'apxg.tries', best: 'apxg.best', month: 'apxg.month', vouchers: 'apxg.vouchers' };
const triesRec = () => {
  const d = bkkDay();
  const s = store.get(K.tries, null);
  return s && s.day === d ? { day: d, used: s.used | 0, bonus: s.bonus | 0 } : { day: d, used: 0, bonus: 0 };
};
const triesLeft = () => { const s = triesRec(); return Math.max(0, DAILY_TRIES + s.bonus - s.used); };
const useTry = () => { const s = triesRec(); s.used++; store.set(K.tries, s); };
const refundTry = () => { const s = triesRec(); s.used = Math.max(0, s.used - 1); store.set(K.tries, s); };
const learnBonusToday = () => triesRec().bonus > 0;
const grantLearnBonus = () => { const s = triesRec(); if (s.bonus > 0) return false; s.bonus = LEARN_BONUS_TRIES; store.set(K.tries, s); return true; };
const bests = () => store.get(K.best, {}) || {};
const monthRec = () => { const m = bkkMonth(); const s = store.get(K.month, null); return s && s.month === m ? s : { month: m, best: {} }; };
const vouchers = () => { const v = store.get(K.vouchers, []); return Array.isArray(v) ? v : []; };

const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeCode(taken) {
  for (let n = 0; n < 50; n++) {
    let c = '';
    try { const u = new Uint8Array(6); crypto.getRandomValues(u); u.forEach(b => (c += B32[b & 31])); }
    catch (e) { for (let i = 0; i < 6; i++) c += B32[Math.floor(Math.random() * 32)]; }
    if (!taken.has(CODE_PREFIX + c)) return CODE_PREFIX + c;
  }
  return CODE_PREFIX + Date.now().toString(32).toUpperCase().slice(-6);
}
const dateText = (ts, lang) => new Date(ts).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' });
const monthText = (ts, lang) => new Date(ts).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok' });
const TIER_COLORS = ['#A886CD', '#6A388C', '#CC3366'];

/* ---------------- QR (qrcode-generator 1.4.4, vendored next to this file) ---------------- */
let qrPromise = null;
function loadQR() {
  if (window.qrcode) return Promise.resolve(window.qrcode);
  if (!qrPromise) qrPromise = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = new URL('./qrcode-generator-1.4.4.js', import.meta.url).href;
    s.onload = () => (window.qrcode ? res(window.qrcode) : rej(new Error('qr')));
    s.onerror = () => { qrPromise = null; rej(new Error('qr')); };
    document.head.appendChild(s);
  });
  return qrPromise;
}
function qrMatrix(text) {
  const q = window.qrcode(0, 'M');
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  return { n, dark: (r, c) => q.isDark(r, c) };
}
function qrSVG(m) {
  const q = 4, size = m.n + q * 2;
  let d = '';
  for (let r = 0; r < m.n; r++) for (let c = 0; c < m.n; c++) if (m.dark(r, c)) d += `M${c + q} ${r + q}h1v1h-1z`;
  return `<svg viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#1F0A30"/></svg>`;
}

const FACETS = '<svg class="g-facets" viewBox="0 0 300 220" aria-hidden="true"><path d="M150 10l70 70-70 70-70-70z"/><path class="f2" d="M230 60l40 40-40 40-40-40z"/><path class="f3" d="M70 120l30 30-30 30-30-30z"/><path d="M150 40l40 40-40 40-40-40z" opacity=".5"/></svg>';
const RING = '<svg viewBox="0 0 150 150" aria-hidden="true"><defs><linearGradient id="apxgRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C9B3DD"/><stop offset="1" stop-color="#CC3366"/></linearGradient></defs><circle cx="75" cy="75" r="68" fill="none" stroke="rgba(201,179,221,.18)" stroke-width="2"/><circle cx="75" cy="75" r="68" fill="none" stroke="url(#apxgRing)" stroke-width="3" stroke-linecap="round" stroke-dasharray="90 338"/><path d="M75 2l5 5-5 5-5-5z" fill="#CC3366"/></svg>';

/* =====================================================================
   mount
   ===================================================================== */
export function mount(container, opts = {}) {
  const lang = opts.lang === 'th' ? 'th' : 'en';
  const onEvent = typeof opts.onEvent === 'function' ? opts.onEvent : () => {};
  const L = o => tx(o, lang);
  const Lf = (o, ...a) => (o[lang] || o.en)(...a);
  css('apxg-css', CSS);
  if (opts.base) {
    const b = opts.base.endsWith('/') ? opts.base : opts.base + '/';
    css('apxg-font', `@font-face{font-family:"LINE Seed";src:url(${b}fonts/LINESeedSansTH-Rg.woff2) format("woff2");font-weight:300 500;font-display:swap}
@font-face{font-family:"LINE Seed";src:url(${b}fonts/LINESeedSansTH-Bd.woff2) format("woff2");font-weight:600 800;font-display:swap}`);
  }

  const root = h('div', { class: 'apxg', lang });
  const wrap = h('div', { class: 'g-wrap' });
  root.appendChild(wrap);
  container.innerHTML = '';
  container.appendChild(root);

  const games = { ...BUILT_IN };   // id -> game module, or null while unavailable
  let destroyed = false, midnightTimer = 0, learnInst = null, overlay = null, view = 'home';

  /* load the two games another build provides; missing files show as Coming soon */
  const externals = Promise.all(Object.entries(EXTERNAL).map(([id, path]) =>
    import(new URL(path, import.meta.url).href)
      .then(m => { const g = m && m.default; games[id] = g && typeof g.run === 'function' ? g : null; })
      .catch(() => { games[id] = null; })));
  externals.then(() => { if (!destroyed && view === 'home') renderHome(); });

  const titleOf = id => (games[id] && games[id].title) || GAMES[id].title;
  const howOf = id => games[id] && games[id].how;

  /* ---------------- shared bits ---------------- */
  const btn = (cls, label, onClick, attrs = {}) => {
    const b = h('button', { class: 'g-btn ' + cls, type: 'button', ...attrs });
    if (typeof label === 'string') b.textContent = label; else b.append(label);
    if (onClick) b.addEventListener('click', onClick);
    return b;
  };
  const iconLabel = (icon, text) => h('span', { html: icon + `<span>${text}</span>`, style: { display: 'inline-flex', gap: '10px', alignItems: 'center' } });
  const triesPill = (light) => {
    const n = triesLeft();
    return h('span', { class: 'g-pill' + (n ? '' : ' zero') + (light ? ' light' : ''), 'data-tries': n }, h('i'), Lf(T.tries, n));
  };
  /* music and sound-effect switches: labelled in the hub header, icon only in the play bar */
  const toggle = (kind, compact) => {
    const ctl = kind === 'music' ? music : sfx;
    const label = L(kind === 'music' ? T.music : T.effects);
    const b = h('button', { class: compact ? 'g-icon' : 'g-tog', type: 'button', 'data-act': kind, 'aria-pressed': String(ctl.on), 'aria-label': label, title: label });
    b.innerHTML = (kind === 'music' ? ICON.music : ICON.sound) + (compact ? '' : `<span>${label}</span><span class="sw" aria-hidden="true"></span>`);
    b.addEventListener('click', () => {
      ctl.set(!ctl.on);
      root.querySelectorAll(`[data-act=${kind}]`).forEach(x => x.setAttribute('aria-pressed', String(ctl.on)));
      if (kind === 'music' && ctl.on) music.play(overlay && overlay.game ? overlay.game : 'hub');
      if (kind === 'sfx' && ctl.on) sfx.play('tap');
    });
    return b;
  };
  const tierTable = id => {
    const g = GAMES[id], best = (bests()[id] || {}).score || 0;
    const ul = h('ul', { class: 'g-tt' }, h('li', { class: 'hd' }, h('span', null, L(T.prize)), h('span', null, L(T.ptsCol))));
    g.tiers.forEach((t, i) => ul.append(h('li', { class: best >= t.score ? 'hit' : '' },
      h('i', { class: 'g-dia t' + i, 'aria-hidden': 'true' }), h('span', { class: 'p' }, L(t.prize)), h('span', { class: 'n' }, fmt(t.score, lang)))));
    ul.append(h('li', { class: 'top' }, h('i', { class: 'g-dia top', 'aria-hidden': 'true' }), h('span', { class: 'p' }, L(g.monthly)), h('span', { class: 'n' }, L(T.topMonth))));
    return ul;
  };
  const bestRow = id => {
    const best = bests()[id];
    return h('div', { class: 'g-kv' }, h('span', null, L(T.best)), best ? h('b', { class: 'num' }, fmt(best.score, lang)) : h('span', { class: 'muted' }, L(T.noBest)));
  };
  const artBox = (id, extra) => {
    const a = h('div', { class: 'g-art', 'data-scene': id, style: { '--mesh': MESH[id] }, html: artSVG(id) });
    if (extra) a.append(...[].concat(extra));
    return a;
  };
  const tilt = card => {
    if (reduced() || !matchMedia('(hover:hover)').matches) return;
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      card.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    });
    card.addEventListener('pointerleave', () => { card.style.setProperty('--mx', 0); card.style.setProperty('--my', 0); });
  };
  const scrollTop = () => {
    const r = root.getBoundingClientRect();
    if (r.top < 0) window.scrollTo({ top: window.scrollY + r.top - 12, behavior: reduced() ? 'auto' : 'smooth' });
  };

  /* ---------------- home ---------------- */
  function renderHome() {
    view = 'home';
    if (learnInst) { learnInst.destroy(); learnInst = null; }
    music.play('hub');
    wrap.innerHTML = '';
    wrap.append(h('header', { class: 'g-head gx-tex', html: FACETS },
      h('div', null, h('h2', null, L(T.games)), h('p', null, L(T.intro))),
      h('div', { class: 'g-tools' }, triesPill(), toggle('music'), toggle('sfx'))));

    const grid = h('div', { class: 'g-grid' });
    GAME_IDS.forEach(id => grid.append(gameCard(id)));
    grid.append(learnCard());
    wrap.append(grid);
    wrap.append(voucherSection());

    clearTimeout(midnightTimer);
    midnightTimer = setTimeout(() => { if (view === 'home') renderHome(); }, msToBkkMidnight() + 1000);
  }

  function gameCard(id) {
    const ready = !!games[id];
    const pending = !(id in games);
    const soon = !ready && !pending;
    const g = GAMES[id];
    const ribbon = [h('span', { class: 'g-ribbon-fold', 'aria-hidden': 'true' }), h('span', { class: 'g-ribbon' }, fill(L(T.from), { s: fmt(g.tiers[0].score, lang) }))];
    if (soon) ribbon.push(h('span', { class: 'g-tag' }, L(T.soon)));
    const card = h('article', { class: 'g-card' + (soon ? ' soon' : ''), 'data-game': id }, artBox(id, ribbon));
    const play = btn('plum block', soon ? L(T.soon) : iconLabel(ICON.play, L(T.play)), () => showDetail(id), { 'data-act': 'open' });
    if (!ready) play.disabled = true;
    card.append(h('div', { class: 'g-body' },
      h('h3', null, L(titleOf(id))),
      howOf(id) ? h('p', { class: 'g-how' }, L(howOf(id))) : null,
      bestRow(id),
      tierTable(id),
      play));
    tilt(card);
    return card;
  }

  function learnCard() {
    const done = learnBonusToday();
    const card = h('article', { class: 'g-card learn', 'data-game': 'learn' },
      artBox('learn'),
      h('div', { class: 'g-body' },
        h('h3', null, L(T.learn)),
        h('p', { class: 'g-how' }, L(T.learnHow)),
        h('ul', { class: 'g-tt info' },
          h('li', null, h('i', { class: 'g-dia t0', 'aria-hidden': 'true' }), h('span', { class: 'p' }, L(T.lQuestions)), h('span', { class: 'n' }, fmt(LEARN_SET_SIZE, lang))),
          h('li', null, h('i', { class: 'g-dia t1', 'aria-hidden': 'true' }), h('span', { class: 'p' }, L(T.lTimer)), h('span', { class: 'n' }, L(T.lNoTimer))),
          h('li', { class: done ? 'hit' : '' }, h('i', { class: 'g-dia t2', 'aria-hidden': 'true' }), h('span', { class: 'p' }, L(T.lReward)), h('span', { class: 'n' }, L(done ? T.learnDone : T.lRewardV)))),
        btn('ghost block', L(T.start), showLearn, { 'data-act': 'learn' })));
    tilt(card);
    return card;
  }

  function voucherSection() {
    const list = vouchers().slice().sort((a, b) => b.issued - a.issued);
    const sec = h('section', { class: 'g-sec', 'aria-labelledby': 'apxg-vh' }, h('h3', { id: 'apxg-vh' }, L(T.vouchers)));
    if (!list.length) { sec.append(h('p', { class: 'g-empty' }, L(T.noVouchers))); return sec; }
    const box = h('div', { class: 'g-vlist' });
    list.forEach(v => {
      const exp = Date.now() > v.expires;
      box.append(h('div', { class: 'g-vrow' + (exp ? ' exp' : ''), 'data-code': v.code },
        h('span', { class: 'stub', 'aria-hidden': 'true' }, h('i')),
        h('div', { class: 'm' },
          h('b', null, L(v.prize)),
          h('span', { class: 'meta' }, h('span', { class: 'code' }, v.code), ' · ', exp ? L(T.expired) : `${L(T.validUntil)} ${dateText(v.expires, lang)}`)),
        btn('ghost sm', L(T.show), () => openVoucher(v))));
    });
    sec.append(box);
    return sec;
  }

  /* ---------------- game detail: choose a mode ---------------- */
  function showDetail(id) {
    if (!games[id]) return;
    view = 'detail';
    music.play('hub');
    wrap.innerHTML = '';
    const left = triesLeft();
    const back = h('button', { class: 'g-backbtn', type: 'button', html: ICON.back + `<span>${L(T.back)}</span>` });
    back.addEventListener('click', () => { renderHome(); scrollTop(); });
    const practice = btn('ghost block', L(T.practice), () => startRun(id, 'practice'), { 'data-act': 'practice' });
    const scored = btn('rose block', L(T.scored), () => startRun(id, 'scored'), { 'data-act': 'scored' });
    if (!left) scored.disabled = true;

    const m = monthRec(), mine = m.best[id];
    const board = h('table', { class: 'g-board' });
    if (mine) board.append(h('tr', null, h('td', null, '1'), h('td', null, L(T.you)), h('td', null, fmt(mine.score, lang))));

    wrap.append(back, h('div', { class: 'g-detail' },
      h('div', { style: { display: 'grid', gap: '16px' } },
        h('div', { class: 'g-dhero' }, artBox(id),
          h('div', { class: 'txt' }, h('h2', null, L(titleOf(id))), howOf(id) ? h('p', null, L(howOf(id))) : null)),
        h('div', { class: 'g-modes' },
          h('div', { class: 'g-mode sc' }, h('span', { class: 'ic', html: ICON.scored }), h('h4', null, L(T.scored)), h('p', null, L(T.scoredNote)),
            h('div', null, triesPill()), left ? null : h('p', null, L(T.resetNote)), scored),
          h('div', { class: 'g-mode' }, h('span', { class: 'ic', html: ICON.practice }), h('h4', null, L(T.practice)), h('p', null, L(T.practiceNote)), practice))),
      h('div', { style: { display: 'grid', gap: '16px' } },
        h('div', { class: 'g-panelbox' }, h('h4', { html: ICON.scored + `<span>${L(T.prizes)}</span>` }), bestRow(id), tierTable(id)),
        h('div', { class: 'g-panelbox' }, h('h4', { html: ICON.board + `<span>${L(T.board)}</span>` }), h('p', { class: 'sub' }, monthText(Date.now(), lang)),
          mine ? board : null, h('p', { class: 'note' }, L(mine ? T.noOthers : T.noScores))))));
    scrollTop();
  }

  /* ---------------- learn ---------------- */
  function showLearn() {
    view = 'learn';
    wrap.innerHTML = '';
    const back = h('button', { class: 'g-backbtn', type: 'button', html: ICON.back + `<span>${L(T.back)}</span>` });
    back.addEventListener('click', () => { renderHome(); scrollTop(); });
    const box = h('div');
    wrap.append(back, h('header', { class: 'g-head gx-tex', html: FACETS, style: { marginBottom: '18px' } },
      h('div', null, h('h2', null, L(T.learn)), h('p', null, L(T.learnHow))), h('div', { class: 'g-tools' }, triesPill())), box);
    learnInst = mountLearn(box, {
      lang, rng: makeRng(newSeed()),
      btn: c => 'g-btn ' + (c || ''),
      onComplete: r => {
        const granted = grantLearnBonus();
        onEvent('games:learn', { correct: r.correct, total: r.total, bonus: granted });
        const pill = wrap.querySelector('.g-pill');
        if (pill) pill.replaceWith(triesPill());
        return granted;
      },
      onExit: () => { renderHome(); scrollTop(); }
    });
    scrollTop();
  }

  /* =====================================================================
     play overlay
     ===================================================================== */
  function openOverlay(id, mode) {
    closeOverlay(true);
    const prevFocus = document.activeElement;
    const quit = h('button', { class: 'g-icon g-quit', type: 'button' }, L(T.quit));
    const sScore = h('b', null, '0'), sLevel = h('b', null, '1'), pips = h('div', { class: 'g-pips', 'aria-hidden': 'true' }), sTime = h('b', null, '');
    const stLives = h('div', { class: 'g-stat', hidden: true }, h('small', null, L(T.lives)), pips);
    const stTime = h('div', { class: 'g-stat', hidden: true }, h('small', null, L(T.time)), sTime);
    const hud = h('div', { class: 'g-hud' }, quit,
      h('div', { class: 'g-stats' },
        h('div', { class: 'g-stat' }, h('small', null, L(T.score)), sScore),
        h('div', { class: 'g-stat' }, h('small', null, L(T.level)), sLevel),
        stLives, stTime),
      h('span', { class: 'g-modetag' + (mode === 'scored' ? ' sc' : '') }, L(mode === 'scored' ? T.tagScored : T.tagPractice)),
      toggle('music', true), toggle('sfx', true));
    const host = h('div', { class: 'g-host' });
    const stage = h('div', { class: 'g-stage' }, host);
    const area = h('div', { class: 'g-area' }, stage);
    const el = h('div', { class: 'g-play', role: 'dialog', 'aria-modal': 'true', 'aria-label': L(titleOf(id)), 'data-game': id, 'data-mode': mode }, hud, area);
    root.appendChild(el);
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    const size = () => {
      const aw = area.clientWidth, ah = area.clientHeight;
      const pad = aw >= 700 ? 16 : 0;
      const hh = ah - pad * 2, ww = Math.min(aw - pad * 2, hh * 1.6);
      stage.style.width = Math.floor(ww) + 'px';
      stage.style.height = Math.floor(hh) + 'px';
    };
    const ro = new ResizeObserver(size);
    ro.observe(area);
    size();

    let maxLives = 0;
    const last = { score: 0, level: 1 };
    const onHud = s => {
      if (!s) return;
      if (s.score !== undefined && s.score !== last.score) { sScore.textContent = fmt(s.score, lang); if (s.score > last.score) pop(sScore, 1.18); last.score = s.score; }
      if (s.level !== undefined && s.level !== last.level) { pop(sLevel, 1.3); last.level = s.level; }
      if (s.level !== undefined) sLevel.textContent = fmt(s.level, lang);
      if (typeof s.lives === 'number') {
        stLives.hidden = false;
        maxLives = Math.max(maxLives, s.lives);
        if (pips.childElementCount !== maxLives) { pips.innerHTML = ''; for (let i = 0; i < maxLives; i++) pips.append(h('i')); }
        [...pips.children].forEach((p, i) => p.classList.toggle('off', i >= s.lives));
        pips.setAttribute('aria-label', `${L(T.lives)} ${s.lives}`);
      }
      if (typeof s.time === 'number') {
        stTime.hidden = false;
        sTime.textContent = String(Math.max(0, Math.ceil(s.time)));
        stTime.classList.toggle('low', s.time <= 5);
      }
    };

    let sureTimer = 0;
    quit.addEventListener('click', () => {
      if (overlay && overlay.panelOpen) { const to = overlay.backTo; closeOverlay(); to ? to() : showDetail(id); return; }
      if (!quit.classList.contains('sure')) {
        quit.classList.add('sure'); quit.textContent = L(T.quitSure);
        clearTimeout(sureTimer);
        sureTimer = setTimeout(() => { quit.classList.remove('sure'); quit.textContent = L(T.quit); }, 2200);
        return;
      }
      overlay && overlay.ctrl && overlay.ctrl.abort();
      closeOverlay();
      showDetail(id);
    });

    overlay = {
      el, host, stage, area, hud, quit, onHud, panelOpen: false, ctrl: null, game: id,
      close() {
        clearTimeout(sureTimer);
        ro.disconnect();
        el.remove();
        document.documentElement.style.overflow = prevOverflow;
        if (prevFocus && prevFocus.focus && document.contains(prevFocus)) prevFocus.focus({ preventScroll: true });
      }
    };
    quit.focus({ preventScroll: true });
    return overlay;
  }
  function closeOverlay(keepMusic) {
    if (!overlay) return;
    const o = overlay; overlay = null;
    o.ctrl && !o.ctrl.signal.aborted && o.ctrl.abort();
    o.close();
    if (!keepMusic) { music.duck(false); music.play('hub'); }
  }

  function countdown(o, id) {
    return new Promise(res => {
      const num = h('b', null, '3');
      const box = h('div', { class: 'g-count', 'aria-live': 'assertive' }, h('h3', null, L(titleOf(id))), h('div', { class: 'ring', html: RING }, num), howOf(id) ? h('p', null, L(howOf(id))) : null);
      o.stage.appendChild(box);
      let n = 3;
      const step = () => {
        if (!overlay || overlay !== o) return res(false);
        if (n === 0) { sfx.play('go'); box.remove(); return res(true); }
        num.textContent = String(n);
        sfx.play('tick');
        if (!reduced() && num.animate) num.animate([{ transform: 'scale(1.35)', opacity: 0.2 }, { transform: 'scale(1)', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.23,1,.32,1)' });
        n--;
        setTimeout(step, 750);
      };
      step();
    });
  }

  async function startRun(id, mode) {
    const g = games[id];
    if (!g) return;
    if (mode === 'scored') { if (triesLeft() <= 0) return; useTry(); }
    const o = openOverlay(id, mode);
    music.duck(false);
    music.play(id);
    const go = await countdown(o, id);
    if (!go || overlay !== o) return;
    const seed = newSeed();
    const ctrl = new AbortController();
    o.ctrl = ctrl;
    onEvent('game:start', { game: id, mode, seed });
    let res = null, failed = false;
    try {
      res = await g.run(o.host, { lang, level: 1, rng: makeRng(seed), signal: ctrl.signal, onHud: o.onHud });
    } catch (e) { failed = true; }
    if (overlay !== o || ctrl.signal.aborted || (res && res.aborted)) return;
    if (failed || !res || typeof res.score !== 'number') {
      if (mode === 'scored') refundTry();
      o.host.innerHTML = '';
      o.host.append(h('div', { class: 'g-count' }, h('p', null, L(T.startFail))));
      return;
    }
    music.duck(true);
    const run = { id, mode, seed, score: Math.max(0, Math.round(res.score)), level: res.level | 0 || 1, durationMs: res.durationMs | 0, inputs: res.inputs | 0, log: Array.isArray(res.log) ? res.log : [], at: Date.now() };
    const before = bests()[id];
    let newBest = false;
    if (mode === 'scored') {
      const b = bests();
      if (!b[id] || run.score > b[id].score) { b[id] = { score: run.score, level: run.level, at: run.at }; newBest = !!run.score; store.set(K.best, b); }
      const m = monthRec();
      if (!m.best[id] || run.score > m.best[id].score) { m.best[id] = { score: run.score, level: run.level, at: run.at }; store.set(K.month, m); }
    }
    onEvent('game:end', { game: id, mode, seed, score: run.score, level: run.level, durationMs: run.durationMs, inputs: run.inputs, log: run.log });
    showResult(o, run, { before, newBest, fresh: true });
  }

  /* ---------------- result ---------------- */
  function panel(o) {
    let p = o.el.querySelector('.g-panel');
    if (!p) { p = h('div', { class: 'g-panel' }); o.area.appendChild(p); }
    p.innerHTML = '';
    p.scrollTop = 0;
    o.panelOpen = true;
    o.quit.textContent = L(T.back);
    o.quit.classList.remove('sure');
    return p;
  }
  const resultHead = (id, chip, sc) => h('div', { class: 'g-rhead', style: { '--mesh': MESH[id] }, html: artSVG(id) },
    h('div', { class: 'cap' }, h('h3', null, L(titleOf(id))), h('span', { class: 'g-chip' + (sc ? ' sc' : '') }, chip)));

  function countUp(el, to, dur, onStep, onDone) {
    if (reduced() || to <= 0) { el.textContent = fmt(to, lang); onStep && onStep(to, true); onDone && onDone(); return () => {}; }
    let raf = 0, t0 = 0, live = true;
    const step = now => {
      if (!live) return;
      if (!t0) t0 = now;
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3), v = Math.round(to * e);
      el.textContent = fmt(v, lang);
      onStep && onStep(v, false);
      if (k < 1) raf = requestAnimationFrame(step); else onDone && onDone();
    };
    raf = requestAnimationFrame(step);
    return () => { live = false; cancelAnimationFrame(raf); };
  }

  function showResult(o, run, info) {
    const p = panel(o);
    const id = run.id, scored = run.mode === 'scored';
    const tier = tierFor(id, run.score), next = nextTier(id, run.score);
    const best = bests()[id];
    const claimedV = vouchers().find(v => v.seed === run.seed && v.game === id);
    const tiers = GAMES[id].tiers;
    const top = tiers[tiers.length - 1].score;
    const animate = !!info.fresh;
    const scoreEl = h('b', { 'data-score': run.score }, animate ? '0' : fmt(run.score, lang));
    /* tier track: medals placed by threshold on a scale a little past the top tier */
    const span = Math.max(top * 1.08, run.score);
    const fillBar = h('i');
    const medals = tiers.map((t, i) => h('div', { class: 'g-medal', style: { left: (t.score / span * 100) + '%', '--t': TIER_COLORS[i] } }, h('span', { class: 'gem' }), h('small', null, fmt(t.score, lang))));
    const track = h('div', { class: 'g-track', 'aria-hidden': 'true' }, h('div', { class: 'bar' }, fillBar), ...medals);
    const prizeBox = tier && scored ? h('div', { class: 'g-prize', 'data-tier': tier.index, style: { '--t': TIER_COLORS[tier.index] } },
      h('span', { class: 'gem' }, h('i')), h('div', null, h('small', null, L(T.prizeReached)), h('b', null, L(tier.prize)))) : null;
    const sheet = h('div', { class: 'g-sheet', 'data-result': '' },
      resultHead(id, L(scored ? T.tagScored : T.tagPractice), scored),
      h('div', { class: 'g-big' }, scoreEl, h('span', null, L(T.pts))),
      track,
      h('dl', { class: 'g-rows' },
        h('div', null, h('dt', null, L(T.levelReached)), h('dd', { 'data-level': run.level }, fmt(run.level, lang))),
        h('div', null, h('dt', null, L(T.best)), h('dd', null, best ? fmt(best.score, lang) : L(T.noBest), info.newBest ? h('span', { class: 'g-badge' }, L(T.newBest)) : null))));
    if (prizeBox) { sheet.append(prizeBox); if (animate && !reduced()) prizeBox.style.opacity = 0; }
    if (!scored) sheet.append(h('p', { class: 'g-next' }, L(T.practiceNoPrize)));
    sheet.append(h('p', { class: 'g-next' }, next ? fill(L(T.nextPrize), { p: L(next.prize), s: fmt(next.score, lang) }) : L(T.allPrizes)));

    const acts = h('div', { class: 'g-acts' });
    if (tier && scored) {
      if (claimedV) acts.append(btn('plum block', L(T.showVoucher), () => showVoucherStep(o, claimedV, run), { 'data-act': 'show-voucher' }));
      else acts.append(btn('rose block', L(T.claim), () => claimSignIn(o, run, tier), { 'data-act': 'claim' }));
    }
    const left = triesLeft();
    const againMode = scored && left > 0 ? 'scored' : 'practice';
    const row = h('div', { class: 'g-acts two' },
      btn('ghost block', L(T.back), () => { closeOverlay(); renderHome(); }, { 'data-act': 'home' }),
      btn('plum block', againMode === 'scored' ? L(T.again) : L(T.practice), () => startRun(id, againMode), { 'data-act': 'again' }));
    sheet.append(acts, row);
    if (scored) sheet.append(triesPill(true));
    p.append(sheet);
    if (!reduced() && sheet.animate && animate) sheet.animate([{ transform: 'translateY(24px) scale(.98)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.23,1,.32,1)' });

    /* score count-up; each tier medal lights as the count passes it */
    const lit = new Set();
    const light = (v, instant) => {
      fillBar.style.width = Math.min(100, v / span * 100) + '%';
      tiers.forEach((t, i) => {
        if (v >= t.score && !lit.has(i)) {
          lit.add(i);
          medals[i].classList.add('on');
          if (!instant && animate) { medals[i].classList.add('burst'); if (scored) sfx.play('tier', { rate: 1 + i * 0.12 }); }
        }
      });
    };
    o.stopCount && o.stopCount();
    o.stopCount = countUp(scoreEl, run.score, animate ? Math.min(1800, 700 + run.score * 0.25) : 0, light, () => {
      if (prizeBox) { prizeBox.style.opacity = ''; prizeBox.classList.add('in'); if (!reduced() && prizeBox.animate && animate) prizeBox.animate([{ transform: 'translateY(10px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.23,1,.32,1)' }); }
      if (tier && scored && !claimedV && animate) sfx.play('prize');
    });
    if (!animate) light(run.score, true);
    const first = sheet.querySelector('.g-btn');
    first && first.focus({ preventScroll: true });
  }

  /* ---------------- claim flow ---------------- */
  function claimSignIn(o, run, tier) {
    const p = panel(o);
    const next = () => claimDetails(o, run, tier);
    const sheet = h('div', { class: 'g-sheet', 'data-step': 'signin' },
      resultHead(run.id, L(T.claim), true),
      h('h3', { style: { marginTop: '20px' } }, fill(L(T.signIn), { p: L(tier.prize) })),
      h('div', { class: 'g-signs' },
        btn('line block', iconLabel(ICON.line, L(T.line)), next, { 'data-act': 'line' }),
        btn('ghost block', iconLabel(ICON.mail, L(T.email)), next, { 'data-act': 'email' }),
        btn('ghost block', iconLabel(ICON.wa, L(T.whatsapp)), next, { 'data-act': 'whatsapp' })),
      h('p', { class: 'g-note' }, h('span', { class: 'g-tagi' }, L(T.previewTag)), L(T.previewSignIn)),
      h('div', { class: 'g-acts' }, btn('ghost block', L(T.cancel), () => showResult(o, run, { newBest: false }))));
    p.append(sheet);
    sheet.querySelector('[data-act=line]').focus({ preventScroll: true });
  }

  function claimDetails(o, run, tier) {
    const p = panel(o);
    const nameIn = h('input', { type: 'text', id: 'apxg-name', autocomplete: 'name', placeholder: L(T.namePh), maxlength: '60' });
    const consent = h('input', { type: 'checkbox', id: 'apxg-consent' });
    const remind = h('input', { type: 'checkbox', id: 'apxg-remind' });
    const freq = h('fieldset', { class: 'g-freq', hidden: true }, h('legend', null, L(T.freq)),
      ...['reset', 'weekly', 'expiry'].map((v, i) => h('label', null, h('input', { type: 'radio', name: 'apxg-freq', value: v, checked: i === 0 }), L([T.f1, T.f2, T.f3][i]))));
    const create = btn('rose block', L(T.create), null, { 'data-act': 'create' });
    const check = () => { create.disabled = !(consent.checked && nameIn.value.trim()); };
    nameIn.addEventListener('input', check);
    consent.addEventListener('change', check);
    remind.addEventListener('change', () => { freq.hidden = !remind.checked; });
    check();
    create.addEventListener('click', () => {
      if (create.disabled) return;
      const f = freq.querySelector('input:checked');
      const taken = new Set(vouchers().map(v => v.code));
      const now = Date.now();
      const v = {
        code: makeCode(taken), game: run.id, prize: tier.prize, tier: tier.index, score: run.score, level: run.level,
        name: nameIn.value.trim().slice(0, 60), issued: now, expires: now + VOUCHER_DAYS * 86400e3, seed: run.seed,
        run: { durationMs: run.durationMs, inputs: run.inputs, logLength: run.log.length },
        consent: true, remind: remind.checked ? { channel: 'line', when: f ? f.value : 'reset' } : null, preview: true
      };
      const all = vouchers(); all.push(v); store.set(K.vouchers, all);
      onEvent('games:voucher', { code: v.code, game: v.game, score: v.score, prize: v.prize, remind: v.remind });
      sfx.play('prize');
      showVoucherStep(o, v, run);
    });
    const sheet = h('div', { class: 'g-sheet', 'data-step': 'details' },
      resultHead(run.id, L(tier.prize), true),
      h('h3', { style: { marginTop: '20px' } }, L(T.details)),
      h('div', { class: 'g-field' }, h('label', { for: 'apxg-name' }, L(T.name)), nameIn),
      h('label', { class: 'g-check' }, consent, h('span', null, L(T.consent))),
      h('label', { class: 'g-check opt' }, remind, h('span', null, L(T.remind))),
      freq,
      h('div', { class: 'g-acts' }, create, btn('ghost block', L(T.cancel), () => claimSignIn(o, run, tier))));
    p.append(sheet);
    nameIn.focus({ preventScroll: true });
  }

  function voucherCard(v) {
    const qr = h('div', { class: 'g-vc-qr', 'aria-hidden': 'true' });
    const err = h('p', { class: 'g-err', hidden: true }, L(T.qrFail));
    loadQR().then(() => { qr.innerHTML = qrSVG(qrMatrix(v.code)); }).catch(() => { qr.hidden = true; err.hidden = false; });
    const card = h('div', { class: 'g-vc', 'data-code': v.code },
      h('span', { class: 'g-vc-tag' }, L(T.previewTag)),
      h('div', { class: 'g-vc-top' },
        h('small', null, L(T.hospital)),
        h('div', { class: 'g-vc-label' }, L(T.voucher)),
        h('div', { class: 'g-vc-prize' }, L(v.prize)),
        h('div', { class: 'g-vc-meta' }, `${L(titleOf(v.game))} · ${fmt(v.score, lang)} ${L(T.pts)}`)),
      h('div', { class: 'g-vc-perf', 'aria-hidden': 'true' }, h('i'), h('i')),
      h('div', { class: 'g-vc-body' },
        h('dl', null,
          h('div', null, h('dt', null, L(T.vName)), h('dd', null, v.name)),
          h('div', null, h('dt', null, L(T.vCode)), h('dd', { class: 'code' }, v.code)),
          h('div', null, h('dt', null, L(T.validUntil)), h('dd', null, dateText(v.expires, lang)))),
        qr),
      h('p', { class: 'g-vc-foot' }, L(T.reception)));
    return h('div', null, card, err);
  }

  function showVoucherStep(o, v, run) {
    const p = panel(o);
    p.append(voucherView(v, () => { if (run) showResult(o, run, { newBest: false }); else closeOverlay(); }));
  }

  function voucherView(v, onDone) {
    const status = h('p', { class: 'g-note', 'aria-live': 'polite', style: { color: 'var(--g-on2)' } });
    const save = btn('plum block', iconLabel(ICON.save, L(T.save)), async () => {
      save.disabled = true; status.textContent = '';
      try { const r = await saveVoucher(v); if (r) status.textContent = L(T.saved); }
      catch (e) { status.textContent = L(T.saveFail); }
      save.disabled = false;
    }, { 'data-act': 'save' });
    const plan = btn('ghost block', iconLabel(ICON.plan, L(T.plan)), () => {
      onEvent('plan:voucher', { code: v.code, game: v.game, prize: v.prize, score: v.score, expires: v.expires, issued: v.issued });
      plan.disabled = true;
      plan.querySelector('span span').textContent = L(T.planned);
    }, { 'data-act': 'plan' });
    const box = h('div', { class: 'g-sheet', 'data-step': 'voucher', style: { background: 'transparent', boxShadow: 'none', padding: '0' } },
      voucherCard(v),
      h('div', { class: 'g-acts fit' }, save, plan),
      status,
      h('div', { class: 'g-acts' }, btn('light block', L(T.done), onDone, { 'data-act': 'done' })));
    const card = box.querySelector('.g-vc');
    if (card && !reduced() && card.animate) card.animate([{ transform: 'translateY(30px) rotate(-1.5deg) scale(.96)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.23,1,.32,1)' });
    return box;
  }

  function openVoucher(v) {
    const o = openOverlay(v.game, 'scored');
    o.game = null;
    o.hud.querySelector('.g-stats').style.visibility = 'hidden';
    o.hud.querySelector('.g-modetag').remove();
    o.stage.style.display = 'none';
    o.backTo = renderHome;
    const p = panel(o);
    p.append(voucherView(v, () => { closeOverlay(); renderHome(); }));
  }

  /* ---------------- voucher PNG ---------------- */
  async function voucherPNG(v) {
    try { await document.fonts.ready; } catch (e) {}
    let m = null;
    try { await loadQR(); m = qrMatrix(v.code); } catch (e) {}
    const W = 1080, H = 1500, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    const F = (w, s) => `${w} ${s}px "LINE Seed","Sarabun","Noto Sans Thai",system-ui,sans-serif`;
    const rr = (X, Y, w, hh, r) => { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + hh, r); x.arcTo(X + w, Y + hh, X, Y + hh, r); x.arcTo(X, Y + hh, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); };
    const wrapText = (t, X, Y, maxW, lh) => {
      const parts = lang === 'th' && typeof Intl.Segmenter === 'function'
        ? [...new Intl.Segmenter('th', { granularity: 'word' }).segment(t)].map(s => s.segment)
        : t.split(/(\s+)/);
      for (let i = parts.length - 2; i >= 0; i--) if (/^[(\[“"'‘]$/.test(parts[i].trim()) && parts[i].trim()) { parts[i + 1] = parts[i].trim() + parts[i + 1]; parts.splice(i, 1); }
      let line = '', y = Y;
      for (const w of parts) {
        const test = line + w;
        if (x.measureText(test).width > maxW && line.trim()) { x.fillText(line.trim(), X, y); line = w.trimStart(); y += lh; }
        else line = test;
      }
      if (line.trim()) x.fillText(line.trim(), X, y);
      return y;
    };
    x.fillStyle = '#FBF3FB'; x.fillRect(0, 0, W, H);
    const M = 60, CW = W - M * 2, CH = H - M * 2;
    x.save(); rr(M, M, CW, CH, 56); x.clip();
    x.fillStyle = '#fff'; x.fillRect(M, M, CW, CH);
    const topH = 560;
    const g = x.createLinearGradient(M, M, M + CW, M + topH);
    g.addColorStop(0, '#6A388C'); g.addColorStop(1, '#2A0F40');
    x.fillStyle = g; x.fillRect(M, M, CW, topH);
    // diamond lattice over the top panel
    x.strokeStyle = 'rgba(201,179,221,.16)'; x.lineWidth = 2;
    for (let k = -topH; k < CW + topH; k += 44) { x.beginPath(); x.moveTo(M + k, M); x.lineTo(M + k + topH, M + topH); x.stroke(); x.beginPath(); x.moveTo(M + k + topH, M); x.lineTo(M + k, M + topH); x.stroke(); }
    x.restore();
    x.save(); rr(M, M, CW, CH, 56); x.lineWidth = 3; x.strokeStyle = '#E4D8EE'; x.stroke(); x.restore();
    x.font = F(800, 30);
    const tag = L(T.previewTag), tw = x.measureText(tag).width + 44;
    x.fillStyle = '#CC3366'; rr(M + CW - tw - 40, M + 40, tw, 52, 26); x.fill();
    x.fillStyle = '#fff'; x.textBaseline = 'middle'; x.fillText(tag, M + CW - tw - 18, M + 67);
    x.textBaseline = 'alphabetic';
    const P = M + 64;
    x.fillStyle = '#CDB9DD'; x.font = F(700, 32); x.fillText(L(T.hospital), P, M + 140);
    x.fillStyle = '#C9B3DD'; x.font = F(800, 34); x.fillText(L(T.voucher), P, M + 230);
    x.fillStyle = '#fff'; x.font = F(800, 72);
    const py = wrapText(L(v.prize), P, M + 320, CW - 128, 86);
    x.fillStyle = '#CDB9DD'; x.font = F(400, 36);
    x.fillText(`${L(titleOf(v.game))} · ${fmt(v.score, lang)} ${L(T.pts)}`, P, Math.min(py + 76, M + topH - 50));
    // perforation with side notches
    x.fillStyle = '#FBF3FB';
    x.beginPath(); x.arc(M, M + topH + 2, 28, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(M + CW, M + topH + 2, 28, 0, Math.PI * 2); x.fill();
    x.setLineDash([16, 14]); x.strokeStyle = '#C9B3DD'; x.lineWidth = 4;
    x.beginPath(); x.moveTo(M + 50, M + topH + 2); x.lineTo(M + CW - 50, M + topH + 2); x.stroke(); x.setLineDash([]);
    let y = M + topH + 110;
    const field = (label, val, big) => {
      x.fillStyle = '#5A4A66'; x.font = F(700, 30); x.fillText(label, P, y);
      x.fillStyle = big ? '#6A388C' : '#2A1F33'; x.font = F(800, big ? 64 : 44);
      x.fillText(val, P, y + (big ? 72 : 58));
      y += big ? 160 : 140;
    };
    field(L(T.vName), v.name.length > 26 ? v.name.slice(0, 25) + '…' : v.name);
    field(L(T.vCode), v.code, true);
    field(L(T.validUntil), dateText(v.expires, lang));
    if (m) {
      const q = 380, X0 = M + CW - q - 64, Y0 = M + topH + 300 - q / 2 + 40;
      x.fillStyle = '#fff'; x.fillRect(X0 - 16, Y0 - 16, q + 32, q + 32);
      const cell = q / m.n;
      x.fillStyle = '#1F0A30';
      for (let r = 0; r < m.n; r++) for (let cc = 0; cc < m.n; cc++) if (m.dark(r, cc)) x.fillRect(Math.floor(X0 + cc * cell), Math.floor(Y0 + r * cell), Math.ceil(cell), Math.ceil(cell));
    }
    x.fillStyle = '#55286F'; x.font = F(800, 40);
    x.fillText(L(T.reception), P, M + CH - 70);
    return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('png'))), 'image/png'));
  }

  async function saveVoucher(v) {
    const blob = await voucherPNG(v);
    const name = `apex-voucher-${v.code}.png`;
    let file = null;
    try { file = new File([blob], name, { type: 'image/png' }); } catch (e) {}
    if (file && navigator.canShare && navigator.share) {
      try {
        if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: L(T.voucher) }); return true; }
      } catch (e) { if (e && e.name === 'AbortError') return false; }
    }
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name, style: { display: 'none' } });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return true;
  }

  /* ---------------- go ---------------- */
  renderHome();

  return {
    destroy() {
      destroyed = true;
      clearTimeout(midnightTimer);
      closeOverlay(true);
      music.stop();
      if (learnInst) learnInst.destroy();
      root.remove();
    }
  };
}
