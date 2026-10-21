/* Steady Hand: trace a suture line from the start dot to the end dot inside a guide band.
 *
 * Hub interface: default export {id, title, how, run(host, {lang, level, rng, signal, onHud, muted})}.
 * run() resolves with {score, level, durationMs, inputs, log} when the third line fails,
 * and rejects with an AbortError when `signal` aborts.
 *
 * Rules per line
 *   - Press the start dot, then trace forward to the end dot.
 *   - Outside the band the steadiness meter drains; an empty meter fails the line.
 *   - Moving backwards, lifting off for more than 500 ms or running out of time also fails the line.
 *   - Three lives per run. A failed line costs a life and a new line of the same level follows.
 *
 * Scoring per completed line
 *   lineScore = round((100 * lengthUnits * accuracy + 120 * timeLeftShare) * (1 + 0.2 * (level - 1)))
 *   lengthUnits   = path length with the stage short side = 1, measured on a fixed 1.6 aspect,
 *                   so the same seed scores the same on every screen.
 *   accuracy      = time-weighted closeness to the centre line while tracing: full credit within
 *                   30% of the half band, falling to 0 at the band edge.
 *   timeLeftShare = remaining time / line time limit, at the moment the line is finished.
 *
 * Difficulty per level n (lines are drawn from the seeded rng only)
 *   band width   = max(0.034, 0.15 * 0.9^(n-1)) of the stage unit (short side, clamped 300 to 400 px)
 *   time limit   = 0.9 s + lengthUnits / (0.3 * 1.14^(n-1))
 *   path family  = 1-2 gentle curve, 3-4 S-curve, 5 tight curves, 6 zigzag, 7 loops, 8 closed loop,
 *                  9+ random mix of the hard families with more turns each level
 *   motion       = drift from level 9, pulse from level 12
 *
 * Log entries are [ms, action] with actions:
 *   z<w>x<h> stage size, n<level> new line, d<x>,<y> press, m<x>,<y> move (sampled every 50 ms),
 *   u release, s line started at the start dot, ok<points> line done, x<reason> line failed (off|back|lift|time).
 *   Coordinates are stage pixels, rounded.
 */

const STR = {
  en: {
    title: 'Steady Hand',
    how: 'Trace the stitch line without leaving it.',
    time: 'Time', steady: 'Steadiness', start: 'Start', end: 'End',
    level: (n) => `Level ${n}`,
    miss: { off: 'Off the line', back: 'Wrong way', lift: 'Finger lifted', time: 'Out of time' },
  },
  th: {
    title: 'มือนิ่ง',
    how: 'ลากตามแนวเย็บโดยไม่ออกนอกแนว',
    time: 'เวลา', steady: 'ความนิ่ง', start: 'เริ่ม', end: 'จบ',
    level: (n) => `ระดับ ${n}`,
    miss: { off: 'ออกนอกแนว', back: 'ลากย้อนทาง', lift: 'ยกนิ้วนานเกินไป', time: 'หมดเวลา' },
  },
};

const C = {
  plum: '#6A388C', plum7: '#55286F', night: '#1F0A30', lilac: '#A886CD', lilac3: '#C9B3DD',
  lilac1: '#F1EAF7', wash: '#FBF3FB', ink: '#2A1F33', ink2: '#5A4A66', rose: '#CC3366',
};
const FONT = '"LINE Seed","Sarabun","Noto Sans Thai",system-ui,sans-serif';
const ASPECT = 1.6;   // nominal long side / short side for path generation
const STEP = 0.006;   // resample spacing, nominal units

const TUNE = {
  band: (n) => Math.max(0.034, 0.15 * Math.pow(0.9, n - 1)),
  speed: (n) => 0.3 * Math.pow(1.14, n - 1),
  drift: (n) => (n < 9 ? 0 : Math.min(0.06, 0.014 + 0.008 * (n - 9))),
  pulse: (n) => (n < 12 ? 0 : Math.min(0.08, 0.025 + 0.01 * (n - 12))),
  drain: (n) => 1.5 + 0.06 * (n - 1),
  liftMs: 500,
};

