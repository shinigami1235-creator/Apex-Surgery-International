/* Implant geometry for the viewers. Pure math, no DOM, so it runs in tests too.

   Breast: an implant is a height field over its base (round, or oval for a teardrop) with the
   catalogue's width, height and projection. The edge roll-off is solved per implant so the volume
   under the field equals the catalogue cc. Gel settles toward the lower pole when standing, more in
   the softer implants, so the fullest point sits below the centre and the upper pole runs straighter.
   The field is blurred by the tissue over it, which keeps its volume. The breast's own depth spreads
   over the implant and the implant's height goes on top, so the breast rounds out instead of pushing
   its point forward, and it grows by exactly the implant's volume.

   Face: chin, forehead and dorsal nose implants are thickness maps in millimetres over the face,
   laid on the skin along its normal. Thicknesses come from catalogue sizes; the skin follows the
   implant almost one to one (soft tissue takes up a little). */

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* ---------- binary meshes (see build/build_implants.py) ---------- */
export function parseMesh(buf){
  const dv = new DataView(buf), n = dv.getUint32(0, true);
  const head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, n)));
  const base = 4 + n, T = {'<i2':Int16Array, '<u2':Uint16Array, '|u1':Uint8Array, '<f4':Float32Array};
  const sec = k => { const s = head.sections[k]; return s ? new T[s.type](buf, base + s.off, s.n) : null; };
  return {head, sec};
}
const dequant = (q, c, s) => { const P = new Float32Array(q.length); for (let i = 0; i < q.length; i++) P[i] = q[i] / 32767 * s + c[i % 3]; return P; };

export function torsoModel(buf){
  const {head:h, sec} = parseMesh(buf);
  const morph = {};
  for (const k of ['weightUp', 'weightDown', 'cupUp', 'cupDown', 'firmUp', 'firmDown']) {
    const s = h.sections[k + '.d'];
    morph[k] = {i:sec(k + '.i'), d:sec(k + '.d'), k:s.scale / 32767};
  }
  return {h, N:h.N, base:dequant(sec('pos'), h.c, h.s), tri:sec('tri'), breast:sec('breast'), fold:sec('fold'), morph};
}
export function faceModel(buf){
  const {head:h, sec} = parseMesh(buf);
  return {h, N:h.N, female:dequant(sec('female'), h.c, h.s), male:dequant(sec('male'), h.c, h.s), tri:sec('tri'), kind:sec('kind')};
}

/* ---------- vectors ---------- */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const at = (P, i) => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]];

export function normals(P, tri, N, out){
  const n = out || new Float32Array(N * 3); n.fill(0);
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t] * 3, b = tri[t + 1] * 3, c = tri[t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
    const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
    n[a] += x; n[a + 1] += y; n[a + 2] += z; n[b] += x; n[b + 1] += y; n[b + 2] += z; n[c] += x; n[c + 1] += y; n[c + 2] += z;
  }
  for (let i = 0; i < N * 3; i += 3) { const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1; n[i] /= l; n[i + 1] /= l; n[i + 2] /= l; }
  return n;
}
/* enclosed volume of a closed triangle mesh, in model units cubed */
export function volume(P, tri){
  let v = 0;
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t] * 3, b = tri[t + 1] * 3, c = tri[t + 2] * 3;
    v += P[a] * (P[b + 1] * P[c + 2] - P[b + 2] * P[c + 1]) - P[a + 1] * (P[b] * P[c + 2] - P[b + 2] * P[c]) + P[a + 2] * (P[b] * P[c + 1] - P[b + 1] * P[c]);
  }
  return v / 6;
}

/* =====================================================================
   BREAST
   ===================================================================== */
