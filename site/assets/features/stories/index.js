/* Review video stories: a row of circular thumbnails grouped by procedure and a fullscreen vertical viewer.
   mount(container, {lang, base, serviceUrl, onEvent, items?}) -> {destroy()}
     items: [{src, procedure, poster?}]. Without items, the module reads the videos lists of
     data/<lang>/svc/<key>.js plus home.js. A video listed on several service pages is labelled with
     the first procedure that lists it (facelift before brow lift), since the clips are shared. */

import { PROC_KEYS, t, procName } from '../plan/procedures.js';

const SITE = 'https://www.apexsurgeryhospital.com/';
const abs = u => (u && u.startsWith('~/') ? SITE + u.slice(2) : u);

const T = {
  title: { en: 'Client review videos', th: 'วิดีโอรีวิวจากลูกค้า' },
  open: { en: 'Play {p} review {n} of {m}', th: 'เล่นรีวิว{p} คลิปที่ {n} จาก {m}' },
  viewer: { en: 'Review video', th: 'วิดีโอรีวิว' },
  close: { en: 'Close', th: 'ปิด' },
  sound: { en: 'Sound on', th: 'เปิดเสียง' },
  mute: { en: 'Sound off', th: 'ปิดเสียง' },
  prev: { en: 'Previous video', th: 'วิดีโอก่อนหน้า' },
  next: { en: 'Next video', th: 'วิดีโอถัดไป' },
  play: { en: 'Play', th: 'เล่น' },
  pause: { en: 'Pause', th: 'หยุด' },
  service: { en: 'Service page', th: 'หน้าบริการ' },
  loading: { en: 'Loading video', th: 'กำลังโหลดวิดีโอ' },
  failed: { en: 'The video could not be loaded.', th: 'โหลดวิดีโอไม่สำเร็จ' },
  retry: { en: 'Try again', th: 'ลองอีกครั้ง' },
  vary: { en: 'Results may vary from person to person.', th: 'ผลลัพธ์อาจแตกต่างกันในแต่ละบุคคล' },
  count: { en: '{n} of {m}', th: '{n} จาก {m}' },
  none: { en: 'No review videos.', th: 'ไม่มีวิดีโอรีวิว' },
  general: { en: 'Apex Surgery Hospital', th: 'โรงพยาบาลศัลยกรรมตกแต่งเอเพ็กซ์' },
  all: { en: 'All', th: 'ทั้งหมด' },
  watch: { en: 'Watch', th: 'ดูคลิป' },
  watched: { en: 'Watched', th: 'ดูแล้ว' },
  clip: { en: 'Review {n} of {m}', th: 'รีวิวที่ {n} จาก {m}' },
  filter: { en: 'Show reviews for', th: 'แสดงรีวิว' },
  left: { en: 'Scroll left', th: 'เลื่อนไปทางซ้าย' },
  right: { en: 'Scroll right', th: 'เลื่อนไปทางขวา' }
};

const ICON = {
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  muted: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l4 6M21 9l-4 6"/></svg>',
  sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 14l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 10l6 6 6-6"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13a1 1 0 0 0 1.5.9l10-6.5a1 1 0 0 0 0-1.7l-10-6.6A1 1 0 0 0 8 5.5z"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6h9v9M18 6L6 18"/></svg>'
};

