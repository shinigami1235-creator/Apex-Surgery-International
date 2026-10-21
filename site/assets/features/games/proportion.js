/* Proportion: drag the features of a line-drawn face back to balanced positions.
 *
 * Hub interface: default export {id, title, how, run(host, {lang, level, rng, signal, onHud, muted})}.
 * run() resolves with {score, level, durationMs, inputs, log} when the last life is lost,
 * and rejects with an AbortError when `signal` aborts.
 *
 * Fairness: the ideal positions are the classic artistic proportion guides (horizontal thirds from
 * hairline to brow, brow to nose base and nose base to chin; vertical fifths of the face width with
 * eye width and the gap between the eyes equal to one fifth; nose width equal to the gap between the
 * eyes; lips one third of the way from nose base to chin). They are used as a game target only.
 * They are not medical advice and not a standard any face should meet.
 *
 * Face units: hairline y = 0, chin y = 1 (ideal). x = 0 is the face midline. One eye width ew = W / 5,
 * where W is the face width of the face shape.
 *
 * Features and ideal values
 *   brow  brow line height          1/3
 *   eye   gap between inner corners ew
 *   nl    nose base height          2/3
 *   nw    nose width                ew
 *   lip   lip line height           2/3 + 1/9
 *   chin  chin height               1
 *
 * Scoring per face
 *   error    E = sum over all six features of |placed - ideal| (face units)
 *   accuracy A = round(100 * max(0, 1 - E / 0.16))
 *   pass when A >= passMark(n) = min(95, 55 + 4 * (n - 1)); a miss costs one of three lives
 *   on a pass: points = round(A * mult + 40 * timeLeftShare * mult), mult = 1 + 0.25 * (n - 1)
 *
 * Difficulty per level n
 *   features moved = min(5, 1 + floor((n - 1) / 2)); at least one of brow, nose base and chin stays put
 *   offset size    = (0.10 to 0.13) * 0.86^(n-1), at least 0.022 face units
 *   face timer     = max(6.5, 20 - 1.5 * (n - 1)) seconds
 *   from level 5   = face shapes (oval, round, long, square) and a slight tilt of 4 to 9 degrees on half the faces
 *
 * Log entries are [ms, action]: z<w>x<h> stage size, n<level> new face, g<f> grab, r<f><value*1000> release,
 * D done tapped, T timer ran out, a<accuracy> result, x miss. f is one of b e n w l c.
 */

const STR = {
  en: {
    title: 'Proportion',
    how: 'Drag each feature until the face looks balanced.',
    done: 'Done', pass: (p) => `Pass mark ${p}%`, accuracy: 'Accuracy', miss: 'Miss',
    level: (n) => `Level ${n}`,
    f: { brow: 'Brow height', eye: 'Eye spacing', nl: 'Nose length', nw: 'Nose width', lip: 'Lip position', chin: 'Chin length' },
  },
  th: {
    title: 'สัดส่วน',
    how: 'ลากแต่ละส่วนของใบหน้าให้อยู่ในตำแหน่งที่สมดุล',
    done: 'เสร็จ', pass: (p) => `เกณฑ์ผ่าน ${p}%`, accuracy: 'ความแม่นยำ', miss: 'พลาด',
    level: (n) => `ระดับ ${n}`,
    f: { brow: 'ความสูงคิ้ว', eye: 'ระยะห่างดวงตา', nl: 'ความยาวจมูก', nw: 'ความกว้างจมูก', lip: 'ตำแหน่งริมฝีปาก', chin: 'ความยาวคาง' },
  },
};

