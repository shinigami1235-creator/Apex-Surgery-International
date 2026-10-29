/* Branch tour: the 3D walk-through video of a branch. It stops in each room, where gold dots open a short note
   about what is there, and the room strip jumps to any room.
   mount(container, {lang, base, branch, links?, onEvent?, full?, onClose?}) -> {destroy(), el}
     branch: a branch from data/<lang>/shared.js with
       tourVideo, tourPoster   paths under assets/ ("features/...") or the media library ("~/...")
       tourStops [{name, from, to, img}]   seconds in the video: a room picked from the strip plays from "from"
                                          and stops at "to"; "Next" plays on from the current stop to the next "to"
       tourNotes [{stop, x, y, h, p}]      stop is 1 for the first room; x and y are percent of the frame
   open(opts) shows the same player full screen over the page, with a close button and the back button closing it. */

const SITE = 'https://www.apexsurgeryhospital.com/';
const FADE = 0.875;   // the cross-fade between rooms in the video, 21 frames at 24 fps

const T = {
  title: { en: '{b} branch tour', th: 'ทัวร์สาขา{b}' },
  model: { en: '3D model built from photos of the branch', th: 'ภาพจำลอง 3 มิติ สร้างจากภาพถ่ายของสาขา' },
  start: { en: 'Start the tour', th: 'เริ่มชม' },
  length: { en: '{n} rooms · {s} seconds', th: '{n} ห้อง · {s} วินาที' },
  next: { en: 'Next: {r}', th: 'ถัดไป: {r}' },
  again: { en: 'Watch again', th: 'ดูอีกครั้ง' },
  book: { en: 'Book a consultation', th: 'นัดปรึกษา' },
  play: { en: 'Play', th: 'เล่น' },
  pause: { en: 'Pause', th: 'หยุด' },
  close: { en: 'Close', th: 'ปิด' },
  rooms: { en: 'Rooms', th: 'ห้อง' },
  room: { en: 'Room {n} of {m}: {r}', th: 'ห้องที่ {n} จาก {m}: {r}' },
  hint: { en: 'Tap a gold dot for details', th: 'แตะจุดสีทองเพื่อดูรายละเอียด' },
  closeNote: { en: 'Close note', th: 'ปิดข้อความ' },
  loading: { en: 'Loading the tour', th: 'กำลังโหลดทัวร์' },
  failed: { en: 'The tour video could not be loaded.', th: 'โหลดวิดีโอทัวร์ไม่สำเร็จ' },
  retry: { en: 'Try again', th: 'ลองอีกครั้ง' },
  progress: { en: 'Tour progress', th: 'ความคืบหน้าของทัวร์' }
};

const ICON = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  again: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14v14H5zM5 10h14M9 3v4M15 3v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