/* the visitor's body: height in cm, weight in kg, current size AA to DD, firmness 0 (soft) to 1 */
export const CUPS = ['AA', 'A', 'B', 'C', 'D', 'DD'];
// cup morph per size: negative takes the mincup target, positive the maxcup target. Set so each cup
// adds about 70 to 120 cc a side on the base figure (tests/implants/volumes.mjs)
export const CUP_MORPH = {AA:-1, A:-.45, B:.05, C:.28, D:.45, DD:.6};
export function bodyParams(b){
  const h = clamp(b.height || 160, 140, 190), kg = clamp(b.weight || 52, 35, 120), bmi = kg / Math.pow(h / 100, 2);
  return {
    scale:h / 160.3,                     // cm per 10 model units: the base female is 160.3 cm tall
    bmi,
    weightUp:clamp((bmi - 22) / 10, 0, 1), weightDown:clamp((22 - bmi) / 5, 0, 1),
    cup:CUP_MORPH[b.cup] != null ? CUP_MORPH[b.cup] : 0,
    firm:clamp(b.firm == null ? .5 : b.firm, 0, 1),
  };
}
export function morphTorso(M, bp, out){
  const P = out || new Float32Array(M.base.length);
  P.set(M.base);
  const add = (m, w) => {
    if (!w) return;
    const {i, d, k} = M.morph[m], f = w * k;
    for (let j = 0; j < i.length; j++) { const o = i[j] * 3, q = j * 3; P[o] += d[q] * f; P[o + 1] += d[q + 1] * f; P[o + 2] += d[q + 2] * f; }
  };
  add('weightUp', bp.weightUp); add('weightDown', bp.weightDown);
  add(bp.cup >= 0 ? 'cupUp' : 'cupDown', Math.abs(bp.cup));
  const fm = (bp.firm - .5) * 2; add(fm >= 0 ? 'firmUp' : 'firmDown', Math.abs(fm) * .8);
  return P;
}

/* An implant from the catalogue: {width, height (oval only), projection} in cm, cc, and its kind.
   sag: how far the gel settles to the lower pole when standing (0 none). oval: teardrop base. */
const GRID = 72;
export function breastField(imp){
  const W = imp.width, H = imp.height || imp.width, P = imp.projection, sag = imp.sag || 0;
  const ext = Math.max(W, H) / 2 + 2.6;           // grid half-size in cm, room for the tissue blur
  const step = ext * 2 / (GRID - 1);
  // standing, the gel settles: the point of most projection sits below the centre and the upper pole
  // runs straighter. y0 is that point as a share of the half height (negative is down)
  const y0 = -(.12 + .45 * sag), up = .5 + 1.1 * sag;
  const shape = n => {
    const g = new Float32Array(GRID * GRID); let mx = 0;
    for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
      const x = -ext + i * step, y = -ext + j * step;
      const yn = y / (H / 2), xn = x / (W / 2);
      if (xn * xn + yn * yn >= 1) continue;
      const yy = yn >= y0 ? (yn - y0) / (1 - y0) : (yn - y0) / (1 + y0);
      const r = Math.min(1, Math.hypot(xn, yy));
      let v = Math.pow(1 - Math.pow(r, n), yn >= y0 ? .5 + (up - .5) * clamp((yn - y0) / (1 - y0), 0, 1) : .5);
      if (imp.teardrop) v *= .55 + .45 * smooth(H / 2, -H * .15, y);
      g[j * GRID + i] = v; if (v > mx) mx = v;
    }
    let vol = 0;
    for (let k = 0; k < g.length; k++) { g[k] /= mx; vol += g[k]; }
    return {g, vol:vol * step * step * P};
  };
  // solve the roll-off exponent so the volume matches the catalogue cc
  let lo = .6, hi = 16, best = null;
  for (let it = 0; it < 34; it++) {
    const n = Math.sqrt(lo * hi), s = shape(n);
    best = {n, ...s};
    if (s.vol < imp.cc) lo = n; else hi = n;
  }
  const h = best.g.map(v => v * P);
  return {h, ext, step, n:best.n, vol:best.vol, W, H, P};
}
/* tissue over the implant softens its edge; a separable gaussian keeps the volume */
export function blurField(F, sigmaCm){
  const r = Math.ceil(sigmaCm * 2.5 / F.step), k = [];
  let s = 0;
  for (let i = -r; i <= r; i++) { const w = Math.exp(-.5 * Math.pow(i * F.step / sigmaCm, 2)); k.push(w); s += w; }
  k.forEach((w, i) => k[i] = w / s);
  const a = F.h, b = new Float32Array(a.length), c = new Float32Array(a.length);
  for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
    let v = 0; for (let t = -r; t <= r; t++) { const ii = i + t; if (ii >= 0 && ii < GRID) v += a[j * GRID + ii] * k[t + r]; } b[j * GRID + i] = v;
  }
  for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
    let v = 0; for (let t = -r; t <= r; t++) { const jj = j + t; if (jj >= 0 && jj < GRID) v += b[jj * GRID + i] * k[t + r]; } c[j * GRID + i] = v;
  }
  return {...F, h:c};
}
const sample = (F, x, y) => {
  const fx = (x + F.ext) / F.step, fy = (y + F.ext) / F.step;
  if (fx < 0 || fy < 0 || fx >= GRID - 1 || fy >= GRID - 1) return 0;
  const i = fx | 0, j = fy | 0, tx = fx - i, ty = fy - j, h = F.h, o = j * GRID + i;
  return (h[o] * (1 - tx) + h[o + 1] * tx) * (1 - ty) + (h[o + GRID] * (1 - tx) + h[o + GRID + 1] * tx) * ty;
};