const C = {
  plum: '#6A388C', plum7: '#55286F', plum8: '#3F1B55', night: '#1F0A30', lilac: '#A886CD', lilac3: '#C9B3DD',
  lilac2: '#E4D8EE', lilac1: '#F1EAF7', wash: '#FBF3FB', ink: '#2A1F33', ink2: '#5A4A66', rose: '#CC3366',
};
const FONT = '"LINE Seed","Sarabun","Noto Sans Thai",system-ui,sans-serif';
const EYE_Y = 0.43;
const KEYS = ['brow', 'eye', 'nl', 'nw', 'lip', 'chin'];
const CODE = { brow: 'b', eye: 'e', nl: 'n', nw: 'w', lip: 'l', chin: 'c' };
const VERTICAL = { brow: 1, nl: 1, lip: 1, chin: 1 };
const SHAPES = {
  oval: { W: 0.70, jawK: 0.74, jawY: 0.66, chinW: 0.09, topK: 0.80 },
  round: { W: 0.80, jawK: 0.80, jawY: 0.60, chinW: 0.13, topK: 0.86 },
  long: { W: 0.62, jawK: 0.80, jawY: 0.70, chinW: 0.10, topK: 0.78 },
  square: { W: 0.76, jawK: 0.88, jawY: 0.70, chinW: 0.14, topK: 0.84 },
};
const TUNE = {
  moved: (n) => Math.min(5, 1 + Math.floor((n - 1) / 2)),
  offset: (n, r) => Math.max(0.022, (0.10 + r * 0.03) * Math.pow(0.86, n - 1)),
  timer: (n) => Math.max(6.5, 20 - 1.5 * (n - 1)),
  passMark: (n) => Math.min(95, 55 + 4 * (n - 1)),
  mult: (n) => 1 + 0.25 * (n - 1),
  errScale: 0.16,
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
function injectCSS() {
  if (document.getElementById('ag-prop-css')) return;
  const s = document.createElement('style');
  s.id = 'ag-prop-css';
  s.textContent = `.ag-prop{position:relative;width:100%;height:100%;overflow:hidden;background:transparent;
    -webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;font-family:var(--font,"LINE Seed","Sarabun","Noto Sans Thai",system-ui,sans-serif)}
  .ag-prop canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
  .ag-prop-done{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);min-width:148px;height:52px;padding:0 30px;
    border:0;border-radius:999px;background:var(--plum,#6A388C);color:#fff;font:700 16px/1 var(--font,"LINE Seed","Sarabun",system-ui,sans-serif);
    letter-spacing:.01em;cursor:pointer;box-shadow:0 12px 26px -12px rgba(106,56,140,.85);
    transition:transform .16s cubic-bezier(.23,1,.32,1),background-color .2s ease,opacity .25s ease}
  .ag-prop-done:hover{background:var(--plum-700,#55286F)}
  .ag-prop-done:active{transform:translateX(-50%) scale(.97)}
  .ag-prop-done:focus-visible{outline:2px solid var(--violet,#8E2DCF);outline-offset:3px}
  .ag-prop-done[hidden]{display:none}
  @media (prefers-reduced-motion:reduce){.ag-prop-done{transition:none}}`;
  document.head.appendChild(s);
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* closed / open Catmull-Rom through points, drawn into the current path */
function curveThrough(ctx, P, closed) {
  const n = P.length;
  const get = (i) => (closed ? P[(i + n) % n] : P[clamp(i, 0, n - 1)]);
  ctx.moveTo(P[0][0], P[0][1]);
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    ctx.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6,
      p2[0], p2[1]);
  }
}

/* ---------- face generation ---------- */
function ranges(f) {
  const ew = f.ew;
  return { brow: [0.24, 0.405], eye: [ew * 0.45, ew * 1.7], nl: [0.56, 0.75], nw: [ew * 0.55, ew * 1.6], lip: [0.7, 0.9], chin: [0.88, 1.14] };
}
function clampVals(f, v, key) {
  const R = ranges(f);
  for (const k of KEYS) v[k] = clamp(v[k], R[k][0], R[k][1]);
  // keep vertical order: nose base, lips, chin
  if (key === 'nl') v.nl = Math.min(v.nl, v.lip - 0.045);
  else if (key === 'lip') v.lip = clamp(v.lip, v.nl + 0.045, v.chin - 0.07);
  else if (key === 'chin') v.chin = Math.max(v.chin, v.lip + 0.07);
  return v;
}
function genFace(r, n) {
  let shapeKey = 'oval', roll = 0;
  if (n >= 5) {
    shapeKey = ['oval', 'round', 'long', 'square'][Math.floor(r() * 4)];
    if (r() < 0.5) roll = (r() < 0.5 ? -1 : 1) * (4 + r() * 5) * (Math.PI / 180);
  }
  const sh = SHAPES[shapeKey];
  const f = { n, shapeKey, sh, roll, ew: sh.W / 5 };
  f.ideal = { brow: 1 / 3, eye: f.ew, nl: 2 / 3, nw: f.ew, lip: 2 / 3 + 1 / 9, chin: 1 };
  const k = TUNE.moved(n);
  const R = ranges(f);
  for (let attempt = 0; attempt < 30; attempt++) {
    // shuffle feature order with the run rng
    const order = KEYS.slice();
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    let moved = order.slice(0, k);
    const anchors = ['brow', 'nl', 'chin'];
    if (anchors.every((a) => moved.includes(a))) {
      const drop = anchors[Math.floor(r() * 3)];
      moved = moved.filter((m) => m !== drop);
      const extra = order.find((o) => !moved.includes(o) && !anchors.includes(o));
      if (extra) moved.push(extra);
    }
    const v = { ...f.ideal };
    for (const key of moved) {
      let off = TUNE.offset(n, r()) * (r() < 0.5 ? -1 : 1);
      if (v[key] + off < R[key][0] || v[key] + off > R[key][1]) off = -off;
      v[key] = clamp(v[key] + off, R[key][0], R[key][1]);
    }
    const ok = v.lip >= v.nl + 0.05 && v.lip <= v.chin - 0.08;
    if (ok || attempt === 29) {
      if (!ok) { v.lip = f.ideal.lip; }
      f.start = v; f.moved = moved;
      break;
    }
  }
  f.val = { ...f.start };
  f.T = TUNE.timer(n);
  f.pass = TUNE.passMark(n);
  return f;
}
function accuracyOf(f, v) {
  let E = 0;
  for (const k of KEYS) E += Math.abs(v[k] - f.ideal[k]);
  return Math.round(100 * Math.max(0, 1 - E / TUNE.errScale));
}