/* ---------- small helpers ---------- */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeBack = (t) => { t = clamp(t, 0, 1); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
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
function injectCSS() {
  if (document.getElementById('ag-steady-css')) return;
  const s = document.createElement('style');
  s.id = 'ag-steady-css';
  s.textContent = `.ag-steady{position:relative;width:100%;height:100%;overflow:hidden;background:transparent;
    -webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
  .ag-steady canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:crosshair}`;
  document.head.appendChild(s);
}

/* ---------- path generation (nominal frame: X in [0, 1.6], Y in [0, 1]) ---------- */
function catmullRom(ctrl, per = 28) {
  const n = ctrl.length;
  const ext = (a, b) => [2 * a[0] - b[0], 2 * a[1] - b[1]];
  const P = [ext(ctrl[0], ctrl[1]), ...ctrl, ext(ctrl[n - 1], ctrl[n - 2])];
  const out = [];
  const tj = (ti, a, b) => ti + Math.max(1e-4, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])));
  for (let i = 1; i < P.length - 2; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
    const t0 = 0, t1 = tj(t0, p0, p1), t2 = tj(t1, p1, p2), t3 = tj(t2, p2, p3);
    for (let k = 0; k < per; k++) {
      const t = t1 + ((t2 - t1) * k) / per;
      const pt = [0, 0];
      for (let d = 0; d < 2; d++) {
        const A1 = ((t1 - t) / (t1 - t0)) * p0[d] + ((t - t0) / (t1 - t0)) * p1[d];
        const A2 = ((t2 - t) / (t2 - t1)) * p1[d] + ((t - t1) / (t2 - t1)) * p2[d];
        const A3 = ((t3 - t) / (t3 - t2)) * p2[d] + ((t - t2) / (t3 - t2)) * p3[d];
        const B1 = ((t2 - t) / (t2 - t0)) * A1 + ((t - t0) / (t2 - t0)) * A2;
        const B2 = ((t3 - t) / (t3 - t1)) * A2 + ((t - t1) / (t3 - t1)) * A3;
        pt[d] = ((t2 - t) / (t2 - t1)) * B1 + ((t - t1) / (t2 - t1)) * B2;
      }
      out.push(pt);
    }
  }
  out.push(ctrl[n - 1].slice());
  return out;
}
function resample(dense) {
  for (const p of dense) { p[0] = clamp(p[0], 0.02, ASPECT - 0.02); p[1] = clamp(p[1], 0.03, 0.97); }
  const cum = [0];
  for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const L = cum[cum.length - 1];
  const N = Math.max(2, Math.ceil(L / STEP) + 1);
  const pts = new Float64Array(N * 2);
  let j = 0;
  for (let k = 0; k < N; k++) {
    const s = (L * k) / (N - 1);
    while (j < cum.length - 2 && cum[j + 1] < s) j++;
    const seg = cum[j + 1] - cum[j] || 1;
    const t = clamp((s - cum[j]) / seg, 0, 1);
    pts[k * 2] = lerp(dense[j][0], dense[j + 1][0], t);
    pts[k * 2 + 1] = lerp(dense[j][1], dense[j + 1][1], t);
  }
  return { pts, N, L };
}
const jit = (r, a) => (r() * 2 - 1) * a;