const CSS = `
.apxt{--t-night:var(--night,#1F0A30);--t-night2:var(--night-2,#2A0F40);--t-on:var(--on-night,#F6EEFB);--t-on2:var(--on-night-2,#CDB9DD);
  --t-gold:#E8C27C;--t-gold2:#C99A4B;--t-ease:var(--ease-out,cubic-bezier(.23,1,.32,1));
  position:relative;display:flex;flex-direction:column;gap:14px;color:var(--t-on);background:var(--t-night);border-radius:24px;padding:16px;
  font-family:var(--font,"LINE Seed","Sarabun","Noto Sans Thai",system-ui,sans-serif);-webkit-tap-highlight-color:transparent}
.apxt *{box-sizing:border-box}
.apxt button{font:inherit;color:inherit}
.apxt :is(button,a):focus-visible{outline:3px solid var(--t-gold);outline-offset:2px}
.apxt .t-top{display:flex;align-items:center;gap:14px;min-height:44px}
.apxt .t-ttl{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
.apxt .t-ttl small{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--t-gold)}
.apxt .t-ttl b{font-size:clamp(18px,2.2vw,22px);font-weight:700;line-height:1.2}
.apxt .t-ttl span{font-size:12.5px;color:var(--t-on2)}
.apxt .t-x{flex:none;width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);display:grid;place-items:center;cursor:pointer;transition:background .2s}
.apxt .t-x:hover{background:rgba(255,255,255,.14)}
.apxt .t-x svg{width:20px;height:20px}
.apxt .t-main{display:flex;justify-content:center;min-height:0}
.apxt .t-stage{position:relative;width:100%;aspect-ratio:16/9;border-radius:18px;overflow:hidden;background:#000;isolation:isolate;container-type:inline-size}
.apxt .t-stage video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.apxt .t-label{position:absolute;left:0;right:0;bottom:0;padding:48px 4.5% 4.5%;background:linear-gradient(180deg,transparent,rgba(17,5,28,.55));pointer-events:none;
  opacity:0;transform:translateY(8px);transition:opacity .5s var(--t-ease),transform .6s var(--t-ease)}
.apxt .t-label.on{opacity:1;transform:none}
.apxt .t-label small{display:block;font-size:clamp(9px,1.4cqi,13px);letter-spacing:.16em;text-transform:uppercase;color:var(--t-gold);margin-bottom:4px}
.apxt .t-label b{display:block;font-size:clamp(17px,4.2cqi,40px);font-weight:400;line-height:1.15;color:#fff;text-shadow:0 2px 18px rgba(0,0,0,.25)}
.apxt .t-dots{position:absolute;inset:0;pointer-events:none}
.apxt .t-dot{position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;border:0;padding:0;background:none;cursor:pointer;pointer-events:auto;display:grid;place-items:center;
  opacity:0;transform:scale(.4);transition:opacity .35s var(--t-ease),transform .45s var(--t-ease)}
.apxt .t-dots.on .t-dot{opacity:1;transform:none}
.apxt .t-dot i{position:relative;width:16px;height:16px;border-radius:50%;background:var(--t-gold);box-shadow:0 0 0 3px rgba(255,255,255,.9),0 4px 14px rgba(0,0,0,.35)}
.apxt .t-dot i::after{content:"";position:absolute;inset:-9px;border-radius:50%;border:2px solid var(--t-gold);animation:apxt-ring 2.2s var(--t-ease) infinite}
.apxt .t-dot[aria-expanded="true"] i{background:#fff;box-shadow:0 0 0 3px var(--t-gold),0 4px 14px rgba(0,0,0,.35)}
@keyframes apxt-ring{0%{transform:scale(.6);opacity:.9}100%{transform:scale(1.5);opacity:0}}
.apxt .t-card{position:absolute;z-index:3;width:min(280px,46cqi);padding:14px 16px 15px;border-radius:16px;background:rgba(255,255,255,.96);color:var(--ink,#2A1F33);
  box-shadow:0 18px 48px -16px rgba(17,5,28,.6);transform-origin:var(--ox,left) top;animation:apxt-pop .32s var(--t-ease)}
.apxt .t-card b{display:block;font-size:15px;font-weight:700;margin:0 26px 4px 0}
.apxt .t-card p{margin:0;font-size:14px;line-height:1.5;color:var(--ink-2,#5A4A66)}
.apxt .t-card button{position:absolute;top:6px;right:6px;width:32px;height:32px;border:0;border-radius:50%;background:none;color:var(--ink-2,#5A4A66);display:grid;place-items:center;cursor:pointer}
.apxt .t-card button svg{width:16px;height:16px}
@keyframes apxt-pop{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:none}}
.apxt .t-stage.narrow .t-card{left:10px!important;right:10px!important;top:auto!important;bottom:10px;width:auto;transform-origin:center bottom}
.apxt .t-hint{position:absolute;top:12px;left:50%;transform:translateX(-50%);z-index:2;padding:7px 13px;border-radius:999px;background:rgba(17,5,28,.6);
  backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font-size:12.5px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .4s}
.apxt .t-hint.on{opacity:1}
.apxt .t-start{position:absolute;inset:0;z-index:4;border:0;padding:0;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;
  background:var(--t-night);color:#fff;transition:opacity .45s var(--t-ease)}
.apxt .t-start img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2}
.apxt .t-start::before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(ellipse 46% 42% at 50% 54%,rgba(17,5,28,.5),rgba(17,5,28,0)),linear-gradient(180deg,rgba(17,5,28,0) 40%,rgba(17,5,28,.45))}
.apxt .t-start .t-big{width:clamp(58px,11cqi,84px);height:clamp(58px,11cqi,84px);border-radius:50%;display:grid;place-items:center;background:var(--t-gold);color:var(--t-night);
  box-shadow:0 0 0 8px rgba(232,194,124,.28),0 14px 40px -10px rgba(0,0,0,.5);transition:transform .3s var(--t-ease)}
.apxt .t-start:hover .t-big{transform:scale(1.06)}
.apxt .t-start .t-big svg{width:44%;height:44%;margin-left:6%}
.apxt .t-start b{font-size:clamp(17px,3cqi,24px);font-weight:700;text-shadow:0 2px 14px rgba(0,0,0,.35)}
.apxt .t-start small{font-size:13px;opacity:.9;text-shadow:0 1px 8px rgba(0,0,0,.4)}
.apxt .t-start.gone{opacity:0;pointer-events:none}
.apxt .t-wait{position:absolute;top:50%;left:50%;width:40px;height:40px;margin:-20px;border-radius:50%;border:3px solid rgba(255,255,255,.25);border-top-color:#fff;
  animation:apxt-spin .9s linear infinite;z-index:2;opacity:0;transition:opacity .2s;pointer-events:none}
.apxt .t-wait.on{opacity:1}
@keyframes apxt-spin{to{transform:rotate(1turn)}}
.apxt .t-err{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:rgba(17,5,28,.85);text-align:center;padding:20px}
.apxt .t-err[hidden]{display:none}
.apxt .t-ctl{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.apxt .t-pp{flex:none;width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);display:grid;place-items:center;cursor:pointer}
.apxt .t-pp svg{width:20px;height:20px}
.apxt .t-bar{position:relative;flex:1;min-width:120px;height:4px;border-radius:4px;background:rgba(255,255,255,.18)}
.apxt .t-bar > i{position:absolute;left:0;top:0;bottom:0;border-radius:4px;background:var(--t-gold);width:0}
.apxt .t-bar > span{position:absolute;top:50%;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;background:var(--t-night);box-shadow:0 0 0 2px rgba(255,255,255,.45)}
.apxt .t-bar > span.past{box-shadow:0 0 0 2px var(--t-gold);background:var(--t-gold)}
.apxt .t-pos{flex:none;font-size:13px;color:var(--t-on2);font-variant-numeric:tabular-nums;min-width:38px;text-align:right}
.apxt .t-acts{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;flex:none}
.apxt .t-btn{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border-radius:999px;border:0;cursor:pointer;font-weight:700;font-size:14.5px;text-decoration:none;
  background:var(--t-gold);color:var(--t-night);transition:transform .2s var(--t-ease),background .2s}
.apxt .t-btn:hover{background:#F1D29A}
.apxt .t-btn:active{transform:scale(.97)}
.apxt .t-btn svg{width:18px;height:18px;flex:none}
.apxt .t-btn.ghost{background:rgba(255,255,255,.08);color:var(--t-on);box-shadow:inset 0 0 0 1px rgba(255,255,255,.22)}
.apxt .t-btn.ghost:hover{background:rgba(255,255,255,.15)}
.apxt .t-btn[hidden]{display:none}
.apxt .t-btn span{max-width:46vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.apxt .t-rooms{list-style:none;margin:0;padding:2px 2px 6px;display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x proximity;scrollbar-width:thin;overscroll-behavior-x:contain}
.apxt .t-rooms li{flex:none;scroll-snap-align:start}
.apxt .t-room{display:flex;flex-direction:column;gap:6px;width:clamp(116px,15vw,150px);border:0;padding:0;background:none;cursor:pointer;text-align:left}
.apxt .t-room .t-th{position:relative;display:block;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:var(--t-night2);box-shadow:0 0 0 2px transparent;transition:box-shadow .25s}
.apxt .t-room img{width:100%;height:100%;object-fit:cover;display:block;opacity:.72;transition:opacity .25s}
.apxt .t-room em{position:absolute;left:6px;top:6px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:rgba(17,5,28,.65);font-style:normal;font-size:11px;line-height:20px;text-align:center}
.apxt .t-room > span:last-child{font-size:12.5px;line-height:1.3;color:var(--t-on2)}
.apxt .t-room:hover img{opacity:1}
.apxt .t-room[aria-current="true"] .t-th{box-shadow:0 0 0 2px var(--t-gold)}
.apxt .t-room[aria-current="true"] img{opacity:1}
.apxt .t-room[aria-current="true"] > span:last-child{color:#fff}
.apxt .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
/* full screen */
.apxt-ov{position:fixed;inset:0;z-index:1000;background:var(--night,#1F0A30);overflow-y:auto;overscroll-behavior:contain;animation:apxt-in .35s var(--ease-out,cubic-bezier(.23,1,.32,1))}
@keyframes apxt-in{from{opacity:0}to{opacity:1}}
.apxt.full{min-height:100%;border-radius:0;padding:max(12px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(14px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));
  max-width:1400px;margin:0 auto;gap:12px}
.apxt.full .t-main{flex:1;align-items:center}
.apxt.full .t-stage{width:min(100%,calc((100dvh - 280px) * 16 / 9));min-width:min(100%,320px)}
.apxt.full .t-ctl,.apxt.full .t-rooms{width:min(100%,max(calc((100dvh - 280px) * 16 / 9),320px));margin-inline:auto}
@media (max-width:640px){
  .apxt{padding:12px;gap:12px;border-radius:18px}
  .apxt .t-stage{border-radius:12px}
  .apxt .t-acts{flex:1 1 100%;justify-content:stretch}
  .apxt .t-acts .t-btn{flex:1;justify-content:center}
  .apxt .t-ttl span{display:none}
  .apxt .t-btn span{max-width:none}
}
@media (max-width:640px) and (orientation:portrait){
  .apxt.full .t-main{flex:none}
  .apxt.full :is(.t-stage,.t-ctl,.t-rooms){width:100%;min-width:0}
  .apxt.full .t-rooms{display:grid;grid-template-columns:1fr 1fr;gap:14px 12px;overflow:visible;padding-bottom:8px}
  .apxt.full .t-room{width:auto}
}
@media (orientation:landscape) and (max-height:520px){
  .apxt.full{gap:8px}
  .apxt.full .t-ttl span,.apxt.full .t-rooms{display:none}
  .apxt.full .t-stage{width:min(100%,calc((100dvh - 130px) * 16 / 9))}
  .apxt.full .t-ctl{width:min(100%,calc((100dvh - 130px) * 16 / 9))}
}
@media (prefers-reduced-motion:reduce){
  .apxt *,.apxt-ov{animation:none!important;transition:none!important}
}
`;

