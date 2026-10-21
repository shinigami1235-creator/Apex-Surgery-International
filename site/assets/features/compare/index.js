/* Before/after images: a draggable comparison slider and a gallery with a swipe lightbox.
   mount(container, {lang, base, serviceUrl, onEvent, items, mode?, layout?, title?}) -> {destroy()}
     items: [{before, after, alt?}] pairs, or [{src, layout?, alt?}] composites (one image holding both).
     layout for a composite: 'lr' (before left, after right), 'tb' (before top, after bottom) or 'single'.
     The client's composites (for example ~/wp-content/uploads/2025/11/BA-Nose-ken-New-03.webp) could not be
     inspected from the build container, so a composite with no layout is shown whole as 'single'.
     mode: 'gallery' (default when several items) or 'slider' (the first item inline).
   slider(container, item, {lang}) -> {destroy(), set(pct)} mounts one comparison on its own. */

import { t } from '../plan/procedures.js';

const SITE = 'https://www.apexsurgeryhospital.com/';
const abs = u => (u && u.startsWith('~/') ? SITE + u.slice(2) : u);

/* Required caption for medical before/after images, Thai rule text plus its English version. Shown in both languages. */
const RULE_TH = 'ใช้เป็นตัวอย่าง ผลจากการเข้ารับการรักษาพยาบาลสำหรับผู้ป่วยเฉพาะราย';
const RULE_EN = 'Example only. Results from treatment of an individual patient.';

const T = {
  title: { en: 'Before and after', th: 'ก่อนและหลัง' },
  before: { en: 'Before', th: 'ก่อน' },
  after: { en: 'After', th: 'หลัง' },
  handle: { en: 'Before and after divider', th: 'เส้นแบ่งภาพก่อนและหลัง' },
  handleV: { en: '{n}% before', th: 'ภาพก่อน {n}%' },
  open: { en: 'Open image {n} of {m}', th: 'เปิดภาพที่ {n} จาก {m}' },
  close: { en: 'Close', th: 'ปิด' },
  prev: { en: 'Previous image', th: 'ภาพก่อนหน้า' },
  next: { en: 'Next image', th: 'ภาพถัดไป' },
  count: { en: '{n} of {m}', th: '{n} จาก {m}' },
  failed: { en: 'The image could not be loaded.', th: 'โหลดภาพไม่สำเร็จ' },
  viewer: { en: 'Before and after image', th: 'ภาพก่อนและหลัง' }
};

const ICON = {
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  l: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 6l-6 6 6 6"/></svg>',
  r: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 6l6 6-6 6"/></svg>',
  grip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 7l-5 5 5 5M15 7l5 5-5 5"/></svg>',
  img: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="15.5" cy="8.5" r="1.5"/></svg>',
  zoom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>'
};