/* the frame each implant sits in on the current body: centre, axis and the two base directions.
   The implant's lower edge sits on the fold under the breast; the axis is the chest wall's,
   turned halfway back toward straight ahead. Units: model units (decimetres of the base figure). */
export function breastFrames(M, P, implantHeightModel, lift = .08){
  const h = M.h;
  return [0, 1].map(k => {
    const nip = at(P, h.nipples[k]), a = h.axes[k];
    const n = norm([a[0] * .5, a[1] * .5, a[2] * .5 + .5]);
    const eu = norm(cross([0, 1, 0], n)), ev = cross(n, eu);
    const foldY = nip[1] + h.foldBelowNipple[k];
    const c = [nip[0] - (k ? -1 : 1) * .03, foldY + implantHeightModel / 2 + lift, nip[2]];
    return {c, n, eu, ev, nip};
  });
}
/* The base figure's breasts come to a point at the nipple. Natural breast tissue is rounder there, so a
   share of the same spread is applied to the figure itself, near the nipple only. Keeps the volume
   within a few cc since the blur moves depth around rather than adding it. */
export function roundBreasts(M, P, Nrm, cmPerUnit, k = .5){
  const s = tissueSpread(M, P, Nrm, cmPerUnit, 2.4), frames = breastFrames(M, P, 0), Q = new Float32Array(P);
  for (let i = 0; i < M.N; i++) {
    if (!s[i]) continue;
    const p = at(P, i), f = frames[p[0] >= 0 ? 0 : 1], nip = f.nip;
    const r = Math.hypot(p[0] - nip[0], p[1] - nip[1], p[2] - nip[2]) * cmPerUnit;
    const d = s[i] * k * (1 - smooth(4, 8, r)) / cmPerUnit;
    Q[i * 3] += f.n[0] * d; Q[i * 3 + 1] += f.n[1] * d; Q[i * 3 + 2] += f.n[2] * d;
  }
  return Q;
}
/* add the implants to a morphed body. F: blurred field in cm. cmPerUnit: cm in one model unit */
/* How far the breast's own depth evens out over an implant, per vertex: a gaussian blur of the depth
   along the implant axis minus the depth itself. It depends only on the body, so it is kept per body. */
const SPREAD = new WeakMap();
function tissueSpread(M, P, Nrm, cmPerUnit, sig){
  const hit = SPREAD.get(P); if (hit && hit.sig === sig && hit.cm === cmPerUnit) return hit.s;
  const frames = breastFrames(M, P, 0), N = M.N, s = new Float32Array(N), k2 = -.5 / (sig * sig);
  for (let side = 0; side < 2; side++) {
    const f = frames[side], ids = [], U = [], V = [], Tt = [];
    for (let i = 0; i < N; i++) {
      if (!M.fold[i]) continue;
      const p = at(P, i); if ((p[0] >= 0 ? 0 : 1) !== side) continue;
      if (dot([Nrm[i * 3], Nrm[i * 3 + 1], Nrm[i * 3 + 2]], f.n) <= -.15) continue;
      const r = sub(p, f.c), u = dot(r, f.eu) * cmPerUnit, v = dot(r, f.ev) * cmPerUnit;
      if (Math.hypot(u, v) > 18) continue;
      ids.push(i); U.push(u); V.push(v); Tt.push(dot(r, f.n) * cmPerUnit);
    }
    const n = ids.length, lim = 9 * sig * sig;
    for (let a = 0; a < n; a++) {
      let sw = 0, st = 0;
      for (let b = 0; b < n; b++) { const du = U[a] - U[b], dv = V[a] - V[b], d2 = du * du + dv * dv; if (d2 > lim) continue; const g = Math.exp(d2 * k2); sw += g; st += g * Tt[b]; }
      s[ids[a]] = st / sw - Tt[a];
    }
  }
  SPREAD.set(P, {sig, cm:cmPerUnit, s});
  return s;
}
/* add the implants to a morphed body. F: blurred field in cm. cmPerUnit: cm in one model unit.
   The implant lies under the breast, so the breast's own depth spreads out over it (the tissue is
   stretched over a dome) and the implant's height is added on top: the breast rounds out rather than
   pushing its own point forward */
