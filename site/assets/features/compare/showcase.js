/* Before/after showcase: featured case with a live slider and case details, filter chips with counts,
   a wall of tiles that show the "before" half and wipe to the "after" on hover or tap, and a full-screen
   viewer with a draggable slider, case details and a "Next case" flow.
   mount(container, opts) -> {destroy(), open(i)}
     opts.lang 'en' | 'th'
     opts.cases [{src, layout:'lr'|'tb'|'single', cat, procName, facts:[[label, value]], story:{title, url}?,
                  ask:{line, wa}, links:[{x, url, kind}] }]
     opts.cats [{k, x}] filter chips (counts are added here); opts.spotlight (default true); opts.vary text;
     opts.tileFacts labels tiles by their first fact (for a page with one procedure); opts.limit tiles shown before 'Show all';
     opts.onEvent(name, data)
   The required Thai caption and its English version come from the compare module and show on the
   featured slider and in the viewer; the wall carries one shared caption. */

import { slider } from './index.js';

const RULE_TH = 'ใช้เป็นตัวอย่าง ผลจากการเข้ารับการรักษาพยาบาลสำหรับผู้ป่วยเฉพาะราย';
const RULE_EN = 'Example only. Results from treatment of an individual patient.';
const SITE = 'https://www.apexsurgeryhospital.com/';
const abs = u => (u && u.startsWith('~/') ? SITE + u.slice(2) : u);

const T = {
  before: { en: 'Before', th: 'ก่อน' },
  after: { en: 'After', th: 'หลัง' },
  featured: { en: 'Featured case', th: 'เคสแนะนำ' },
  caseN: { en: 'Case {n} of {m}', th: 'เคสที่ {n} จาก {m}' },
  next: { en: 'Next case', th: 'เคสถัดไป' },
  prev: { en: 'Previous case', th: 'เคสก่อนหน้า' },
  close: { en: 'Close', th: 'ปิด' },
  ask: { en: 'Ask about this result', th: 'สอบถามเกี่ยวกับผลลัพธ์นี้' },
  story: { en: 'Patient review', th: 'รีวิวจากผู้เข้ารับบริการ' },
  all: { en: 'All', th: 'ทั้งหมด' },
  open: { en: 'Open case {n}: {p}', th: 'เปิดเคสที่ {n}: {p}' },
  filter: { en: 'Filter cases', th: 'กรองเคส' },
  viewer: { en: 'Before and after case', th: 'เคสก่อนและหลัง' },
  view: { en: 'View case', th: 'ดูเคสนี้' },
  more: { en: 'Show all {n} cases', th: 'ดูทั้งหมด {n} เคส' }
};
const ICON = {
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  l: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 6l-6 6 6 6"/></svg>',
  r: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 6l6 6-6 6"/></svg>',
  open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  line: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3C6.5 3 2 6.6 2 11c0 4 3.6 7.3 8.4 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6A7.5 7.5 0 0 0 22 11c0-4.4-4.5-8-10-8z"/></svg>',
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.2-.2-.4-.3z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  img: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="15.5" cy="8.5" r="1.5"/></svg>'
};