const CSS = `
.apxb,.apxb-lb{--b-plum:var(--plum,#6A388C);--b-plum7:var(--plum-700,#55286F);--b-night:var(--night,#1F0A30);--b-night2:var(--night-2,#2A0F40);
  --b-lilac:var(--lilac,#A886CD);--b-l3:var(--lilac-300,#C9B3DD);--b-l2:var(--lilac-200,#E4D8EE);--b-l1:var(--lilac-100,#F1EAF7);
  --b-ink:var(--ink,#2A1F33);--b-ink2:var(--ink-2,#5A4A66);--b-on2:var(--on-night-2,#CDB9DD);--b-rose:#CC3366;--b-ease:cubic-bezier(.23,1,.32,1);
  font-family:"LINE Seed","Sarabun","Noto Sans Thai",system-ui,sans-serif;font-size:16px;line-height:1.6;-webkit-text-size-adjust:100%}
.apxb{color:var(--b-ink)}
.apxb *,.apxb *::before,.apxb *::after,.apxb-lb *,.apxb-lb *::before,.apxb-lb *::after{box-sizing:border-box}
.apxb h2,.apxb p,.apxb-lb p{margin:0}
.apxb .b-wrap{max-width:1180px;margin:0 auto;padding:24px 16px 40px}
.apxb .b-wrap>h2{font-size:clamp(24px,4.5vw,32px);font-weight:800;letter-spacing:-.01em;line-height:1.2;margin-bottom:14px}
.b-cmp{position:relative;user-select:none;-webkit-user-select:none}
.b-stage{position:relative;overflow:hidden;border-radius:20px;background:linear-gradient(150deg,var(--b-l2),var(--b-l3));touch-action:pan-y;cursor:ew-resize;aspect-ratio:var(--ar,4/5)}
.b-stage.single{cursor:default}
.b-layer{position:absolute;inset:0;background-repeat:no-repeat}
.b-layer.before{clip-path:inset(0 calc(100% - var(--pos,50%)) 0 0)}
.b-stage.tb .b-layer.before{clip-path:inset(0 calc(100% - var(--pos,50%)) 0 0)}
.b-stage img.b-single{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
.b-tag{position:absolute;top:12px;z-index:2;font-size:13px;font-weight:800;line-height:26px;padding:0 12px;border-radius:999px;background:rgba(31,10,48,.62);color:#fff;pointer-events:none}
.b-tag.b{left:12px}.b-tag.a{right:12px}
.b-line{position:absolute;top:0;bottom:0;left:var(--pos,50%);width:2px;margin-left:-1px;background:#fff;box-shadow:0 0 0 1px rgba(31,10,48,.25);z-index:2;pointer-events:none}
.b-knob{position:absolute;top:50%;left:var(--pos,50%);z-index:3;width:48px;height:48px;margin:-24px 0 0 -24px;border-radius:50%;border:2px solid #fff;background:var(--b-plum);color:#fff;display:flex;align-items:center;justify-content:center;cursor:ew-resize;box-shadow:0 8px 22px -8px rgba(31,10,48,.7);padding:0;transition:transform .16s var(--b-ease)}
.b-knob:active{transform:scale(1.08)}
.b-knob svg{width:24px;height:24px}
.b-knob:focus-visible{outline:3px solid var(--b-lilac);outline-offset:3px}
.b-stage.single .b-line,.b-stage.single .b-knob,.b-stage.single .b-tag{display:none}
.b-fail{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:16px;text-align:center;color:var(--b-plum7);font-size:14px;font-weight:700}
.b-fail svg{width:40px;height:40px;color:var(--b-lilac)}
.b-stage.err .b-fail{display:flex}
.b-stage.err .b-line,.b-stage.err .b-knob,.b-stage.err .b-tag{display:none}
.b-cap{margin-top:8px;font-size:12px;line-height:1.5;color:var(--b-ink2)}
.apxb .b-card .b-cap{font-size:11px;line-height:1.45}
.b-cap span{display:block}
.apxb .b-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
@media (min-width:700px){.apxb .b-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}}
@media (min-width:1040px){.apxb .b-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
.apxb .b-card{margin:0;min-width:0}
.apxb .b-th{position:relative;display:block;width:100%;padding:0;border:0;border-radius:20px;overflow:hidden;cursor:zoom-in;aspect-ratio:4/5;background:linear-gradient(150deg,var(--b-l1),var(--b-l3))}
.apxb .b-th img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.apxb .b-th.contain img{object-fit:contain}
.apxb .b-th .b-ico{position:absolute;right:10px;bottom:10px;width:36px;height:36px;border-radius:50%;background:rgba(31,10,48,.6);color:#fff;display:flex;align-items:center;justify-content:center}
.apxb .b-th .b-ico svg{width:18px;height:18px}
.apxb .b-th .b-ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--b-plum)}
.apxb .b-th .b-ph svg{width:36%;max-width:64px;opacity:.7}
.apxb .b-th:focus-visible{outline:3px solid var(--b-plum);outline-offset:3px}
.apxb .b-th .b-pair{position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr;gap:2px;background:#fff}
.apxb .b-th .b-pair img{position:static;width:100%;height:100%}
.apxb-lb{position:fixed;inset:0;z-index:2147483000;background:rgba(17,5,28,.95);color:#fff;display:flex;flex-direction:column;touch-action:pan-y}
.apxb-lb .lb-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;flex:none}
.apxb-lb .lb-top p{font-size:15px;font-weight:700;color:var(--b-on2);padding-left:6px}
.apxb-lb .lb-ib{width:44px;height:44px;border-radius:50%;border:0;background:rgba(255,255,255,.14);color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex:none}
.apxb-lb .lb-ib svg{width:22px;height:22px}
.apxb-lb .lb-ib:hover{background:rgba(255,255,255,.24)}
.apxb-lb .lb-ib[disabled]{opacity:.3;cursor:default}
.apxb-lb :is(button):focus-visible{outline:3px solid var(--b-lilac);outline-offset:2px}
.apxb-lb .lb-main{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;gap:12px;padding:0 12px}
.apxb-lb .lb-nav{position:absolute;bottom:14px;z-index:2}
.apxb-lb .lb-nav[data-act=prev]{left:16px}.apxb-lb .lb-nav[data-act=next]{right:16px}
@media (min-width:760px) and (hover:hover){.apxb-lb .lb-nav{position:static}}
.apxb-lb .lb-fig{margin:0;display:flex;flex-direction:column;align-items:center;max-height:100%;min-height:0;transition:transform .32s var(--b-ease),opacity .32s}
.apxb-lb .lb-fig .b-cmp{width:min(calc(100vw - 24px),calc((100dvh - 230px) * var(--arn,.8)))}
@media (min-width:760px) and (hover:hover){.apxb-lb .lb-fig .b-cmp{width:min(calc(100vw - 160px),calc((100dvh - 190px) * var(--arn,.8)))}}
.apxb-lb .b-cap{color:var(--b-on2);text-align:center;max-width:640px;margin:10px auto 0}
.apxb-lb .lb-foot{flex:none;height:72px}
@media (min-width:760px) and (hover:hover){.apxb-lb .lb-foot{height:28px}}
@media (prefers-reduced-motion:reduce){.apxb *,.apxb-lb *,.b-cmp *{transition:none!important}}
`;

