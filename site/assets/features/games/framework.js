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
export const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

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
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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

/* ---------- sound: synthesised with WebAudio, off by default ---------- */
export const sfx = (() => {
  let ctx = null, master = null;
  const s = { on: store.get('apxg.sound', false) === true };
  const ensure = () => {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);
    return ctx;
  };
  const tone = (f, t0, dur, type = 'sine', vol = 1, f2) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  };
  const SOUNDS = {
    tap: t => tone(700, t, 0.05, 'sine', 0.5),
    flip: t => tone(1300, t, 0.035, 'triangle', 0.35, 900),
    good: t => { tone(660, t, 0.09, 'triangle', 0.8); tone(990, t + 0.06, 0.12, 'triangle', 0.7); },
    bad: t => tone(220, t, 0.26, 'sawtooth', 0.35, 110),
    level: t => [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.07, 0.14, 'triangle', 0.6)),
    tick: t => tone(880, t, 0.08, 'sine', 0.6),
    go: t => tone(1320, t, 0.18, 'triangle', 0.7),
    end: t => [523, 392, 262].forEach((f, i) => tone(f, t + i * 0.12, 0.2, 'triangle', 0.6)),
    prize: t => [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.09, 0.2, 'triangle', 0.55))
  };
  s.play = name => {
    if (!s.on || !SOUNDS[name]) return;
    try {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
      SOUNDS[name](ctx.currentTime + 0.005);
    } catch (e) { /* audio is optional */ }
  };
  s.set = on => {
    s.on = !!on;
    store.set('apxg.sound', s.on);
    if (s.on) { try { ensure(); ctx && ctx.state === 'suspended' && ctx.resume(); } catch (e) {} }
  };
  return s;
})();

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

/* Shared stage colours, usable inside any game's own CSS. Each falls back to the brief's value. */
export const COLORS = {
  plum: 'var(--plum,#6A388C)', plum700: 'var(--plum-700,#55286F)', night: 'var(--night,#1F0A30)', night2: 'var(--night-2,#2A0F40)',
  lilac: 'var(--lilac,#A886CD)', lilac300: 'var(--lilac-300,#C9B3DD)', lilac100: 'var(--lilac-100,#F1EAF7)', wash: 'var(--wash,#FBF3FB)',
  ink: 'var(--ink,#2A1F33)', ink2: 'var(--ink-2,#5A4A66)', onNight: 'var(--on-night,#F6EEFB)', onNight2: 'var(--on-night-2,#CDB9DD)', rose: '#CC3366'
};
