/* The results machine, from Apex Slim: pick a procedure, the pod shows the "before" half of a case, closes,
   scans, and opens on the "after"; then the camera moves to the terminal and the three screens show the case.
   mount(container, opts) -> {destroy()}
     opts.lang 'en' | 'th'
     opts.cases [{src, layout, cat, procName, facts:[[label, value]], story:{title, url}?, ask:{line, wa}, links:[{x, url}]}]
       Only side-by-side composites (layout 'lr', before on the left) can go in the pod. Others are left out.
     opts.cats [{k, x, icon?}] procedure chips, in order; icon is Apex's line icon for that service
     opts.vary the "results vary" line; opts.onEvent(name, data)
   The film, its first and last frames and the frame map are in this folder. */

import { MAP } from './map.js';

const RULE_TH = 'ใช้เป็นตัวอย่าง ผลจากการเข้ารับการรักษาพยาบาลสำหรับผู้ป่วยเฉพาะราย';
const RULE_EN = 'Example only. Results from treatment of an individual patient.';
const SITE = 'https://www.apexsurgeryhospital.com/';
const abs = u => (u && u.startsWith('~/') ? SITE + u.slice(2) : u);
const HERE = new URL('./', import.meta.url);
const file = n => new URL(n, HERE).href;
/* where to cut the pod's 2:3 window from each half: faces sit high; the liposuction photos carry a title band on top */
const FOCUS = { lipo: '100%' };

const T = {
  pick: { en: 'Pick a procedure', th: 'เลือกหัตถการ' },
  idle: { en: 'Pick a case', th: 'เลือกเคส' },
  scan: { en: 'Processing {n}%', th: 'กำลังประมวลผล {n}%' },
  done: { en: 'Done', th: 'เสร็จแล้ว' },
  send: { en: 'Sending', th: 'กำลังส่งผล' },
  again: { en: 'Run again', th: 'ดูอีกครั้ง' },
  next: { en: 'Next case', th: 'เคสถัดไป' },
  kick: { en: 'Apex Surgery Hospital', th: 'Apex Surgery Hospital' },
  proc: { en: 'Procedure', th: 'หัตถการ' },
  cases: { en: 'Cases', th: 'เคส' },
  nCases: { en: '{n} cases', th: '{n} เคส' },
  caseN: { en: 'Case {n}', th: 'เคส {n}' },
  before: { en: 'Before', th: 'ก่อน' },
  after: { en: 'After', th: 'หลัง' },
  thisCase: { en: 'This case', th: 'เคสนี้' },
  plain: { en: 'Photos from Apex Surgery Hospital. The dates are on the photos.', th: 'ภาพจาก Apex Surgery Hospital วันที่อยู่บนภาพ' },
  story: { en: 'Patient review', th: 'รีวิวจากผู้เข้ารับบริการ' },
  ask: { en: 'Ask about this result', th: 'สอบถามเกี่ยวกับผลลัพธ์นี้' },
  big: { en: 'See it large', th: 'ดูภาพใหญ่' },
  close: { en: 'Close', th: 'ปิด' },
  stage: { en: 'The results pod', th: 'เครื่องแสดงผลลัพธ์' }
};

const ICON = {
  line: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3C6.5 3 2 6.6 2 11c0 4 3.6 7.3 8.4 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6A7.5 7.5 0 0 0 22 11c0-4.4-4.5-8-10-8z"/></svg>',
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.2-.2-.4-.3z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
};