function injectCSS() {
  if (document.getElementById('apxb-css')) return;
  const s = document.createElement('style'); s.id = 'apxb-css'; s.textContent = CSS; document.head.append(s);
}
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  kids.flat(Infinity).forEach(c => { if (c != null && c !== false) el.append(c.nodeType ? c : String(c)); });
  return el;
}
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => (o[k] ?? ''));

export const caption = () => h('p', { class: 'b-cap' }, h('span', { lang: 'th' }, RULE_TH), h('span', { lang: 'en' }, RULE_EN));

/* Normalise an item to {kind:'pair'|'lr'|'tb'|'single', before, after, src, alt}. */
function norm(x, defLayout) {
  if (typeof x === 'string') x = { src: x };
  if (x.before && x.after) return { kind: 'pair', before: abs(x.before), after: abs(x.after), alt: x.alt || '' };
  const lay = x.layout || defLayout || 'single';
  return { kind: lay === 'lr' || lay === 'tb' ? lay : 'single', src: abs(x.src), alt: x.alt || '' };
}

const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = src; });

/* One comparison. Returns {el, destroy, set}. */
function buildSlider(item, lang, onChange) {
  const L = o => t(o, lang);
  let pos = 50;
  const stage = h('div', { class: 'b-stage ' + item.kind, style: { '--pos': '50%' } });
  const fail = h('div', { class: 'b-fail', role: 'img', 'aria-label': L(T.failed) }, h('span', { html: ICON.img }), h('span', null, L(T.failed)));
  const knob = h('button', { type: 'button', class: 'b-knob', role: 'slider', 'aria-label': L(T.handle), 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '50', 'aria-valuetext': fill(L(T.handleV), { n: 50 }), html: ICON.grip });
  const el = h('div', { class: 'b-cmp' }, stage, caption());
  let destroyed = false;

  const setAR = ar => { stage.style.setProperty('--ar', String(ar)); el.style.setProperty('--arn', String(ar)); el.dataset.ar = ar.toFixed(3); };

  if (item.kind === 'single') {
    const img = h('img', { class: 'b-single', alt: item.alt || L(T.viewer), src: item.src, decoding: 'async' });
    img.onload = () => { if (img.naturalWidth) setAR(img.naturalWidth / img.naturalHeight); };
    img.onerror = () => { stage.classList.add('err'); img.remove(); };
    stage.append(img, fail);
    el.dataset.state = 'single';
    return { el, destroy() {}, set() {} };
  }

  const before = h('div', { class: 'b-layer before', role: 'img', 'aria-label': `${L(T.before)}${item.alt ? ': ' + item.alt : ''}` });
  const after = h('div', { class: 'b-layer after', role: 'img', 'aria-label': `${L(T.after)}${item.alt ? ': ' + item.alt : ''}` });
  stage.append(after, before, h('span', { class: 'b-tag b', 'aria-hidden': 'true' }, L(T.before)), h('span', { class: 'b-tag a', 'aria-hidden': 'true' }, L(T.after)), h('span', { class: 'b-line' }), knob, fail);
  el.dataset.state = 'loading';

  if (item.kind === 'pair') {
    [before, after].forEach((l, i) => { l.style.backgroundImage = `url("${i ? item.after : item.before}")`; l.style.backgroundSize = 'cover'; l.style.backgroundPosition = 'center'; });
    loadImg(item.before).then(i => { if (!destroyed) { setAR(i.naturalWidth / i.naturalHeight); el.dataset.state = 'ready'; } }).catch(() => { stage.classList.add('err'); el.dataset.state = 'error'; });
    loadImg(item.after).catch(() => { stage.classList.add('err'); el.dataset.state = 'error'; });
  } else {
    /* composite: each layer shows its half of the same image */
    const lr = item.kind === 'lr';
    [before, after].forEach((l, i) => {
      l.style.backgroundImage = `url("${item.src}")`;
      l.style.backgroundSize = lr ? '200% 100%' : '100% 200%';
      l.style.backgroundPosition = lr ? (i ? '100% 0' : '0 0') : (i ? '0 100%' : '0 0');
    });
    loadImg(item.src).then(i => {
      if (destroyed) return;
      setAR(lr ? (i.naturalWidth / 2) / i.naturalHeight : i.naturalWidth / (i.naturalHeight / 2));
      el.dataset.state = 'ready';
    }).catch(() => { stage.classList.add('err'); el.dataset.state = 'error'; });
  }

  const set = p => {
    pos = Math.max(0, Math.min(100, p));
    stage.style.setProperty('--pos', pos.toFixed(2) + '%');
    const n = Math.round(pos);
    knob.setAttribute('aria-valuenow', String(n));
    knob.setAttribute('aria-valuetext', fill(L(T.handleV), { n }));
    el.dataset.pos = String(n);
  };
  let drag = false, startX = 0, startY = 0, axis = null;
  const fromEvent = e => { const r = stage.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * 100; };
  stage.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    drag = true; axis = e.pointerType === 'mouse' ? 'x' : null; startX = e.clientX; startY = e.clientY;
    if (axis === 'x' || e.target === knob || knob.contains(e.target)) { axis = 'x'; set(fromEvent(e)); }
    try { stage.setPointerCapture(e.pointerId); } catch (er) { /* synthetic */ }
    e.stopPropagation();
  });
  stage.addEventListener('pointermove', e => {
    if (!drag) return;
    if (!axis) {
      const dx = Math.abs(e.clientX - startX), dy = Math.abs(e.clientY - startY);
      if (dx < 6 && dy < 6) return;
      axis = dx >= dy ? 'x' : 'y';
      if (axis === 'y') { drag = false; return; }
    }
    e.preventDefault(); e.stopPropagation();
    set(fromEvent(e));
  });
  const up = e => {
    if (!drag) return;
    drag = false;
    if (!axis && e.type === 'pointerup') set(fromEvent(e));
    e.stopPropagation();
    onChange && onChange(pos);
  };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  knob.addEventListener('keydown', e => {
    const step = { ArrowLeft: -2, ArrowDown: -2, ArrowRight: 2, ArrowUp: 2, PageDown: -10, PageUp: 10 }[e.key];
    if (step) { e.preventDefault(); e.stopPropagation(); set(pos + step); onChange && onChange(pos); }
    else if (e.key === 'Home') { e.preventDefault(); e.stopPropagation(); set(0); }
    else if (e.key === 'End') { e.preventDefault(); e.stopPropagation(); set(100); }
  });
  return { el, destroy() { destroyed = true; }, set };
}