const CSS = `
.apxs{--s-plum:var(--plum,#6A388C);--s-plum7:var(--plum-700,#55286F);--s-night:var(--night,#1F0A30);--s-night2:var(--night-2,#2A0F40);
  --s-lilac:var(--lilac,#A886CD);--s-l3:var(--lilac-300,#C9B3DD);--s-l2:var(--lilac-200,#E4D8EE);--s-l1:var(--lilac-100,#F1EAF7);
  --s-ink:var(--ink,#2A1F33);--s-ink2:var(--ink-2,#5A4A66);--s-on:var(--on-night,#F6EEFB);--s-on2:var(--on-night-2,#CDB9DD);--s-rose:#CC3366;
  --s-ease:cubic-bezier(.23,1,.32,1);
  font-family:"LINE Seed","Sarabun","Noto Sans Thai",system-ui,sans-serif;color:var(--s-ink);font-size:16px;line-height:1.6;-webkit-text-size-adjust:100%}
.apxs *,.apxs *::before,.apxs *::after,.apxs-v *,.apxs-v *::before,.apxs-v *::after{box-sizing:border-box}
.apxs h2,.apxs h3,.apxs p{margin:0}
.apxs .s-wrap{max-width:1180px;margin:0 auto;padding:24px 0 32px}
.apxs .s-wrap>h2{font-size:clamp(24px,4.5vw,32px);font-weight:800;letter-spacing:-.01em;line-height:1.2;padding:0 16px;margin-bottom:14px}
.apxs .s-track{display:flex;gap:22px;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x proximity;scroll-padding-inline:16px;padding:4px 16px 12px;scrollbar-width:thin}
@media (min-width:700px){.apxs .s-track{-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 48px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 48px),transparent)}}
.apxs .s-group{flex:none;scroll-snap-align:start}
.apxs .s-group h3{font-size:14px;font-weight:800;color:var(--s-plum7);margin:0 0 8px 2px;white-space:nowrap}
.apxs .s-row{display:flex;gap:12px}
.apxs .s-th{position:relative;width:76px;height:76px;padding:3px;border-radius:50%;border:0;cursor:pointer;flex:none;
  background:conic-gradient(from 200deg,var(--s-rose),var(--s-plum),var(--s-lilac),var(--s-rose));transition:transform .2s var(--s-ease)}
.apxs .s-th:active{transform:scale(.94)}
.apxs .s-th.seen{background:var(--s-l3)}
.apxs .s-th:focus-visible{outline:3px solid var(--s-plum);outline-offset:3px}
.apxs .s-in{position:relative;display:block;width:100%;height:100%;border-radius:50%;overflow:hidden;border:3px solid #fff;
  background:linear-gradient(150deg,var(--s-l3),var(--s-lilac) 55%,var(--s-plum))}
.apxs .s-in i{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:4px;font-style:normal;font-size:9.5px;line-height:1.15;font-weight:800;color:#fff;hyphens:auto}
.apxs .s-in video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .3s}
.apxs .s-in video.ok{opacity:1}
.apxs .s-vary{padding:0 16px;font-size:13px;color:var(--s-ink2)}
.apxs-v{position:fixed;inset:0;z-index:2147483000;background:rgba(17,5,28,.94);display:flex;flex-direction:column;align-items:center;justify-content:center;
  font-family:"LINE Seed","Sarabun","Noto Sans Thai",system-ui,sans-serif;color:#fff;-webkit-tap-highlight-color:transparent;touch-action:none}
.apxs-v[hidden]{display:none}
.apxs-v .v-frame{position:relative;width:min(100vw,calc((100dvh - 44px) * 9 / 16));height:calc(100dvh - 44px);overflow:hidden;background:var(--s-night,#1F0A30)}
@media (min-width:700px){.apxs-v .v-frame{border-radius:20px;height:calc(100dvh - 92px);width:calc((100dvh - 92px) * 9 / 16)}}
.apxs-v .v-slide{position:absolute;inset:0;transition:transform .42s cubic-bezier(.23,1,.32,1);will-change:transform}
.apxs-v .v-slide.drag{transition:none}
.apxs-v .v-slide video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:linear-gradient(160deg,#2A0F40,#6A388C 60%,#A886CD)}
.apxs-v .v-ph{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center;
  background:linear-gradient(160deg,#2A0F40,#6A388C 60%,#A886CD)}
.apxs-v .v-ph b{font-size:24px;font-weight:800}
.apxs-v .v-slide[data-state=ready] .v-ph,.apxs-v .v-slide[data-state=playing] .v-ph,.apxs-v .v-slide[data-state=paused] .v-ph{display:none}
.apxs-v .v-spin{width:36px;height:36px;border-radius:50%;border:3px solid rgba(255,255,255,.25);border-top-color:#fff;animation:apxs-spin 1s linear infinite}
.apxs-v .v-slide[data-state=error] .v-spin{display:none}
.apxs-v .v-err{display:none;font-size:15px;color:var(--s-on2,#CDB9DD)}
.apxs-v .v-slide[data-state=error] .v-err{display:block}
.apxs-v .v-retry{display:none;min-height:44px;padding:0 18px;border-radius:999px;border:1.5px solid rgba(255,255,255,.5);background:transparent;color:#fff;font:inherit;font-weight:700;cursor:pointer}
.apxs-v .v-slide[data-state=error] .v-retry{display:inline-flex;align-items:center}
.apxs-v .v-big{position:absolute;left:50%;top:50%;width:72px;height:72px;margin:-36px 0 0 -36px;border-radius:50%;background:rgba(31,10,48,.55);display:none;align-items:center;justify-content:center;pointer-events:none}
.apxs-v .v-big svg{width:34px;height:34px;margin-left:4px}
.apxs-v .v-slide[data-state=paused] .v-big{display:flex}
@keyframes apxs-spin{to{transform:rotate(360deg)}}
.apxs-v .v-top{position:absolute;left:0;right:0;top:0;z-index:3;padding:10px 10px 28px;background:linear-gradient(rgba(17,5,28,.7),transparent)}
.apxs-v .v-bars{display:flex;gap:4px}
.apxs-v .v-bar{flex:1;height:3px;border-radius:3px;background:rgba(255,255,255,.3);overflow:hidden}
.apxs-v .v-bar i{display:block;height:100%;width:0;background:#fff}
.apxs-v .v-bar.done i{width:100%}
.apxs-v .v-head{display:flex;align-items:center;gap:8px;margin-top:10px}
.apxs-v .v-label{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.3}
.apxs-v .v-label b{font-size:17px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.apxs-v .v-label a{display:inline-flex;align-items:center;gap:4px;align-self:flex-start;min-height:32px;color:var(--s-on2,#CDB9DD);font-size:14px;font-weight:700;text-decoration:underline;text-underline-offset:.2em}
.apxs-v .v-label a svg{width:14px;height:14px}
.apxs-v .v-label small{font-size:12px;color:var(--s-on2,#CDB9DD)}
.apxs-v .v-ib{width:44px;height:44px;border-radius:50%;border:0;background:rgba(255,255,255,.14);color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex:none}
.apxs-v .v-ib svg{width:22px;height:22px}
.apxs-v .v-ib:hover{background:rgba(255,255,255,.24)}
.apxs-v :is(button,a):focus-visible{outline:3px solid var(--s-lilac,#A886CD);outline-offset:2px}
.apxs-v .v-nav{position:absolute;left:calc(50% + (100dvh - 92px) * 9 / 32 + 20px);top:50%;transform:translateY(-50%);display:none;flex-direction:column;gap:12px}
@media (min-width:700px) and (hover:hover){.apxs-v .v-nav{display:flex}}
.apxs-v .v-cap{margin:0;height:44px;display:flex;align-items:center;justify-content:center;padding:0 16px;font-size:13px;color:var(--s-on2,#CDB9DD);text-align:center}
.apxs-v .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

/* reels layout: tall cards with a muted preview, procedure chips and arrows */
.apxs.reels .s-wrap{padding:0}
.apxs.reels .r-bar{display:flex;align-items:center;gap:12px;margin:0 0 18px}
.apxs.reels .r-chips{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;flex:1;min-width:0;padding:2px}
.apxs.reels .r-chips::-webkit-scrollbar{display:none}
.apxs.reels .r-chip{flex:none;display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 8px 0 16px;border-radius:999px;border:0;cursor:pointer;font:inherit;font-size:14.5px;font-weight:700;
  background:#fff;color:var(--s-ink);box-shadow:inset 0 0 0 1px var(--s-l2);transition:background .25s,color .25s,box-shadow .25s}
.apxs.reels .r-chip em{font-style:normal;font-size:12px;min-width:24px;height:24px;padding:0 7px;border-radius:999px;display:grid;place-items:center;background:var(--s-l1);color:var(--s-plum7)}
.apxs.reels .r-chip[aria-pressed=true]{background:var(--s-plum);color:#fff;box-shadow:0 10px 24px -12px rgba(106,56,140,.8)}
.apxs.reels .r-chip[aria-pressed=true] em{background:rgba(255,255,255,.2);color:#fff}
.apxs.reels .r-arrows{display:none;gap:8px;flex:none}
@media (min-width:760px){.apxs.reels .r-arrows{display:flex}}
.apxs.reels .r-arrow{width:44px;height:44px;border-radius:50%;border:0;cursor:pointer;display:grid;place-items:center;background:#fff;color:var(--s-plum7);box-shadow:inset 0 0 0 1px var(--s-l2);transition:transform .25s var(--s-ease),opacity .25s}
.apxs.reels .r-arrow svg{width:20px;height:20px}
.apxs.reels .r-arrow:hover{transform:scale(1.06)}
.apxs.reels .r-arrow:disabled{opacity:.35;cursor:default;transform:none}
.apxs.reels .r-track{display:flex;gap:clamp(12px,1.6vw,20px);overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;scroll-behavior:smooth;padding:6px 2px 22px;scrollbar-width:none}
.apxs.reels .r-track::-webkit-scrollbar{display:none}
.apxs.reels .r-card{position:relative;flex:none;width:clamp(158px,40vw,232px);aspect-ratio:9/16;border-radius:22px;overflow:hidden;border:0;padding:0;cursor:pointer;scroll-snap-align:start;isolation:isolate;
  background:linear-gradient(160deg,var(--s-night2),var(--s-plum) 60%,var(--s-lilac));color:#fff;text-align:left;font:inherit;
  box-shadow:0 28px 50px -30px rgba(31,10,48,.85),0 0 0 1px rgba(255,255,255,.06);transition:transform .45s var(--s-ease),box-shadow .45s var(--s-ease)}
@media (min-width:1100px){.apxs.reels .r-card{width:calc((100% - 4 * 20px) / 5.2)}}
.apxs.reels .r-card:hover,.apxs.reels .r-card.live{transform:translateY(-6px)}
.apxs.reels .r-card:hover{box-shadow:0 40px 60px -30px rgba(31,10,48,.95),0 0 0 2px var(--s-rose)}
.apxs.reels .r-card:focus-visible{outline:3px solid var(--s-lilac);outline-offset:3px}
.apxs.reels .r-card video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .4s,transform .8s var(--s-ease);z-index:-1}
.apxs.reels .r-card video.ok{opacity:1}
.apxs.reels .r-card:hover video{transform:scale(1.04)}
.apxs.reels .r-card::after{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;
  background:linear-gradient(180deg,rgba(17,5,28,.55) 0,rgba(17,5,28,0) 26%,rgba(17,5,28,0) 52%,rgba(17,5,28,.88) 100%)}
.apxs.reels .r-tag{position:absolute;z-index:1;top:12px;left:12px;right:12px;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:800;letter-spacing:.02em}
.apxs.reels .r-tag i{font-style:normal;padding:5px 10px;border-radius:999px;background:rgba(17,5,28,.5);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.apxs.reels .r-seen{display:none;margin-left:auto;width:24px;height:24px;flex:none;border-radius:50%;background:rgba(255,255,255,.9);color:var(--s-plum);place-items:center}
.apxs.reels .r-seen svg{width:14px;height:14px}
.apxs.reels .r-card.seen .r-seen{display:grid}
.apxs.reels .r-play{position:absolute;z-index:1;left:50%;top:50%;width:58px;height:58px;margin:-29px 0 0 -29px;border-radius:50%;display:grid;place-items:center;
  background:rgba(255,255,255,.2);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.55);transition:transform .35s var(--s-ease),background .35s,opacity .35s}
.apxs.reels .r-play svg{width:24px;height:24px;margin-left:3px}
.apxs.reels .r-card:hover .r-play{transform:scale(1.12);background:var(--s-rose);box-shadow:none}
.apxs.reels .r-card.live:not(:hover) .r-play{opacity:0;transform:scale(.8)}
.apxs.reels .r-bot{position:absolute;z-index:1;left:14px;right:14px;bottom:14px;display:flex;flex-direction:column;gap:2px;line-height:1.25}
.apxs.reels .r-bot b{font-size:16px;font-weight:800}
.apxs.reels .r-bot small{font-size:12.5px;color:var(--s-on2);display:flex;align-items:center;gap:6px}
.apxs.reels .r-bot small::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--s-rose);box-shadow:0 0 0 0 rgba(204,51,102,.6)}
.apxs.reels .r-card.live .r-bot small::before{animation:apxs-pulse 1.6s infinite}
@keyframes apxs-pulse{70%{box-shadow:0 0 0 7px rgba(204,51,102,0)}100%{box-shadow:0 0 0 0 rgba(204,51,102,0)}}
.apxs.reels .r-card[hidden]{display:none}
.apxs.reels .s-vary{padding:0}
.apxs.reels.on-night .r-chip{background:rgba(255,255,255,.07);color:var(--s-on);box-shadow:inset 0 0 0 1px rgba(201,179,221,.22)}
.apxs.reels.on-night .r-chip em{background:rgba(255,255,255,.1);color:var(--s-on)}
.apxs.reels.on-night .r-chip[aria-pressed=true]{background:#fff;color:var(--s-plum7)}
.apxs.reels.on-night .r-chip[aria-pressed=true] em{background:var(--s-l1);color:var(--s-plum7)}
.apxs.reels.on-night .r-arrow{background:rgba(255,255,255,.08);color:#fff;box-shadow:inset 0 0 0 1px rgba(201,179,221,.22)}
.apxs.reels.on-night .s-vary{color:var(--s-on2)}
@media (prefers-reduced-motion:reduce){.apxs *,.apxs-v *{transition:none!important;animation-duration:2s!important}}
`;

