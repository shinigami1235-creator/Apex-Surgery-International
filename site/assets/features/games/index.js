/* Apex games hub: games grid, daily tries, play flow, results, prize claim and vouchers.
   mount(container, {lang, base, serviceUrl, onEvent}) -> {destroy()} */
import { css, h, tx, fmt, store, bkkDay, bkkMonth, msToBkkMidnight, makeRng, newSeed, sfx, reduced, pop } from './framework.js';
import { GAMES, GAME_IDS, DAILY_TRIES, LEARN_BONUS_TRIES, VOUCHER_DAYS, CODE_PREFIX, tierFor, nextTier } from './config.js';
import { mountLearn } from './learn.js';
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
  soundOn: { en: 'Sound on', th: 'เปิดเสียง' },
  soundOff: { en: 'Sound off', th: 'ปิดเสียง' },
  best: { en: 'Personal best', th: 'คะแนนสูงสุดของคุณ' },
  noBest: { en: 'No score yet', th: 'ยังไม่มีคะแนน' },
  prizes: { en: 'Prizes', th: 'รางวัล' },
  pts: { en: 'points', th: 'คะแนน' },
  topMonth: { en: 'No. 1', th: 'อันดับ 1' },
  play: { en: 'Play', th: 'เล่น' },
  soon: { en: 'Coming soon', th: 'เร็ว ๆ นี้' },
  learn: { en: 'Learn', th: 'เรียนรู้' },
  learnHow: { en: 'Eight fact or myth questions at your own pace.', th: 'คำถามจริงหรือเข้าใจผิด 8 ข้อ ทำได้ตามจังหวะของคุณ' },
  learnTag: { en: 'Finish a set: +1 try today', th: 'ทำครบชุด: +1 สิทธิ์วันนี้' },
  learnDone: { en: 'Extra try added today', th: 'วันนี้ได้รับสิทธิ์เพิ่มแล้ว' },
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
  claimed: { en: 'Voucher claimed', th: 'รับบัตรกำนัลแล้ว' },
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
  startFail: { en: 'The game could not start.', th: 'เริ่มเกมไม่สำเร็จ' },
  of: { en: 'points', th: 'คะแนน' }
};
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);

/* ---------------- card art: small geometric marks per game ---------------- */
const ART = {
  steady: '<svg viewBox="0 0 120 64" aria-hidden="true"><path d="M8 44 C28 14,46 54,64 30 S98 12,112 26" fill="none" stroke="#C9B3DD" stroke-width="3" stroke-dasharray="4 6" stroke-linecap="round"/><path d="M8 44 C28 14,46 54,64 30" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/><circle cx="64" cy="30" r="6" fill="#CC3366"/></svg>',
  proportion: '<svg viewBox="0 0 120 64" aria-hidden="true"><rect x="14" y="8" width="77" height="48" rx="4" fill="none" stroke="#C9B3DD" stroke-width="2.5"/><line x1="61.6" y1="8" x2="61.6" y2="56" stroke="#C9B3DD" stroke-width="2.5"/><line x1="61.6" y1="26.4" x2="91" y2="26.4" stroke="#C9B3DD" stroke-width="2.5"/><line x1="14" y1="56" x2="91" y2="8" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="91" cy="26.4" r="4" fill="#CC3366"/></svg>',
  factrush: '<svg viewBox="0 0 120 64" aria-hidden="true"><rect x="22" y="12" width="44" height="40" rx="7" fill="#C9B3DD" transform="rotate(-10 44 32)"/><rect x="54" y="10" width="44" height="40" rx="7" fill="#fff" transform="rotate(9 76 30)"/><path d="M68 30l6 6 11-12" fill="none" stroke="#6A388C" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" transform="rotate(9 76 30)"/></svg>',
  recoverysort: '<svg viewBox="0 0 120 64" aria-hidden="true"><rect x="6" y="8" width="108" height="18" rx="5" fill="#2E1146" stroke="#C9B3DD" stroke-width="1.5"/><rect x="58" y="10" width="30" height="14" rx="4" fill="#fff"/><rect x="12" y="38" width="28" height="20" rx="5" fill="none" stroke="#C9B3DD" stroke-width="2" stroke-dasharray="3 3"/><rect x="46" y="38" width="28" height="20" rx="5" fill="#A886CD"/><rect x="80" y="38" width="28" height="20" rx="5" fill="none" stroke="#C9B3DD" stroke-width="2" stroke-dasharray="3 3"/></svg>',
  memorymatch: '<svg viewBox="0 0 120 64" aria-hidden="true"><rect x="22" y="6" width="22" height="24" rx="4" fill="#6A388C" stroke="#C9B3DD"/><rect x="49" y="6" width="22" height="24" rx="4" fill="#fff"/><rect x="76" y="6" width="22" height="24" rx="4" fill="#6A388C" stroke="#C9B3DD"/><rect x="22" y="34" width="22" height="24" rx="4" fill="#F1EAF7"/><rect x="49" y="34" width="22" height="24" rx="4" fill="#6A388C" stroke="#C9B3DD"/><rect x="76" y="34" width="22" height="24" rx="4" fill="#6A388C" stroke="#C9B3DD"/><path d="M33 45 l27-27" stroke="#CC3366" stroke-width="2.5" stroke-dasharray="3 3"/></svg>',
  learn: '<svg viewBox="0 0 120 64" aria-hidden="true"><rect x="30" y="8" width="60" height="48" rx="8" fill="#fff"/><line x1="40" y1="22" x2="80" y2="22" stroke="#C9B3DD" stroke-width="3" stroke-linecap="round"/><line x1="40" y1="32" x2="74" y2="32" stroke="#C9B3DD" stroke-width="3" stroke-linecap="round"/><line x1="40" y1="42" x2="62" y2="42" stroke="#C9B3DD" stroke-width="3" stroke-linecap="round"/><circle cx="84" cy="46" r="9" fill="#CC3366"/><path d="M80 46l3 3 5-6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>'
};
const ICON = {
  sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
  mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 1-13.4 7.9L3 21l1.2-4.4A9 9 0 1 1 21 12z"/><path d="M9 9c0 3.3 2.7 6 6 6l1-1.6-2-1-1 1c-1-.4-2-1.4-2.4-2.4l1-1-1-2z"/></svg>',
  line: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="6" fill="#06C755"/><path d="M12 6.2c-3.6 0-6.5 2.3-6.5 5.2 0 2.6 2.3 4.7 5.4 5.1.4.1.3.4.2 1.2 0 .3-.2.9.7.5s4.6-2.8 5.9-4.6c.5-.7.8-1.4.8-2.2 0-2.9-2.9-5.2-6.5-5.2z" fill="#fff"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/></svg>',
  plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M12 13v5M9.5 15.5h5"/></svg>'
};