export function addBreasts(M, P, Nrm, F, cmPerUnit, out){
  const Q = out || new Float32Array(P.length);
  Q.set(P);
  if (!F) return Q;
  const frames = breastFrames(M, P, F.H / cmPerUnit);
  const N = M.N, fold = M.fold, R = Math.max(F.W, F.H) / 2, reach = R + 3.5;
  const spread = tissueSpread(M, P, Nrm, cmPerUnit, 2.4);
  // how far each point moves along its side's axis
  const D = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const w = fold[i] / 255;
    if (w <= 0) continue;
    const p = at(P, i), side = p[0] >= 0 ? 0 : 1, f = frames[side];
    const nr = [Nrm[i * 3], Nrm[i * 3 + 1], Nrm[i * 3 + 2]];
    const front = smooth(-.85, .25, dot(nr, f.n));
    if (front <= 0) continue;
    const r = sub(p, f.c), u = dot(r, f.eu) * cmPerUnit * (side ? -1 : 1), v = dot(r, f.ev) * cmPerUnit;
    const foot = 1 - smooth(R, reach, Math.hypot(u, v));
    D[i] = (sample(F, u, v) + spread[i] * foot) / cmPerUnit * w * front;
  }
  // The move turns off where the skin faces down under the breast, and next to the fold that change
  // happens within a couple of triangles: the skin there split open into a crack. Evening the move out
  // over neighbouring points keeps the surface whole; fitBreasts puts back the volume this spreads.
  const {off, nb} = adjacency(M), tmp = new Float32Array(N);
  for (let it = 0; it < 14; it++) {
    for (let i = 0; i < N; i++) {
      const a = off[i], z = off[i + 1];
      if (!fold[i] || z === a) { tmp[i] = D[i]; continue; }
      let s = 0; for (let k = a; k < z; k++) s += D[nb[k]];
      tmp[i] = D[i] * .5 + s / (z - a) * .5;
    }
    D.set(tmp);
  }
  for (let i = 0; i < N; i++) {
    const d = D[i]; if (!d) continue;
    const f = frames[P[i * 3] >= 0 ? 0 : 1];
    Q[i * 3] += f.n[0] * d; Q[i * 3 + 1] += f.n[1] * d; Q[i * 3 + 2] += f.n[2] * d;
  }
  return Q;
}
/* the same, scaled so each breast grows by exactly the field's volume: the mask at the fold and the
   turn of the skin away from the axis lose a few percent, which one measured pass puts back */
export function fitBreasts(M, P, Nrm, F, cmPerUnit, out){
  if (!F) return addBreasts(M, P, Nrm, null, cmPerUnit, out);
  const v0 = volume(P, M.tri);
  const Q = addBreasts(M, P, Nrm, F, cmPerUnit, out);
  const got = (volume(Q, M.tri) - v0) * Math.pow(cmPerUnit, 3) / 2;
  if (got <= 0) return Q;
  const k = clamp(F.vol / got, .8, 1.25);
  for (let i = 0; i < Q.length; i++) Q[i] = P[i] + (Q[i] - P[i]) * k;
  return Q;
}
/* the implant itself as a closed lens for the see-through view: front from the field, back flat */
export function implantShell(F, frame, cmPerUnit, side, rings = 28, segs = 48){
  const pos = [], idx = [];
  const R = Math.max(F.W, F.H) / 2;
  const pt = (u, v, z) => {
    const s = side ? -1 : 1, k = 1 / cmPerUnit;
    return [frame.c[0] + (frame.eu[0] * u * s + frame.ev[0] * v + frame.n[0] * z) * k,
            frame.c[1] + (frame.eu[1] * u * s + frame.ev[1] * v + frame.n[1] * z) * k,
            frame.c[2] + (frame.eu[2] * u * s + frame.ev[2] * v + frame.n[2] * z) * k];
  };
  // the front surface sits behind the skin by the tissue depth, which the viewer sets by pushing the
  // shell back along the axis; here it is the raw implant on its base plane
  const raw = {...F};
  for (let r = 0; r <= rings; r++) for (let s = 0; s < segs; s++) {
    const t = r / rings, a = s / segs * Math.PI * 2;
    const u = Math.cos(a) * F.W / 2 * t, v = Math.sin(a) * F.H / 2 * t;
    // the field's edge falls across grid cells, so sampling right on it gave a jagged rim
    const z = r === rings ? 0 : sample(raw, u * .97, v * .97);
    pos.push(...pt(u, v, z));
  }
  const back = pos.length / 3;
  pos.push(...pt(0, 0, 0));
  for (let r = 0; r < rings; r++) for (let s = 0; s < segs; s++) {
    const a = r * segs + s, b = r * segs + (s + 1) % segs, c = a + segs, d = b + segs;
    idx.push(a, c, b, b, c, d);
  }
  const rim = rings * segs;
  for (let s = 0; s < segs; s++) idx.push(back, rim + (s + 1) % segs, rim + s);
  void R;
  return {pos:new Float32Array(pos), idx:new Uint16Array(idx)};
}