function genGentle(r, bumps) {
  const n = 3 + bumps, ctrl = [];
  let sgn = r() < 0.5 ? -1 : 1;
  for (let i = 0; i < n; i++) {
    const x = 0.1 + (i * 1.4) / (n - 1);
    const end = i === 0 || i === n - 1;
    const y = end ? 0.5 + jit(r, 0.16) : 0.5 + sgn * (0.1 + r() * 0.1);
    if (!end) sgn = -sgn;
    ctrl.push([x, y]);
  }
  return catmullRom(ctrl);
}
function genWave(r, n, amp) {
  const ctrl = [];
  let sgn = r() < 0.5 ? -1 : 1;
  for (let i = 0; i < n; i++) {
    const x = 0.08 + ((i + (i && i < n - 1 ? jit(r, 0.18) : 0)) * 1.44) / (n - 1);
    const end = i === 0 || i === n - 1;
    const y = end ? 0.5 + sgn * amp * 0.4 : 0.5 + sgn * amp * (0.8 + r() * 0.2);
    ctrl.push([x, y]);
    sgn = -sgn;
  }
  return catmullRom(ctrl);
}
function genZigzag(r, corners) {
  const n = corners + 2, raw = [];
  let up = r() < 0.5;
  for (let i = 0; i < n; i++) {
    const x = 0.08 + (i * 1.44) / (n - 1);
    const end = i === 0 || i === n - 1;
    const y = end ? 0.5 + jit(r, 0.1) : (up ? 0.16 : 0.84) + jit(r, 0.05);
    raw.push([x, y]);
    up = !up;
  }
  const ctrl = [raw[0]];
  for (let i = 1; i < n - 1; i++) {
    const a = raw[i - 1], b = raw[i], c = raw[i + 1];
    const k = 0.07;
    ctrl.push([lerp(b[0], a[0], k), lerp(b[1], a[1], k)], b, [lerp(b[0], c[0], k), lerp(b[1], c[1], k)]);
  }
  ctrl.push(raw[n - 1]);
  return catmullRom(ctrl, 14);
}
function genLoops(r, k) {
  // prolate trochoid: x = s*th - rad*sin(th), y = -rad*cos(th); loops where rad > s
  const span = 1.36, ratio = 1.75 + r() * 0.5;
  const s = span / (2 * Math.PI * k + 2), rad = Math.min(0.3, s * ratio);
  const tilt = jit(r, 0.08);
  const out = [], M = 220 * k;
  const th0 = Math.PI / 2, th1 = th0 + 2 * Math.PI * k;
  const x0 = s * th0 - rad * Math.sin(th0);
  for (let i = 0; i <= M; i++) {
    const th = lerp(th0, th1, i / M);
    const x = s * th - rad * Math.sin(th) - x0;
    const y = -rad * Math.cos(th);
    const xn = 0.12 + x;
    out.push([xn, 0.5 + y + tilt * (xn / ASPECT - 0.5)]);
  }
  return out;
}
function genBlob(r, wobble) {
  const cx = ASPECT / 2, cy = 0.5, rx = 0.56, ry = 0.36;
  const h2 = jit(r, wobble), h3 = jit(r, wobble), p2 = r() * 6.283, p3 = r() * 6.283;
  const th0 = r() * 6.283, dir = r() < 0.5 ? 1 : -1, sweep = 2 * Math.PI * 0.9;
  const out = [];
  for (let i = 0; i <= 360; i++) {
    const th = th0 + dir * sweep * (i / 360);
    const k = 1 + h2 * Math.sin(2 * th + p2) + h3 * Math.sin(3 * th + p3);
    out.push([cx + Math.cos(th) * rx * k, cy + Math.sin(th) * ry * k]);
  }
  return out;
}
function genPath(r, n) {
  let dense;
  if (n <= 1) dense = genGentle(r, 1);
  else if (n === 2) dense = genGentle(r, 2);
  else if (n === 3) dense = genWave(r, 5, 0.26);
  else if (n === 4) dense = genWave(r, 6, 0.32);
  else if (n === 5) dense = genWave(r, 8, 0.36);
  else if (n === 6) dense = genZigzag(r, 5);
  else if (n === 7) dense = genLoops(r, 2);
  else if (n === 8) dense = genBlob(r, 0.08);
  else {
    const c = n - 9, pick = Math.floor(r() * 4);
    if (pick === 0) dense = genWave(r, Math.min(13, 9 + c), 0.38);
    else if (pick === 1) dense = genZigzag(r, Math.min(10, 6 + c));
    else if (pick === 2) dense = genLoops(r, Math.min(5, 2 + Math.floor((c + 1) / 2)));
    else dense = genBlob(r, Math.min(0.16, 0.1 + 0.015 * c));
  }
  if (r() < 0.5) dense.reverse();
  return resample(dense);
}