const CSS = `
.apxw{--s-plum:var(--plum,#6A388C);--s-plum7:var(--plum-700,#55286F);--s-night:var(--night,#1F0A30);--s-night2:var(--night-2,#2A0F40);
  --s-lilac:var(--lilac,#A886CD);--s-l3:var(--lilac-300,#C9B3DD);--s-l2:var(--lilac-200,#E4D8EE);--s-l1:var(--lilac-100,#F1EAF7);
  --s-ink:var(--ink,#2A1F33);--s-ink2:var(--ink-2,#5A4A66);--s-on:var(--on-night,#F6EEFB);--s-on2:var(--on-night-2,#CDB9DD);--s-rose:#CC3366;
  --s-ease:cubic-bezier(.23,1,.32,1);--s-io:cubic-bezier(.77,0,.175,1);
  font-family:"LINE Seed","Sarabun","Noto Sans Thai",system-ui,sans-serif;font-size:16px;line-height:1.55;color:var(--s-on)}
.apxw *,.apxw *::before,.apxw *::after,.apxw-v *,.apxw-v *::before,.apxw-v *::after{box-sizing:border-box}
.apxw h3,.apxw p,.apxw dl,.apxw dd,.apxw-v h3,.apxw-v p,.apxw-v dl,.apxw-v dd{margin:0}
.apxw button,.apxw-v button{font:inherit;color:inherit;cursor:pointer}
/* featured case */
.apxw .s-spot{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:clamp(18px,3vw,40px);align-items:center;padding:clamp(14px,2vw,22px);border-radius:32px;margin-bottom:clamp(28px,4vw,48px);
  background:radial-gradient(90% 80% at 0% 0%,rgba(142,45,207,.28),transparent 60%),radial-gradient(70% 70% at 100% 100%,rgba(204,51,102,.16),transparent 60%),linear-gradient(160deg,rgba(255,255,255,.08),rgba(255,255,255,.02));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.14),inset 0 0 0 1px rgba(201,179,221,.18),0 50px 90px -50px rgba(0,0,0,.8)}
.apxw .s-stage{min-width:0;display:flex;justify-content:center}
.apxw .s-stage .b-cmp{width:min(100%,calc(68vh * var(--arn,.8)))}
.apxw .s-stage .b-stage{border-radius:22px;box-shadow:0 30px 60px -30px rgba(0,0,0,.7)}
.apxw .s-stage .b-cap,.apxw-v .b-cap{color:var(--s-on2);text-align:center;font-size:12px}
/* details panel */
.s-panel{min-width:0;color:var(--s-on)}
.s-kick{display:inline-flex;align-items:center;gap:8px;height:28px;padding:0 12px;border-radius:999px;background:rgba(204,51,102,.18);color:#ffd6e5;font-size:12.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.s-kick::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--s-rose,#CC3366);box-shadow:0 0 0 3px rgba(204,51,102,.3)}
.s-panel h3{font-size:clamp(28px,3vw,42px);line-height:1.08;letter-spacing:-.03em;font-weight:400;margin:14px 0 18px;color:#fff}
.s-panel h3:first-child{margin-top:0}
.s-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:18px}
.s-facts div{padding:12px 14px;border-radius:16px;background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1px rgba(201,179,221,.16)}
.s-facts dt{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--s-on2);font-weight:700}
.s-facts dd{font-size:16.5px;font-weight:700;color:#fff;margin-top:2px;line-height:1.3}
.s-story{display:flex;align-items:center;gap:12px;padding:12px 16px 12px 12px;border-radius:18px;margin-bottom:18px;background:linear-gradient(140deg,rgba(255,255,255,.12),rgba(255,255,255,.04));box-shadow:inset 0 0 0 1px rgba(201,179,221,.22);color:#fff;text-decoration:none;transition:transform .3s var(--s-ease),background-color .2s}
.s-story:hover{transform:translateY(-2px)}
.s-story>svg:first-child{width:38px;height:38px;padding:9px;border-radius:12px;background:var(--s-plum);flex:none}
.s-story span{display:flex;flex-direction:column;line-height:1.3;min-width:0}
.s-story small{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--s-on2);font-weight:700}
.s-story b{font-size:15px;font-weight:700;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.s-story>svg:last-child{width:20px;height:20px;margin-left:auto;flex:none}
.s-ask{font-size:14px;font-weight:800;color:var(--s-on2);margin-bottom:8px}
.s-ctas{display:flex;flex-wrap:wrap;gap:8px}
.s-btn{display:inline-flex;align-items:center;gap:8px;min-height:46px;padding:0 18px;border-radius:999px;font-weight:800;font-size:15px;text-decoration:none;transition:transform .16s var(--s-ease),background-color .2s,box-shadow .2s}
.s-btn:active{transform:scale(.97)}
.s-btn svg{width:20px;height:20px;flex:none}
.s-btn.ln{background:#00843A;color:#fff}
.s-btn.wa{background:#167A43;color:#fff}
.s-btn.gh{background:transparent;color:#fff;box-shadow:inset 0 0 0 1.5px rgba(201,179,221,.45)}
.s-btn.gh:hover{background:rgba(255,255,255,.08)}
.s-links{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.s-vary{margin-top:14px;font-size:13px;color:var(--s-on2)}
.s-step{display:flex;gap:8px;margin-top:18px}
.s-step .s-btn{min-height:42px}
/* spacing in the details panel: these beat the margin reset on dl and p above */
:is(.apxw,.apxw-v) .s-panel .s-facts{gap:10px;margin:0 0 12px}
:is(.apxw,.apxw-v) .s-panel .s-facts div{padding:14px 16px;min-width:0}
:is(.apxw,.apxw-v) .s-panel .s-facts dd{overflow-wrap:anywhere}
:is(.apxw,.apxw-v) .s-panel .s-story{margin:0 0 22px;padding:14px 16px 14px 14px}
:is(.apxw,.apxw-v) .s-panel .s-ask{margin:0 0 10px}
:is(.apxw,.apxw-v) .s-panel .s-links{margin-top:12px}
:is(.apxw,.apxw-v) .s-panel .s-vary{margin-top:12px}
:is(.apxw,.apxw-v) .s-panel .s-step{margin-top:20px}
/* chips */
.apxw .s-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 22px}
.apxw .s-chip{display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 8px 0 16px;border-radius:999px;border:0;background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1px rgba(201,179,221,.28);color:var(--s-on);font-size:15px;font-weight:700;transition:background-color .2s,color .2s,transform .16s var(--s-ease)}
.apxw .s-chip:active{transform:scale(.97)}
.apxw .s-chip i{font-style:normal;min-width:26px;height:26px;padding:0 8px;border-radius:999px;background:rgba(255,255,255,.12);display:grid;place-items:center;font-size:12.5px;font-variant-numeric:tabular-nums}
.apxw .s-chip[aria-pressed=true]{background:#fff;color:var(--s-plum)}
.apxw .s-chip[aria-pressed=true] i{background:var(--s-plum);color:#fff}
/* wall */
.apxw .s-wall{columns:4 230px;column-gap:14px}
.apxw .s-tile{position:relative;display:block;width:100%;margin:0 0 14px;padding:0;border:0;border-radius:20px;overflow:hidden;break-inside:avoid;aspect-ratio:var(--ar,4/5);
  background:linear-gradient(150deg,#3a1758,#24103a);box-shadow:0 22px 40px -26px rgba(0,0,0,.8),inset 0 0 0 1px rgba(201,179,221,.12);isolation:isolate;transition:transform .45s var(--s-ease),box-shadow .45s var(--s-ease)}
.apxw .s-tile[hidden]{display:none}
.apxw .s-tile:focus-visible{outline:3px solid var(--s-lilac);outline-offset:3px}
@media (hover:hover){.apxw .s-tile:hover{transform:translateY(-4px);box-shadow:0 34px 56px -28px rgba(0,0,0,.85),inset 0 0 0 1px rgba(201,179,221,.3)}}
.s-layer{position:absolute;inset:0;background-repeat:no-repeat}
.s-tile.lr .s-layer{background-size:200% 100%}.s-tile.lr .s-after{background-position:100% 0}
.s-tile.tb .s-layer{background-size:100% 200%}.s-tile.tb .s-after{background-position:0 100%}
.s-tile.single .s-layer{background-size:contain;background-position:center}
.s-tile .s-after{clip-path:inset(0 0 0 100%);transition:clip-path .75s var(--s-io)}
.s-tile .s-line{position:absolute;top:0;bottom:0;left:100%;width:2px;margin-left:-1px;background:#fff;box-shadow:0 0 14px rgba(255,255,255,.8);opacity:0;transition:left .75s var(--s-io),opacity .2s;z-index:2}
.s-tile.rev .s-after{clip-path:inset(0 0 0 0)}
.s-tile.rev .s-line{left:0;opacity:1}
.s-tile.rev.done .s-line{opacity:0}
.s-tile .s-tag{position:absolute;top:10px;z-index:3;height:26px;padding:0 10px;border-radius:999px;display:inline-flex;align-items:center;font-size:12px;font-weight:800;background:rgba(31,10,48,.68);color:#fff;transition:opacity .3s}
.s-tile .s-tag.b{left:10px}.s-tile .s-tag.a{left:10px;background:var(--s-rose,#CC3366);opacity:0}
.s-tile.rev .s-tag.b{opacity:0}.s-tile.rev .s-tag.a{opacity:1}
.s-tile.single .s-tag{display:none}
.s-tile .s-meta{position:absolute;left:0;right:0;bottom:0;z-index:3;display:flex;align-items:flex-end;justify-content:space-between;gap:10px;padding:34px 12px 12px;background:linear-gradient(180deg,transparent,rgba(17,5,28,.82));text-align:left}
.s-tile .s-meta span{display:flex;flex-direction:column;line-height:1.25;min-width:0}
.s-tile .s-meta b{font-size:14.5px;color:#fff}
.s-tile .s-meta small{font-size:12px;color:var(--s-on2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.s-tile .s-meta>svg{width:34px;height:34px;padding:8px;border-radius:50%;background:rgba(255,255,255,.16);color:#fff;flex:none;transition:background-color .2s,transform .3s var(--s-ease)}
.s-tile:hover .s-meta>svg{background:#fff;color:var(--s-plum);transform:scale(1.06)}
.s-tile .s-ph{position:absolute;inset:0;display:grid;place-items:center;color:var(--s-l3);z-index:0}
.s-tile .s-ph svg{width:44px;height:44px;opacity:.5}
.s-tile .s-story-dot{position:absolute;top:10px;right:10px;z-index:3;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--s-plum);color:#fff;box-shadow:0 6px 14px -6px rgba(0,0,0,.6)}
.s-tile .s-story-dot svg{width:16px;height:16px}
.apxw .s-more{display:flex;margin:6px auto 18px;align-items:center;justify-content:center;height:50px;padding:0 26px;border-radius:999px;border:0;background:#fff;color:var(--s-plum);font-weight:800;font-size:15.5px;box-shadow:0 18px 36px -18px rgba(0,0,0,.6);transition:transform .16s var(--s-ease)}
.apxw .s-more:active{transform:scale(.97)}
.apxw .s-more[hidden]{display:none}
.apxw.light .s-more{background:var(--s-plum);color:#fff}
.apxw .s-cap{margin-top:8px;font-size:12px;line-height:1.5;color:var(--s-on2)}
.apxw .s-cap span{display:block}
/* light surroundings */
.apxw.light{color:var(--s-ink)}
.apxw.light .s-chip{background:#fff;color:var(--s-ink2);box-shadow:inset 0 0 0 1px var(--s-l3)}
.apxw.light .s-chip i{background:var(--s-l1);color:var(--s-plum)}
.apxw.light .s-chip[aria-pressed=true]{background:var(--s-plum);color:#fff}
.apxw.light .s-chip[aria-pressed=true] i{background:#fff;color:var(--s-plum)}
.apxw.light .s-cap{color:var(--s-ink2)}
/* viewer */
.apxw-v{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;color:var(--s-on,#F6EEFB);background:radial-gradient(80% 60% at 20% 0%,rgba(106,56,140,.45),transparent 60%),rgba(17,5,28,.96);
  font-family:"LINE Seed","Sarabun","Noto Sans Thai",system-ui,sans-serif;font-size:16px;line-height:1.55;--s-plum:var(--plum,#6A388C);--s-on2:var(--on-night-2,#CDB9DD);--s-rose:#CC3366;--s-ease:cubic-bezier(.23,1,.32,1);--s-lilac:var(--lilac,#A886CD)}
@supports (backdrop-filter:blur(1px)){.apxw-v{backdrop-filter:blur(12px)}}
.apxw-v .v-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;flex:none}
.apxw-v .v-top p{font-size:15px;font-weight:700;color:var(--s-on2);font-variant-numeric:tabular-nums}
.apxw-v .v-ib{width:46px;height:46px;border-radius:50%;border:0;background:rgba(255,255,255,.12);color:#fff;display:inline-grid;place-items:center;flex:none;transition:background-color .2s,transform .16s var(--s-ease)}
.apxw-v .v-ib:hover{background:rgba(255,255,255,.22)}
.apxw-v .v-ib:active{transform:scale(.95)}
.apxw-v .v-ib[disabled]{opacity:.3;cursor:default}
.apxw-v .v-ib svg{width:22px;height:22px}
.apxw-v :is(button,a):focus-visible{outline:3px solid var(--s-lilac);outline-offset:2px}
.apxw-v .v-body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1.4fr) minmax(300px,420px);gap:clamp(16px,3vw,40px);padding:0 clamp(16px,3vw,40px) 16px;align-items:center;overflow:auto}
.apxw-v .v-stage{min-width:0;display:flex;justify-content:center;align-items:center;transition:transform .35s var(--s-ease),opacity .35s}
.apxw-v .v-stage .b-cmp{width:min(100%,calc((100dvh - 190px) * var(--arn,.8)))}
.apxw-v .v-stage .b-stage{border-radius:22px}
.apxw-v .v-next{display:flex;align-items:center;gap:12px;width:100%;margin-top:18px;padding:10px 16px 10px 10px;border-radius:20px;border:0;text-align:left;background:linear-gradient(140deg,var(--s-plum),#8a3fa8);color:#fff;box-shadow:0 18px 36px -18px rgba(106,56,140,.9);transition:transform .25s var(--s-ease)}
.apxw-v .v-next:hover{transform:translateY(-2px)}
.apxw-v .v-next:active{transform:scale(.98)}
.apxw-v .v-next .v-th{width:56px;height:56px;border-radius:14px;flex:none;background-repeat:no-repeat;background-color:rgba(255,255,255,.15)}
.apxw-v .v-next span{display:flex;flex-direction:column;line-height:1.25;min-width:0}
.apxw-v .v-next small{font-size:12px;letter-spacing:.06em;text-transform:uppercase;opacity:.8;font-weight:700}
.apxw-v .v-next b{font-size:16px}
.apxw-v .v-next>svg{width:22px;height:22px;margin-left:auto;flex:none}
@media (max-width:860px){
  .apxw .s-spot{grid-template-columns:minmax(0,1fr)}
  .apxw-v .v-body{grid-template-columns:minmax(0,1fr);align-items:start;padding-bottom:28px}
  .apxw-v .v-stage .b-cmp{width:min(100%,calc((100dvh - 260px) * var(--arn,.8)))}
}
@media (max-width:560px){.apxw .s-wall{columns:2 140px;column-gap:10px}.apxw .s-tile{margin-bottom:10px;border-radius:16px}.apxw .s-tile .s-meta small{display:none}.apxw .s-chips{flex-wrap:nowrap;overflow-x:auto;margin-left:-16px;margin-right:-16px;padding:0 16px 4px;scrollbar-width:none}.apxw .s-chip{flex:none}.s-panel h3{font-size:28px}}
@media (prefers-reduced-motion:reduce){.apxw *,.apxw-v *{transition:none!important;animation:none!important}}
`;