const CSS = `
.apxr{--r-plum:var(--plum,#6A388C);--r-night:var(--night,#1F0A30);--r-l1:var(--lilac-100,#F1EAF7);--r-l3:var(--lilac-300,#C9B3DD);
  --r-ink:var(--ink,#2A1F33);--r-ink2:var(--ink-2,#5A4A66);--r-ease:cubic-bezier(.23,1,.32,1);
  font-family:"LINE Seed","Sarabun","Noto Sans Thai",system-ui,sans-serif;font-size:16px;line-height:1.5;color:var(--r-ink)}
.apxr *,.apxr *::before,.apxr *::after,.apxr-zoom *{box-sizing:border-box}
.apxr h3,.apxr p,.apxr dl,.apxr dd{margin:0}
.rx-picker{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0 0 16px}
.rx-picker .lbl{font-size:15px;color:var(--r-ink2);margin-right:4px}
.rx-chip{display:inline-flex;align-items:center;gap:10px;min-height:48px;padding:4px 18px 4px 4px;border-radius:999px;border:1.5px solid var(--r-l3);background:#fff;color:var(--r-night);font-weight:700;font-size:15px;line-height:1.2;font-family:inherit;cursor:pointer;transition:border-color .2s,background-color .2s}
.rx-chip .ic{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:var(--r-l1);border:1.5px solid var(--r-plum);overflow:hidden}
.rx-chip .ic img{width:30px;height:30px;object-fit:contain}
.rx-chip small{font-weight:400;color:var(--r-ink2);margin-left:2px}
.rx-chip:hover{border-color:var(--r-plum)}
.rx-chip[aria-pressed=true]{border-color:var(--r-plum);background:var(--r-l1)}
.rx-chip:disabled{opacity:.55;cursor:default}
.rx-frame{position:relative}
.rx-stage{position:relative;aspect-ratio:16/10;border-radius:16px;overflow:hidden;background:#E9E3EF;isolation:isolate}
.rx-layer{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.rx-run,.rx-term{opacity:0}
.rx-stage[data-step=run] .rx-run,.rx-stage[data-step=terminal] .rx-run,.rx-stage[data-step=terminal] .rx-term{opacity:1}
.rx-map{position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none}
.rx-photo{width:200px;height:300px;overflow:hidden;transition:opacity .35s var(--r-ease)}
.rx-photo i{position:absolute;inset:0;background-repeat:no-repeat;background-size:200% auto;opacity:0;transition:opacity .5s var(--r-ease),filter .5s var(--r-ease)}
.rx-photo.on i{opacity:1}
.rx-stage[data-step=run] .rx-photo i{transition:none}
.rx-crown{width:240px;height:48px;display:grid;place-items:center;color:#EBDDFB;font-weight:700;font-size:20px;line-height:1;font-family:inherit;letter-spacing:.02em;text-shadow:0 0 8px rgba(201,168,242,.8);transition:opacity .35s var(--r-ease);white-space:nowrap}
.rx-stage[data-step=terminal] .rx-photo,.rx-stage[data-step=terminal] .rx-crown,.rx-stage.rx-moving .rx-crown{opacity:0}
.rx-hud{position:absolute;right:14px;bottom:14px;display:flex;gap:8px;z-index:3}
.rx-btn{min-height:40px;padding:0 18px;border-radius:999px;border:1.5px solid #fff;background:rgba(31,10,48,.72);color:#fff;font-weight:700;font-size:14px;line-height:1;font-family:inherit;cursor:pointer;backdrop-filter:blur(6px)}
.rx-btn:hover{background:var(--r-plum)}
.rx-btn[hidden]{display:none}
.rx-panels{position:absolute;inset:0;pointer-events:none;z-index:2}
.rx-panels[hidden]{display:none}
.rx-panel{position:absolute;left:0;top:0;transform-origin:0 0;padding:22px 24px;color:#F6EEFB;background:linear-gradient(#1A0729,#2C0D40);opacity:0;transition:opacity .5s var(--r-ease);pointer-events:auto;overflow:hidden;display:flex;flex-direction:column}
.rx-panels.on .rx-panel{opacity:1}
.rx-pl,.rx-pr{width:366px;height:500px}.rx-pc{width:600px;height:510px}
.rx-panel h3{color:#F6EEFB;font-size:24px;line-height:1.2;margin:0 0 10px}
.rx-kick{font-size:14px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#C9B3DD;margin:0 0 10px!important}
.rx-tile{display:grid;grid-template-columns:64px 1fr;gap:12px;align-items:center;padding:8px 10px;border-radius:10px;background:#3A1A58;border:1.5px solid #B58CDD;margin-bottom:16px}
.rx-tile .ic{display:grid;place-items:center;height:64px;border-radius:6px;background:#F1EAF7}
.rx-tile .ic img{width:48px;height:48px;object-fit:contain}
.rx-tile span{font-weight:700;font-size:21px;line-height:1.2}
.rx-tile small{display:flex;align-items:center;gap:6px;margin-top:6px;font-weight:400;font-size:15px;color:#C4B0D6}
.rx-tile small::before{content:"";width:8px;height:8px;border-radius:50%;background:#8DF0C6}
.rx-cases{display:grid;gap:7px;flex:1;min-height:0;overflow-y:auto;padding-right:4px;scrollbar-width:thin;scrollbar-color:#78509E transparent}
.rx-case{display:grid;grid-template-columns:48px 1fr;gap:12px;align-items:center;padding:7px;border-radius:10px;background:#27103B;border:1.5px solid #4E2A70;color:#F6EEFB;font-weight:700;font-size:17px;line-height:1.2;font-family:inherit;text-align:left;cursor:pointer}
.rx-case i{width:48px;height:48px;border-radius:5px;background-repeat:no-repeat;background-size:200% auto}
.rx-case[aria-current=true]{background:#3A1A58;border-color:#B58CDD}
.rx-case:hover{border-color:#B58CDD}
.rx-ba{position:relative;flex:1;min-height:0;margin:0;cursor:zoom-in;border:0;padding:0;background:none;display:flex;flex-direction:column}
.rx-ba img{flex:1;min-height:0;width:100%;object-fit:contain;background:#120520;border-radius:6px;border:1.5px solid #78509E;display:block}
.rx-ba .cap{display:grid;grid-template-columns:1fr 1fr;margin-top:6px;font-size:16px;color:#F6EEFB;font-weight:700;text-align:left}
.rx-ba .cap b:last-child{text-align:right}
.rx-facts{margin-bottom:10px!important}
.rx-facts dt{font-size:14px;color:#C4B0D6}
.rx-facts dd{margin:0 0 8px;font-weight:700;font-size:18px;line-height:1.3}
.rx-plain{font-size:16px;color:#E3D6EE;margin-bottom:14px!important}
.rx-link{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:10px;background:#27103B;border:1.5px solid #4E2A70;color:#F6EEFB;text-decoration:none;font-weight:700;font-size:15px;line-height:1.3;margin-bottom:8px}
.rx-link small{display:block;font-weight:400;color:#C4B0D6;font-size:13px}
.rx-link svg{width:18px;height:18px;flex:none;margin-left:auto}
.rx-link:hover{border-color:#B58CDD;color:#fff}
.rx-ask{font-size:14px;color:#C4B0D6;margin:4px 0 6px!important}
.rx-ctas{display:flex;gap:8px;margin-bottom:12px}
.rx-cta{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;border-radius:999px;color:#fff;text-decoration:none;font-weight:700;font-size:15px}
.rx-cta svg{width:20px;height:20px}
.rx-cta.ln{background:#06C755}.rx-cta.wa{background:#1F8F4E}
.rx-cta:hover{filter:brightness(1.08);color:#fff}
.rx-rule{margin-top:auto!important;padding-top:8px;font-size:12px;line-height:1.4;color:#BCA8CF}
.rx-rule span{display:block}
@media (max-width:1023px){
  .rx-stage{border-radius:12px}
  .rx-panels{position:static;display:grid;gap:12px;margin-top:12px;pointer-events:auto}
  .rx-panel{position:static;transform:none!important;width:auto!important;height:auto!important;border-radius:12px;opacity:1}
  .rx-pc{order:-1}
  .rx-pc .rx-ba img{flex:none;aspect-ratio:1/1;max-height:70vh}
  .rx-cases{max-height:236px}
  .rx-hud{right:8px;bottom:8px}
  .rx-crown{font-size:22px}
}
@media (min-width:640px) and (max-width:1023px){.rx-panels{grid-template-columns:1fr 1fr}.rx-pc{grid-column:1/-1}}
.apxr-zoom{position:fixed;inset:0;background:rgba(15,4,24,.92);place-items:center;padding:20px;font-family:"LINE Seed","Sarabun","Noto Sans Thai",system-ui,sans-serif;width:auto;height:auto;max-width:none;max-height:none;margin:0;border:0;color:inherit;overflow:hidden;overscroll-behavior:contain}
.apxr-zoom[open]{display:grid}
.apxr-zoom::backdrop{background:transparent;overflow:hidden;overscroll-behavior:contain}
.apxr-zoom figure{margin:0;max-width:min(1000px,100%);width:100%}
.apxr-zoom img{width:100%;max-height:80vh;object-fit:contain;border-radius:8px;display:block}
.apxr-zoom figcaption{display:flex;justify-content:space-between;color:#F6EEFB;margin:8px 2px 0;font-size:17px;font-weight:700}
.apxr-zoom .rx-btn{position:absolute;top:16px;right:16px}
`;