function injectCSS() {
  if (document.getElementById('apxs-css')) return;
  const s = document.createElement('style'); s.id = 'apxs-css'; s.textContent = CSS; document.head.append(s);
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
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? ''));
const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

/* ---------- data files (data/<lang>/<file>.js assign APEX._d[id]) ---------- */
const dataCache = {};
function loadData(base, lang, id) {
  const ck = lang + '|' + id;
  if (dataCache[ck]) return dataCache[ck];
  const file = id.includes(':') ? id.replace(':', '/') : id;
  const one = l => new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = `${base}data/${l}/${file}.js`;
    s.onload = () => { s.remove(); const d = window.APEX && APEX._d && APEX._d[id]; d ? res(JSON.parse(JSON.stringify(d))) : rej(new Error('empty ' + id)); };
    s.onerror = () => { s.remove(); rej(new Error('missing ' + s.src)); };
    document.head.append(s);
  });
  dataCache[ck] = one(lang).catch(e => (lang !== 'th' ? one('th') : Promise.reject(e)));
  dataCache[ck].catch(() => { delete dataCache[ck]; });
  return dataCache[ck];
}

/* Items from the service files (in procedure order) and home.js, one entry per video file. */
export async function itemsFromData(base, lang) {
  const files = await Promise.all([...PROC_KEYS.map(k => loadData(base, lang, 'svc:' + k).catch(() => null)), loadData(base, lang, 'home').catch(() => null)]);
  const seen = new Set();
  const out = [];
  PROC_KEYS.forEach((k, i) => ((files[i] && files[i].videos) || []).forEach(src => {
    const u = abs(src); if (seen.has(u)) return; seen.add(u); out.push({ src: u, procedure: k });
  }));
  const home = files[PROC_KEYS.length];
  ((home && home.videos) || []).forEach(src => { const u = abs(src); if (!seen.has(u)) { seen.add(u); out.push({ src: u, procedure: null }); } });
  return out;
}

