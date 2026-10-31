/* Apex games: shared helpers for the hub and every game.
   Games may import any of these. Nothing here touches the network. */

export const EASE = 'cubic-bezier(.23,1,.32,1)';

/* ---------- random ---------- */
/* mulberry32: small, fast, seedable. Every game must draw randomness from the rng it is given. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function newSeed() {
  try { const u = new Uint32Array(1); crypto.getRandomValues(u); return u[0]; }
  catch (e) { return (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0; }
}
export function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- DOM ---------- */
export function css(id, text) {
  if (document.getElementById(id)) return;
  const s = document.createElement('style');
  s.id = id;
  s.textContent = text;
  document.head.appendChild(s);
}
/* h('div', {class:'x', onclick: fn, 'aria-label': 'y'}, child, 'text') */
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') { for (const p in v) { if (p.startsWith('--')) el.style.setProperty(p, v[p]); else el.style[p] = v[p]; } }
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
export const tx = (obj, lang) => obj == null ? '' : (typeof obj === 'string' ? obj : (obj[lang] ?? obj.en ?? ''));
export const fmt = (n, lang) => Math.round(n || 0).toLocaleString(lang === 'th' ? 'th-TH' : 'en-US');

export const reduced = () => {
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
};

/* ---------- storage (per-visitor conveniences only) ---------- */
export const store = {
  get(k, d) {
    try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
  },
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
  }
};

/* ---------- Bangkok calendar (UTC+7, no daylight saving) ---------- */
const BKK = 7 * 3600e3;
export const bkkDay = (ts = Date.now()) => new Date(ts + BKK).toISOString().slice(0, 10);
export const bkkMonth = (ts = Date.now()) => new Date(ts + BKK).toISOString().slice(0, 7);
export const msToBkkMidnight = (ts = Date.now()) => 86400e3 - ((ts + BKK) % 86400e3);

/* ---------- run recording ---------- */
/* rec.act('L') counts one player action and logs [ms, 'L'].
   rec.note('lv3') logs an event that is not a player action.
   ms is game time (sum of frame deltas), so a hidden tab does not inflate it. */
export function recorder() {
  const r = {
    t: 0, inputs: 0, log: [],
    act(a) { r.inputs++; r.log.push([Math.round(r.t), a]); },
    note(a) { r.log.push([Math.round(r.t), a]); }
  };
  return r;
}

/* rAF loop that hands fn(dtMs) a clamped delta and stops on abort or when fn returns false. */
export function loop(signal, fn) {
  let last = 0, id = 0, live = true;
  const step = now => {
    if (!live) return;
    const dt = last ? Math.min(50, now - last) : 16.7;
    last = now;
    if (fn(dt) === false) { live = false; return; }
    id = requestAnimationFrame(step);
  };
  id = requestAnimationFrame(step);
  const stop = () => { live = false; cancelAnimationFrame(id); };
  signal && signal.addEventListener('abort', stop, { once: true });
  return stop;
}

/* ---------- feel ---------- */
export function shake(el, mag = 7) {
  if (!el || reduced() || !el.animate) return;
  el.animate([
    { transform: 'translate3d(0,0,0)' },
    { transform: `translate3d(${-mag}px,0,0)` },
    { transform: `translate3d(${mag * 0.8}px,0,0)` },
    { transform: `translate3d(${-mag * 0.5}px,0,0)` },
    { transform: `translate3d(${mag * 0.25}px,0,0)` },
    { transform: 'translate3d(0,0,0)' }
  ], { duration: 280, easing: 'ease-out' });
}
export function pop(el, s = 1.12) {
  if (!el || reduced() || !el.animate) return;
  el.animate([{ transform: 'scale(1)' }, { transform: `scale(${s})` }, { transform: 'scale(1)' }], { duration: 220, easing: EASE });
}
/* floating "+30" text at x,y inside a positioned parent */
export function floatText(parent, x, y, text, cls = '') {
  const f = h('div', { class: 'gx-float ' + cls, style: { left: x + 'px', top: y + 'px' } }, text);
  parent.appendChild(f);
  if (reduced() || !f.animate) { setTimeout(() => f.remove(), 600); return; }
  f.animate([
    { transform: 'translate(-50%,-50%) scale(.8)', opacity: 0 },
    { transform: 'translate(-50%,-90%) scale(1.1)', opacity: 1, offset: .25 },
    { transform: 'translate(-50%,-170%) scale(1)', opacity: 0 }
  ], { duration: 700, easing: 'ease-out' }).onfinish = () => f.remove();
}
css('gx-base', `.gx-float{position:absolute;pointer-events:none;font-weight:800;font-size:20px;color:#fff;text-shadow:0 2px 10px rgba(31,10,48,.6);white-space:nowrap;z-index:30}
.gx-float.bad{color:#FFC2D6}`);

/* ---------- sound: music loops and sound effects live in audio.js ---------- */
export { sfx, music } from './audio.js';

/* ---------- pointer helpers ---------- */
/* Tracks a drag on el. cb.start(e) may return false to refuse. cb.move(dx, dy, e), cb.end(dx, dy, vx, e). */
export function drag(el, cb) {
  let id = null, x0 = 0, y0 = 0, lx = 0, lt = 0, vx = 0;
  const down = e => {
    if (id !== null || (e.button != null && e.button > 0)) return;
    if (cb.start && cb.start(e) === false) return;
    id = e.pointerId; x0 = lx = e.clientX; y0 = e.clientY; lt = performance.now(); vx = 0;
    try { el.setPointerCapture(id); } catch (err) {}
    e.preventDefault();
  };
  const move = e => {
    if (e.pointerId !== id) return;
    const now = performance.now(), dtt = Math.max(1, now - lt);
    vx = vx * 0.6 + ((e.clientX - lx) / dtt) * 0.4;
    lx = e.clientX; lt = now;
    cb.move && cb.move(e.clientX - x0, e.clientY - y0, e);
  };
  const up = e => {
    if (e.pointerId !== id) return;
    id = null;
    cb.end && cb.end(e.clientX - x0, e.clientY - y0, vx, e);
  };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
  };
}

/* ---------- textures (no image files): film grain, a diamond lattice and a fine silk weave ---------- */
const svgUrl = s => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
export const GRAIN = svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='180' height='180' filter='url(#n)' opacity='.55'/></svg>`);
export const LATTICE = (c = '#C9B3DD', a = 0.22) => svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28'><path d='M14 0L28 14 14 28 0 14z' fill='none' stroke='${c}' stroke-opacity='${a}' stroke-width='1'/><circle cx='14' cy='14' r='1.2' fill='${c}' fill-opacity='${a * 1.6}'/></svg>`);
export const SILK = (c = '#ffffff', a = 0.06) => svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='240' height='120'><g fill='none' stroke='${c}' stroke-opacity='${a}' stroke-width='1'>${Array.from({ length: 12 }, (_, i) => `<path d='M0 ${i * 10 + 4} C60 ${i * 10 - 6} 120 ${i * 10 + 14} 240 ${i * 10 + 4}'/>`).join('')}</g></svg>`);