function injectCss() {
  if (document.getElementById('apxr-css')) return;
  const s = document.createElement('style'); s.id = 'apxr-css'; s.textContent = CSS; document.head.append(s);
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* map a w x h element onto four points (tl, tr, br, bl in px) with a matrix3d */
const adj = m => [m[4]*m[8]-m[5]*m[7], m[2]*m[7]-m[1]*m[8], m[1]*m[5]-m[2]*m[4], m[5]*m[6]-m[3]*m[8], m[0]*m[8]-m[2]*m[6], m[2]*m[3]-m[0]*m[5], m[3]*m[7]-m[4]*m[6], m[1]*m[6]-m[0]*m[7], m[0]*m[4]-m[1]*m[3]];
const mm = (a, b) => { const c = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { let s = 0; for (let k = 0; k < 3; k++) s += a[3*i+k]*b[3*k+j]; c[3*i+j] = s; } return c; };
const mv = (m, v) => [m[0]*v[0]+m[1]*v[1]+m[2]*v[2], m[3]*v[0]+m[4]*v[1]+m[5]*v[2], m[6]*v[0]+m[7]*v[1]+m[8]*v[2]];
const basis = p => { const m = [p[0][0], p[1][0], p[2][0], p[0][1], p[1][1], p[2][1], 1, 1, 1]; const v = mv(adj(m), [p[3][0], p[3][1], 1]); return mm(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]); };
const place = (el, w, h, pts) => {
  const s = basis([[0, 0], [w, 0], [0, h], [w, h]]);
  const d = basis([pts[0], pts[1], pts[3], pts[2]]);
  const t = mm(d, adj(s)); for (let i = 0; i < 9; i++) t[i] /= t[8];
  el.style.transform = `matrix3d(${t[0]},${t[3]},0,${t[6]},${t[1]},${t[4]},0,${t[7]},0,0,1,0,${t[2]},${t[5]},0,${t[8]})`;
};
// map quads are bl, br, tr, tl in 0..1 of the stage
const quad = (q, W, H) => [q[3], q[2], q[1], q[0]].map(p => [p[0]*W, p[1]*H]);
const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
const wait = ms => new Promise(r => setTimeout(r, ms));
/* the case photo comes from Apex's own site; give it a few seconds so the pod never opens on an empty frame */
const loadImg = src => new Promise(res => { const i = new Image(); const to = setTimeout(res, 5000); i.onload = i.onerror = () => { clearTimeout(to); res(); }; i.src = src; });