function injectCSS() {
  if (document.getElementById('apxw-css')) return;
  const s = document.createElement('style'); s.id = 'apxw-css'; s.textContent = CSS; document.head.append(s);
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? ''));
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function mount(container, opts = {}) {
  injectCSS();
  const lang = opts.lang === 'th' ? 'th' : 'en';
  const L = o => o[lang] || o.en;
  const emit = (n, d) => { try { opts.onEvent && opts.onEvent(n, d); } catch (e) { /* host handler */ } };
  const cases = (opts.cases || []).map((c, i) => Object.assign({ i, url: abs(c.src) }, c));
  const light = !!opts.light;
  const root = document.createElement('div');
  root.className = 'apxw' + (light ? ' light' : '');
  root.lang = lang;
  container.append(root);
  let filter = 'all', spotIdx = 0, spot = null, spotCase = null, peekRaf = 0, touched = false, viewer = null;
  const visible = () => cases.filter(c => filter === 'all' || c.cat === filter);

  const panel = (c, kicker) => `<div class="s-panel">
      ${kicker ? `<p class="s-kick">${esc(kicker)}</p>` : ''}
      <h3>${esc(c.procName)}</h3>
      ${(c.facts || []).length ? `<dl class="s-facts">${c.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
      ${c.story ? `<a class="s-story" href="${esc(c.story.url)}">${ICON.book}<span><small>${esc(L(T.story))}</small><b>${esc(c.story.title)}</b></span>${ICON.arrow}</a>` : ''}
      <p class="s-ask">${esc(L(T.ask))}</p>
      <div class="s-ctas"><a class="s-btn ln" data-ask="line" href="${esc(c.ask.line)}" target="_blank" rel="noopener">${ICON.line}LINE</a><a class="s-btn wa" data-ask="whatsapp" href="${esc(c.ask.wa)}" target="_blank" rel="noopener">${ICON.wa}WhatsApp</a></div>
      ${(c.links || []).length ? `<div class="s-links">${c.links.map(l => `<a class="s-btn gh" href="${esc(l.url)}">${esc(l.x)}${ICON.arrow}</a>`).join('')}</div>` : ''}
      ${opts.vary ? `<p class="s-vary">${esc(opts.vary)}</p>` : ''}
    </div>`;
  const bindAsk = (el, c) => el.querySelectorAll('[data-ask]').forEach(a => a.addEventListener('click', () => emit('ba:ask', { procedure: c.cat, channel: a.dataset.ask })));

  /* ---------- featured case ---------- */
  const spotEl = document.createElement('div');
  spotEl.className = 's-spot';
  if (opts.spotlight !== false && cases.length) root.append(spotEl);
  function renderSpot() {
    if (!spotEl.isConnected) return;
    const list = visible();
    if (!list.length) { spotEl.hidden = true; return; }
    spotEl.hidden = false;
    spotIdx = (spotIdx + list.length) % list.length;
    const c = list[spotIdx];
    spotCase = c;
    if (spot) spot.destroy();
    cancelAnimationFrame(peekRaf);
    spotEl.innerHTML = `<div class="s-stage"></div><div>${panel(c, L(T.featured))}
      ${list.length > 1 ? `<div class="s-step"><button type="button" class="s-btn gh" data-step="-1" aria-label="${esc(L(T.prev))}">${ICON.l}</button><button type="button" class="s-btn gh" data-step="1">${esc(L(T.next))}${ICON.r}</button></div>` : ''}</div>`;
    spot = slider(spotEl.querySelector('.s-stage'), { src: c.src, layout: c.layout }, { lang, onChange: () => { touched = true; emit('ba:slide', { procedure: c.cat }); } });
    bindAsk(spotEl, c);
    spotEl.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => { spotIdx += +b.dataset.step; touched = true; renderSpot(); }));
    if (seen) peek();
  }
  /* one slow sweep of the divider when the featured case first comes into view */
  let seen = false;
  function peek() {
    if (!spot || touched || reduced() || !spotCase || spotCase.layout === 'single') return;
    const keys = [[0, 50], [700, 18], [1700, 82], [2500, 50]];
    const t0 = performance.now();
    const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    const step = now => {
      if (touched || !spot) return;
      const t = now - t0;
      let k = keys.findIndex((p, j) => j < keys.length - 1 && t >= p[0] && t < keys[j + 1][0]);
      if (k < 0) { spot.set(50); return; }
      const [ta, va] = keys[k], [tb, vb] = keys[k + 1];
      spot.set(va + (vb - va) * ease((t - ta) / (tb - ta)));
      peekRaf = requestAnimationFrame(step);
    };
    peekRaf = requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); seen = true; setTimeout(peek, 400); } }, { threshold: .45 });
    io.observe(spotEl);
  }
  spotEl.addEventListener('pointerdown', () => { touched = true; }, { capture: true });

  /* ---------- chips with counts ---------- */
  const cats = (opts.cats || []).filter(k => cases.some(c => c.cat === k.k));
  if (cats.length > 1) {
    const chips = document.createElement('div');
    chips.className = 's-chips';
    chips.setAttribute('role', 'group');
    chips.setAttribute('aria-label', L(T.filter));
    chips.innerHTML = [{ k: 'all', x: L(T.all) }, ...cats].map(k => `<button type="button" class="s-chip" data-k="${esc(k.k)}" aria-pressed="${k.k === 'all'}">${esc(k.x)}<i>${k.k === 'all' ? cases.length : cases.filter(c => c.cat === k.k).length}</i></button>`).join('');
    chips.addEventListener('click', e => {
      const b = e.target.closest('.s-chip');
      if (!b) return;
      filter = b.dataset.k;
      chips.querySelectorAll('.s-chip').forEach(x => x.setAttribute('aria-pressed', x === b));
      collapsed = true; applyWall();
      spotIdx = 0; touched = true; renderSpot();
      emit('ba:filter', { cat: filter });
    });
    root.append(chips);
  }

  /* ---------- wall ---------- */
  const wall = document.createElement('div');
  wall.className = 's-wall';
  wall.innerHTML = cases.map(c => {
    const first = (c.facts || [])[0];
    const lab = opts.tileFacts && first ? first[1] : c.procName;
    const sub = opts.tileFacts ? ((c.facts || [])[1] || [])[1] : first && first[1];
    return `<button type="button" class="s-tile ${esc(c.layout)}" data-i="${c.i}" data-cat="${esc(c.cat)}" aria-label="${esc(fill(L(T.open), { n: c.i + 1, p: c.procName }))}">
      <span class="s-ph">${ICON.img}</span>
      <span class="s-layer s-before" style="background-image:url('${esc(c.url)}')"></span>
      ${c.layout === 'single' ? '' : `<span class="s-layer s-after" style="background-image:url('${esc(c.url)}')"></span><span class="s-line" aria-hidden="true"></span>`}
      <span class="s-tag b" aria-hidden="true">${esc(L(T.before))}</span><span class="s-tag a" aria-hidden="true">${esc(L(T.after))}</span>
      ${c.story ? `<span class="s-story-dot" aria-hidden="true">${ICON.book}</span>` : ''}
      <span class="s-meta"><span><b>${esc(lab)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span>${ICON.open}</span></button>`;
  }).join('');
  root.append(wall);
  const limit = opts.limit || 12;
  let collapsed = true;
  const moreBtn = document.createElement('button');
  moreBtn.type = 'button';
  moreBtn.className = 's-more';
  moreBtn.addEventListener('click', () => { collapsed = false; applyWall(); emit('ba:more', { cat: filter }); });
  root.append(moreBtn);
  function applyWall() {
    let n = 0;
    wall.querySelectorAll('.s-tile').forEach(t => { const inF = filter === 'all' || t.dataset.cat === filter; t.hidden = !inF || (collapsed && n >= limit); if (inF) n++; });
    moreBtn.hidden = !collapsed || n <= limit;
    moreBtn.textContent = fill(L(T.more), { n });
  }
  applyWall();
  const cap = document.createElement('p');
  cap.className = 's-cap';
  cap.innerHTML = `<span lang="th">${RULE_TH}</span><span lang="en">${RULE_EN}</span>${opts.vary ? `<span>${esc(opts.vary)}</span>` : ''}`;
  root.append(cap);

  /* tile proportions follow the half of the composite each one shows */
  wall.querySelectorAll('.s-tile').forEach(t => {
    const c = cases[+t.dataset.i];
    const im = new Image();
    im.onload = () => {
      const w = im.naturalWidth, hgt = im.naturalHeight;
      if (!w || !hgt) return;
      const ar = c.layout === 'lr' ? (w / 2) / hgt : c.layout === 'tb' ? w / (hgt / 2) : w / hgt;
      t.style.setProperty('--ar', Math.max(.5, Math.min(2.2, ar)).toFixed(3));
      t.classList.add('ok');
    };
    im.src = c.url;
  });
  /* hover wipes to "after"; a tap wipes first, then opens the viewer */
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  wall.addEventListener('pointerover', e => { const t = e.target.closest('.s-tile'); if (t && fine && e.pointerType === 'mouse') reveal(t); });
  wall.addEventListener('pointerout', e => { const t = e.target.closest('.s-tile'); if (t && fine && !t.contains(e.relatedTarget)) t.classList.remove('rev', 'done'); });
  wall.addEventListener('focusin', e => { const t = e.target.closest('.s-tile'); if (t) reveal(t); });
  wall.addEventListener('focusout', e => { const t = e.target.closest('.s-tile'); if (t) t.classList.remove('rev', 'done'); });
  wall.addEventListener('click', e => {
    const t = e.target.closest('.s-tile');
    if (!t) return;
    const i = +t.dataset.i;
    if (!fine && !t.classList.contains('rev') && cases[i].layout !== 'single' && !reduced()) { reveal(t); setTimeout(() => open(i, t), 700); }
    else open(i, t);
  });
  function reveal(t) { if (t.classList.contains('rev')) return; t.classList.add('rev'); setTimeout(() => t.classList.add('done'), 800); }

  /* ---------- viewer ---------- */
  function open(i, opener) {
    if (viewer) viewer.close();
    const list = visible();
    let k = Math.max(0, list.findIndex(c => c.i === i));
    let s = null;
    const ov = document.createElement('div');
    ov.className = 'apxw-v';
    ov.lang = lang;
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', L(T.viewer));
    ov.innerHTML = `<div class="v-top"><p aria-live="polite"></p><div style="display:flex;gap:8px"><button type="button" class="v-ib" data-v="-1" aria-label="${esc(L(T.prev))}">${ICON.l}</button><button type="button" class="v-ib" data-v="1" aria-label="${esc(L(T.next))}">${ICON.r}</button><button type="button" class="v-ib" data-v="x" aria-label="${esc(L(T.close))}">${ICON.x}</button></div></div>
      <div class="v-body"><div class="v-stage"></div><div class="v-side"></div></div>`;
    document.body.append(ov);
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const stage = ov.querySelector('.v-stage'), side = ov.querySelector('.v-side'), count = ov.querySelector('.v-top p');
    const show = (j, dir) => {
      k = (j + list.length) % list.length;
      const c = list[k], n = list[(k + 1) % list.length];
      if (s) s.destroy();
      stage.textContent = '';
      s = slider(stage, { src: c.src, layout: c.layout }, { lang, onChange: () => emit('ba:slide', { procedure: c.cat, index: c.i }) });
      const thPos = n.layout === 'lr' ? 'background-size:200% 100%;background-position:0 0' : n.layout === 'tb' ? 'background-size:100% 200%;background-position:0 0' : 'background-size:cover;background-position:center';
      side.innerHTML = panel(c, '') +
        (list.length > 1 ? `<button type="button" class="v-next" data-v="1"><span class="v-th" style="background-image:url('${esc(n.url)}');${thPos}"></span><span><small>${esc(L(T.next))}</small><b>${esc(n.procName)}</b></span>${ICON.arrow}</button>` : '');
      bindAsk(side, c);
      count.textContent = fill(L(T.caseN), { n: k + 1, m: list.length });
      ov.querySelectorAll('.v-top [data-v="-1"],.v-top [data-v="1"]').forEach(b => { b.disabled = list.length < 2; });
      if (dir && !reduced()) { stage.style.transition = 'none'; stage.style.transform = `translateX(${dir * 36}px)`; stage.style.opacity = '0'; requestAnimationFrame(() => requestAnimationFrame(() => { stage.style.transition = ''; stage.style.transform = ''; stage.style.opacity = ''; })); }
      emit('ba:view', { procedure: c.cat, index: c.i });
    };
    ov.addEventListener('click', e => {
      const b = e.target.closest('[data-v]');
      if (!b) return;
      if (b.dataset.v === 'x') close(); else show(k + +b.dataset.v, +b.dataset.v);
    });
    let sx = 0, sy = 0, down = false;
    side.addEventListener('pointerdown', e => { if (e.target.closest('a,button')) return; down = true; sx = e.clientX; sy = e.clientY; });
    side.addEventListener('pointerup', e => { if (!down) return; down = false; const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) show(k + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); });
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowRight' && !e.target.closest('.b-knob')) { e.preventDefault(); show(k + 1, 1); }
      else if (e.key === 'ArrowLeft' && !e.target.closest('.b-knob')) { e.preventDefault(); show(k - 1, -1); }
      else if (e.key === 'Tab') {
        const f = [...ov.querySelectorAll('a[href],button:not([disabled])')].filter(x => x.offsetParent !== null);
        const ix = f.indexOf(document.activeElement);
        if (e.shiftKey && ix <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && ix === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    function close() {
      document.removeEventListener('keydown', onKey);
      if (s) s.destroy();
      ov.remove();
      document.documentElement.style.overflow = prevOverflow;
      viewer = null;
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    }
    show(k, 0);
    ov.querySelector('[data-v="x"]').focus({ preventScroll: true });
    viewer = { close, el: ov };
  }

  renderSpot();
  return {
    destroy() { cancelAnimationFrame(peekRaf); if (viewer) viewer.close(); if (spot) spot.destroy(); root.remove(); },
    open: i => open(i)
  };
}