/* ---------- game ---------- */
function run(host, opts = {}) {
  const { lang = 'en', level: startLevel = 1, rng = Math.random, signal, onHud = () => {}, muted = true, probe = false } = opts;
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
    btn.type = 'button'; btn.className = 'ag-prop-done'; btn.textContent = S.done;
    root.append(cv, btn);
    host.appendChild(root);
    const ctx = cv.getContext('2d');
    const cardCv = document.createElement('canvas'); // background and card, painted on layout
    const fx = mulberry32((rng() * 4294967296) >>> 0); // cosmetic randomness, seeded from the run rng
    const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const reduce = () => !!(mq && mq.matches);
    const now = () => performance.now();
    const t0 = now();
    let lastMs = 0;
    const ms = () => (lastMs = Math.max(lastMs, Math.round(now() - t0))); // monotonic log clock
    const log = [];
    const L = (a) => log.push([ms(), a]);

    let W = 1, H = 1, dpr = 1, panel = null, needLayout = true, view = { cx: 0, cy: 0, s: 100 };
    let level = Math.max(1, startLevel | 0), maxLevel = level, lives = 3, score = 0, inputs = 0;
    let face = null, phase = 'show', phaseT = t0, lastLevelShown = 0, endMs = 0;
    let drag = null, hover = null, pops = [], shakeT = -1e9, raf = 0, done = false, lastHud = '', result = null;
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

    /* layout and transforms */
    function layout() {
      const r = root.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = cardCv.width = Math.round(W * dpr); cv.height = cardCv.height = Math.round(H * dpr);
      const pad = W < 560 ? 8 : 14;
      panel = { x: pad, y: pad, w: W - pad * 2, h: H - pad * 2, r: W < 560 ? 20 : 28 };
      paintCard();
      fitFace();
      L(`z${Math.round(W)}x${Math.round(H)}`);
      needLayout = false;
    }
    function paintCard() {
      const c = cardCv.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, W, H);
      c.save();
      c.shadowColor = 'rgba(63,27,85,.18)'; c.shadowBlur = 30; c.shadowOffsetY = 12;
      rrect(c, panel.x, panel.y, panel.w, panel.h, panel.r);
      const cg = c.createLinearGradient(0, panel.y, 0, panel.y + panel.h);
      cg.addColorStop(0, '#FFFFFF'); cg.addColorStop(1, '#FCF8FD');
      c.fillStyle = cg; c.fill();
      c.restore();
      c.lineWidth = 1; c.strokeStyle = 'rgba(106,56,140,.10)';
      rrect(c, panel.x + 0.5, panel.y + 0.5, panel.w - 1, panel.h - 1, panel.r); c.stroke();
    }
    function fitFace() {
      const top = panel.y + 56, bottom = panel.y + panel.h - 96;
      const avH = Math.max(80, bottom - top), avW = panel.w - 24;
      const sw = face ? face.sh.W : 0.7;
      // drawing spans y -0.34 .. 1.22 and x +-0.68 W incl. ears and hair
      const s = Math.min(avH / 1.56, avW / (sw * 1.42));
      view = { cx: panel.x + panel.w / 2, cy: top + avH / 2 - (0.44 - 0.5) * s, s };
    }
    function toScreen(x, y) {
      const c = Math.cos(face.roll), sn = Math.sin(face.roll), s = view.s;
      const dx = x * s, dy = (y - 0.5) * s;
      return { x: view.cx + dx * c - dy * sn, y: view.cy + dx * sn + dy * c };
    }
    function axisFor(key, side) {
      // screen px per unit change of the feature value
      const c = Math.cos(face.roll), sn = Math.sin(face.roll), s = view.s;
      if (VERTICAL[key]) return { x: -sn * s, y: c * s };
      return { x: c * s * side * 0.5, y: sn * s * side * 0.5 };
    }
    function handles(v) {
      const ew = face.ew, ex = v.eye / 2 + ew / 2;
      const mw = ew * 0.78;
      const list = [];
      for (const side of [1, -1]) {
        list.push({ key: 'eye', side, p: [side * ex, EYE_Y] });
        list.push({ key: 'brow', side, p: [side * ex, v.brow] });
        list.push({ key: 'nw', side, p: [side * v.nw / 2, v.nl - 0.022] });
        list.push({ key: 'lip', side, p: [side * mw * 0.8, v.lip] });
        list.push({ key: 'chin', side, p: [side * face.sh.chinW * 0.7, v.chin - 0.02] });
      }
      list.push({ key: 'nl', side: 1, p: [0, v.nl] });
      list.push({ key: 'lip', side: 1, p: [0, v.lip] });
      list.push({ key: 'chin', side: 1, p: [0, v.chin] });
      return list;
    }

    /* face lifecycle */
    function newFace() {
      face = genFace(rng, level);
      fitFace();
      maxLevel = Math.max(maxLevel, level);
      phase = 'show'; phaseT = now();
      drag = null;
      btn.hidden = false;
      L(`n${level}`);
      if (lastLevelShown !== level) {
        lastLevelShown = level;
        pop(S.level(level), W / 2, panel.y + 88, { pill: true, dur: 1000, big: true });
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
      result = { acc, passed, pts, from: { ...face.val } };
      phase = 'reveal'; phaseT = now();
      btn.hidden = true;
      if (passed) {
        score += pts;
        level = face.n + 1;
        blip(660, 0.09); setTimeout(() => blip(990, 0.12), 100);
      } else {
        lives -= 1;
        L('x');
        endMs = ms();
        shakeT = now();
        blip(196, 0.22, 'triangle', 0.05);
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

    /* input */
    function local(e) {
      const r = cv.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function candidates(p) {
      const R = clamp(view.s * 0.075, 22, 34);
      const out = [];
      for (const h of handles(face.val)) {
        const q = toScreen(h.p[0], h.p[1]);
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d <= R) out.push({ ...h, d });
      }
      return out.sort((a, b) => a.d - b.d);
    }
    function onDown(e) {
      if (done || phase !== 'play') return;
      const p = local(e);
      const cands = candidates(p);
      if (!cands.length) return;
      e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
      drag = { id: e.pointerId, start: p, last: p, cands, key: null, side: 1 };
    }
    function onMove(e) {
      const p = local(e);
      if (!drag) {
        if (phase === 'play' && e.pointerType === 'mouse') {
          const c = candidates(p);
          hover = c.length ? c[0].key : null;
          cv.style.cursor = hover ? 'grab' : 'default';
        }
        return;
      }
      if (done || phase !== 'play') return;
      if (!drag.key) {
        const mx = p.x - drag.start.x, my = p.y - drag.start.y, ml = Math.hypot(mx, my);
        if (ml < 5) return;
        let best = null, bs = Infinity;
        for (const c of drag.cands) {
          const a = axisFor(c.key, c.side), al = Math.hypot(a.x, a.y);
          const align = Math.abs((mx * a.x + my * a.y) / (ml * al));
          const sc = c.d * (align > 0.55 ? 1 : 3.2);
          if (sc < bs) { bs = sc; best = c; }
        }
        drag.key = best.key; drag.side = best.side; drag.last = drag.start;
        inputs++;
        L(`g${CODE[drag.key]}`);
        cv.style.cursor = 'grabbing';
        blip(440, 0.05);
      }
      const a = axisFor(drag.key, drag.side);
      const dv = ((p.x - drag.last.x) * a.x + (p.y - drag.last.y) * a.y) / (a.x * a.x + a.y * a.y);
      drag.last = p;
      face.val[drag.key] += dv;
      clampVals(face, face.val, drag.key);
    }
    function release() {
      if (drag && drag.key) L(`r${CODE[drag.key]}${Math.round(face.val[drag.key] * 1000)}`);
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
      if (ac) { try { ac.close(); } catch { /* closed */ } ac = null; }
      if (probe) delete host.__probe;
    }
    function pop(text, x, y, o = {}) {
      pops.push({ text, x, y, t: now(), dur: o.dur || 900, color: o.color || C.plum, big: !!o.big, pill: !!o.pill });
    }

    /* timing */
    const REVEAL = { guides: 220, slide: 700, hold: 1050, out: 260 };
    const REVEAL_TOTAL = REVEAL.slide + REVEAL.hold + REVEAL.out;
    function update(t) {
      if (phase === 'show' && t - phaseT >= 450) { phase = 'play'; face.t0 = t; }
      if (phase === 'play' && (t - face.t0) / 1000 >= face.T) submit('T');
      if (phase === 'reveal') {
        const k = easeInOut((t - phaseT) / REVEAL.slide);
        for (const key of KEYS) face.val[key] = lerp(result.from[key], face.ideal[key], k);
        if (t - phaseT >= REVEAL_TOTAL) {
          if (result.passed || lives > 0) newFace(); else finish();
        }
      }
    }

    /* drawing */
    function draw(t) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      let sx = 0;
      const sk = t - shakeT;
      if (sk < 340 && !reduce()) sx = Math.sin(sk * 0.09) * 7 * (1 - sk / 340);
      ctx.translate(sx, 0);
      ctx.drawImage(cardCv, 0, 0, W, H);
      if (!face) return;

      // timer and pass mark
      const bx = panel.x + 18, bw = panel.w - 36, by = panel.y + 16;
      const left = face.T ? timeLeft() / face.T : 0;
      ctx.font = `600 11.5px ${FONT}`; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      ctx.fillStyle = C.ink2; ctx.fillText(S.pass(face.pass), bx, by + 10);
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.ceil(timeLeft())}s`, bx + bw, by + 10);
      rrect(ctx, bx, by + 17, bw, 5, 2.5); ctx.fillStyle = 'rgba(106,56,140,.12)'; ctx.fill();
      if (left > 0.002) { rrect(ctx, bx, by + 17, Math.max(5, bw * left), 5, 2.5); ctx.fillStyle = left < 0.25 ? C.rose : C.plum; ctx.fill(); }

      // face
      const show = phase === 'show' ? easeOut((t - phaseT) / 450) : 1;
      let out = 1;
      if (phase === 'reveal') {
        const e = t - phaseT - (REVEAL.slide + REVEAL.hold);
        if (e > 0) out = 1 - e / REVEAL.out;
      }
      const alpha = Math.min(show, out);
      ctx.save();
      ctx.globalAlpha = clamp(alpha, 0, 1);
      const sc = reduce() ? 1 : lerp(0.97, 1, show);
      ctx.translate(view.cx, view.cy); ctx.rotate(face.roll); ctx.scale(view.s * sc, view.s * sc); ctx.translate(0, -0.5);
      const gk = phase === 'reveal' ? easeOut((t - phaseT) / REVEAL.guides) : 0;
      drawFace(face.val, drag && drag.key ? drag.key : phase === 'play' ? hover : null, gk);
      ctx.restore();

      // drag label
      if (drag && drag.key && phase === 'play') {
        const h = handles(face.val).find((q) => q.key === drag.key && q.side === drag.side) || handles(face.val).find((q) => q.key === drag.key);
        const q = toScreen(h.p[0], h.p[1]);
        tag(S.f[drag.key], q.x, q.y - Math.max(44, view.s * 0.1));
      }

      // result
      if (phase === 'reveal') {
        const e = t - phaseT;
        const a = clamp(e / 200, 0, 1) * clamp(out, 0, 1);
        const pc = reduce() ? 1 : lerp(0.85, 1, easeBack(e / 280));
        const cx = W / 2, cy = panel.y + panel.h - 50;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(cx, cy); ctx.scale(pc, pc);
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.font = `700 34px ${FONT}`;
        ctx.fillStyle = result.passed ? C.plum : C.rose;
        ctx.fillText(`${result.acc}%`, 0, 4);
        ctx.font = `600 12px ${FONT}`; ctx.fillStyle = C.ink2;
        const sub = result.passed ? `${S.accuracy}  +${result.pts}` : `${S.accuracy}  ·  ${S.miss}`;
        ctx.fillText(sub, 0, 26);
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
        const tw = ctx.measureText(p.text).width + 36;
        ctx.shadowColor = 'rgba(63,27,85,.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
        rrect(ctx, -tw / 2, -22, tw, 44, 22); ctx.fillStyle = C.plum; ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#fff'; ctx.fillText(p.text, 0, 1);
        ctx.restore();
      }
    }
    function tag(text, x, y) {
      ctx.save();
      ctx.font = `600 13px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(text).width + 24;
      const lx = clamp(x, panel.x + tw / 2 + 8, panel.x + panel.w - tw / 2 - 8);
      const ly = clamp(y, panel.y + 52, panel.y + panel.h - 20);
      ctx.shadowColor = 'rgba(63,27,85,.3)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
      rrect(ctx, lx - tw / 2, ly - 15, tw, 30, 15); ctx.fillStyle = 'rgba(31,10,48,.86)'; ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#fff'; ctx.fillText(text, lx, ly + 0.5);
      ctx.restore();
    }

    /* face drawing in face units (current transform maps face units to screen) */
    function drawFace(v, active, guides) {
      const sh = face.sh, w = sh.W / 2, ew = face.ew, px = 1 / view.s;
      const ink = (k) => (k && k === active ? C.rose : C.plum);
      const lw = (n) => n * px;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      // neck
      const jy = 0.45 + (v.chin - 0.45) * sh.jawY;
      const neckTop = Math.min(jy + 0.1, v.chin - 0.06);
      ctx.beginPath();
      for (const s of [-1, 1]) {
        ctx.moveTo(s * w * 0.56, neckTop);
        ctx.bezierCurveTo(s * w * 0.55, neckTop + 0.14, s * w * 0.58, 1.12, s * w * 0.7, 1.2);
      }
      const ng = ctx.createLinearGradient(0, neckTop, 0, 1.2);
      ng.addColorStop(0, 'rgba(106,56,140,.75)'); ng.addColorStop(1, 'rgba(106,56,140,0)');
      ctx.strokeStyle = ng; ctx.lineWidth = lw(1.6); ctx.stroke();

      // ears (fixed between the ideal brow and nose base lines, the classic ear guide)
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * w * 0.97, 1 / 3 + 0.015);
        ctx.bezierCurveTo(s * (w + 0.06), 1 / 3 - 0.015, s * (w + 0.066), 2 / 3 - 0.09, s * w * 0.96, 2 / 3 - 0.005);
        ctx.fillStyle = '#FBEFEA'; ctx.fill();
        ctx.strokeStyle = C.plum; ctx.lineWidth = lw(1.6); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s * (w + 0.012), 1 / 3 + 0.04);
        ctx.bezierCurveTo(s * (w + 0.038), 1 / 3 + 0.035, s * (w + 0.04), 0.54, s * (w + 0.008), 0.57);
        ctx.strokeStyle = 'rgba(106,56,140,.4)'; ctx.lineWidth = lw(1.2); ctx.stroke();
      }

      // face outline
      const top = [0, -0.25];
      const rightSide = [[w * sh.topK, -0.17], [w * 0.96, 0.08], [w, 0.36], [w * (0.97 - (1 - sh.jawK) * 0.35), 0.58], [w * sh.jawK, jy], [sh.chinW + (v.chin - jy) * 0.32, v.chin - 0.028]];
      const pts = [top, ...rightSide, [0, v.chin], ...rightSide.slice().reverse().map((p) => [-p[0], p[1]])];
      ctx.beginPath(); curveThrough(ctx, pts, true);
      const sg = ctx.createRadialGradient(-w * 0.25, 0.35, 0.05, 0, 0.5, 0.75);
      sg.addColorStop(0, '#FFF8F4'); sg.addColorStop(1, '#F7E7E0');
      ctx.fillStyle = sg; ctx.fill();
      // cheeks
      for (const s of [-1, 1]) {
        const cx = s * w * 0.55, cy = 0.62;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 0.11);
        g.addColorStop(0, 'rgba(204,51,102,.10)'); g.addColorStop(1, 'rgba(204,51,102,0)');
        ctx.fillStyle = g; ctx.fillRect(cx - 0.12, cy - 0.12, 0.24, 0.24);
      }
      ctx.beginPath(); curveThrough(ctx, pts, true);
      ctx.strokeStyle = active === 'chin' ? C.rose : C.plum; ctx.lineWidth = lw(active === 'chin' ? 2.4 : 1.9); ctx.stroke();

      // hair: outer shape over the cranium, inner edge is the hairline (y = 0 at the midline)
      const hw = w * 1.06;
      ctx.beginPath();
      ctx.moveTo(-w * 0.99, 0.2);
      ctx.bezierCurveTo(-hw * 1.04, 0.02, -hw * 0.98, -0.3, 0, -0.33);
      ctx.bezierCurveTo(hw * 0.98, -0.3, hw * 1.04, 0.02, w * 0.99, 0.2);
      ctx.bezierCurveTo(w * 0.92, 0.1, w * 0.72, 0.03, w * 0.42, 0.015);
      ctx.bezierCurveTo(w * 0.2, 0.0, w * 0.05, -0.002, 0, 0);
      ctx.bezierCurveTo(-w * 0.12, 0.002, -w * 0.3, 0.006, -w * 0.5, 0.02);
      ctx.bezierCurveTo(-w * 0.76, 0.04, -w * 0.93, 0.1, -w * 0.99, 0.2);
      ctx.closePath();
      const hg = ctx.createLinearGradient(0, -0.33, 0, 0.2);
      hg.addColorStop(0, '#E2D2EE'); hg.addColorStop(1, '#F1EAF7');
      ctx.fillStyle = hg; ctx.fill();
      ctx.strokeStyle = C.plum; ctx.lineWidth = lw(1.9); ctx.stroke();
      // strands
      ctx.strokeStyle = 'rgba(106,56,140,.32)'; ctx.lineWidth = lw(1.2);
      for (const [a, b, c] of [[-0.6, -0.2, 0.15], [-0.25, -0.27, 0.35], [0.15, -0.28, 0.55], [0.5, -0.22, 0.75]]) {
        ctx.beginPath();
        ctx.moveTo(a * w, b);
        ctx.quadraticCurveTo((a + 0.25) * w, b + 0.12, c * w, 0.03 + Math.abs(c) * 0.04);
        ctx.stroke();
      }

      // guides (result only)
      if (guides > 0) drawGuides(guides, w, ew);

      // brows
      const ex = v.eye / 2 + ew / 2;
      for (const s of [-1, 1]) {
        const cx = s * ex;
        const xi = cx - s * ew * 0.58, xo = cx + s * ew * 0.66, xp = cx + s * ew * 0.22;
        const y = v.brow;
        ctx.beginPath();
        ctx.moveTo(xi, y + 0.006);
        ctx.quadraticCurveTo(xi + s * ew * 0.25, y - 0.016, xp, y - 0.019);
        ctx.quadraticCurveTo(xp + s * ew * 0.25, y - 0.018, xo, y + 0.012);
        ctx.quadraticCurveTo(xp + s * ew * 0.22, y - 0.008, xp, y - 0.006);
        ctx.quadraticCurveTo(xi + s * ew * 0.25, y - 0.002, xi, y + 0.018);
        ctx.closePath();
        ctx.fillStyle = active === 'brow' ? C.rose : C.plum7; ctx.fill();
      }

      // eyes
      for (const s of [-1, 1]) {
        const cx = s * ex, cy = EYE_Y, a = ew * 0.48;
        const col = ink(active === 'eye' ? 'eye' : null);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx - a, cy);
        ctx.bezierCurveTo(cx - a * 0.5, cy - 0.036, cx + a * 0.45, cy - 0.04, cx + a, cy - 0.002);
        ctx.bezierCurveTo(cx + a * 0.45, cy + 0.026, cx - a * 0.5, cy + 0.026, cx - a, cy);
        ctx.closePath();
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.clip();
        ctx.beginPath(); ctx.arc(cx, cy - 0.002, 0.022, 0, 6.283);
        ctx.fillStyle = C.plum8; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy - 0.002, 0.009, 0, 6.283);
        ctx.fillStyle = C.night; ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 0.007, cy - 0.01, 0.0045, 0, 6.283);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.restore();
        // upper lid, lower lid, crease
        ctx.beginPath();
        ctx.moveTo(cx - a, cy);
        ctx.bezierCurveTo(cx - a * 0.5, cy - 0.036, cx + a * 0.45, cy - 0.04, cx + a, cy - 0.002);
        ctx.strokeStyle = col; ctx.lineWidth = lw(2.4); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - a * 0.85, cy + 0.006);
        ctx.bezierCurveTo(cx - a * 0.4, cy + 0.027, cx + a * 0.4, cy + 0.026, cx + a * 0.9, cy + 0.002);
        ctx.strokeStyle = active === 'eye' ? 'rgba(204,51,102,.7)' : 'rgba(106,56,140,.45)'; ctx.lineWidth = lw(1.2); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - a * 0.62, cy - 0.03);
        ctx.bezierCurveTo(cx - a * 0.2, cy - 0.052, cx + a * 0.4, cy - 0.054, cx + a * 0.82, cy - 0.024);
        ctx.strokeStyle = 'rgba(106,56,140,.3)'; ctx.lineWidth = lw(1.1); ctx.stroke();
      }

      // nose
      const nl = v.nl, nw = v.nw / 2;
      const nc = active === 'nl' || active === 'nw' ? C.rose : C.plum;
      ctx.beginPath();
      ctx.moveTo(-ew * 0.32, EYE_Y + 0.01);
      ctx.bezierCurveTo(-ew * 0.22, (EYE_Y + nl) / 2, -ew * 0.2, nl - 0.1, -nw * 0.5, nl - 0.06);
      ctx.strokeStyle = active === 'nl' ? 'rgba(204,51,102,.55)' : 'rgba(106,56,140,.3)'; ctx.lineWidth = lw(1.3); ctx.stroke();
      for (const s of [-1, 1]) {
        ctx.beginPath(); // ala
        ctx.moveTo(s * nw * 0.62, nl - 0.058);
        ctx.bezierCurveTo(s * nw * 1.12, nl - 0.05, s * nw * 1.12, nl - 0.004, s * nw * 0.55, nl - 0.004);
        ctx.strokeStyle = active === 'nw' ? C.rose : nc; ctx.lineWidth = lw(1.7); ctx.stroke();
        ctx.beginPath(); // nostril
        ctx.ellipse(s * nw * 0.38, nl - 0.012, nw * 0.16, 0.0065, s * 0.25, 0, 6.283);
        ctx.fillStyle = 'rgba(85,40,111,.55)'; ctx.fill();
      }
      ctx.beginPath(); // tip and columella
      ctx.moveTo(-nw * 0.38, nl - 0.03);
      ctx.bezierCurveTo(-nw * 0.2, nl - 0.044, nw * 0.2, nl - 0.044, nw * 0.38, nl - 0.03);
      ctx.strokeStyle = active === 'nl' ? 'rgba(204,51,102,.7)' : 'rgba(106,56,140,.35)'; ctx.lineWidth = lw(1.2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-nw * 0.2, nl - 0.003);
      ctx.quadraticCurveTo(0, nl + 0.006, nw * 0.2, nl - 0.003);
      ctx.strokeStyle = active === 'nl' ? C.rose : nc; ctx.lineWidth = lw(1.5); ctx.stroke();

      // lips
      const ly = v.lip, mw = ew * 0.78;
      const lc = active === 'lip' ? C.rose : '#B23A62';
      ctx.beginPath(); // philtrum
      for (const s of [-1, 1]) { ctx.moveTo(s * mw * 0.12, nl + 0.012); ctx.lineTo(s * mw * 0.2, ly - 0.03); }
      ctx.strokeStyle = 'rgba(106,56,140,.18)'; ctx.lineWidth = lw(1.1); ctx.stroke();
      ctx.beginPath(); // upper lip
      ctx.moveTo(-mw, ly);
      ctx.bezierCurveTo(-mw * 0.7, ly - 0.012, -mw * 0.4, ly - 0.036, -mw * 0.2, ly - 0.034);
      ctx.quadraticCurveTo(-mw * 0.08, ly - 0.034, 0, ly - 0.026);
      ctx.quadraticCurveTo(mw * 0.08, ly - 0.034, mw * 0.2, ly - 0.034);
      ctx.bezierCurveTo(mw * 0.4, ly - 0.036, mw * 0.7, ly - 0.012, mw, ly);
      ctx.bezierCurveTo(mw * 0.5, ly - 0.004, mw * 0.2, ly + 0.002, 0, ly + 0.001);
      ctx.bezierCurveTo(-mw * 0.2, ly + 0.002, -mw * 0.5, ly - 0.004, -mw, ly);
      ctx.fillStyle = 'rgba(204,51,102,.32)'; ctx.fill();
      ctx.strokeStyle = lc; ctx.lineWidth = lw(1.5); ctx.stroke();
      ctx.beginPath(); // lower lip
      ctx.moveTo(-mw * 0.96, ly + 0.001);
      ctx.bezierCurveTo(-mw * 0.6, ly + 0.05, mw * 0.6, ly + 0.05, mw * 0.96, ly + 0.001);
      ctx.bezierCurveTo(mw * 0.5, ly + 0.004, -mw * 0.5, ly + 0.004, -mw * 0.96, ly + 0.001);
      ctx.fillStyle = 'rgba(204,51,102,.2)'; ctx.fill();
      ctx.strokeStyle = lc; ctx.lineWidth = lw(1.5); ctx.stroke();
      ctx.beginPath(); // stomion
      ctx.moveTo(-mw, ly);
      ctx.bezierCurveTo(-mw * 0.5, ly - 0.004, -mw * 0.2, ly + 0.004, 0, ly + 0.002);
      ctx.bezierCurveTo(mw * 0.2, ly + 0.004, mw * 0.5, ly - 0.004, mw, ly);
      ctx.strokeStyle = active === 'lip' ? C.rose : C.plum7; ctx.lineWidth = lw(1.6); ctx.stroke();
      // chin crease
      const cy = ly + (v.chin - ly) * 0.48;
      ctx.beginPath();
      ctx.moveTo(-ew * 0.22, cy); ctx.quadraticCurveTo(0, cy + 0.012, ew * 0.22, cy);
      ctx.strokeStyle = active === 'chin' ? 'rgba(204,51,102,.6)' : 'rgba(106,56,140,.28)'; ctx.lineWidth = lw(1.2); ctx.stroke();

      // grab points: faint dots so features read as movable
      if (phase === 'play' || phase === 'show') {
        for (const h of handles(v)) {
          if (h.key === 'lip' && h.p[0] !== 0) continue;
          if (h.key === 'chin' && h.p[0] !== 0) continue;
          const on = active === h.key;
          ctx.beginPath(); ctx.arc(h.p[0], h.p[1], (on ? 4.5 : 3.2) * px, 0, 6.283);
          ctx.fillStyle = on ? C.rose : 'rgba(168,134,205,.9)'; ctx.fill();
          ctx.lineWidth = lw(1.5); ctx.strokeStyle = '#fff'; ctx.stroke();
        }
      }
    }
    function drawGuides(a, w, ew) {
      const px = 1 / view.s;
      ctx.save();
      ctx.globalAlpha *= a;
      ctx.setLineDash([5 * px, 5 * px]);
      ctx.lineWidth = 1.2 * px;
      // horizontal thirds
      ctx.strokeStyle = 'rgba(168,134,205,.95)';
      for (const y of [0, 1 / 3, 2 / 3, 1]) {
        ctx.beginPath(); ctx.moveTo(-w * 1.3, y); ctx.lineTo(w * 1.3, y); ctx.stroke();
      }
      // vertical fifths around the eye band
      for (const k of [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5]) {
        ctx.beginPath(); ctx.moveTo(k * ew, EYE_Y - 0.1); ctx.lineTo(k * ew, EYE_Y + 0.08); ctx.stroke();
      }
      // lower face split
      ctx.strokeStyle = 'rgba(204,51,102,.8)';
      ctx.beginPath(); ctx.moveTo(-ew * 1.2, 2 / 3 + 1 / 9); ctx.lineTo(ew * 1.2, 2 / 3 + 1 / 9); ctx.stroke();
      ctx.setLineDash([]);
      // thirds bracket on the side
      const bx = -w * 1.3;
      ctx.strokeStyle = 'rgba(106,56,140,.7)';
      ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx, 1); ctx.stroke();
      for (const y of [0, 1 / 3, 2 / 3, 1]) { ctx.beginPath(); ctx.moveTo(bx - 0.012, y); ctx.lineTo(bx + 0.012, y); ctx.stroke(); }
      ctx.restore();
    }

    let lastT = now();
    function frame() {
      if (done) return;
      const t = now();
      lastT = t;
      if (needLayout) layout();
      update(t);
      if (done) return;
      draw(t);
      hud(false);
      raf = requestAnimationFrame(frame);
    }

    if (probe) {
      host.__probe = () => {
        if (!face) return { phase };
        const r = cv.getBoundingClientRect();
        const hs = handles(face.val);
        const features = KEYS.map((key) => {
          const h = hs.find((q) => q.key === key && q.side === 1 && (key !== 'lip' && key !== 'chin' ? true : q.p[0] === 0));
          const q = toScreen(h.p[0], h.p[1]);
          const a = axisFor(key, 1);
          return { key, value: face.val[key], ideal: face.ideal[key], x: q.x + r.left, y: q.y + r.top, ax: a.x, ay: a.y };
        });
        const b = btn.getBoundingClientRect();
        return {
          phase, level, lives, score, pass: face.pass, T: face.T, left: timeLeft(), moved: face.moved.slice(), scale: view.s,
          features, done: { x: b.left + b.width / 2, y: b.top + b.height / 2 },
        };
      };
    }

    layout();
    newFace();
    raf = requestAnimationFrame(frame);
  });
}

export default {
  id: 'proportion',
  title: { en: STR.en.title, th: STR.th.title },
  how: { en: STR.en.how, th: STR.th.how },
  run,
};