/* ---------- game ---------- */
function run(host, opts = {}) {
  const { lang = 'en', level: startLevel = 1, rng = Math.random, signal, onHud = () => {}, muted = true, probe = false } = opts;
  return new Promise((resolve, reject) => {
    if (signal && signal.aborted) { reject(abortError()); return; }
    const S = STR[lang] || STR.en;
    injectCSS();
    const root = document.createElement('div');
    root.className = 'ag-steady';
    root.setAttribute('role', 'application');
    root.setAttribute('aria-label', S.title);
    const cv = document.createElement('canvas');
    root.appendChild(cv);
    host.appendChild(root);
    const ctx = cv.getContext('2d');
    const bandCv = document.createElement('canvas');
    const bctx = bandCv.getContext('2d');
    const skinCv = document.createElement('canvas');
    const layerCv = document.createElement('canvas'); // skin + band + suture, reused while the line is still
    let layerKey = '';
    const fx = mulberry32((rng() * 4294967296) >>> 0); // cosmetic randomness, seeded from the run rng
    const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const reduce = () => !!(mq && mq.matches);
    const now = () => performance.now();

    const t0 = now();
    let lastMs = 0;
    const ms = () => (lastMs = Math.max(lastMs, Math.round(now() - t0))); // monotonic log clock
    const log = [];
    const L = (a) => log.push([ms(), a]);

    let W = 1, H = 1, dpr = 1, panel = null, inner = null, unit = 300, portrait = false, needLayout = true;
    let level = Math.max(1, startLevel | 0), maxLevel = level, lives = 3, score = 0, inputs = 0;
    let phase = 'show', phaseT = t0, phaseEnd = 0, line = null, lastLevelShown = 0;
    let pressed = false, ptr = { x: 0, y: 0 }, liftAt = 0, lastMoveLog = -1e9, endMs = 0;
    let pops = [], parts = [], shakeT = -1e9, glowT = -1e9, raf = 0, done = false, lastHud = '';
    let ac = null;

    function blip(freq, dur = 0.09, type = 'sine', gain = 0.04) {
      if (muted) return;
      try {
        ac = ac || new (window.AudioContext || window.webkitAudioContext)();
        const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
        o.type = type; o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
      } catch { /* audio unavailable */ }
    }

    function hud(force) {
      const time = line && phase === 'play' ? Math.max(0, Math.ceil((line.T - line.time) * 10) / 10) : line ? Math.round(line.T * 10) / 10 : 0;
      const key = `${score}|${level}|${lives}|${time}`;
      if (!force && key === lastHud) return;
      lastHud = key;
      try { onHud({ score, level, lives, time }); } catch { /* hub error */ }
    }

    /* layout */
    function layout() {
      const r = root.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      for (const c of [cv, bandCv, skinCv, layerCv]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
      const pad = W < 560 ? 8 : 14;
      panel = { x: pad, y: pad, w: W - pad * 2, h: H - pad * 2, r: W < 560 ? 20 : 28 };
      portrait = panel.h > panel.w;
      unit = clamp(Math.min(panel.w, panel.h - 56), 300, 400); // band size nearly equal on phones and desktops
      paintSkin();
      layerKey = '';
      if (line) fitLine();
      L(`z${Math.round(W)}x${Math.round(H)}`);
      needLayout = false;
    }
    function paintSkin() {
      const c = skinCv.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, W, H);
      const { x, y, w, h, r } = panel;
      c.save();
      c.shadowColor = 'rgba(63,27,85,.22)'; c.shadowBlur = 30; c.shadowOffsetY = 12;
      rrect(c, x, y, w, h, r);
      const g = c.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, '#F9ECE6'); g.addColorStop(0.55, '#F5E2DA'); g.addColorStop(1, '#EFD6CC');
      c.fillStyle = g; c.fill();
      c.restore();
      c.save();
      rrect(c, x, y, w, h, r); c.clip();
      const hl = c.createRadialGradient(x + w * 0.25, y + h * 0.2, 0, x + w * 0.25, y + h * 0.2, Math.max(w, h) * 0.75);
      hl.addColorStop(0, 'rgba(255,255,255,.55)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = hl; c.fillRect(x, y, w, h);
      const pr = mulberry32(1234567); // fixed pore pattern, independent of the run rng
      const count = Math.round((w * h) / 420);
      for (let i = 0; i < count; i++) {
        const px = x + pr() * w, py = y + pr() * h, rr = 0.4 + pr() * 0.9;
        c.fillStyle = pr() < 0.5 ? 'rgba(176,120,112,.10)' : 'rgba(255,255,255,.35)';
        c.beginPath(); c.arc(px, py, rr, 0, 6.283); c.fill();
      }
      c.lineWidth = 1; c.strokeStyle = 'rgba(106,56,140,.10)';
      rrect(c, x + 0.5, y + 0.5, w - 1, h - 1, r); c.stroke();
      c.restore();
    }
    function fitLine() {
      const hb = (line.bandFrac * unit) / 2;
      const motion = (line.drift * 1.1 + line.pulse * 0.6) * Math.min(panel.w, panel.h);
      const m = hb + 22 + motion;
      const top = 50;
      inner = { x: panel.x + m, y: panel.y + top + m * 0.7, w: panel.w - m * 2, h: panel.h - top - m * 1.7 };
      inner.w = Math.max(40, inner.w); inner.h = Math.max(40, inner.h);
      mapLine(line.time || 0);
    }
    const halfBand = () => (line ? (line.bandFrac * unit) / 2 : 10);

    function mapLine(tSec) {
      const { pts, N } = line;
      const X = line.X, Y = line.Y, cum = line.cum;
      let dA = 0, dB = 0, k = 1;
      if (line.drift) { dA = line.drift * ASPECT * Math.sin(tSec * 0.55 + line.ph1); dB = line.drift * Math.cos(tSec * 0.43 + line.ph2); }
      if (line.pulse) k = 1 + line.pulse * Math.sin(tSec * 1.5 + line.ph2);
      const cx = ASPECT / 2, cy = 0.5;
      for (let i = 0; i < N; i++) {
        const a = (cx + (pts[i * 2] - cx) * k + dA) / ASPECT;
        const b = cy + (pts[i * 2 + 1] - cy) * k + dB;
        if (portrait) { X[i] = inner.x + (1 - b) * inner.w; Y[i] = inner.y + a * inner.h; }
        else { X[i] = inner.x + a * inner.w; Y[i] = inner.y + b * inner.h; }
        cum[i] = i ? cum[i - 1] + Math.hypot(X[i] - X[i - 1], Y[i] - Y[i - 1]) : 0;
      }
      line.Lpx = cum[N - 1] || 1;
    }
    function pointAt(u) {
      const { N, X, Y } = line;
      const f = clamp(u, 0, 1) * (N - 1), i = Math.min(N - 2, Math.floor(f)), t = f - i;
      const dx = X[i + 1] - X[i], dy = Y[i + 1] - Y[i], len = Math.hypot(dx, dy) || 1;
      return { x: lerp(X[i], X[i + 1], t), y: lerp(Y[i], Y[i + 1], t), tx: dx / len, ty: dy / len };
    }
    function nearest(px, py, u0, u1) {
      const { N, X, Y, cum, Lpx } = line;
      const i0 = clamp(Math.floor(u0 * (N - 1)), 0, N - 2), i1 = clamp(Math.ceil(u1 * (N - 1)), 1, N - 1);
      let best = Infinity, bu = 0, lat = 0;
      for (let i = i0; i < i1; i++) {
        const ax = X[i], ay = Y[i], dx = X[i + 1] - ax, dy = Y[i + 1] - ay;
        const l2 = dx * dx + dy * dy || 1e-9;
        const t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
        const qx = ax + dx * t, qy = ay + dy * t;
        const d2 = (px - qx) * (px - qx) + (py - qy) * (py - qy);
        if (d2 < best) {
          best = d2; bu = (cum[i] + t * Math.sqrt(l2)) / Lpx;
          lat = (dx * (py - ay) - dy * (px - ax)) / Math.sqrt(l2);
        }
      }
      return { d: Math.sqrt(best), u: bu, lat };
    }

    /* line lifecycle */
    function newLine() {
      const n = level;
      const g = genPath(rng, n);
      line = {
        n, pts: g.pts, N: g.N, Lnorm: g.L, bandFrac: TUNE.band(n), T: 0.9 + g.L / TUNE.speed(n),
        drift: TUNE.drift(n), pulse: TUNE.pulse(n), ph1: rng() * 6.283, ph2: rng() * 6.283,
        X: new Float32Array(g.N), Y: new Float32Array(g.N), cum: new Float32Array(g.N), Lpx: 1,
        started: false, u: 0, d: 0, steady: 1, accN: 0, accD: 0, trace: [], time: 0, t0: 0,
      };
      lineId++;
      fitLine();
      maxLevel = Math.max(maxLevel, n);
      phase = 'show'; phaseT = now();
      pressed = false;
      L(`n${n}`);
      if (lastLevelShown !== n) {
        lastLevelShown = n;
        pop(S.level(n), W / 2, panel.y + 88, { big: true, dur: 1100, pill: true });
      }
      hud(true);
    }
    function startPlay() {
      phase = 'play'; line.t0 = now(); line.time = 0;
    }
    function fail(reason) {
      if (phase !== 'play') return;
      const t = now();
      phase = 'miss'; phaseEnd = t + 1050;
      lives -= 1;
      L(`x${reason}`);
      endMs = ms();
      shakeT = t;
      const at = line.started ? ptr : pointAt(0);
      pop(S.miss[reason], clamp(at.x, 90, W - 90), clamp(at.y - 46, panel.y + 70, H - 40), { color: C.rose, dur: 1000 });
      blip(196, 0.22, 'triangle', 0.05);
      hud(true);
    }
    function win() {
      const t = now();
      const acc = line.accD > 0 ? line.accN / line.accD : 0;
      const left = clamp(1 - line.time / line.T, 0, 1);
      const mult = 1 + 0.2 * (line.n - 1);
      const pts = Math.round((100 * line.Lnorm * acc + 120 * left) * mult);
      score += pts;
      L(`ok${pts}`);
      phase = 'win'; phaseEnd = t + 850; glowT = t;
      const e = pointAt(1);
      pop(`+${pts}`, clamp(e.x, 50, W - 50), clamp(e.y - 34, panel.y + 70, H - 30), { color: C.plum, dur: 900 });
      if (!reduce()) for (let i = 0; i < 26; i++) {
        const p = pointAt(fx());
        parts.push({ x: p.x, y: p.y, vx: (fx() - 0.5) * 70, vy: -20 - fx() * 60, t: t, life: 600 + fx() * 400, c: fx() < 0.5 ? C.rose : C.lilac, r: 1 + fx() * 2 });
      }
      blip(660, 0.09); setTimeout(() => blip(880, 0.12), 90);
      level = line.n + 1;
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

    /* input */
    function local(e) {
      const r = cv.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function evalPointer(p) {
      const Lpx = line.Lpx, hb = halfBand();
      const back = Math.max(hb * 0.9, 14) / Lpx;
      const fwd = Math.max(hb * 3, 56) / Lpx;
      const r = nearest(p.x, p.y, line.u - back - 30 / Lpx, line.u + fwd);
      line.d = r.d;
      if (r.d <= hb) {
        if (r.u < line.u - back) { fail('back'); return; }
        if (r.u > line.u) line.u = r.u;
      }
      const last = line.trace[line.trace.length - 1];
      if (!last || Math.abs(last.u - r.u) * Lpx > 1.5 || Math.abs(last.lat - r.lat) > 1.5) {
        line.trace.push({ u: r.u, lat: clamp(r.lat, -hb * 3, hb * 3) });
      }
      if (line.u >= 1 - Math.max(hb, 10) / Lpx) win();
    }
    function onDown(e) {
      if (done || phase !== 'play') return;
      e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
      const p = local(e);
      inputs++;
      L(`d${Math.round(p.x)},${Math.round(p.y)}`);
      pressed = true; ptr = p; lastMoveLog = now();
      if (!line.started) {
        const s = pointAt(0), hb = halfBand();
        if (Math.hypot(p.x - s.x, p.y - s.y) <= Math.max(hb * 1.5, 22)) {
          line.started = true;
          L('s');
          blip(520, 0.06);
          evalPointer(p);
        }
      } else {
        evalPointer(p);
      }
    }
    function onMove(e) {
      if (!pressed || done || phase !== 'play') return;
      const p = local(e);
      ptr = p;
      const t = now();
      if (t - lastMoveLog >= 50) { lastMoveLog = t; L(`m${Math.round(p.x)},${Math.round(p.y)}`); }
      if (line.started) evalPointer(p);
    }
    function onUp(e) {
      if (!pressed) return;
      pressed = false;
      if (done) return;
      const p = e && e.clientX != null ? local(e) : ptr;
      L(`m${Math.round(p.x)},${Math.round(p.y)}`);
      L('u');
      liftAt = now();
    }
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
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
      window.removeEventListener('resize', onWinResize);
      if (ro) ro.disconnect();
      if (ac) { try { ac.close(); } catch { /* closed */ } ac = null; }
      if (probe) delete host.__probe;
    }

    /* feedback */
    function pop(text, x, y, o = {}) {
      pops.push({ text, x, y, t: now(), dur: o.dur || 900, color: o.color || C.plum, big: !!o.big, pill: !!o.pill });
    }

    /* frame */
    function update(t, dt) {
      if (phase === 'show' && t - phaseT >= 600) startPlay();
      if (phase === 'play') {
        line.time = (t - line.t0) / 1000;
        if (line.drift || line.pulse) mapLine(line.time);
        if (line.time >= line.T) { fail('time'); return; }
        if (line.started) {
          if (!pressed) {
            if (t - liftAt > TUNE.liftMs) { fail('lift'); return; }
          } else {
            evalPointer(ptr);
            if (phase !== 'play') return;
            const hb = halfBand(), d = line.d;
            const c = d <= hb * 0.3 ? 1 : clamp(1 - (d - hb * 0.3) / (hb * 0.7), 0, 1);
            line.accN += c * dt; line.accD += dt;
            if (d > hb) {
              line.steady -= dt * TUNE.drain(line.n) * (1 + 1.6 * Math.min(1, (d - hb) / hb));
              if (line.steady <= 0) { line.steady = 0; fail('off'); return; }
            } else {
              line.steady = Math.min(1, line.steady + dt * 0.12);
            }
          }
        }
      } else if (phase === 'win' && t >= phaseEnd) {
        newLine();
      } else if (phase === 'miss' && t >= phaseEnd) {
        if (lives > 0) newLine(); else finish();
      }
    }

    function strokePath(c, upto) {
      const { N, X, Y } = line;
      const end = Math.max(1, Math.min(N - 1, Math.round(upto * (N - 1))));
      c.beginPath();
      c.moveTo(X[0], Y[0]);
      for (let i = 1; i <= end; i++) c.lineTo(X[i], Y[i]);
    }

    let lineId = 0;
    function drawSuture(c, reveal, hb) {
      // guide band: soft lilac fill with crisper edges, rendered off-screen so self-crossing loops stay clean
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.clearRect(0, 0, W, H);
      bctx.lineCap = 'round'; bctx.lineJoin = 'round';
      strokePath(bctx, reveal);
      bctx.strokeStyle = 'rgba(168,134,205,.95)'; bctx.lineWidth = hb * 2 + 2.5; bctx.stroke();
      bctx.globalCompositeOperation = 'destination-out';
      bctx.strokeStyle = 'rgba(0,0,0,.7)'; bctx.lineWidth = Math.max(1, hb * 2 - 2); bctx.stroke();
      bctx.globalCompositeOperation = 'source-over';
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = 0.62;
      c.drawImage(bandCv, 0, 0);
      c.restore();
      // dotted suture line
      c.lineCap = 'round'; c.lineJoin = 'round';
      strokePath(c, reveal);
      c.setLineDash([0.01, 7]);
      c.strokeStyle = 'rgba(85,40,111,.55)'; c.lineWidth = 2.2; c.stroke();
      c.setLineDash([]);
      stitches(c, reveal, hb, false);
    }
    function stitches(c, reveal, hb, passedOnly) {
      const Lpx = line.Lpx;
      const gap = clamp(hb * 1.5, 16, 30);
      const tick = clamp(hb * 0.62, 4, 11);
      const lim = passedOnly ? (line.started ? line.u * Lpx : 0) : Lpx * reveal;
      for (let s = gap * 0.5; s < lim; s += gap) {
        const p = pointAt(s / Lpx);
        const nx = -p.ty, ny = p.tx;
        const sl = 0.35; // slant like a running stitch
        const ax = nx + p.tx * sl, ay = ny + p.ty * sl, al = Math.hypot(ax, ay);
        c.beginPath();
        c.moveTo(p.x - (ax / al) * tick, p.y - (ay / al) * tick);
        c.lineTo(p.x + (ax / al) * tick, p.y + (ay / al) * tick);
        c.strokeStyle = passedOnly ? 'rgba(204,51,102,.9)' : 'rgba(106,56,140,.45)';
        c.lineWidth = passedOnly ? 2.2 : 1.6;
        c.stroke();
      }
    }

    function draw(t) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      let sx = 0, sy = 0;
      const sk = t - shakeT;
      if (sk < 320 && !reduce()) { const a = (1 - sk / 320) * 7; sx = Math.sin(sk * 0.09) * a; sy = Math.cos(sk * 0.13) * a * 0.4; }
      ctx.translate(sx, sy);
      if (!line) { ctx.drawImage(skinCv, 0, 0, W, H); return; }

      const hb = halfBand();
      const reveal = phase === 'show' ? easeOut((t - phaseT) / 560) : 1;
      const still = reveal >= 1 && !line.drift && !line.pulse;
      if (still) {
        const key = `${lineId}|${W}|${H}|${dpr}`;
        if (key !== layerKey) {
          const lc = layerCv.getContext('2d');
          lc.setTransform(dpr, 0, 0, dpr, 0, 0);
          lc.clearRect(0, 0, W, H);
          lc.drawImage(skinCv, 0, 0, W, H);
          lc.save(); rrect(lc, panel.x, panel.y, panel.w, panel.h, panel.r); lc.clip();
          drawSuture(lc, 1, hb);
          lc.restore();
          layerKey = key;
        }
        ctx.drawImage(layerCv, 0, 0, W, H);
      } else {
        ctx.drawImage(skinCv, 0, 0, W, H);
      }
      ctx.save();
      rrect(ctx, panel.x, panel.y, panel.w, panel.h, panel.r);
      ctx.clip();
      if (!still) drawSuture(ctx, reveal, hb);
      if (line.started) stitches(ctx, 1, hb, true);

      // success glow
      const gt = t - glowT;
      if (gt < 850) {
        const a = 1 - gt / 850;
        ctx.save();
        ctx.shadowColor = `rgba(204,51,102,${0.55 * a})`; ctx.shadowBlur = 18;
        strokePath(ctx, 1);
        ctx.strokeStyle = `rgba(255,255,255,${0.75 * a})`; ctx.lineWidth = hb * 2; ctx.stroke();
        ctx.restore();
      }

      // trace
      if (line.trace.length > 1) {
        ctx.save();
        ctx.beginPath();
        const P = line.trace.map((q) => { const p = pointAt(q.u); return [p.x - p.ty * q.lat, p.y + p.tx * q.lat]; });
        ctx.moveTo(P[0][0], P[0][1]);
        for (let i = 1; i < P.length - 1; i++) ctx.quadraticCurveTo(P[i][0], P[i][1], (P[i][0] + P[i + 1][0]) / 2, (P[i][1] + P[i + 1][1]) / 2);
        ctx.lineTo(P[P.length - 1][0], P[P.length - 1][1]);
        const tw = clamp(hb * 0.32, 2.4, 4);
        ctx.strokeStyle = 'rgba(204,51,102,.16)'; ctx.lineWidth = tw + 6; ctx.stroke();
        ctx.strokeStyle = C.rose; ctx.lineWidth = tw; ctx.stroke();
        ctx.restore();
      }

      // start and end dots
      if (reveal > 0.15) {
        const s = pointAt(0), e = pointAt(1);
        const r0 = clamp(hb * 0.55, 7, 11);
        const ctrX = panel.x + panel.w / 2, ctrY = panel.y + panel.h / 2;
        // end
        ctx.beginPath(); ctx.arc(e.x, e.y, r0 + 1, 0, 6.283);
        ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = C.plum; ctx.stroke();
        ctx.beginPath(); ctx.arc(e.x, e.y, r0 * 0.38, 0, 6.283); ctx.fillStyle = C.plum; ctx.fill();
        // start
        if (!line.started && phase === 'play' && !reduce()) {
          const k = ((t - line.t0) % 1300) / 1300;
          ctx.beginPath(); ctx.arc(s.x, s.y, r0 + 4 + k * 16, 0, 6.283);
          ctx.strokeStyle = `rgba(106,56,140,${0.45 * (1 - k)})`; ctx.lineWidth = 2; ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(s.x, s.y, r0 + 2.5, 0, 6.283); ctx.fillStyle = '#fff'; ctx.fill();
        ctx.beginPath(); ctx.arc(s.x, s.y, r0, 0, 6.283); ctx.fillStyle = line.started ? C.rose : C.plum; ctx.fill();
        // labels, pushed toward the panel centre
        ctx.font = `600 12px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const lab = (p, txt) => {
          let dx = ctrX - p.x, dy = ctrY - p.y; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
          // keep the label off the path: offset along the normal on the side facing the centre
          let nx = -p.ty, ny = p.tx; if (nx * dx + ny * dy < 0) { nx = -nx; ny = -ny; }
          const off = r0 + hb + 14;
          const lx = clamp(p.x + nx * off, panel.x + 26, panel.x + panel.w - 26), ly = clamp(p.y + ny * off, panel.y + 58, panel.y + panel.h - 14);
          const tw = ctx.measureText(txt).width + 14;
          rrect(ctx, lx - tw / 2, ly - 10, tw, 20, 10);
          ctx.fillStyle = 'rgba(255,255,255,.82)'; ctx.fill();
          ctx.fillStyle = C.plum7; ctx.fillText(txt, lx, ly + 0.5);
        };
        if (!line.started) { lab(s, S.start); lab(e, S.end); }
      }

      // pointer ring
      if (pressed && line.started && phase === 'play') {
        const out = line.d > hb;
        ctx.beginPath(); ctx.arc(ptr.x, ptr.y, 9, 0, 6.283);
        ctx.strokeStyle = out ? 'rgba(204,51,102,.9)' : 'rgba(106,56,140,.55)'; ctx.lineWidth = 2; ctx.stroke();
      }

      // particles
      parts = parts.filter((p) => t - p.t < p.life);
      for (const p of parts) {
        const k = (t - p.t) / p.life, s = (t - p.t) / 1000;
        ctx.globalAlpha = 1 - k;
        ctx.beginPath(); ctx.arc(p.x + p.vx * s, p.y + p.vy * s + 40 * s * s, p.r, 0, 6.283);
        ctx.fillStyle = p.c; ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // bars: time and steadiness
      const bx = panel.x + 18, by = panel.y + 16, bw = (panel.w - 18 * 3) / 2;
      const timeLeft = phase === 'play' ? clamp(1 - line.time / line.T, 0, 1) : phase === 'show' ? 1 : clamp(1 - line.time / line.T, 0, 1);
      bar(bx, by, bw, S.time, timeLeft, timeLeft < 0.25 ? C.rose : C.plum);
      bar(bx + bw + 18, by, bw, S.steady, line.steady, line.steady < 0.35 ? C.rose : C.lilac);

      // pops
      pops = pops.filter((p) => t - p.t < p.dur);
      for (const p of pops) {
        const k = (t - p.t) / p.dur;
        const a = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
        const sc = reduce() ? 1 : lerp(0.82, 1, easeBack((t - p.t) / 260));
        const rise = reduce() ? 0 : -14 * easeOut(k);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(p.x, p.y + rise); ctx.scale(sc, sc);
        ctx.font = `700 ${p.big ? 22 : 17}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (p.pill) {
          const tw = ctx.measureText(p.text).width + 36;
          ctx.shadowColor = 'rgba(63,27,85,.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
          rrect(ctx, -tw / 2, -22, tw, 44, 22); ctx.fillStyle = C.plum; ctx.fill();
          ctx.shadowColor = 'transparent';
          ctx.fillStyle = '#fff'; ctx.fillText(p.text, 0, 1);
        } else {
          ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.strokeText(p.text, 0, 0);
          ctx.fillStyle = p.color; ctx.fillText(p.text, 0, 0);
        }
        ctx.restore();
      }
    }
    function bar(x, y, w, label, v, color) {
      ctx.font = `600 11.5px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = C.ink2; ctx.fillText(label, x, y + 10);
      rrect(ctx, x, y + 17, w, 5, 2.5); ctx.fillStyle = 'rgba(106,56,140,.12)'; ctx.fill();
      if (v > 0.002) { rrect(ctx, x, y + 17, Math.max(5, w * v), 5, 2.5); ctx.fillStyle = color; ctx.fill(); }
    }

    let last = now();
    function frame() {
      if (done) return;
      const t = now();
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (needLayout) layout();
      update(t, dt);
      if (done) return;
      draw(t);
      hud(false);
      raf = requestAnimationFrame(frame);
    }

    if (probe) {
      host.__probe = () => {
        const r = cv.getBoundingClientRect();
        if (!line) return { phase };
        return {
          phase, level, lives, score, started: line.started, u: line.u, hb: halfBand(), T: line.T, time: line.time,
          steady: line.steady, Lpx: line.Lpx, unit,
          at: (u) => { const p = pointAt(u); return { x: p.x + r.left, y: p.y + r.top, tx: p.tx, ty: p.ty }; },
        };
      };
    }

    layout();
    newLine();
    raf = requestAnimationFrame(frame);
  });
}

export default {
  id: 'steady',
  title: { en: STR.en.title, th: STR.th.title },
  how: { en: STR.en.how, th: STR.th.how },
  run,
};