export function mount(el, opts = {}) {
  injectCss();
  const lang = opts.lang === 'th' ? 'th' : 'en';
  const L = (k, v = {}) => T[k][lang].replace(/\{(\w+)\}/g, (_, n) => v[n] ?? '');
  const emit = (n, d) => { try { opts.onEvent && opts.onEvent(n, d); } catch (e) { /* analytics only */ } };
  const cases = (opts.cases || []).filter(c => c && c.src && c.layout === 'lr').map(c => Object.assign({}, c, { url: abs(c.src) }));
  const cats = (opts.cats || []).map(c => Object.assign({}, c, { list: cases.filter(x => x.cat === c.k) })).filter(c => c.list.length);
  if (!cats.length) { el.innerHTML = ''; return { destroy() {} }; }
  const half = (c, side) => `background-image:url('${String(c.url).replace(/'/g, '%27')}');background-position:${side === 'a' ? '100%' : '0%'} ${FOCUS[c.cat] || '22%'}`;

  el.innerHTML = `<div class="apxr">
    <div class="rx-picker" role="group" aria-label="${esc(L('pick'))}"><span class="lbl">${esc(L('pick'))}</span>${cats.map(c => `<button class="rx-chip" type="button" data-k="${esc(c.k)}" aria-pressed="false">${c.icon ? `<span class="ic"><img src="${esc(c.icon)}" alt="" loading="lazy" decoding="async"></span>` : '<span class="ic"></span>'}${esc(c.x)}<small>${c.list.length}</small></button>`).join('')}</div>
    <div class="rx-frame">
      <div class="rx-stage" data-step="idle">
        <img class="rx-layer rx-start" src="${file('run-start.webp')}" alt="${esc(L('stage'))}" width="1600" height="1000" loading="lazy" decoding="async">
        <video class="rx-layer rx-run" muted playsinline preload="none" aria-hidden="true"><source src="${file('run.webm')}" type="video/webm"><source src="${file('run.mp4')}" type="video/mp4"></video>
        <div class="rx-map rx-photo" aria-hidden="true"><i></i></div>
        <div class="rx-map rx-crown" aria-hidden="true"><span>${esc(L('idle'))}</span></div>
        <img class="rx-layer rx-term" src="${file('terminal-end.webp')}" alt="" width="1600" height="1000" loading="lazy" decoding="async">
        <div class="rx-hud"><button class="rx-btn" type="button" data-act="again" hidden>${esc(L('again'))}</button><button class="rx-btn" type="button" data-act="next" hidden>${esc(L('next'))}</button></div>
      </div>
      <div class="rx-panels" hidden aria-live="polite">
        <div class="rx-panel rx-pl" data-w="366" data-h="500">
          <p class="rx-kick">${esc(L('kick'))}</p>
          <h3>${esc(L('proc'))}</h3>
          <div class="rx-tile"></div>
          <h3>${esc(L('cases'))}</h3>
          <div class="rx-cases"></div>
        </div>
        <div class="rx-panel rx-pc" data-w="600" data-h="510">
          <h3 class="rx-title"></h3>
          <button class="rx-ba" type="button" aria-label="${esc(L('big'))}"><img alt=""><span class="cap"><b>${esc(L('before'))}</b><b>${esc(L('after'))}</b></span></button>
        </div>
        <div class="rx-panel rx-pr" data-w="366" data-h="500">
          <h3>${esc(L('thisCase'))}</h3>
          <div class="rx-info"></div>
          <p class="rx-rule"><span lang="th">${RULE_TH}</span><span lang="en">${RULE_EN}</span>${opts.vary ? `<span>${esc(opts.vary)}</span>` : ''}</p>
        </div>
      </div>
    </div>
  </div>`;

  const q = s => el.querySelector(s);
  const stage = q('.rx-stage'), film = q('.rx-run'), photo = q('.rx-photo'), shot = q('.rx-photo i'), crown = q('.rx-crown span');
  const panels = q('.rx-panels'), picker = q('.rx-picker'), again = q('[data-act=again]'), nextBtn = q('[data-act=next]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wide = matchMedia('(min-width: 1024px)');
  const at = {};           // which case each procedure is on
  let cat = cats[0], cur = cat.list[0], run = 0, busy = false, alive = true;

  const layout = () => {
    const r = stage.getBoundingClientRect(), W = r.width, H = r.height;
    if (!W) return;
    place(photo, 200, 300, quad(MAP.podPhoto, W, H));
    place(q('.rx-crown'), 240, 48, quad(MAP.crown, W, H));
    panels.querySelectorAll('.rx-panel').forEach((p, i) => {
      if (!wide.matches) { p.style.transform = ''; return; }
      place(p, +p.dataset.w, +p.dataset.h, quad(MAP[['panelL', 'panelC', 'panelR'][i]], W, H));
    });
  };

  /* the three screens */
  const fill = () => {
    const n = cat.list.indexOf(cur) + 1;
    q('.rx-tile').innerHTML = `${cat.icon ? `<span class="ic"><img src="${esc(cat.icon)}" alt=""></span>` : '<span class="ic"></span>'}<span>${esc(cat.x)}<small>${esc(L('nCases', { n: cat.list.length }))}</small></span>`;
    q('.rx-cases').innerHTML = cat.list.map((c, i) => `<button class="rx-case" type="button" data-i="${i}" aria-current="${c === cur}"><i style="${half(c, 'b')}"></i>${esc(L('caseN', { n: i + 1 }))}</button>`).join('');
    q('.rx-title').textContent = `${cur.procName || cat.x} · ${L('caseN', { n })}`;
    const img = q('.rx-ba img'); img.src = cur.url; img.alt = `${cur.procName || cat.x}, ${L('before')} / ${L('after')}`;
    const facts = cur.facts || [];
    q('.rx-info').innerHTML = (facts.length ? `<dl class="rx-facts">${facts.map(f => `<dt>${esc(f[0])}</dt><dd>${esc(f[1])}</dd>`).join('')}</dl>` : `<p class="rx-plain">${esc(L('plain'))}</p>`)
      + (cur.story ? `<a class="rx-link" href="${esc(cur.story.url)}"><span><small>${esc(L('story'))}</small>${esc(cur.story.title)}</span>${ICON.arrow}</a>` : '')
      + (cur.links || []).slice(0, cur.story ? 1 : 2).map(l => `<a class="rx-link" href="${esc(l.url)}"><span>${esc(l.x)}</span>${ICON.arrow}</a>`).join('')
      + (cur.ask ? `<p class="rx-ask">${esc(L('ask'))}</p><div class="rx-ctas"><a class="rx-cta ln" data-ask="line" href="${esc(cur.ask.line)}" target="_blank" rel="noopener">${ICON.line}LINE</a><a class="rx-cta wa" data-ask="whatsapp" href="${esc(cur.ask.wa)}" target="_blank" rel="noopener">${ICON.wa}WhatsApp</a></div>` : '');
    picker.querySelectorAll('.rx-chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === cat.k && stage.dataset.step !== 'idle')));
  };

  const step = s => { stage.dataset.step = s; };
  const ready = v => new Promise(res => {
    if (v.readyState >= 3) return res(true);
    const done = ok => { v.oncanplaythrough = v.onerror = null; clearTimeout(to); res(ok); };
    const to = setTimeout(() => done(v.readyState >= 2), 8000);
    v.oncanplaythrough = () => done(true); v.onerror = () => done(false);
    if (v.preload !== 'auto') { v.preload = 'auto'; v.load(); }
  });
  const lock = on => {
    busy = on; picker.querySelectorAll('.rx-chip').forEach(b => { b.disabled = on; });
    const end = !on && stage.dataset.step === 'terminal';
    again.hidden = !end; nextBtn.hidden = !end || cat.list.length < 2;
  };

  /* the doors: the photo is cut to the gap between the two door edges, frame by frame */
  const pl = MAP.podPhoto[3][0], pr = MAP.podPhoto[2][0];
  const clipToDoors = f => {
    const g = MAP.gap[f];
    if (!g) { photo.style.clipPath = f > 30 && f < 118 ? 'inset(0 50% 0 50%)' : ''; return; }
    const l = g[0] == null ? 0 : Math.max(0, Math.min(1, (g[0] - pl) / (pr - pl)));
    const r = g[1] == null ? 1 : Math.max(0, Math.min(1, (g[1] - pl) / (pr - pl)));
    photo.style.clipPath = r <= l ? 'inset(0 50% 0 50%)' : `inset(0 ${((1 - r) * 100).toFixed(2)}% 0 ${(l * 100).toFixed(2)}%)`;
  };

  /* one film, frame 1 to 292: doors close 1-24, scan 25-120, doors open with fog 121-208, the camera moves to the terminal 209-292 */
  const sync = (c, f, st) => {
    clipToDoors(f);
    if (f <= 24) crown.textContent = cat.x;
    else if (f <= 120) {
      crown.textContent = L('scan', { n: Math.min(100, Math.round((f - 25) / 95 * 100)) });
      if (!st.swapped && f > 40) { st.swapped = true; shot.setAttribute('style', half(c, 'a')); }
    } else if (f <= 200) crown.textContent = L('done');
    else crown.textContent = L('send');
    // the after shows only as the fog thins, then leaves as light when the data goes
    let o = 1, blur = 0, glow = 1;
    if (f > 120 && f < 196) { const k = ease((f - 150) / 45); o = k; blur = (1 - k) * 8; }
    if (f >= 200) { const k = ease((f - 200) / 9); o = 1 - k; glow = 1 + k * 1.6; blur = k * 3; }
    shot.style.opacity = o.toFixed(3);
    shot.style.filter = `blur(${blur.toFixed(1)}px) brightness(${glow.toFixed(2)})`;
    stage.classList.toggle('rx-moving', f >= 209);
  };

  const start = async c => {
    run++; const id = run; cur = c; lock(true);
    panels.classList.remove('on'); panels.hidden = true; film.pause();
    emit('results:run', { cat: cat.k, n: cat.list.indexOf(c) + 1 });
    if (reduce) { step('terminal'); fill(); panels.hidden = false; layout(); panels.classList.add('on'); lock(false); return; }
    step('loaded'); fill(); stage.classList.remove('rx-moving');
    photo.style.clipPath = ''; shot.setAttribute('style', half(c, 'b')); photo.classList.add('on');
    crown.textContent = cat.x;
    const [ok] = await Promise.all([ready(film), loadImg(c.url)]); if (id !== run || !alive) return;
    await wait(900); if (id !== run || !alive) return;
    const st = {};
    if (ok) {
      film.currentTime = 0;
      await new Promise(res => {
        const tick = () => {
          if (id !== run || !alive) return res();
          sync(c, Math.min(MAP.frames, Math.floor(film.currentTime * MAP.fps) + 1), st);
          if (film.ended) return res();
          requestAnimationFrame(tick);
        };
        film.onended = () => { film.onended = null; res(); };
        film.play().then(() => { step('run'); requestAnimationFrame(tick); }).catch(() => res());
      });
    }
    if (id !== run || !alive) return;
    photo.classList.remove('on');
    step('terminal'); panels.hidden = false; layout();
    await wait(250); panels.classList.add('on');
    lock(false);
  };

  const pickCat = k => {
    const c = cats.find(x => x.k === k); if (!c) return;
    // pressing the same procedure again moves on to its next case
    if (c === cat && stage.dataset.step !== 'idle') at[k] = ((at[k] || 0) + 1) % c.list.length;
    cat = c; start(c.list[at[k] || 0]);
  };
  picker.addEventListener('click', e => { const b = e.target.closest('.rx-chip'); if (b && !busy) pickCat(b.dataset.k); });
  again.addEventListener('click', () => { if (!busy) start(cur); });
  nextBtn.addEventListener('click', () => { if (!busy) pickCat(cat.k); });
  q('.rx-cases').addEventListener('click', e => {
    const b = e.target.closest('.rx-case'); if (!b) return;
    at[cat.k] = +b.dataset.i; cur = cat.list[at[cat.k]]; fill();
  });
  q('.rx-pr').addEventListener('click', e => { const a = e.target.closest('[data-ask]'); if (a) emit('results:ask', { via: a.dataset.ask, cat: cat.k }); });

  /* tap the case to see it large */
  // a native modal dialog: Esc, focus inside, the page behind inert, and focus back to the case on close
  const zoom = document.createElement('dialog'); zoom.className = 'apxr-zoom'; zoom.setAttribute('aria-label', L('big'));
  zoom.innerHTML = `<button class="rx-btn" type="button">${esc(L('close'))}</button><figure><img alt=""><figcaption><span>${esc(L('before'))}</span><span>${esc(L('after'))}</span></figcaption></figure>`;
  document.body.appendChild(zoom);
  const closeZoom = () => { if (zoom.open) zoom.close(); };
  q('.rx-ba').addEventListener('click', () => {
    const im = zoom.querySelector('img'); im.src = cur.url; im.alt = q('.rx-ba img').alt;
    zoom.showModal(); zoom.querySelector('button').focus();
  });
  zoom.addEventListener('click', e => { if (e.target === zoom || e.target.closest('button')) closeZoom(); });

  /* load the film once the machine is near */
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((en, ob) => { if (en[0].isIntersecting) { film.preload = 'auto'; film.load(); ob.disconnect(); } }, { rootMargin: '400px' }) : null;
  if (io) io.observe(stage);
  const ro = 'ResizeObserver' in window ? new ResizeObserver(layout) : null;
  if (ro) ro.observe(stage); else addEventListener('resize', layout);
  wide.addEventListener('change', layout);
  fill(); layout();

  return {
    destroy() {
      alive = false; film.pause(); io && io.disconnect(); ro ? ro.disconnect() : removeEventListener('resize', layout);
      wide.removeEventListener('change', layout); zoom.remove(); el.innerHTML = '';
    }
  };
}