/* ---------------- styles ---------------- */
const CSS = `
.apxg{--g-plum:var(--plum,#6A388C);--g-plum7:var(--plum-700,#55286F);--g-night:var(--night,#1F0A30);--g-night2:var(--night-2,#2A0F40);
  --g-lilac:var(--lilac,#A886CD);--g-l3:var(--lilac-300,#C9B3DD);--g-l2:var(--lilac-200,#E4D8EE);--g-l1:var(--lilac-100,#F1EAF7);--g-wash:var(--wash,#FBF3FB);
  --g-ink:var(--ink,#2A1F33);--g-ink2:var(--ink-2,#5A4A66);--g-on:var(--on-night,#F6EEFB);--g-on2:var(--on-night-2,#CDB9DD);--g-rose:#CC3366;
  --g-ease:cubic-bezier(.23,1,.32,1);
  font-family:"LINE Seed","Sarabun","Noto Sans Thai",system-ui,sans-serif;color:var(--g-ink);line-height:1.6;font-size:16px;-webkit-text-size-adjust:100%}
.apxg *,.apxg *::before,.apxg *::after{box-sizing:border-box}
.apxg button{font:inherit}
.apxg .g-wrap{max-width:1180px;margin:0 auto;padding:24px 16px 48px}
.apxg h2,.apxg h3,.apxg h4{margin:0;line-height:1.25;color:var(--g-ink)}
.apxg .g-head{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:22px}
.apxg .g-head h2{font-size:clamp(28px,5vw,40px);font-weight:800;letter-spacing:-.01em}
.apxg .g-head p{margin:6px 0 0;color:var(--g-ink2);max-width:52ch}
.apxg .g-tools{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.apxg .g-pill{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;border-radius:999px;background:var(--g-l1);color:var(--g-plum7);font-weight:700;font-size:15px}
.apxg .g-pill i{width:9px;height:9px;transform:rotate(45deg);background:var(--g-plum);border-radius:2px;display:inline-block}
.apxg .g-pill.zero{background:#FCEAF0;color:#9E2050}
.apxg .g-pill.zero i{background:var(--g-rose)}
.apxg .g-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 22px;border-radius:999px;border:2px solid transparent;font-weight:700;font-size:16px;cursor:pointer;text-decoration:none;transition:transform .16s var(--g-ease),background-color .2s,color .2s,border-color .2s,box-shadow .2s;white-space:nowrap}
.apxg .g-btn:active{transform:scale(.97)}
.apxg .g-btn:focus-visible{outline:3px solid var(--g-lilac);outline-offset:2px}
.apxg .g-btn svg{width:20px;height:20px;flex:none}
.apxg .g-btn.plum{background:var(--g-plum);color:#fff;box-shadow:0 10px 24px -12px rgba(106,56,140,.8)}
.apxg .g-btn.plum:hover{background:var(--g-plum7)}
.apxg .g-btn.rose{background:var(--g-rose);color:#fff;box-shadow:0 10px 24px -12px rgba(204,51,102,.8)}
.apxg .g-btn.ghost{background:transparent;color:var(--g-plum);border-color:var(--g-l3)}
.apxg .g-btn.ghost:hover{border-color:var(--g-plum)}
.apxg .g-btn.light{background:#fff;color:var(--g-plum)}
.apxg .g-btn.onnight{background:rgba(255,255,255,.08);color:#fff;border-color:rgba(201,179,221,.4)}
.apxg .g-btn[disabled]{opacity:.45;cursor:not-allowed;box-shadow:none}
.apxg .g-btn.sm{min-height:44px;padding:0 16px;font-size:15px}
.apxg .g-btn.block{width:100%}
.apxg .g-icon{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-width:44px;min-height:44px;padding:0 14px;border-radius:999px;border:1.5px solid var(--g-l3);background:#fff;color:var(--g-plum);cursor:pointer;font-weight:700;font-size:15px}
.apxg .g-icon svg{width:20px;height:20px}
.apxg .g-icon[aria-pressed="true"]{background:var(--g-plum);color:#fff;border-color:var(--g-plum)}

.apxg .g-grid{display:grid;grid-template-columns:1fr;gap:16px}
@media (min-width:640px){.apxg .g-grid{grid-template-columns:repeat(2,1fr)}}
@media (min-width:1000px){.apxg .g-grid{grid-template-columns:repeat(3,1fr)}}
.apxg .g-card{position:relative;display:flex;flex-direction:column;background:#fff;border:1px solid var(--g-l2);border-radius:20px;overflow:hidden;box-shadow:0 10px 30px -18px rgba(74,22,104,.35);transition:transform .25s var(--g-ease),box-shadow .25s}
.apxg .g-card:hover{transform:translateY(-2px);box-shadow:0 18px 40px -20px rgba(74,22,104,.45)}
.apxg .g-art{height:96px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--g-night2),var(--g-plum));position:relative}
.apxg .g-art svg{height:64px;width:auto}
.apxg .g-art .g-tag{position:absolute;top:12px;right:12px}
.apxg .g-tag{display:inline-block;font-size:12px;font-weight:700;line-height:22px;padding:0 10px;border-radius:999px;background:rgba(255,255,255,.14);color:#fff;border:1px solid rgba(255,255,255,.3)}
.apxg .g-tag.rose{background:var(--g-rose);border-color:var(--g-rose)}
.apxg .g-tag.lilac{background:var(--g-l1);color:var(--g-plum7);border-color:var(--g-l2)}
.apxg .g-body{padding:16px 18px 18px;display:flex;flex-direction:column;gap:10px;flex:1}
.apxg .g-body h3{font-size:21px;font-weight:800}
.apxg .g-how{margin:0;color:var(--g-ink2);font-size:15px}
.apxg .g-best{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:8px 0;border-top:1px solid var(--g-l1);border-bottom:1px solid var(--g-l1);font-size:14px;color:var(--g-ink2)}
.apxg .g-best b{font-size:18px;color:var(--g-ink)}
.apxg .g-tiers{list-style:none;margin:0;padding:0;display:grid;gap:6px;font-size:14px}
.apxg .g-tiers li{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:baseline}
.apxg .g-tiers .n{min-width:64px;font-weight:800;color:var(--g-plum);font-variant-numeric:tabular-nums}
.apxg .g-tiers li.hit .n{color:var(--g-rose)}
.apxg .g-tiers li.top .n{color:var(--g-ink2);font-weight:700}
.apxg .g-tiers-label{font-size:12px;font-weight:700;color:var(--g-ink2);letter-spacing:.02em;margin-bottom:-4px}
.apxg .g-card .g-btn{margin-top:auto}
.apxg .g-card.soon{opacity:.75}
.apxg .g-card.soon .g-art{filter:grayscale(.5)}
.apxg .g-card.learn .g-art{background:linear-gradient(135deg,var(--g-plum),var(--g-lilac))}

.apxg .g-sec{margin-top:36px}
.apxg .g-sec h3{font-size:22px;font-weight:800;margin-bottom:12px}
.apxg .g-vlist{display:grid;gap:10px}
@media (min-width:800px){.apxg .g-vlist{grid-template-columns:repeat(2,1fr)}}
.apxg .g-vrow{display:flex;align-items:center;gap:14px;background:#fff;border:1px solid var(--g-l2);border-radius:16px;padding:12px 14px}
.apxg .g-vrow .m{flex:1;min-width:0}
.apxg .g-vrow b{display:block;font-size:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.apxg .g-vrow span{font-size:13px;color:var(--g-ink2)}
.apxg .g-vrow .code{font-weight:800;color:var(--g-plum);letter-spacing:.06em}
.apxg .g-empty{color:var(--g-ink2);margin:0}

.apxg .g-backbtn{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 14px 0 8px;margin:-4px 0 14px -8px;border:0;background:none;color:var(--g-plum);font-weight:700;cursor:pointer;border-radius:999px}
.apxg .g-backbtn svg{width:20px;height:20px}
.apxg .g-detail{display:grid;gap:18px}
@media (min-width:900px){.apxg .g-detail{grid-template-columns:1.2fr 1fr;align-items:start}}
.apxg .g-dhead{display:flex;gap:16px;align-items:center}
.apxg .g-dhead .g-art{width:120px;height:80px;border-radius:16px;flex:none}
.apxg .g-dhead .g-art svg{height:52px}
.apxg .g-dhead h2{font-size:clamp(26px,5vw,34px);font-weight:800}
.apxg .g-modes{display:grid;gap:12px;margin-top:4px}
@media (min-width:560px){.apxg .g-modes{grid-template-columns:1fr 1fr}}
.apxg .g-mode{display:flex;flex-direction:column;gap:8px;padding:16px;border-radius:20px;border:1px solid var(--g-l2);background:#fff}
.apxg .g-mode.sc{background:linear-gradient(160deg,var(--g-night2),var(--g-plum7));color:#fff;border-color:transparent}
.apxg .g-mode h4{font-size:18px;font-weight:800;color:inherit}
.apxg .g-mode p{margin:0;font-size:14px;color:var(--g-ink2)}
.apxg .g-mode.sc p{color:var(--g-on2)}
.apxg .g-mode .g-btn{margin-top:auto}
.apxg .g-panelbox{background:#fff;border:1px solid var(--g-l2);border-radius:20px;padding:16px 18px}
.apxg .g-panelbox h4{font-size:17px;font-weight:800;margin-bottom:10px}
.apxg .g-panelbox .sub{font-size:13px;color:var(--g-ink2);margin:-6px 0 10px}
.apxg .g-board{width:100%;border-collapse:collapse;font-size:15px}
.apxg .g-board td{padding:8px 4px;border-bottom:1px solid var(--g-l1)}
.apxg .g-board td:first-child{width:36px;color:var(--g-ink2);font-weight:700}
.apxg .g-board td:last-child{text-align:right;font-weight:800;font-variant-numeric:tabular-nums}
.apxg .g-board + p{margin:10px 0 0;font-size:14px;color:var(--g-ink2)}

/* ---------- play overlay ---------- */
.apxg .g-play{position:fixed;inset:0;z-index:9000;background:var(--g-night);color:#fff;display:flex;flex-direction:column;overscroll-behavior:contain}
.apxg .g-hud{flex:none;display:flex;align-items:center;gap:10px;padding:6px 10px;padding-top:max(6px,env(safe-area-inset-top));min-height:60px;background:rgba(31,10,48,.96);border-bottom:1px solid rgba(201,179,221,.16)}
.apxg .g-hud .g-btn,.apxg .g-hud .g-icon{min-height:44px}
.apxg .g-hud .g-icon{background:transparent;color:#fff;border-color:rgba(201,179,221,.35);padding:0 10px}
.apxg .g-hud .g-icon[aria-pressed="true"]{background:var(--g-plum);border-color:var(--g-lilac)}
.apxg .g-quit{min-width:64px}
.apxg .g-quit.sure{background:var(--g-rose)!important;border-color:var(--g-rose)!important}
.apxg .g-stats{flex:1;display:flex;justify-content:center;gap:clamp(12px,4vw,36px);min-width:0}
.apxg .g-stat{display:flex;flex-direction:column;align-items:center;line-height:1.1}
.apxg .g-stat small{font-size:11px;color:var(--g-on2);font-weight:700;letter-spacing:.03em}
.apxg .g-stat b{font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;display:inline-block}
.apxg .g-stat.low b{color:#FF8FB3}
.apxg .g-pips{display:flex;gap:5px;height:24px;align-items:center}
.apxg .g-pips i{width:11px;height:11px;transform:rotate(45deg);border-radius:2px;background:var(--g-rose);display:block;transition:background-color .2s,transform .2s}
.apxg .g-pips i.off{background:transparent;box-shadow:inset 0 0 0 1.5px rgba(201,179,221,.5)}
.apxg .g-modetag{font-size:11px;font-weight:800;line-height:20px;padding:0 8px;border-radius:999px;background:rgba(255,255,255,.12);color:var(--g-on2);white-space:nowrap}
.apxg .g-modetag.sc{background:var(--g-rose);color:#fff}
@media (max-width:420px){.apxg .g-modetag{display:none}.apxg .g-stat b{font-size:18px}}
.apxg .g-area{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;position:relative}
.apxg .g-stage{position:relative;overflow:hidden;background:var(--g-night)}
@media (min-width:700px){.apxg .g-stage{border-radius:20px;box-shadow:0 30px 80px -30px rgba(0,0,0,.8);border:1px solid rgba(201,179,221,.15)}}
.apxg .g-host{position:absolute;inset:0}
.apxg .g-count{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:rgba(31,10,48,.86);z-index:50;text-align:center;padding:24px}
.apxg .g-count b{font-size:96px;line-height:1;font-weight:800;width:150px;height:150px;display:flex;align-items:center;justify-content:center;border-radius:50%;border:3px solid var(--g-lilac)}
.apxg .g-count h3{color:#fff;font-size:24px}
.apxg .g-count p{margin:0;color:var(--g-on2);font-size:17px;max-width:30ch}

.apxg .g-panel{position:absolute;inset:0;overflow-y:auto;padding:20px 16px calc(28px + env(safe-area-inset-bottom));z-index:60;background:var(--g-night)}
.apxg .g-sheet{max-width:520px;margin:0 auto;background:#fff;color:var(--g-ink);border-radius:28px;padding:24px 20px;box-shadow:0 30px 80px -30px rgba(0,0,0,.8)}
.apxg .g-sheet h3{font-size:24px;font-weight:800}
.apxg .g-sheet .kicker{font-size:13px;font-weight:700;color:var(--g-ink2);margin:0 0 4px}
.apxg .g-big{display:flex;align-items:baseline;gap:10px;margin:14px 0 4px}
.apxg .g-big b{font-size:56px;line-height:1;font-weight:800;color:var(--g-plum);font-variant-numeric:tabular-nums}
.apxg .g-big span{font-size:16px;color:var(--g-ink2);font-weight:700}
.apxg .g-rows{margin:12px 0 0;display:grid;gap:0}
.apxg .g-rows div{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--g-l1);font-size:15px}
.apxg .g-rows dt{color:var(--g-ink2)}
.apxg .g-rows dd{margin:0;font-weight:800;text-align:right}
.apxg .g-badge{display:inline-block;margin-left:8px;font-size:12px;line-height:20px;padding:0 8px;border-radius:999px;background:var(--g-l1);color:var(--g-plum7);font-weight:800;vertical-align:2px}
.apxg .g-prize{margin-top:14px;padding:14px 16px;border-radius:20px;background:linear-gradient(150deg,var(--g-plum),var(--g-night2));color:#fff}
.apxg .g-prize small{display:block;font-size:12px;font-weight:700;color:var(--g-on2)}
.apxg .g-prize b{font-size:20px;line-height:1.3}
.apxg .g-next{margin:12px 0 0;font-size:15px;color:var(--g-ink2)}
.apxg .g-acts{display:grid;gap:10px;margin-top:18px}
.apxg .g-acts.two{grid-template-columns:1fr 1fr}
.apxg .g-acts.fit{grid-template-columns:repeat(auto-fit,minmax(210px,1fr))}
.apxg .g-signs{display:grid;gap:10px;margin:16px 0 6px}
.apxg .g-signs .g-btn{justify-content:flex-start;padding-left:18px}
.apxg .g-signs .g-btn.line{background:#06C755;color:#fff}
.apxg .g-note{font-size:13px;color:var(--g-ink2);margin:8px 0 0}
.apxg .g-field{display:grid;gap:6px;margin-top:16px}
.apxg .g-field label{font-weight:700;font-size:15px}
.apxg .g-field input[type=text]{min-height:48px;border:1.5px solid var(--g-l3);border-radius:12px;padding:0 14px;font:inherit;font-size:16px;color:var(--g-ink);background:#fff}
.apxg .g-field input[type=text]:focus{outline:none;border-color:var(--g-plum);box-shadow:0 0 0 3px var(--g-l1)}
.apxg .g-check{display:flex;gap:12px;align-items:flex-start;margin-top:16px;cursor:pointer;font-size:15px;line-height:1.5}
.apxg .g-check input{flex:none;width:24px;height:24px;margin:0;accent-color:var(--g-plum);cursor:pointer}
.apxg .g-check.opt{padding-top:14px;border-top:1px solid var(--g-l1)}
.apxg .g-freq{display:grid;gap:8px;margin:10px 0 0 36px;border:0;padding:0}
.apxg .g-freq legend{font-size:13px;font-weight:700;color:var(--g-ink2);padding:0;margin-bottom:4px}
.apxg .g-freq label{display:flex;gap:10px;align-items:center;min-height:44px;padding:0 12px;border-radius:12px;border:1.5px solid var(--g-l2);cursor:pointer;font-size:15px}
.apxg .g-freq label:has(input:checked){border-color:var(--g-plum);background:var(--g-l1)}
.apxg .g-freq input{width:20px;height:20px;margin:0;accent-color:var(--g-plum)}
.apxg .g-err{color:#9E2050;font-size:14px;margin:8px 0 0}

/* ---------- voucher ---------- */
.apxg .g-vc{position:relative;border-radius:28px;overflow:hidden;background:#fff;border:1px solid var(--g-l2);box-shadow:0 20px 50px -24px rgba(74,22,104,.5);color:var(--g-ink)}
.apxg .g-vc-tag{position:absolute;top:14px;right:14px;z-index:2;font-size:11px;font-weight:800;line-height:22px;padding:0 10px;border-radius:999px;background:var(--g-rose);color:#fff;letter-spacing:.03em}
.apxg .g-vc-top{padding:22px 20px 20px;background:
  linear-gradient(135deg,rgba(255,255,255,.07) 25%,transparent 25%) 0 0/22px 22px,
  linear-gradient(150deg,var(--g-plum),var(--g-night2));color:#fff}
.apxg .g-vc-top small{display:block;font-size:12px;font-weight:700;color:var(--g-on2)}
.apxg .g-vc-label{font-size:13px;font-weight:800;color:var(--g-l3);margin-top:12px}
.apxg .g-vc-prize{font-size:26px;line-height:1.2;font-weight:800;margin-top:2px}
.apxg .g-vc-meta{font-size:14px;color:var(--g-on2);margin-top:8px}
.apxg .g-vc-perf{height:0;border-top:2px dashed var(--g-l3);margin:0 18px}
.apxg .g-vc-body{display:grid;grid-template-columns:1fr auto;gap:14px;padding:18px 20px 8px;align-items:center}
.apxg .g-vc-body dl{margin:0;display:grid;gap:8px}
.apxg .g-vc-body dt{font-size:12px;font-weight:700;color:var(--g-ink2)}
.apxg .g-vc-body dd{margin:0;font-weight:800;font-size:16px;line-height:1.3;word-break:break-word}
.apxg .g-vc-body dd.code{font-size:20px;letter-spacing:.08em;color:var(--g-plum)}
.apxg .g-vc-qr{width:124px;height:124px;background:#fff;border-radius:12px;border:1px solid var(--g-l2);padding:4px}
.apxg .g-vc-qr svg{width:100%;height:100%;display:block}
.apxg .g-vc-foot{margin:0;padding:6px 20px 20px;font-weight:700;color:var(--g-plum7);font-size:15px}
@media (max-width:360px){.apxg .g-vc-qr{width:104px;height:104px}}
.apxg [hidden]{display:none!important}
.apxg .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (prefers-reduced-motion:reduce){.apxg *{transition:none!important}}
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
  let destroyed = false, midnightTimer = 0, learnInst = null, overlay = null, view = 'home', viewArg = null;

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
  const triesPill = () => {
    const n = triesLeft();
    return h('span', { class: 'g-pill' + (n ? '' : ' zero'), 'data-tries': n }, h('i'), Lf(T.tries, n));
  };
  const soundBtn = (onNight) => {
    const b = h('button', { class: 'g-icon', type: 'button', 'aria-pressed': String(sfx.on), 'aria-label': L(sfx.on ? T.soundOn : T.soundOff) });
    const paint = () => {
      b.setAttribute('aria-pressed', String(sfx.on));
      b.setAttribute('aria-label', L(sfx.on ? T.soundOn : T.soundOff));
      b.innerHTML = (sfx.on ? ICON.sound : ICON.mute) + (onNight ? '' : `<span>${L(sfx.on ? T.soundOn : T.soundOff)}</span>`);
    };
    paint();
    b.addEventListener('click', () => { sfx.set(!sfx.on); paint(); sfx.play('tap'); });
    return b;
  };
  const tierList = id => {
    const g = GAMES[id], best = (bests()[id] || {}).score || 0;
    const ul = h('ul', { class: 'g-tiers' });
    g.tiers.forEach(t => ul.append(h('li', { class: best >= t.score ? 'hit' : '' }, h('span', { class: 'n' }, fmt(t.score, lang)), h('span', null, L(t.prize)))));
    ul.append(h('li', { class: 'top' }, h('span', { class: 'n' }, L(T.topMonth)), h('span', null, L(g.monthly))));
    return ul;
  };
  const scrollTop = () => {
    const r = root.getBoundingClientRect();
    if (r.top < 0) window.scrollTo({ top: window.scrollY + r.top - 12, behavior: reduced() ? 'auto' : 'smooth' });
  };

  /* ---------------- home ---------------- */
  function renderHome() {
    view = 'home';
    if (learnInst) { learnInst.destroy(); learnInst = null; }
    wrap.innerHTML = '';
    wrap.append(h('div', { class: 'g-head' },
      h('div', null, h('h2', null, L(T.games)), h('p', null, L(T.intro))),
      h('div', { class: 'g-tools' }, triesPill(), soundBtn(false))));

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
    const best = bests()[id];
    const card = h('article', { class: 'g-card' + (soon ? ' soon' : ''), 'data-game': id },
      h('div', { class: 'g-art', html: ART[id] || '' }));
    if (soon) card.firstChild.append(h('span', { class: 'g-tag' }, L(T.soon)));
    const body = h('div', { class: 'g-body' },
      h('h3', null, L(titleOf(id))),
      howOf(id) ? h('p', { class: 'g-how' }, L(howOf(id))) : null,
      h('div', { class: 'g-best' }, h('span', null, L(T.best)), best ? h('b', null, fmt(best.score, lang)) : h('span', null, L(T.noBest))),
      h('span', { class: 'g-tiers-label' }, L(T.prizes)),
      tierList(id));
    const play = btn('plum block', soon ? L(T.soon) : L(T.play), () => showDetail(id), { 'data-act': 'open' });
    if (!ready) play.disabled = true;
    body.append(play);
    card.append(body);
    return card;
  }

  function learnCard() {
    const done = learnBonusToday();
    return h('article', { class: 'g-card learn', 'data-game': 'learn' },
      h('div', { class: 'g-art', html: ART.learn }, h('span', { class: 'g-tag' + (done ? '' : ' rose') }, L(done ? T.learnDone : T.learnTag))),
      h('div', { class: 'g-body' },
        h('h3', null, L(T.learn)),
        h('p', { class: 'g-how' }, L(T.learnHow)),
        btn('ghost block', L(T.start), showLearn, { 'data-act': 'learn' })));
  }

  function voucherSection() {
    const list = vouchers().slice().sort((a, b) => b.issued - a.issued);
    const sec = h('section', { class: 'g-sec', 'aria-labelledby': 'apxg-vh' }, h('h3', { id: 'apxg-vh' }, L(T.vouchers)));
    if (!list.length) { sec.append(h('p', { class: 'g-empty' }, L(T.noVouchers))); return sec; }
    const box = h('div', { class: 'g-vlist' });
    list.forEach(v => {
      const exp = Date.now() > v.expires;
      box.append(h('div', { class: 'g-vrow', 'data-code': v.code },
        h('div', { class: 'm' },
          h('b', null, L(v.prize)),
          h('span', null, h('span', { class: 'code' }, v.code), ' · ', exp ? L(T.expired) : `${L(T.validUntil)} ${dateText(v.expires, lang)}`)),
        btn('ghost sm', L(T.show), () => openVoucher(v))));
    });
    sec.append(box);
    return sec;
  }

  /* ---------------- game detail: choose a mode ---------------- */
  function showDetail(id) {
    if (!games[id]) return;
    view = 'detail'; viewArg = id;
    wrap.innerHTML = '';
    const left = triesLeft();
    const back = h('button', { class: 'g-backbtn', type: 'button', html: ICON.back + `<span>${L(T.back)}</span>` });
    back.addEventListener('click', () => { renderHome(); scrollTop(); });
    const best = bests()[id];
    const practice = btn('ghost block', L(T.practice), () => startRun(id, 'practice'), { 'data-act': 'practice' });
    const scored = btn('rose block', L(T.scored), () => startRun(id, 'scored'), { 'data-act': 'scored' });
    if (!left) scored.disabled = true;

    const m = monthRec(), mine = m.best[id];
    const board = h('table', { class: 'g-board' });
    if (mine) board.append(h('tr', null, h('td', null, '1'), h('td', null, L(T.you)), h('td', null, fmt(mine.score, lang))));

    wrap.append(back, h('div', { class: 'g-detail' },
      h('div', { style: { display: 'grid', gap: '16px' } },
        h('div', { class: 'g-dhead' }, h('div', { class: 'g-art', html: ART[id] || '' }),
          h('div', null, h('h2', null, L(titleOf(id))), howOf(id) ? h('p', { class: 'g-how', style: { margin: '4px 0 0' } }, L(howOf(id))) : null)),
        h('div', { class: 'g-modes' },
          h('div', { class: 'g-mode sc' }, h('h4', null, L(T.scored)), h('p', null, L(T.scoredNote)),
            h('div', null, triesPill()), left ? null : h('p', null, L(T.resetNote)), scored),
          h('div', { class: 'g-mode' }, h('h4', null, L(T.practice)), h('p', null, L(T.practiceNote)), practice))),
      h('div', { style: { display: 'grid', gap: '16px' } },
        h('div', { class: 'g-panelbox' }, h('h4', null, L(T.prizes)),
          h('div', { class: 'g-best', style: { marginBottom: '10px' } }, h('span', null, L(T.best)), best ? h('b', null, fmt(best.score, lang)) : h('span', null, L(T.noBest))),
          tierList(id)),
        h('div', { class: 'g-panelbox' }, h('h4', null, L(T.board)), h('p', { class: 'sub' }, monthText(Date.now(), lang)),
          mine ? board : null, h('p', null, L(mine ? T.noOthers : T.noScores))))));
    scrollTop();
  }

  /* ---------------- learn ---------------- */
  function showLearn() {
    view = 'learn';
    wrap.innerHTML = '';
    const back = h('button', { class: 'g-backbtn', type: 'button', html: ICON.back + `<span>${L(T.back)}</span>` });
    back.addEventListener('click', () => { renderHome(); scrollTop(); });
    const box = h('div');
    wrap.append(back, h('div', { class: 'g-head', style: { marginBottom: '16px' } }, h('div', null, h('h2', null, L(T.learn))), h('div', { class: 'g-tools' }, triesPill())), box);
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
    closeOverlay();
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
      soundBtn(true));
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

    let maxLives = 0, last = { score: 0, level: 1 };
    const onHud = s => {
      if (!s) return;
      if (s.score !== undefined && s.score !== last.score) { sScore.textContent = fmt(s.score, lang); if (s.score > last.score) pop(sScore, 1.18); last.score = s.score; }
      if (s.level !== undefined && s.level !== last.level) { sLevel.textContent = fmt(s.level, lang); pop(sLevel, 1.3); last.level = s.level; }
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
      el, host, stage, area, hud, quit, onHud, panelOpen: false, ctrl: null,
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
  function closeOverlay() {
    if (!overlay) return;
    const o = overlay; overlay = null;
    o.ctrl && !o.ctrl.signal.aborted && o.ctrl.abort();
    o.close();
  }

  function countdown(o, id) {
    return new Promise(res => {
      const num = h('b', null, '3');
      const box = h('div', { class: 'g-count', 'aria-live': 'assertive' }, h('h3', null, L(titleOf(id))), num, howOf(id) ? h('p', null, L(howOf(id))) : null);
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
    showResult(o, run, { before, newBest });
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

  function showResult(o, run, info) {
    const p = panel(o);
    const id = run.id, scored = run.mode === 'scored';
    const tier = tierFor(id, run.score), next = nextTier(id, run.score);
    const best = bests()[id];
    const claimedV = vouchers().find(v => v.seed === run.seed && v.game === id);
    const sheet = h('div', { class: 'g-sheet', 'data-result': '' },
      h('p', { class: 'kicker' }, `${L(titleOf(id))} · ${L(scored ? T.scored : T.practice)}`),
      h('h3', null, L(T.score)),
      h('div', { class: 'g-big' }, h('b', { 'data-score': run.score }, fmt(run.score, lang)), h('span', null, L(T.pts))),
      h('dl', { class: 'g-rows' },
        h('div', null, h('dt', null, L(T.levelReached)), h('dd', { 'data-level': run.level }, fmt(run.level, lang))),
        h('div', null, h('dt', null, L(T.best)), h('dd', null, best ? fmt(best.score, lang) : L(T.noBest), info.newBest ? h('span', { class: 'g-badge' }, L(T.newBest)) : null))));
    if (tier && scored) sheet.append(h('div', { class: 'g-prize', 'data-tier': tier.index }, h('small', null, L(T.prizeReached)), h('b', null, L(tier.prize))));
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
    if (scored) sheet.append(h('div', { style: { marginTop: '14px' } }, triesPill()));
    p.append(sheet);
    if (tier && scored && !claimedV) sfx.play('prize');
    const first = sheet.querySelector('.g-btn');
    first && first.focus({ preventScroll: true });
  }

  /* ---------------- claim flow ---------------- */
  function claimSignIn(o, run, tier) {
    const p = panel(o);
    const next = () => claimDetails(o, run, tier);
    const sheet = h('div', { class: 'g-sheet', 'data-step': 'signin' },
      h('p', { class: 'kicker' }, L(T.claim)),
      h('h3', null, fill(L(T.signIn), { p: L(tier.prize) })),
      h('div', { class: 'g-signs' },
        btn('line block', h('span', { html: ICON.line + `<span>${L(T.line)}</span>`, style: { display: 'inline-flex', gap: '10px', alignItems: 'center' } }), next, { 'data-act': 'line' }),
        btn('ghost block', h('span', { html: ICON.mail + `<span>${L(T.email)}</span>`, style: { display: 'inline-flex', gap: '10px', alignItems: 'center' } }), next, { 'data-act': 'email' }),
        btn('ghost block', h('span', { html: ICON.wa + `<span>${L(T.whatsapp)}</span>`, style: { display: 'inline-flex', gap: '10px', alignItems: 'center' } }), next, { 'data-act': 'whatsapp' })),
      h('p', { class: 'g-note' }, h('span', { class: 'g-tag rose', style: { marginRight: '8px' } }, L(T.previewTag)), L(T.previewSignIn)),
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
        code: makeCode(taken), game: id_(run), prize: tier.prize, tier: tier.index, score: run.score, level: run.level,
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
      h('p', { class: 'kicker' }, `${L(T.claim)} · ${L(tier.prize)}`),
      h('h3', null, L(T.details)),
      h('div', { class: 'g-field' }, h('label', { for: 'apxg-name' }, L(T.name)), nameIn),
      h('label', { class: 'g-check' }, consent, h('span', null, L(T.consent))),
      h('label', { class: 'g-check opt' }, remind, h('span', null, L(T.remind))),
      freq,
      h('div', { class: 'g-acts' }, create, btn('ghost block', L(T.cancel), () => claimSignIn(o, run, tier))));
    p.append(sheet);
    nameIn.focus({ preventScroll: true });
  }
  const id_ = run => run.id;

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
      h('div', { class: 'g-vc-perf' }),
      h('div', { class: 'g-vc-body' },
        h('dl', null,
          h('dt', null, L(T.vName)), h('dd', null, v.name),
          h('dt', null, L(T.vCode)), h('dd', { class: 'code' }, v.code),
          h('dt', null, L(T.validUntil)), h('dd', null, dateText(v.expires, lang))),
        qr),
      h('p', { class: 'g-vc-foot' }, L(T.reception)));
    return h('div', null, card, err);
  }

  function showVoucherStep(o, v, run) {
    const p = panel(o);
    p.append(voucherView(v, () => { if (run) showResult(o, run, { newBest: false }); else closeOverlay(); }));
  }

  function voucherView(v, onDone) {
    const status = h('p', { class: 'g-note', 'aria-live': 'polite' });
    const save = btn('plum block', h('span', { html: ICON.save + `<span>${L(T.save)}</span>`, style: { display: 'inline-flex', gap: '8px', alignItems: 'center' } }), async () => {
      save.disabled = true; status.textContent = '';
      try { const r = await saveVoucher(v); if (r) status.textContent = L(T.saved); }
      catch (e) { status.textContent = L(T.saveFail); }
      save.disabled = false;
    }, { 'data-act': 'save' });
    const plan = btn('ghost block', h('span', { html: ICON.plan + `<span>${L(T.plan)}</span>`, style: { display: 'inline-flex', gap: '8px', alignItems: 'center' } }), () => {
      onEvent('plan:voucher', { code: v.code, game: v.game, prize: v.prize, score: v.score, expires: v.expires, issued: v.issued });
      plan.disabled = true;
      plan.querySelector('span span').textContent = L(T.planned);
    }, { 'data-act': 'plan' });
    return h('div', { class: 'g-sheet', 'data-step': 'voucher', style: { background: 'transparent', boxShadow: 'none', padding: '0' } },
      voucherCard(v),
      h('div', { class: 'g-acts fit' }, save, plan),
      status,
      h('div', { class: 'g-acts' }, btn('light block', L(T.done), onDone, { 'data-act': 'done' })));
  }

  function openVoucher(v) {
    const o = openOverlay(v.game, 'scored');
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
      // keep an opening bracket or quote with the word after it
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
    x.restore();
    x.save(); rr(M, M, CW, CH, 56); x.lineWidth = 3; x.strokeStyle = '#E4D8EE'; x.stroke(); x.restore();
    // preview tag
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
    // perforation
    x.setLineDash([16, 14]); x.strokeStyle = '#C9B3DD'; x.lineWidth = 4;
    x.beginPath(); x.moveTo(M + 40, M + topH + 2); x.lineTo(M + CW - 40, M + topH + 2); x.stroke(); x.setLineDash([]);
    // fields
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
    // QR
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
      closeOverlay();
      if (learnInst) learnInst.destroy();
      root.remove();
    }
  };
}
