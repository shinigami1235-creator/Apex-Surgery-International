/* Proportion: drag the features of the clinic's face stencil back to their places.
 *
 * Hub interface: default export {id, title, how, run(host, {lang, level, rng, signal, onHud, muted})}.
 * run() resolves with {score, level, durationMs, inputs, log} when the last life is lost,
 * and rejects with an AbortError when `signal` aborts.
 *
 * Art: the clinic's own traced face line art (stencil.js, from _ref/stencils/cygnus-face.js), split into
 * movable features (each brow, each eye, the nose, the lips) over a static base (head outline, ears,
 * neck, cheek lines). The target for every feature is its own place in the stencil.
 *
 * Units: offsets are measured in face units, where 1 = skull top to chin (540 stencil units).
 *
 * Scoring per face
 *   error    E = sum over the movable features of the distance from their place (face units)
 *   accuracy A = round(100 * max(0, 1 - E / 0.16))
 *   pass when A >= passMark(n) = min(95, 55 + 4 * (n - 1)); a miss costs one of three lives
 *   on a pass: points = round(A * mult + 40 * timeLeftShare * mult), mult = 1 + 0.25 * (n - 1)
 *
 * Difficulty per level n
 *   features moved = min(features - 1, 1 + floor((n - 1) / 2)) on the front view, up to both on the 45 view
 *   offset size    = (0.10 to 0.13) * 0.86^(n-1), at least 0.022 face units, in a random direction
 *   face timer     = max(6.5, 20 - 1.5 * (n - 1)) seconds
 *   from level 5   = the 45 degree view on 40% of faces (the near brow and eye move there; the far
 *                    ones, the nose and the lips are part of the profile line), mirrored on half of those, and a slight tilt of
 *                    4 to 9 degrees on half the faces
 *
 * Log entries are [ms, action]: z<w>x<h> stage size, n<level> new face, v<view> view, g<f> grab,
 * r<f><x*1000>,<y*1000> release offset, D done tapped, T timer ran out, a<accuracy> result, x miss.
 * f is one of b B e E n l (left brow, right brow, left eye, right eye, nose, lips as seen on screen).
 */
import { sfx } from './framework.js';

const STR = {
  en: {
    title: 'Proportion',
    how: 'Drag each feature until the face looks balanced.',
    done: 'Done', pass: (p) => `Pass mark ${p}%`, accuracy: 'Accuracy', miss: 'Miss',
    level: (n) => `Level ${n}`,
    f: { browL: 'Brow', browR: 'Brow', eyeL: 'Eye', eyeR: 'Eye', nose: 'Nose', lips: 'Lips' },
  },
  th: {
    title: 'สัดส่วน',
    how: 'ลากแต่ละส่วนของใบหน้าให้อยู่ในตำแหน่งที่สมดุล',
    done: 'เสร็จ', pass: (p) => `เกณฑ์ผ่าน ${p}%`, accuracy: 'ความแม่นยำ', miss: 'พลาด',
    level: (n) => `ระดับ ${n}`,
    f: { browL: 'คิ้ว', browR: 'คิ้ว', eyeL: 'ตา', eyeR: 'ตา', nose: 'จมูก', lips: 'ริมฝีปาก' },
  },
};

const C = {
  plum: '#6A388C', plum7: '#55286F', night: '#1F0A30', lilac: '#A886CD', lilac3: '#C9B3DD',
  ink: '#2A1F33', ink2: '#5A4A66', rose: '#CC3366', paperInk: '#2B2238',
};
const FONT = '"LINE Seed","Sarabun","Noto Sans Thai",system-ui,sans-serif';
const FU = 540;   // stencil units per face unit
const CODE = { browL: 'b', browR: 'B', eyeL: 'e', eyeR: 'E', nose: 'n', lips: 'l' };
const VIEW_KEYS = { front: ['browL', 'browR', 'eyeL', 'eyeR', 'nose', 'lips'], left45: ['browR', 'eyeR'] };
const TUNE = {
  moved: (n, k) => Math.min(k > 3 ? k - 1 : k, 1 + Math.floor((n - 1) / 2)),
  offset: (n, r) => Math.max(0.022, (0.10 + r * 0.03) * Math.pow(0.86, n - 1)),
  timer: (n) => Math.max(6.5, 20 - 1.5 * (n - 1)),
  passMark: (n) => Math.min(95, 55 + 4 * (n - 1)),
  mult: (n) => 1 + 0.25 * (n - 1),
  errScale: 0.16,
  maxOff: 0.22,
};