export function slider(container, item, opts = {}) {
  injectCSS();
  const s = buildSlider(norm(item, opts.layout), opts.lang === 'th' ? 'th' : 'en', opts.onChange);
  container.append(s.el);
  return { destroy() { s.destroy(); s.el.remove(); }, set: s.set, el: s.el };
}

export function mount(container, opts = {}) {
  injectCSS();
  const lang = opts.lang === 'th' ? 'th' : 'en';
  const L = o => t(o, lang);
  const emit = (n, d) => { try { opts.onEvent && opts.onEvent(n, d); } catch (e) { /* host handler error */ } };
  const items = (opts.items || []).map(x => norm(x, opts.layout));
  const mode = opts.mode || (items.length > 1 ? 'gallery' : 'slider');
  const root = h('div', { class: 'apxb', lang });
  const wrap = h('div', { class: 'b-wrap' });
  if (opts.title !== false) wrap.append(h('h2', null, opts.title || L(T.title)));
  root.append(wrap);
  container.append(root);
  const parts = [];
  let lb = null;

  if (mode === 'slider') {
    if (items[0]) {
      const s = buildSlider(items[0], lang, p => emit('compare:slide', { pos: Math.round(p) }));
      s.el.style.maxWidth = '560px';
      wrap.append(s.el); parts.push(s);
    }
  } else {
    const grid = h('div', { class: 'b-grid', role: 'list' });
    items.forEach((it, i) => {
      const th = h('button', { type: 'button', class: 'b-th' + (it.kind === 'pair' ? '' : ' contain'), 'data-i': i, 'aria-label': fill(L(T.open), { n: i + 1, m: items.length }) },
        h('span', { class: 'b-ph', html: ICON.img }));
      const add = (src, parent) => {
        const img = h('img', { src, alt: '', loading: 'lazy', decoding: 'async' });
        img.onerror = () => img.remove();
        parent.append(img);
      };
      if (it.kind === 'pair') { const p = h('span', { class: 'b-pair' }); th.append(p); add(it.before, p); add(it.after, p); }
      else add(it.src, th);
      th.append(h('span', { class: 'b-ico', html: ICON.zoom }));
      th.addEventListener('click', () => openLB(i, th));
      grid.append(h('figure', { class: 'b-card', role: 'listitem' }, th, caption()));
    });
    wrap.append(grid);
  }

  function openLB(start, opener) {
    if (lb) lb.close();
    let cur = start;
    let s = null;
    const count = h('p', { 'aria-live': 'polite' });
    const closeBtn = h('button', { type: 'button', class: 'lb-ib', 'data-act': 'close', 'aria-label': L(T.close), html: ICON.x });
    const prev = h('button', { type: 'button', class: 'lb-ib lb-nav', 'data-act': 'prev', 'aria-label': L(T.prev), html: ICON.l });
    const next = h('button', { type: 'button', class: 'lb-ib lb-nav', 'data-act': 'next', 'aria-label': L(T.next), html: ICON.r });
    const fig = h('figure', { class: 'lb-fig' });
    const main = h('div', { class: 'lb-main' }, prev, fig, next);
    const ov = h('div', { class: 'apxb-lb', role: 'dialog', 'aria-modal': 'true', 'aria-label': L(T.viewer), lang },
      h('div', { class: 'lb-top' }, count, closeBtn), main, h('div', { class: 'lb-foot' }));
    document.body.append(ov);
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const show = (i, dir) => {
      cur = i;
      if (s) s.destroy();
      fig.textContent = '';
      s = buildSlider(items[cur], lang, p => emit('compare:slide', { index: cur, pos: Math.round(p) }));
      fig.append(s.el);
      if (dir && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        fig.style.transition = 'none'; fig.style.transform = `translateX(${dir * 40}px)`; fig.style.opacity = '0';
        requestAnimationFrame(() => requestAnimationFrame(() => { fig.style.transition = ''; fig.style.transform = ''; fig.style.opacity = ''; }));
      }
      count.textContent = fill(L(T.count), { n: cur + 1, m: items.length });
      prev.disabled = cur === 0; next.disabled = cur === items.length - 1;
      ov.dataset.index = String(cur);
      emit('compare:view', { index: cur });
    };
    const go = d => { const i = cur + d; if (i >= 0 && i < items.length) show(i, d); };
    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    closeBtn.addEventListener('click', () => close());
    /* swipe left or right outside the slider handle to move between images */
    let sx = 0, sy = 0, down = false;
    main.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; down = true; sx = e.clientX; sy = e.clientY; });
    main.addEventListener('pointerup', e => {
      if (!down) return; down = false;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) go(dx < 0 ? 1 : -1);
      else if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && e.target === main) close();
    });
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      else if (e.key === 'Tab') {
        const f = [...ov.querySelectorAll('button:not([disabled])')].filter(x => x.offsetParent !== null);
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    function close() {
      document.removeEventListener('keydown', onKey);
      if (s) s.destroy();
      ov.remove();
      document.documentElement.style.overflow = prevOverflow;
      lb = null;
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    }
    show(start, 0);
    closeBtn.focus({ preventScroll: true });
    lb = { close, go, el: ov };
  }

  return {
    destroy() { if (lb) lb.close(); parts.forEach(p => p.destroy()); root.remove(); },
    open: i => openLB(i)
  };
}