/* =====================================================================
   FACE
   ===================================================================== */
// nasion to menton, mm: adult averages used to put the model face in millimetres
export const FACE_MM = {female:112, male:122};
export function faceScale(M, sex){
  const P = M[sex], L = M.h.landmarks[sex];
  const a = at(P, L.nasion), b = at(P, L.menton);
  return FACE_MM[sex] / (Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * 100);   // model units -> mm is * 100 * k
}

/* thickness in mm at each vertex for an implant. imp = {area, style, mm, ...}; returns Float32Array */
export function faceThickness(M, sex, Nrm, imp){
  const P = M[sex], L = M.h.landmarks[sex], N = M.N, kind = M.kind;
  const mmPer = 100 * faceScale(M, sex);            // mm in one model unit
  const T = new Float32Array(N);
  const lm = k => at(P, L[k]);
  if (imp.area === 'chin') {
    const pg = lm('pogonion'), me = lm('menton'), lb = lm('labiomental');
    // the jaw as a vertical cylinder behind the chin point; arc length runs along the jaw
    const Rj = 38 / mmPer, cz = pg[2] - Rj;
    const yBot = me[1] + (pg[1] - me[1]) * .15, hgt = imp.heightMm / mmPer;
    const yTop = Math.min(yBot + hgt, lb[1] - 2 / mmPer);
    const half = imp.spanMm / 2, plate = imp.plateMm / 2, arm = imp.armMm || 0;
    for (let i = 0; i < N; i++) {
      if (kind[i] === 2 || kind[i] === 1) continue;
      const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
      if (z < cz - .05) continue;
      const s = Math.atan2(x, z - cz) * Rj * mmPer;            // mm along the jaw
      const as = Math.abs(s);
      if (as > half) continue;
      // along the jaw: full thickness on the front plate, down to the arm thickness, then to nothing at the ends
      let along;
      if (as <= plate) along = 1;
      else if (arm > 0) { const k = (as - plate) / Math.max(1, half - plate); along = (1 - smooth(0, .35, k)) + (arm / imp.mm) * smooth(0, .35, k) * (1 - smooth(.55, 1, k)); }
      else along = 1 - smooth(plate, half, as);
      // up the chin: zero above the top edge, full over the lower half, wrapping a little under the jaw
      const t = (y - yBot) / (yTop - yBot);
      const up = smooth(1.05, .55, t) * smooth(-.45, .05, t);
      const tissue = .9;
      T[i] = imp.mm * along * up * tissue;
    }
  } else if (imp.area === 'forehead') {
    const gl = lm('glabella'), top = lm('foreheadTop');
    const yB = gl[1] + 13 / mmPer, yT = top[1] - 4 / mmPer, halfW = (imp.widthMm || 110) / 2;
    for (let i = 0; i < N; i++) {
      if (kind[i] !== 0) continue;
      const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
      if (z < gl[2] - .55 || Nrm[i * 3 + 2] < .1) continue;
      const ax = Math.abs(x) * mmPer;
      const t = (y - yB) / (yT - yB);
      const across = 1 - smooth(halfW * .45, halfW, ax);
      const up = smooth(-.12, .3, t) * smooth(1.08, .7, t);
      T[i] = imp.mm * across * up * .95;
    }
  } else if (imp.area === 'nose') {
    const na = lm('nasion'), tip = lm('tip'), gl = lm('glabella');
    // the dorsal line in the side view, from just above the nasion to the supratip
    const R = [0, na[1] + (gl[1] - na[1]) * .35, na[2]];
    const S = [0, tip[1] + (na[1] - tip[1]) * .16, tip[2] - (tip[2] - na[2]) * .2];
    const d = sub(S, R), len = Math.hypot(d[1], d[2]);
    const halfW = (imp.widthMm || 9) / 2;
    for (let i = 0; i < N; i++) {
      if (kind[i] !== 0) continue;
      const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
      const ty = y - R[1], tz = z - R[2];
      const t = (ty * d[1] + tz * d[2]) / (len * len);
      if (t < -.25 || t > 1.25) continue;
      const off = Math.abs(ty * d[2] - tz * d[1]) / len;      // distance off the line, in the side view
      if (off * mmPer > 9) continue;
      const ax = Math.abs(x) * mmPer;
      const across = Math.exp(-Math.pow(ax / halfW, 4));
      // the implant is carved thin at the radix edge and the supratip end
      const along = smooth(-.18, .08, t) * (1 - .65 * smooth(.7, 1.08, t)) * (1 - smooth(1.02, 1.2, t));
      T[i] = imp.mm * across * along * .92;
    }
    if (imp.tipMm) {
      // L-shape: the strut pushes the tip and columella forward along the nose's axis
      const sigma = 4.2 / mmPer;
      for (let i = 0; i < N; i++) {
        if (kind[i] !== 0) continue;
        const dd = Math.hypot(P[i * 3] - tip[0], P[i * 3 + 1] - tip[1], P[i * 3 + 2] - tip[2]);
        if (dd > sigma * 3) continue;
        T[i] += imp.tipMm * Math.exp(-.5 * Math.pow(dd / sigma, 2));
      }
    }
  }
  // the skin over an implant is smoother than the implant: blur over the mesh, keeping the peak
  const iters = {chin:12, forehead:8, nose:3}[imp.area] || 0;
  if (iters) {
    const peak = T.reduce((a, b) => Math.max(a, b), 0);
    smoothField(T, adjacency(M), iters);
    const p2 = T.reduce((a, b) => Math.max(a, b), 0);
    if (p2 > 0) for (let i = 0; i < N; i++) T[i] *= peak / p2;
  }
  return {T, mmPer};
}
/* vertex neighbours as compressed rows, built once per mesh */
export function adjacency(M){
  if (M.adj) return M.adj;
  const N = M.N, tri = M.tri, sets = Array.from({length:N}, () => new Set());
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t], b = tri[t + 1], c = tri[t + 2];
    sets[a].add(b); sets[a].add(c); sets[b].add(a); sets[b].add(c); sets[c].add(a); sets[c].add(b);
  }
  const off = new Uint32Array(N + 1);
  for (let i = 0; i < N; i++) off[i + 1] = off[i] + sets[i].size;
  const nb = new Uint32Array(off[N]);
  for (let i = 0; i < N; i++) { let k = off[i]; for (const j of sets[i]) nb[k++] = j; }
  return (M.adj = {off, nb});
}
export function smoothField(T, adj, iters){
  const {off, nb} = adj, N = T.length, tmp = new Float32Array(N);
  for (let it = 0; it < iters; it++) {
    for (let i = 0; i < N; i++) {
      const a = off[i], b = off[i + 1];
      if (b === a) { tmp[i] = T[i]; continue; }
      let s = 0; for (let k = a; k < b; k++) s += T[nb[k]];
      tmp[i] = T[i] * .5 + s / (b - a) * .5;
    }
    T.set(tmp);
  }
  return T;
}
/* lay a thickness map on the skin along the normals; light smoothing over neighbours keeps it even */
export function addFace(P, Nrm, TH, mmPer, out){
  const Q = out || new Float32Array(P.length);
  Q.set(P);
  const {T} = TH;
  for (let i = 0; i < T.length; i++) {
    const d = T[i] / mmPer;
    if (!d) continue;
    Q[i * 3] += Nrm[i * 3] * d; Q[i * 3 + 1] += Nrm[i * 3 + 1] * d; Q[i * 3 + 2] += Nrm[i * 3 + 2] * d;
  }
  return Q;
}