/* ---------- helpers ---------- */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeInOut = (t) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const easeBack = (t) => { t = clamp(t, 0, 1); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
function abortError() {
  try { return new DOMException('Aborted', 'AbortError'); } catch { const e = new Error('Aborted'); e.name = 'AbortError'; return e; }
}
function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function injectCSS() {
  if (document.getElementById('ag-prop-css')) return;
  const s = document.createElement('style');
  s.id = 'ag-prop-css';
  s.textContent = `.ag-prop{position:relative;width:100%;height:100%;overflow:hidden;background:transparent;
    -webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;font-family:"LINE Seed","Sarabun","Noto Sans Thai",system-ui,sans-serif}
  .ag-prop canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
  .ag-prop-done{position:absolute;left:50%;bottom:24px;transform:translateX(-50%);min-width:156px;height:52px;padding:0 32px;
    border:0;border-radius:999px;background:linear-gradient(180deg,#7A44A0,#6A388C 55%,#55286F);color:#fff;font:700 16px/1 "LINE Seed","Sarabun",system-ui,sans-serif;
    cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 14px 28px -12px rgba(63,27,85,.85);
    transition:transform .16s cubic-bezier(.23,1,.32,1),box-shadow .2s ease,opacity .25s ease}
  .ag-prop-done:active{transform:translateX(-50%) scale(.97)}
  .ag-prop-done:focus-visible{outline:3px solid #A886CD;outline-offset:3px}
  .ag-prop-done[hidden]{display:none}
  @media (prefers-reduced-motion:reduce){.ag-prop-done{transition:none}}`;
  document.head.appendChild(s);
}

/* ---------- stencil ---------- */
let stencilP = null;
function loadStencil() {
  if (!stencilP) stencilP = import(new URL('./stencil.js', import.meta.url).href).then((m) => {
    const views = {};
    for (const [key, v] of Object.entries(m.VIEWS)) {
      const groups = {};
      for (const [g, G] of Object.entries(v.groups)) {
        const [x0, y0, x1, y1] = G.bb;
        groups[g] = { path: new Path2D(G.d), bb: G.bb, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
      }
      views[key] = { m: v.m, groups };
    }
    return { views, SKULL_Y: m.SKULL_Y, CHIN_Y: m.CHIN_Y };
  }).catch((e) => { stencilP = null; throw e; });
  return stencilP;
}

/* ---------- face generation (rng order: view, mirror, tilt, then features) ---------- */
function genFace(r, n) {
  let view = 'front', mirror = false, roll = 0;
  if (n >= 5) {
    if (r() < 0.4) { view = 'left45'; mirror = r() < 0.5; }
    if (r() < 0.5) roll = (r() < 0.5 ? -1 : 1) * (4 + r() * 5) * (Math.PI / 180);
  }
  const keys = VIEW_KEYS[view];
  const order = keys.slice();
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const moved = order.slice(0, TUNE.moved(n, keys.length));
  const val = {};
  for (const k of keys) val[k] = { x: 0, y: 0 };
  for (const k of moved) {
    const d = TUNE.offset(n, r()), a = r() * Math.PI * 2;
    val[k] = { x: clamp(Math.cos(a) * d, -TUNE.maxOff, TUNE.maxOff), y: clamp(Math.sin(a) * d, -TUNE.maxOff, TUNE.maxOff) };
  }
  const start = {};
  for (const k of keys) start[k] = { ...val[k] };
  return { n, view, mirror, roll, keys, moved, val, start, T: TUNE.timer(n), pass: TUNE.passMark(n) };
}
function accuracyOf(f, v) {
  let E = 0;
  for (const k of f.keys) E += Math.hypot(v[k].x, v[k].y);
  return Math.round(100 * Math.max(0, 1 - E / TUNE.errScale));
}

/* ---------- game ---------- */
function run(host, opts = {}) {
  const { lang = 'en', level: startLevel = 1, rng = Math.random, signal, onHud = () => {}, muted = false, probe = false } = opts;
  return new Promise((resolve, reject) => {
    if (signal && signal.aborted) { reject(abortError()); return; }
    const S = STR[lang] || STR.en;
    injectCSS();
    const root = document.createElement('div');
    root.className = 'ag-prop';
    root.setAttribute('role', 'application');
    root.setAttribute('aria-label', S.title);
    const cv = document.createElement('canvas');
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'ag-prop-done'; btn.textContent = S.done; btn.hidden = true;
    root.append(cv, btn);
    host.appendChild(root);
    const ctx = cv.getContext('2d');
    const paperCv = document.createElement('canvas');
    const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const reduce = () => !!(mq && mq.matches);
    const now = () => performance.now();
    let t0 = now();   // restarted once the stencil has loaded, so load time never reaches the log
    let lastMs = 0;
    const ms = () => (lastMs = Math.max(lastMs, Math.round(now() - t0)));
    const log = [];
    const L = (a) => log.push([ms(), a]);
    const play = (name, o) => { if (!muted) sfx.play(name, o); };

    let ST = null;   // stencil, once loaded
    let W = 1, H = 1, dpr = 1, panel = null, needLayout = true, view = { cx: 0, cy: 0, s: 1, ox: 300, oy: 400 };
    let level = Math.max(1, startLevel | 0), maxLevel = level, lives = 3, score = 0, inputs = 0;
    let face = null, phase = 'load', phaseT = t0, lastLevelShown = 0, endMs = 0;
    let drag = null, hover = null, pops = [], shakeT = -1e9, raf = 0, done = false, lastHud = '', result = null;

    function timeLeft() {
      if (!face) return 0;
      if (phase === 'play') return Math.max(0, face.T - (now() - face.t0) / 1000);
      if (phase === 'show') return face.T;
      return face.left || 0;
    }
    function hud(force) {
      const time = Math.ceil(timeLeft() * 10) / 10;
      const key = `${score}|${level}|${lives}|${time}`;
      if (!force && key === lastHud) return;
      lastHud = key;
      try { onHud({ score, level, lives, time }); } catch { /* hub error */ }
    }

    /* ---------- layout and transforms ---------- */
    function layout() {
      const r = root.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = paperCv.width = Math.round(W * dpr); cv.height = paperCv.height = Math.round(H * dpr);
      const pad = W < 560 ? 8 : 14;
      panel = { x: pad, y: pad, w: W - pad * 2, h: H - pad * 2, r: W < 560 ? 20 : 28 };
      paintPaper();
      fitFace();
      L(`z${Math.round(W)}x${Math.round(H)}`);
      needLayout = false;
    }
    function paintPaper() {
      const c = paperCv.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, W, H);
      const { x, y, w, h, r } = panel;
      c.save();
      c.shadowColor = 'rgba(8,2,14,.55)'; c.shadowBlur = 40; c.shadowOffsetY = 16;
      rrect(c, x, y, w, h, r); c.fillStyle = '#F6EEE2'; c.fill();
      c.restore();
      c.save();
      rrect(c, x, y, w, h, r); c.clip();
      const g = c.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, '#FFFBF5'); g.addColorStop(1, '#F4EADC');
      c.fillStyle = g; c.fillRect(x, y, w, h);
      const pr = mulberry32(99173);
      // paper tooth and fibres
      const dots = Math.round((w * h) / 140);
      for (let i = 0; i < dots; i++) {
        c.fillStyle = pr() < 0.5 ? 'rgba(150,120,90,.06)' : 'rgba(255,255,255,.5)';
        c.fillRect(x + pr() * w, y + pr() * h, 1, 1);
      }
      c.lineCap = 'round';
      const fib = Math.round((w * h) / 1800);
      for (let i = 0; i < fib; i++) {
        const px = x + pr() * w, py = y + pr() * h, a = pr() * 6.283, l = 4 + pr() * 12;
        c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + Math.cos(a + 0.4) * l * 0.5, py + Math.sin(a + 0.4) * l * 0.5, px + Math.cos(a) * l, py + Math.sin(a) * l);
        c.strokeStyle = `rgba(140,110,80,${0.04 + pr() * 0.05})`; c.lineWidth = 0.6; c.stroke();
      }
      const vg = c.createRadialGradient(x + w / 2, y + h * 0.45, Math.min(w, h) * 0.3, x + w / 2, y + h / 2, Math.max(w, h) * 0.75);
      vg.addColorStop(0, 'rgba(160,120,80,0)'); vg.addColorStop(1, 'rgba(160,120,80,.14)');
      c.fillStyle = vg; c.fillRect(x, y, w, h);
      // stationery rules
      c.strokeStyle = 'rgba(106,56,140,.16)'; c.lineWidth = 1;
      rrect(c, x + 12.5, y + 12.5, w - 25, h - 25, Math.max(6, r - 10)); c.stroke();
      c.restore();
    }
    function fitFace() {
      if (!face || !ST) return;
      const base = ST.views[face.view].groups.base.bb;
      const top = panel.y + 66, bottom = panel.y + panel.h - 92;
      const avH = Math.max(80, bottom - top), avW = panel.w - 32;
      const fw = base[2] - base[0] + 40, fh = Math.min(base[3], 690) - base[1] + 20;
      const s = Math.min(avH / fh, avW / fw);
      view = { cx: panel.x + panel.w / 2, cy: top + avH / 2, s, ox: (base[0] + base[2]) / 2, oy: (base[1] + Math.min(base[3], 690)) / 2 };
    }
    /* stencil space (600 x 800 after the stencil's own transform) to screen */
    function toScreen(x, y) {
      const sx = (face.mirror ? -1 : 1) * (x - view.ox) * view.s, sy = (y - view.oy) * view.s;
      const c = Math.cos(face.roll), sn = Math.sin(face.roll);
      return { x: view.cx + sx * c - sy * sn, y: view.cy + sx * sn + sy * c };
    }
    function toStencil(px, py) {
      const dx = px - view.cx, dy = py - view.cy, c = Math.cos(-face.roll), sn = Math.sin(-face.roll);
      const sx = dx * c - dy * sn, sy = dx * sn + dy * c;
      return { x: view.ox + (face.mirror ? -1 : 1) * sx / view.s, y: view.oy + sy / view.s };
    }
    /* which keys are on screen left: mirroring swaps them */
    const screenKey = (k) => (!face.mirror ? k : k.endsWith('L') ? k.slice(0, -1) + 'R' : k.endsWith('R') ? k.slice(0, -1) + 'L' : k);
    function centre(k, v) {
      const g = ST.views[face.view].groups[k];
      return { x: g.cx + v[k].x * FU, y: g.cy + v[k].y * FU };
    }

    /* ---------- face lifecycle ---------- */
    function newFace() {
      face = genFace(rng, level);
      fitFace();
      maxLevel = Math.max(maxLevel, level);
      phase = 'show'; phaseT = now();
      drag = null;
      btn.hidden = false;
      L(`n${level}`);
      if (face.view !== 'front' || face.mirror) L(`v${face.view}${face.mirror ? 'm' : ''}`);
      if (lastLevelShown !== level) {
        lastLevelShown = level;
        pop(S.level(level), W / 2, panel.y + 100, { pill: true, dur: 1000, big: true });
      }
      hud(true);
    }
    function submit(how) {
      if (phase !== 'play') return;
      if (drag && drag.key) release();
      drag = null;
      face.left = how === 'D' ? Math.max(0, face.T - (now() - face.t0) / 1000) : 0;
      L(how);
      const acc = accuracyOf(face, face.val);
      const passed = acc >= face.pass;
      const mult = TUNE.mult(face.n);
      const pts = passed ? Math.round(acc * mult + 40 * (face.left / face.T) * mult) : 0;
      L(`a${acc}`);
      const from = {};
      for (const k of face.keys) from[k] = { ...face.val[k] };
      result = { acc, passed, pts, from };
      phase = 'reveal'; phaseT = now();
      btn.hidden = true;
      if (passed) {
        score += pts;
        level = face.n + 1;
        play('good');
      } else {
        lives -= 1;
        L('x');
        endMs = ms();
        shakeT = now();
        play('bad');
      }
      hud(true);
    }
    function finish() {
      if (done) return;
      done = true;
      phase = 'over';
      cancelAnimationFrame(raf);
      unbind();
      resolve({ score, level: maxLevel, durationMs: endMs || ms(), inputs, log });
    }

    /* ---------- input ---------- */
    function local(e) {
      const r = cv.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function pick(p) {
      const q = toStencil(p.x, p.y), pad = 16 / view.s + 6;
      let best = null, bd = Infinity;
      for (const k of face.keys) {
        const g = ST.views[face.view].groups[k], c = centre(k, face.val);
        const hw = Math.max(g.w / 2, 26) + pad, hh = Math.max(g.h / 2, 22) + pad;
        const dx = Math.abs(q.x - c.x), dy = Math.abs(q.y - c.y);
        if (dx <= hw && dy <= hh) { const d = Math.hypot(dx / hw, dy / hh); if (d < bd) { bd = d; best = k; } }
      }
      return best;
    }
    function onDown(e) {
      if (done || phase !== 'play') return;
      const p = local(e);
      const k = pick(p);
      if (!k) return;
      e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
      drag = { id: e.pointerId, key: k, last: toStencil(p.x, p.y), lifted: false };
      inputs++;
      L(`g${CODE[screenKey(k)]}`);
      cv.style.cursor = 'grabbing';
      play('tap', { vol: 0.6 });
    }
    function onMove(e) {
      const p = local(e);
      if (!drag) {
        if (phase === 'play' && e.pointerType === 'mouse') {
          hover = pick(p);
          cv.style.cursor = hover ? 'grab' : 'default';
        }
        return;
      }
      if (done || phase !== 'play') return;
      const q = toStencil(p.x, p.y);
      const v = face.val[drag.key];
      v.x = clamp(v.x + (q.x - drag.last.x) / FU, -TUNE.maxOff, TUNE.maxOff);
      v.y = clamp(v.y + (q.y - drag.last.y) / FU, -TUNE.maxOff, TUNE.maxOff);
      drag.last = q;
    }
    function release() {
      if (drag && drag.key) { const v = face.val[drag.key]; L(`r${CODE[screenKey(drag.key)]}${Math.round(v.x * 1000)},${Math.round(v.y * 1000)}`); }
    }
    function onUp() {
      if (!drag) return;
      release();
      drag = null;
      cv.style.cursor = 'default';
    }
    function onDone(e) {
      if (e) e.preventDefault();
      if (phase !== 'play') return;
      inputs++;
      submit('D');
    }
    function onKey(e) {
      if (e.key === 'Enter' && phase === 'play' && document.activeElement !== btn && root.contains(document.activeElement)) onDone(e);
    }
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
    btn.addEventListener('click', onDone);
    root.addEventListener('keydown', onKey);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {
      const r = root.getBoundingClientRect();
      if (Math.abs(r.width - W) > 0.5 || Math.abs(r.height - H) > 0.5) needLayout = true;
    }) : null;
    if (ro) ro.observe(root);
    const onWinResize = () => { needLayout = true; };
    window.addEventListener('resize', onWinResize);
    const onAbort = () => {
      if (done) { root.remove(); return; }
      done = true;
      cancelAnimationFrame(raf);
      unbind();
      root.remove();
      reject(abortError());
    };
    if (signal) signal.addEventListener('abort', onAbort, { once: true });
    function unbind() {
      cv.removeEventListener('pointerdown', onDown);
      cv.removeEventListener('pointermove', onMove);
      cv.removeEventListener('pointerup', onUp);
      cv.removeEventListener('pointercancel', onUp);
      btn.removeEventListener('click', onDone);
      root.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onWinResize);
      if (ro) ro.disconnect();
      btn.hidden = true;
      if (probe) delete host.__probe;
    }
    function pop(text, x, y, o = {}) {
      pops.push({ text, x, y, t: now(), dur: o.dur || 900, color: o.color || C.plum, big: !!o.big, pill: !!o.pill });
    }

    /* ---------- timing ---------- */
    const REVEAL = { guides: 260, slide: 700, hold: 1150, out: 260 };
    const REVEAL_TOTAL = REVEAL.slide + REVEAL.hold + REVEAL.out;
    function update(t) {
      if (phase === 'show' && t - phaseT >= 450) { phase = 'play'; face.t0 = t; }
      if (phase === 'play' && (t - face.t0) / 1000 >= face.T) submit('T');
      if (phase === 'reveal') {
        const k = easeInOut((t - phaseT - 150) / REVEAL.slide);
        for (const key of face.keys) { face.val[key].x = lerp(result.from[key].x, 0, k); face.val[key].y = lerp(result.from[key].y, 0, k); }
        if (t - phaseT >= REVEAL_TOTAL) {
          if (result.passed || lives > 0) newFace(); else finish();
        }
      }
    }

    /* ---------- drawing ---------- */
    function draw(t) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      let sx = 0;
      const sk = t - shakeT;
      if (sk < 340 && !reduce()) sx = Math.sin(sk * 0.09) * 7 * (1 - sk / 340);
      ctx.translate(sx, 0);
      ctx.drawImage(paperCv, 0, 0, W, H);
      if (!face) return;

      // timer and pass mark on a frosted strip
      const fx0 = panel.x + 22, fw = panel.w - 44, fy0 = panel.y + 22;
      const left = face.T ? timeLeft() / face.T : 0;
      ctx.font = `700 12px ${FONT}`; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      ctx.fillStyle = C.ink2; ctx.fillText(S.pass(face.pass), fx0, fy0 + 10);
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.ceil(timeLeft())}s`, fx0 + fw, fy0 + 10);
      rrect(ctx, fx0, fy0 + 17, fw, 6, 3); ctx.fillStyle = 'rgba(106,56,140,.12)'; ctx.fill();
      if (left > 0.002) {
        rrect(ctx, fx0, fy0 + 17, Math.max(6, fw * left), 6, 3);
        const g = ctx.createLinearGradient(fx0, 0, fx0 + fw, 0);
        if (left < 0.25) { g.addColorStop(0, C.rose); g.addColorStop(1, '#E8668F'); } else { g.addColorStop(0, C.plum); g.addColorStop(1, '#B48BDC'); }
        ctx.fillStyle = g; ctx.fill();
      }

      const show = phase === 'show' ? easeOut((t - phaseT) / 450) : 1;
      let out = 1;
      if (phase === 'reveal') { const e = t - phaseT - (REVEAL.slide + REVEAL.hold); if (e > 0) out = 1 - e / REVEAL.out; }
      const alpha = clamp(Math.min(show, out), 0, 1);
      const gk = phase === 'reveal' ? easeOut((t - phaseT) / REVEAL.guides) : 0;
      ctx.save();
      ctx.globalAlpha = alpha;
      drawFace(t, gk, reduce() ? 1 : lerp(0.97, 1, show));
      ctx.restore();

      // drag label
      if (drag && drag.key && phase === 'play') {
        const g = ST.views[face.view].groups[drag.key], c = centre(drag.key, face.val);
        const q = toScreen(c.x, c.y - g.h / 2);
        tag(S.f[drag.key], q.x, q.y - 26);
      }

      // result
      if (phase === 'reveal') {
        const e = t - phaseT;
        const a = clamp(e / 200, 0, 1) * clamp(out, 0, 1);
        const pc = reduce() ? 1 : lerp(0.85, 1, easeBack(e / 280));
        const cx = W / 2, cy = panel.y + panel.h - 54;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(cx, cy); ctx.scale(pc, pc);
        ctx.shadowColor = 'rgba(63,27,85,.25)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
        rrect(ctx, -96, -40, 192, 72, 22); ctx.fillStyle = 'rgba(255,252,248,.95)'; ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.font = `800 32px ${FONT}`;
        ctx.fillStyle = result.passed ? C.plum7 : C.rose;
        ctx.fillText(`${result.acc}%`, 0, 2);
        ctx.font = `700 12px ${FONT}`; ctx.fillStyle = C.ink2;
        ctx.fillText(result.passed ? `${S.accuracy}  +${result.pts}` : `${S.accuracy}  ·  ${S.miss}`, 0, 22);
        ctx.restore();
      }

      // pops
      pops = pops.filter((p) => t - p.t < p.dur);
      for (const p of pops) {
        const k = (t - p.t) / p.dur;
        const a = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
        const s = reduce() ? 1 : lerp(0.82, 1, easeBack((t - p.t) / 260));
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(p.x, p.y); ctx.scale(s, s);
        ctx.font = `700 ${p.big ? 22 : 17}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const tw = ctx.measureText(p.text).width + 40;
        ctx.shadowColor = 'rgba(63,27,85,.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
        rrect(ctx, -tw / 2, -22, tw, 44, 22); ctx.fillStyle = C.plum; ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#fff'; ctx.fillText(p.text, 0, 1);
        ctx.restore();
      }
    }
    function tag(text, x, y) {
      ctx.save();
      ctx.font = `700 13px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(text).width + 26;
      const lx = clamp(x, panel.x + tw / 2 + 8, panel.x + panel.w - tw / 2 - 8);
      const ly = clamp(y, panel.y + 60, panel.y + panel.h - 20);
      ctx.shadowColor = 'rgba(63,27,85,.3)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
      rrect(ctx, lx - tw / 2, ly - 15, tw, 30, 15); ctx.fillStyle = 'rgba(31,10,48,.88)'; ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#fff'; ctx.fillText(text, lx, ly + 0.5);
      ctx.restore();
    }
    /* the stencil in ink on paper; movable features carry their offsets */
    function faceTransform(scale) {
      ctx.translate(view.cx, view.cy);
      ctx.rotate(face.roll);
      ctx.scale(view.s * scale * (face.mirror ? -1 : 1), view.s * scale);
      ctx.translate(-view.ox, -view.oy);
    }
    function drawFace(t, guides, scale) {
      const V = ST.views[face.view], m = V.m;
      const active = drag && drag.key ? drag.key : phase === 'play' ? hover : null;
      ctx.save();
      faceTransform(scale);
      // guides first, under the ink
      if (guides > 0) drawGuides(V, guides);
      const ink = (k) => {
        ctx.save();
        if (k !== 'base') { const v = face.val[k]; ctx.translate(v.x * FU, v.y * FU); }
        ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
        ctx.fillStyle = k === active ? C.rose : C.paperInk;
        ctx.fill(V.groups[k].path, 'evenodd');
        ctx.restore();
      };
      // soft ink bleed under the line art
      ctx.save();
      ctx.shadowColor = 'rgba(43,34,56,.35)'; ctx.shadowBlur = Math.max(0.5, view.s * 1.2);
      ink('base');
      ctx.restore();
      for (const k of face.keys) ink(k);
      // grab marks: a faint ring under each movable feature while playing
      if (phase === 'play' || phase === 'show') {
        for (const k of face.keys) {
          const g = V.groups[k], c = centre(k, face.val), on = k === active;
          const rx = g.w / 2 + 8, ry = g.h / 2 + 7;
          ctx.save();
          ctx.translate(c.x, c.y);
          ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 6.283);
          ctx.setLineDash([3 / view.s * 2, 5 / view.s * 2]);
          ctx.lineWidth = (on ? 1.6 : 1) / view.s;
          ctx.strokeStyle = on ? 'rgba(204,51,102,.8)' : 'rgba(106,56,140,.22)';
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.restore();
    }
    function drawGuides(V, a) {
      const G = V.groups, lw = 1.2 / view.s;
      const base = G.base.bb, x0 = base[0] - 18, x1 = base[2] + 18;
      ctx.save();
      ctx.globalAlpha *= a;
      ctx.lineWidth = lw;
      ctx.setLineDash([6 / view.s, 5 / view.s]);
      const hline = (y, col) => { ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); };
      const avg = (a, b) => (a && b ? (a.cy + b.cy) / 2 : (a || b).cy);
      const brow = avg(G.browL, G.browR), eye = avg(G.eyeL, G.eyeR);
      hline(ST.SKULL_Y, 'rgba(106,56,140,.45)');
      hline(brow, 'rgba(106,56,140,.75)');
      hline(eye, 'rgba(168,134,205,.95)');
      if (G.nose) hline(G.nose.bb[3], 'rgba(106,56,140,.75)');
      if (G.lips) hline(G.lips.cy, 'rgba(204,51,102,.75)');
      hline(ST.CHIN_Y, 'rgba(106,56,140,.75)');
      // eye fifths
      if (face.view === 'front') {
        ctx.strokeStyle = 'rgba(168,134,205,.95)';
        const xs = [G.eyeL.bb[0], G.eyeL.bb[2], G.eyeR.bb[0], G.eyeR.bb[2]];
        for (const x of xs) { ctx.beginPath(); ctx.moveTo(x, brow - 30); ctx.lineTo(x, eye + 40); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(106,56,140,.35)';
        ctx.beginPath(); ctx.moveTo(300, ST.SKULL_Y - 10); ctx.lineTo(300, ST.CHIN_Y + 20); ctx.stroke();
      }
      ctx.setLineDash([]);
      // ideal places: pale ghosts of the features where they belong
      ctx.globalAlpha *= 0.14;
      for (const k of face.keys) {
        ctx.save();
        ctx.transform(V.m[0], V.m[1], V.m[2], V.m[3], V.m[4], V.m[5]);
        ctx.fillStyle = C.plum; ctx.fill(G[k].path, 'evenodd');
        ctx.restore();
      }
      ctx.restore();
    }

    function frame() {
      if (done) return;
      const t = now();
      if (needLayout) layout();
      update(t);
      if (done) return;
      draw(t);
      hud(false);
      raf = requestAnimationFrame(frame);
    }

    if (probe) {
      host.__probe = () => {
        if (!face || !ST) return { phase };
        const r = cv.getBoundingClientRect();
        const features = face.keys.map((k) => {
          const c = centre(k, face.val), g = ST.views[face.view].groups[k];
          const q = toScreen(c.x, c.y), ideal = toScreen(g.cx, g.cy);
          return { key: k, value: { ...face.val[k] }, x: q.x + r.left, y: q.y + r.top, ix: ideal.x + r.left, iy: ideal.y + r.top, err: Math.hypot(face.val[k].x, face.val[k].y) };
        });
        const b = btn.getBoundingClientRect();
        return {
          phase, level, lives, score, pass: face.pass, T: face.T, left: timeLeft(), moved: face.moved.slice(), view: face.view,
          pxPerFU: view.s * FU, features, done: { x: b.left + b.width / 2, y: b.top + b.height / 2 },
        };
      };
    }

    loadStencil().then((st) => {
      if (done) return;
      ST = st;
      t0 = now(); phaseT = t0;
      layout();
      newFace();
      raf = requestAnimationFrame(frame);
    }).catch(() => {
      if (done) return;
      done = true;
      unbind();
      root.remove();
      reject(new Error('stencil'));
    });
  });
}

export default {
  id: 'proportion',
  title: { en: STR.en.title, th: STR.th.title },
  how: { en: STR.en.how, th: STR.th.how },
  run,
};