export function mount(container, opts = {}) {
  injectCSS();
  const lang = opts.lang === 'th' ? 'th' : 'en';
  const L = o => t(o, lang);
  const base = opts.base || new URL('../../', import.meta.url).href;
  const serviceUrl = typeof opts.serviceUrl === 'function' ? opts.serviceUrl : k => `service.html?p=${k}`;
  const emit = (n, d) => { try { opts.onEvent && opts.onEvent(n, d); } catch (e) { /* host handler error */ } };
  const pname = k => (k ? procName(k, lang) : L(T.general));

  const reels = opts.layout === 'reels';
  const root = h('div', { class: 'apxs' + (reels ? ' reels' : ''), lang });
  const wrap = h('div', { class: 's-wrap' }, opts.title === false ? null : h('h2', null, opts.title || L(T.title)));
  root.append(wrap);
  container.append(root);
  if (reels && container.closest && container.closest('.night')) root.classList.add('on-night');

  let items = [];
  let groups = [];
  const seen = new Set();
  let io = null;
  let viewer = null;
  let destroyed = false;

  let all = [];
  function build(list) {
    items = list.map((x, i) => ({ src: abs(x.src), procedure: x.procedure || null, poster: x.poster ? abs(x.poster) : null, i }));
    if (reels) { all = items; return buildReels(); }
    const order = [...PROC_KEYS, null];
    groups = order.map(k => ({ key: k, items: items.filter(x => x.procedure === k) })).filter(g => g.items.length);
    items = groups.flatMap(g => g.items);
    items.forEach((x, i) => { x.i = i; });
    const track = h('div', { class: 's-track', role: 'list' });
    if (!items.length) { wrap.append(h('p', { class: 's-vary' }, L(T.none))); return; }
    io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const v = e.target; io.unobserve(v);
      v.src = v.dataset.src;
    }), { root: track, rootMargin: '0px 200px' }) : null;
    groups.forEach(g => {
      track.append(h('div', { class: 's-group', role: 'listitem' },
        h('h3', null, pname(g.key)),
        h('div', { class: 's-row' }, g.items.map((x, j) => {
          const vid = h('video', { muted: true, playsinline: true, preload: 'metadata', 'aria-hidden': 'true', tabindex: '-1', 'data-src': x.src + '#t=1.5', poster: x.poster });
          vid.muted = true;
          vid.addEventListener('loadeddata', () => vid.classList.add('ok'));
          if (io) io.observe(vid); else vid.src = vid.dataset.src;
          const b = h('button', { type: 'button', class: 's-th', 'data-i': x.i, 'aria-label': fill(L(T.open), { p: pname(g.key), n: j + 1, m: g.items.length }) },
            h('span', { class: 's-in' }, h('i', { 'aria-hidden': 'true' }, pname(g.key)), vid));
          b.addEventListener('click', () => open(x.i, b));
          return b;
        }))));
    });
    wrap.append(track, h('p', { class: 's-vary' }, L(T.vary)));
  }


  /* ---------------- reels layout ---------------- */
  let track = null, live = null, liveT = 0, filterKey = null;
  const canHover = () => { try { return matchMedia('(hover:hover) and (pointer:fine)').matches; } catch (e) { return false; } };
  function setGroups(key) {
    const order = [...(opts.focus ? [opts.focus] : []), ...PROC_KEYS.filter(k => k !== opts.focus), null];
    const src = key ? all.filter(x => x.procedure === key) : all;
    groups = order.map(k => ({ key: k, items: src.filter(x => x.procedure === k) })).filter(g => g.items.length);
    items = groups.flatMap(g => g.items).map((x, i) => Object.assign({}, x, { i }));
    groups.forEach(g => { g.items = items.filter(x => x.procedure === g.key); });
  }
  function buildReels() {
    const order = [...PROC_KEYS, null];
    if (!all.length) { wrap.append(h('p', { class: 's-vary' }, L(T.none))); return; }
    if (opts.focus && all.some(x => x.procedure === opts.focus)) {
      all = [...all.filter(x => x.procedure === opts.focus), ...all.filter(x => x.procedure !== opts.focus)];
    }
    const counts = order.map(k => [k, all.filter(x => x.procedure === k).length]).filter(c => c[1] && c[0]);
    const chips = h('div', { class: 'r-chips', role: 'group', 'aria-label': L(T.filter) });
    const mk = (k, label, n) => {
      const b = h('button', { type: 'button', class: 'r-chip', 'aria-pressed': String(k === filterKey) }, label, h('em', null, String(n)));
      b.addEventListener('click', () => { filterKey = k; chips.querySelectorAll('.r-chip').forEach(c => c.setAttribute('aria-pressed', String(c === b))); render(); emit('stories:filter', { procedure: k }); });
      return b;
    };
    chips.append(mk(null, L(T.all), all.length), ...counts.map(([k, n]) => mk(k, pname(k), n)));
    const prev = h('button', { type: 'button', class: 'r-arrow', 'aria-label': L(T.left), html: ICON.left });
    const next = h('button', { type: 'button', class: 'r-arrow', 'aria-label': L(T.right), html: ICON.right });
    track = h('div', { class: 's-track r-track' });
    const step = dir => track.scrollBy({ left: dir * Math.max(200, track.clientWidth * .8), behavior: reduced() ? 'auto' : 'smooth' });
    prev.addEventListener('click', () => step(-1));
    next.addEventListener('click', () => step(1));
    const arrows = () => { prev.disabled = track.scrollLeft < 4; next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 4; };
    let st = 0;
    track.addEventListener('scroll', () => { arrows(); clearTimeout(st); st = setTimeout(pickLive, 160); }, { passive: true });
    wrap.append(h('div', { class: 'r-bar' }, chips, h('div', { class: 'r-arrows' }, prev, next)), track, h('p', { class: 's-vary' }, L(T.vary)));
    render();
    requestAnimationFrame(arrows); setTimeout(arrows, 400);
    /* the preview starts once the rail is on screen and stops when it leaves */
    if ('IntersectionObserver' in window) {
      const vis = new IntersectionObserver(es => es.forEach(e => { onScreen = e.isIntersecting; if (onScreen) pickLive(); else setLive(null); }), { threshold: .35 });
      vis.observe(track); cleanups.push(() => vis.disconnect());
    }
    const onR = () => { arrows(); pickLive(); }; window.addEventListener('resize', onR); cleanups.push(() => window.removeEventListener('resize', onR));
  }
  let onScreen = false;
  const cleanups = [];
  function render() {
    setGroups(filterKey);
    setLive(null);
    track.textContent = '';
    track.scrollLeft = 0;
    if (io) io.disconnect();
    io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const v = e.target; io.unobserve(v); v.src = v.dataset.src;
    }), { rootMargin: '100px 0px' }) : null;   // measured against the screen, so cards load only once they are actually in view
    groups.forEach(g => g.items.forEach((x, j) => {
      const vid = h('video', { muted: true, playsinline: true, loop: true, preload: 'metadata', 'aria-hidden': 'true', tabindex: '-1', 'data-src': x.src + '#t=1.5', poster: x.poster });
      vid.muted = true;
      vid.addEventListener('loadeddata', () => vid.classList.add('ok'));
      if (io) io.observe(vid); else vid.src = vid.dataset.src;
      const b = h('button', { type: 'button', class: 'r-card' + (seenSrc.has(x.src) ? ' seen' : ''), 'data-i': x.i, 'aria-label': fill(L(T.open), { p: pname(g.key), n: j + 1, m: g.items.length }) },
        vid,
        h('span', { class: 'r-tag', 'aria-hidden': 'true' }, h('i', null, pname(g.key)), h('span', { class: 'r-seen', title: L(T.watched), html: ICON.check })),
        h('span', { class: 'r-play', 'aria-hidden': 'true', html: ICON.play }),
        h('span', { class: 'r-bot', 'aria-hidden': 'true' }, h('b', null, L(T.watch)), h('small', null, fill(L(T.clip), { n: j + 1, m: g.items.length }))));
      b.addEventListener('click', () => { setLive(null); open(x.i, b); });
      b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') setLive(b); });
      b.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') pickLive(); });
      track.append(b);
    }));
    if (onScreen) setTimeout(pickLive, 300);
  }
  /* one muted preview plays at a time: the hovered card, or the first card fully in view */
  function pickLive() {
    if (!track || viewer || !onScreen || reduced()) return;
    const r = track.getBoundingClientRect();
    const card = [...track.querySelectorAll('.r-card')].find(c => { const q = c.getBoundingClientRect(); return q.left >= r.left - 4 && q.right <= r.right + 4; });
    if (canHover() && track.querySelector('.r-card:hover')) return;
    setLive(card || null);
  }
  function setLive(card) {
    if (live === card) return;
    if (live) { const v = live.querySelector('video'); live.classList.remove('live'); if (v) { v.pause(); } }
    live = card; clearTimeout(liveT);
    if (!card || reduced()) return;
    const v = card.querySelector('video');
    if (!v) return;
    if (!v.src) v.src = v.dataset.src;
    card.classList.add('live');
    liveT = setTimeout(() => { const p = v.play(); if (p && p.catch) p.catch(() => card.classList.remove('live')); }, 120);
  }
  const seenSrc = new Set();

  /* ---------------- viewer ---------------- */
  function open(index, opener) {
    if (viewer) viewer.close();
    viewer = makeViewer(index, opener);
    emit('stories:open', { index, procedure: items[index].procedure, src: items[index].src });
  }

  function makeViewer(start, opener) {
    let cur = start;
    let muted = false; /* opened by a tap, so the browser allows sound; falls back to muted if it refuses */
    let paused = false;
    const slides = new Map(); /* index -> {el, video} ; only cur-1, cur, cur+1 are kept */
    const frame = h('div', { class: 'v-frame' });
    const bars = h('div', { class: 'v-bars', 'aria-hidden': 'true' });
    const label = h('div', { class: 'v-label' });
    const soundBtn = h('button', { type: 'button', class: 'v-ib', 'data-act': 'sound' });
    const closeBtn = h('button', { type: 'button', class: 'v-ib', 'data-act': 'close', 'aria-label': L(T.close), html: ICON.x });
    const live = h('p', { class: 'sr', 'aria-live': 'polite' });
    const top = h('div', { class: 'v-top' }, bars, h('div', { class: 'v-head' }, label, soundBtn, closeBtn), live);
    frame.append(top);
    const prevBtn = h('button', { type: 'button', class: 'v-ib', 'data-act': 'prev', 'aria-label': L(T.prev), html: ICON.up });
    const nextBtn = h('button', { type: 'button', class: 'v-ib', 'data-act': 'next', 'aria-label': L(T.next), html: ICON.down });
    const ov = h('div', { class: 'apxs-v', role: 'dialog', 'aria-modal': 'true', 'aria-label': L(T.viewer), lang },
      frame, h('div', { class: 'v-nav' }, prevBtn, nextBtn), h('p', { class: 'v-cap' }, L(T.vary)));
    document.body.append(ov);
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    const setSound = () => {
      soundBtn.innerHTML = muted ? ICON.muted : ICON.sound;
      soundBtn.setAttribute('aria-label', muted ? L(T.sound) : L(T.mute));
      soundBtn.setAttribute('aria-pressed', String(!muted));
      slides.forEach(s => { s.video.muted = muted; });
    };
    soundBtn.addEventListener('click', () => { muted = !muted; setSound(); const s = slides.get(cur); if (s && !muted && s.video.paused && !paused) tryPlay(s); });
    closeBtn.addEventListener('click', () => close());
    prevBtn.addEventListener('click', () => go(cur - 1));
    nextBtn.addEventListener('click', () => go(cur + 1));

    function makeSlide(i) {
      const x = items[i];
      const video = h('video', { playsinline: true, preload: i === cur ? 'auto' : 'metadata', poster: x.poster });
      video.muted = muted; video.playsInline = true;
      const retry = h('button', { type: 'button', class: 'v-retry' }, L(T.retry));
      const el = h('div', { class: 'v-slide', 'data-i': i, 'data-state': 'loading' },
        video,
        h('div', { class: 'v-ph' }, h('b', null, pname(x.procedure)), h('span', { class: 'v-spin', role: 'img', 'aria-label': L(T.loading) }), h('p', { class: 'v-err' }, L(T.failed)), retry),
        h('span', { class: 'v-big', html: ICON.play }));
      const s = { el, video, i };
      const state = st => { el.dataset.state = st; if (i === cur) ov.dataset.state = st; };
      video.addEventListener('loadeddata', () => { if (el.dataset.state === 'loading') state(i === cur && !paused ? 'playing' : 'ready'); });
      video.addEventListener('playing', () => state('playing'));
      video.addEventListener('pause', () => { if (el.dataset.state === 'playing') state('paused'); });
      video.addEventListener('error', () => state('error'));
      video.addEventListener('ended', () => { if (i === cur) go(cur + 1, true); });
      video.addEventListener('timeupdate', () => { if (i === cur) progress(); });
      retry.addEventListener('click', e => { e.stopPropagation(); state('loading'); video.load(); if (i === cur) tryPlay(s); });
      video.src = x.src;
      return s;
    }
    function tryPlay(s) {
      const p = s.video.play();
      if (p && p.catch) p.catch(err => {
        if (!muted && err && err.name === 'NotAllowedError') { muted = true; setSound(); s.video.muted = true; const q = s.video.play(); if (q && q.catch) q.catch(() => {}); return; }
        if (s.el.dataset.state !== 'error' && s.video.readyState >= 2) { s.el.dataset.state = 'paused'; }
      });
    }

    function place(offsetPx = 0, drag = false) {
      const H = frame.clientHeight || 1;
      slides.forEach(s => {
        s.el.classList.toggle('drag', drag);
        s.el.style.transform = `translate3d(0,${(s.i - cur) * H + offsetPx}px,0)`;
      });
    }

    function sync() {
      /* keep only the previous, current and next videos in the DOM */
      const want = new Set([cur - 1, cur, cur + 1].filter(i => i >= 0 && i < items.length));
      slides.forEach((s, i) => { if (!want.has(i)) { s.video.pause(); s.video.removeAttribute('src'); s.video.load(); s.el.remove(); slides.delete(i); } });
      want.forEach(i => { if (!slides.has(i)) { const s = makeSlide(i); slides.set(i, s); frame.insertBefore(s.el, top); } });
      slides.forEach((s, i) => {
        s.el.setAttribute('aria-hidden', String(i !== cur));
        if (i !== cur) { s.video.pause(); try { s.video.currentTime = 0; } catch (e) { /* not loaded */ } }
      });
      const s = slides.get(cur);
      s.video.preload = 'auto';
      ov.dataset.state = s.el.dataset.state;
      ov.dataset.index = String(cur);
      const x = items[cur];
      label.textContent = '';
      const g = groups.find(gg => gg.key === x.procedure);
      const n = g.items.indexOf(x);
      label.append(h('b', null, pname(x.procedure)),
        x.procedure ? h('a', { href: serviceUrl(x.procedure), html: `<span>${L(T.service)}</span>` + ICON.ext }) : h('small', null, fill(L(T.count), { n: n + 1, m: g.items.length })));
      bars.textContent = '';
      g.items.forEach((y, j) => bars.append(h('span', { class: 'v-bar' + (j < n ? ' done' : ''), 'data-j': j }, h('i'))));
      live.textContent = `${pname(x.procedure)}, ${fill(L(T.count), { n: n + 1, m: g.items.length })}`;
      prevBtn.disabled = cur === 0; nextBtn.disabled = cur === items.length - 1;
      seen.add(cur);
      const th = root.querySelector(`.s-th[data-i="${cur}"],.r-card[data-i="${cur}"]`); if (th) th.classList.add('seen');
      seenSrc.add(items[cur].src);
      place();
      if (!paused) tryPlay(s);
      setSound();
    }
    function progress() {
      const s = slides.get(cur); if (!s) return;
      const x = items[cur];
      const g = groups.find(gg => gg.key === x.procedure);
      const bar = bars.querySelector(`.v-bar[data-j="${g.items.indexOf(x)}"] i`);
      if (bar && s.video.duration) bar.style.width = (100 * s.video.currentTime / s.video.duration).toFixed(1) + '%';
    }
    function go(i, auto) {
      if (i < 0 || i >= items.length) { if (auto || i >= items.length) { if (i >= items.length && auto) close(); } place(); return; }
      cur = i; paused = false;
      sync();
      emit('stories:view', { index: cur, procedure: items[cur].procedure, auto: !!auto });
    }
    function togglePause() {
      const s = slides.get(cur); if (!s || s.el.dataset.state === 'error' || s.el.dataset.state === 'loading') return;
      if (s.video.paused) { paused = false; tryPlay(s); } else { paused = true; s.video.pause(); s.el.dataset.state = 'paused'; ov.dataset.state = 'paused'; }
    }

    /* touch and mouse: swipe up/down to move, tap the side thirds to move, tap the middle to pause */
    let sy = 0, sx = 0, dy = 0, dragging = false, moved = false, st0 = 0;
    frame.addEventListener('pointerdown', e => {
      if (e.target.closest('button,a')) return;
      dragging = true; moved = false; sy = e.clientY; sx = e.clientX; dy = 0; st0 = performance.now();
      try { frame.setPointerCapture(e.pointerId); } catch (er) { /* synthetic */ }
    });
    frame.addEventListener('pointermove', e => {
      if (!dragging) return;
      dy = e.clientY - sy;
      if (Math.abs(dy) > 8) moved = true;
      if (moved) { const edge = (cur === 0 && dy > 0) || (cur === items.length - 1 && dy < 0); place(edge ? dy * .3 : dy, true); }
    });
    const end = e => {
      if (!dragging) return;
      dragging = false;
      const H = frame.clientHeight;
      const fast = Math.abs(dy) > 40 && performance.now() - st0 < 300;
      if (moved && (Math.abs(dy) > H * .18 || fast)) { go(dy < 0 ? cur + 1 : cur - 1); return; }
      if (moved) { place(); return; }
      if (e.type === 'pointercancel') return;
      const r = frame.getBoundingClientRect();
      const fx = (sx - r.left) / r.width;
      if (fx < 1 / 3) go(cur - 1); else if (fx > 2 / 3) go(cur + 1); else togglePause();
    };
    frame.addEventListener('pointerup', end);
    frame.addEventListener('pointercancel', end);
    let wheelLock = 0;
    ov.addEventListener('wheel', e => {
      e.preventDefault();
      if (performance.now() < wheelLock || Math.abs(e.deltaY) < 20) return;
      wheelLock = performance.now() + 600;
      go(e.deltaY > 0 ? cur + 1 : cur - 1);
    }, { passive: false });

    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(cur + 1); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(cur - 1); }
      else if (e.key === 'm' || e.key === 'M') { soundBtn.click(); }
      else if (e.key === ' ' && !e.target.closest('button,a')) { e.preventDefault(); togglePause(); }
      else if (e.key === 'Tab') { /* focus trap */
        const f = [...ov.querySelectorAll('button:not([disabled]),a[href]')].filter(x => x.offsetParent !== null && !x.closest('[aria-hidden=true]'));
        if (!f.length) return;
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    const onResize = () => place();
    window.addEventListener('resize', onResize);

    function close() {
      slides.forEach(s => { s.video.pause(); s.video.removeAttribute('src'); s.video.load(); });
      slides.clear();
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      ov.remove();
      document.documentElement.style.overflow = prevOverflow;
      viewer = null;
      emit('stories:close', { index: cur });
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
      else { const th = root.querySelector(`.s-th[data-i="${cur}"],.r-card[data-i="${cur}"]`); if (th) th.focus({ preventScroll: true }); }
      if (reels) setTimeout(pickLive, 200);
    }

    if (reduced()) frame.classList.add('rm');
    sync();
    closeBtn.focus({ preventScroll: true });
    return { close, go: i => go(i), get index() { return cur; }, el: ov };
  }

  if (Array.isArray(opts.items)) build(opts.items);
  else itemsFromData(base, lang).then(list => { if (!destroyed) build(list); }).catch(() => { if (!destroyed) build([]); });

  return {
    destroy() { destroyed = true; if (viewer) viewer.close(); if (io) io.disconnect(); setLive(null); cleanups.forEach(f => f()); root.remove(); },
    open: i => open(i),
    get items() { return items; }
  };
}