let cssOn = false;
const css = () => { if (cssOn) return; cssOn = true; const s = document.createElement('style'); s.id = 'apxt-css'; s.textContent = CSS; document.head.append(s); };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] != null ? o[k] : '');

export function mount(container, opts = {}) {
  css();
  const lang = opts.lang === 'th' ? 'th' : 'en';
  const L = (k, o) => fill(T[k][lang], o || {});
  const B = opts.branch || {};
  const base = opts.base || '';
  const abs = u => !u ? '' : u.startsWith('~/') ? SITE + u.slice(2) : /^(img|video|features)\//.test(u) ? base + u : u;
  const S = (B.tourStops || []).filter(s => isFinite(+s.from) && isFinite(+s.to)).map(s => ({...s, from:+s.from, to:+s.to})).sort((a, b) => a.to - b.to);
  const N = (B.tourNotes || []).filter(n => +n.stop >= 1 && +n.stop <= S.length);
  const ev = (n, d) => { try { opts.onEvent && opts.onEvent(n, d); } catch (e) {} };
  const short = B.short || B.name || '';
  const kicker = 'Apex Surgery Hospital · ' + short;
  const consult = opts.links && opts.links.consult;
  const last = S.length - 1;

  const root = document.createElement('div');
  root.className = 'apxt' + (opts.full ? ' full' : '');
  root.lang = lang;
  root.innerHTML = `
    <div class="t-top">
      <div class="t-ttl"><small>${esc(kicker)}</small><b>${esc(L('title', {b:short}))}</b><span>${esc(L('model'))}</span></div>
      ${opts.full ? `<button type="button" class="t-x" aria-label="${esc(L('close'))}">${ICON.close}</button>` : ''}
    </div>
    <div class="t-main"><div class="t-stage">
      <video playsinline muted preload="${opts.full ? 'auto' : 'metadata'}" disablepictureinpicture ${B.tourPoster ? `poster="${esc(abs(B.tourPoster))}"` : ''}></video>
      <div class="t-label" aria-hidden="true"><small>${esc(kicker)}</small><b></b></div>
      <div class="t-dots"></div>
      <div class="t-hint" aria-hidden="true">${esc(L('hint'))}</div>
      <div class="t-wait" role="status"><span class="sr">${esc(L('loading'))}</span></div>
      <div class="t-err" hidden><p>${esc(L('failed'))}</p><button type="button" class="t-btn">${esc(L('retry'))}</button></div>
      <button type="button" class="t-start">${B.tourPoster ? `<img src="${esc(abs(B.tourPoster))}" alt="">` : ''}<span class="t-big">${ICON.play}</span><b>${esc(L('start'))}</b><small class="t-len">${esc(L('length', {n:S.length, s:''}))}</small></button>
      <p class="sr" aria-live="polite"></p>
    </div></div>
    <div class="t-ctl">
      <button type="button" class="t-pp" aria-label="${esc(L('play'))}">${ICON.play}</button>
      <div class="t-bar" role="progressbar" aria-label="${esc(L('progress'))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>
      <span class="t-pos" aria-hidden="true"></span>
      <div class="t-acts">
        <a class="t-btn ghost t-book" hidden>${ICON.cal}<span>${esc(L('book'))}</span></a>
        <button type="button" class="t-btn t-next">${ICON.next}<span></span></button>
      </div>
    </div>
    <ol class="t-rooms" aria-label="${esc(L('rooms'))}">${S.map((s, i) => `<li><button type="button" class="t-room" data-k="${i}" aria-label="${esc(L('room', {n:i + 1, m:S.length, r:s.name}))}">
      <span class="t-th">${s.img ? `<img src="${esc(abs(s.img))}" alt="" loading="lazy" decoding="async">` : ''}<em>${i + 1}</em></span><span>${esc(s.name)}</span></button></li>`).join('')}</ol>`;
  container.append(root);

  const $ = s => root.querySelector(s);
  const video = $('video'), stage = $('.t-stage'), label = $('.t-label'), labelB = $('.t-label b'), dots = $('.t-dots'), hint = $('.t-hint');
  const wait = $('.t-wait'), err = $('.t-err'), startB = $('.t-start'), pp = $('.t-pp'), bar = $('.t-bar'), barI = $('.t-bar > i'), pos = $('.t-pos');
  const nextB = $('.t-next'), nextT = $('.t-next span'), book = $('.t-book'), live = $('.t-main .sr[aria-live]');
  const rooms = [...root.querySelectorAll('.t-room')];
  if (consult) book.href = consult;

  let target = -1, at = -1, shown = -2, raf = 0, card = null, hinted = false, begun = false, dead = false;
  const dur = () => video.duration || (S.length ? S[last].to : 0);

  // progress ticks at each stop, placed once the length is known
  const ticks = () => {
    bar.querySelectorAll('span').forEach(x => x.remove());
    const d = dur(); if (!d) return;
    S.forEach(s => { const t = document.createElement('span'); t.style.left = (s.to / d * 100).toFixed(2) + '%'; bar.append(t); });
    $('.t-len').textContent = L('length', {n:S.length, s:Math.round(d)});
  };

  const roomAt = t => { let k = -1; S.forEach((s, i) => { if (t >= s.from - FADE) k = i; }); return k; };
  const setLabel = k => {
    if (k === shown) return;
    shown = k;
    label.classList.remove('on');
    if (k < 0) return;
    rooms.forEach((r, i) => r.setAttribute('aria-current', i === k));
    pos.textContent = (k + 1) + ' / ' + S.length;
    setTimeout(() => { if (shown === k && !dead) { labelB.textContent = S[k].name; label.classList.add('on'); } }, 120);
    const r = rooms[k]; if (r && r.scrollIntoView && begun) { const ol = r.closest('ol'); const x = r.parentNode.offsetLeft - (ol.clientWidth - r.offsetWidth) / 2; ol.scrollTo({left:x, behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'}); }
  };
  const paint = () => {
    const t = video.currentTime, d = dur();
    const pc = d ? Math.min(100, t / d * 100) : 0;
    barI.style.width = pc + '%';
    bar.setAttribute('aria-valuenow', Math.round(pc));
    bar.querySelectorAll('span').forEach((x, i) => x.classList.toggle('past', S[i] && t >= S[i].to - 0.05));
    setLabel(roomAt(t));
  };
  const setPP = playing => { pp.innerHTML = playing ? ICON.pause : ICON.play; pp.setAttribute('aria-label', L(playing ? 'pause' : 'play')); };
  const setNext = () => {
    const end = at === last;
    nextB.querySelector('svg').outerHTML = end ? ICON.again : ICON.next;
    const nk = at >= 0 ? at + 1 : Math.max(0, target);
    nextT.textContent = end ? L('again') : L('next', {r:(S[nk] || S[0] || {}).name || ''});
    book.hidden = !(end && consult);
  };

  /* dots and their note cards */
  const closeCard = () => { if (!card) return; card.el.remove(); card.dot.setAttribute('aria-expanded', 'false'); card = null; };
  const openCard = (dot, n) => {
    const same = card && card.dot === dot;
    closeCard(); if (same) return;
    const el = document.createElement('div');
    el.className = 't-card'; el.setAttribute('role', 'note');
    el.innerHTML = `<b>${esc(n.h)}</b><p>${esc(n.p)}</p><button type="button" aria-label="${esc(L('closeNote'))}">${ICON.close}</button>`;
    const x = +n.x, y = +n.y, right = x > 55;
    if (right) { el.style.right = `calc(${100 - x}% + 26px)`; el.style.setProperty('--ox', 'right'); } else el.style.left = `calc(${x}% + 26px)`;
    el.style.top = `clamp(10px, calc(${y}% - 30px), calc(100% - 150px))`;
    el.querySelector('button').addEventListener('click', () => { const d = card && card.dot; closeCard(); if (d) d.focus(); });
    stage.append(el);
    dot.setAttribute('aria-expanded', 'true');
    card = {el, dot};
    ev('tour:note', {index:at});
  };
  const showDots = k => {
    dots.innerHTML = '';
    N.filter(n => +n.stop === k + 1).forEach(n => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 't-dot'; b.style.left = n.x + '%'; b.style.top = n.y + '%';
      b.setAttribute('aria-label', n.h); b.setAttribute('aria-expanded', 'false');
      b.innerHTML = '<i></i>';
      b.addEventListener('click', e => { e.stopPropagation(); openCard(b, n); });
      dots.append(b);
    });
    requestAnimationFrame(() => dots.classList.add('on'));
    if (!hinted && dots.children.length) { hinted = true; hint.classList.add('on'); setTimeout(() => hint.classList.remove('on'), 3200); }
  };
  const hideDots = () => { closeCard(); dots.classList.remove('on'); dots.innerHTML = ''; hint.classList.remove('on'); };

  /* playing between stops */
  const loop = () => {
    raf = 0;
    if (dead) return;
    paint();
    if (target >= 0 && video.currentTime >= S[target].to - 0.03) return arrive(target);
    if (!video.paused) raf = requestAnimationFrame(loop);
  };
  const arrive = k => {
    video.pause();
    try { video.currentTime = S[k].to; } catch (e) {}
    at = k; target = -1;
    setPP(false); setNext(); paint(); setLabel(k);
    showDots(k);
    live.textContent = L('room', {n:k + 1, m:S.length, r:S[k].name});
    ev(k === last ? 'tour:end' : 'tour:stop', {index:k});
  };
  const run = () => {
    hideDots(); at = -1; setNext();
    const p = video.play();
    if (p && p.catch) p.catch(() => setPP(false));
  };
  const begin = () => {
    if (!begun) { begun = true; startB.classList.add('gone'); startB.tabIndex = -1; ev('tour:start', {}); }
  };
  const go = k => {   // play one room from its start
    if (!S[k]) return;
    begin();
    target = k;
    try { video.currentTime = S[k].from; } catch (e) {}
    run();
  };
  const next = () => {
    begin();
    if (at === last) { target = 0; try { video.currentTime = 0; } catch (e) {} return run(); }
    if (at >= 0) target = at + 1;
    else { const t = video.currentTime; target = S.findIndex(s => s.to > t + 0.03); if (target < 0) target = last; }
    run();
  };
  const toggle = () => {
    if (!begun || video.paused) return next();
    video.pause(); setPP(false);
  };

  video.addEventListener('play', () => { setPP(true); if (!raf) raf = requestAnimationFrame(loop); });
  video.addEventListener('pause', () => setPP(false));
  video.addEventListener('seeked', paint);
  video.addEventListener('loadedmetadata', () => { ticks(); paint(); });
  video.addEventListener('ended', () => { if (S.length) arrive(last); });
  video.addEventListener('waiting', () => wait.classList.add('on'));
  ['playing', 'canplay', 'seeked', 'pause'].forEach(n => video.addEventListener(n, () => wait.classList.remove('on')));
  video.addEventListener('error', () => { err.hidden = false; wait.classList.remove('on'); });
  err.querySelector('button').addEventListener('click', () => { err.hidden = true; video.load(); });
  video.src = abs(B.tourVideo);

  startB.addEventListener('click', () => { begin(); target = 0; run(); });
  pp.addEventListener('click', toggle);
  nextB.addEventListener('click', next);
  book.addEventListener('click', () => ev('tour:book', {}));
  rooms.forEach(r => r.addEventListener('click', () => go(+r.dataset.k)));
  stage.addEventListener('click', e => { if (card && !card.el.contains(e.target)) closeCard(); });
  const onKey = e => {
    if (e.target.closest && e.target.closest('input,textarea,select')) return;
    if (e.key === 'Escape' && card) { e.preventDefault(); e.stopPropagation(); const d = card.dot; closeCard(); d.focus(); return; }
    if (e.key === ' ' || e.key === 'k') { if (e.target.closest('button,a')) return; e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); const k = at >= 0 ? at : roomAt(video.currentTime); go(Math.max(0, k - (at >= 0 ? 1 : 0))); }
  };
  root.addEventListener('keydown', onKey);
  const ro = 'ResizeObserver' in window ? new ResizeObserver(() => stage.classList.toggle('narrow', stage.clientWidth < 560)) : null;
  if (ro) ro.observe(stage); else stage.classList.toggle('narrow', innerWidth < 600);

  target = 0; setNext(); setPP(false);
  if (!S.length || !B.tourVideo) { err.hidden = false; startB.hidden = true; }

  return {
    el: root,
    stop() { video.pause(); },
    destroy() { dead = true; if (raf) cancelAnimationFrame(raf); if (ro) ro.disconnect(); video.pause(); video.removeAttribute('src'); video.load(); root.remove(); }
  };
}

/* full screen over the page; the phone's back button closes it */
export function open(opts = {}) {
  css();
  const prevFocus = opts.opener || document.activeElement;
  const ov = document.createElement('div');
  ov.className = 'apxt-ov';
  ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', fill(T.title[opts.lang === 'th' ? 'th' : 'en'], {b:(opts.branch && (opts.branch.short || opts.branch.name)) || ''}));
  document.body.append(ov);
  const prevOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';
  const p = mount(ov, Object.assign({}, opts, {full:true}));
  let closed = false, pushed = false;
  const close = fromHistory => {
    if (closed) return; closed = true;
    removeEventListener('popstate', onPop);
    document.removeEventListener('keydown', onKey, true);
    p.destroy(); ov.remove();
    document.documentElement.style.overflow = prevOverflow;
    if (pushed && !fromHistory && history.state && history.state.apxTour) history.back();
    if (prevFocus && prevFocus.isConnected) prevFocus.focus({preventScroll:true});
    try { opts.onClose && opts.onClose(); } catch (e) {}
  };
  const onPop = () => close(true);
  const onKey = e => {
    if (e.key === 'Escape') { if (ov.querySelector('.t-card')) return; e.preventDefault(); close(); return; }   // an open note closes first
    if (e.key !== 'Tab') return;
    const f = [...ov.querySelectorAll('button:not([disabled]):not([tabindex="-1"]),a[href]')].filter(x => x.offsetParent !== null && !x.hidden);
    if (!f.length) return;
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  };
  try { history.pushState({apxTour:1}, ''); pushed = true; addEventListener('popstate', onPop); } catch (e) {}
  document.addEventListener('keydown', onKey, true);
  ov.querySelector('.t-x').addEventListener('click', () => close());
  const st = ov.querySelector('.t-start');
  (st && !st.hidden ? st : ov.querySelector('.t-x')).focus({preventScroll:true});
  return {close: () => close()};
}
