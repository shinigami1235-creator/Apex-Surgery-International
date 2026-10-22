/* Photo mode for the implant viewers. The visitor's own photo is warped where the implant would sit.
   Face implants work on a side photo: the face's outline against the background is traced, the points
   the warp needs are placed on it, and the visitor can drag them. The breast works on a front photo
   with four points the visitor places. Sizes come from average proportions, so the change in pixels
   matches the implant's millimetres or cc on an average face or chest of the visitor's height. */
import {clamp, smooth} from './shapes.js';

const V = {
  add:(a, b) => ({x:a.x + b.x, y:a.y + b.y}), sub:(a, b) => ({x:a.x - b.x, y:a.y - b.y}), mul:(a, k) => ({x:a.x * k, y:a.y * k}),
  len:a => Math.hypot(a.x, a.y), lerp:(a, b, t) => ({x:a.x + (b.x - a.x) * t, y:a.y + (b.y - a.y) * t}),
  norm:a => { const l = Math.hypot(a.x, a.y) || 1; return {x:a.x / l, y:a.y / l}; },
};

/* the points for each area, in the order they are placed */
export const POINTS = {
  breast:[
    {k:'NR', c:'#FF4D85', en:'Nipple, right side of the photo', th:'หัวนม ด้านขวาของรูป'},
    {k:'NL', c:'#FF4D85', en:'Nipple, left side of the photo', th:'หัวนม ด้านซ้ายของรูป'},
    {k:'FR', c:'#3FA9FF', en:'Crease under the breast, right', th:'ร่องใต้ราวนม ด้านขวา'},
    {k:'FL', c:'#3FA9FF', en:'Crease under the breast, left', th:'ร่องใต้ราวนม ด้านซ้าย'},
  ],
  chin:[
    {k:'SN', c:'#22D3B6', en:'Where the nose meets the lip', th:'จุดที่จมูกต่อกับริมฝีปาก'},
    {k:'LM', c:'#FFB020', en:'Crease between lip and chin', th:'ร่องระหว่างริมฝีปากล่างกับคาง'},
    {k:'PG', c:'#FF4D85', en:'Point of the chin', th:'ปลายคาง'},
    {k:'ME', c:'#3FA9FF', en:'Under the chin', th:'ใต้คาง'},
  ],
  nose:[
    {k:'NA', c:'#FF4D85', en:'Between the eyes', th:'หว่างตา'},
    {k:'TIP', c:'#3FA9FF', en:'Tip of the nose', th:'ปลายจมูก'},
    {k:'SN', c:'#22D3B6', en:'Where the nose meets the lip', th:'จุดที่จมูกต่อกับริมฝีปาก'},
  ],
  forehead:[
    {k:'TOP', c:'#B488FF', en:'Hairline', th:'แนวไรผม'},
    {k:'FH', c:'#FFB020', en:'Fullest point of the forehead', th:'จุดที่หน้าผากนูนที่สุด'},
    {k:'GL', c:'#FF4D85', en:'Between the brows', th:'หว่างคิ้ว'},
    {k:'NA', c:'#3FA9FF', en:'Between the eyes', th:'หว่างตา'},
  ],
};
// average distances used to turn millimetres into pixels: nasion to subnasale, subnasale to menton
const NOSE_LEN = {female:48, male:52}, LOWER = {female:64, male:70}, NIP = 19.5;

/* ---------- side photos: trace the face's outline ---------- */
/* which way the face looks: +1 right, -1 left. The background side has the steadier colour column. */
export function facing(data){
  const W = data.width, H = data.height, D = data.data;
  const spread = x => {
    const col = []; for (let y = Math.round(H * .15); y < H * .85; y += 4) { const i = (y * W + x) * 4; col.push([D[i], D[i + 1], D[i + 2]]); }
    const m = [0, 1, 2].map(c => col.reduce((a, p) => a + p[c], 0) / col.length);
    return col.reduce((a, p) => a + Math.abs(p[0] - m[0]) + Math.abs(p[1] - m[1]) + Math.abs(p[2] - m[2]), 0) / col.length;
  };
  // also how far in the background reaches from each side, along the middle rows
  const reach = s => {
    let tot = 0;
    for (let y = Math.round(H * .3); y < H * .7; y += 6) {
      const b0 = (y * W + (s > 0 ? W - 3 : 2)) * 4;
      let k = 3;
      for (; k < W * .9; k++) { const x = s > 0 ? W - 1 - k : k, i = (y * W + x) * 4; if (Math.abs(D[i] - D[b0]) + Math.abs(D[i + 1] - D[b0 + 1]) + Math.abs(D[i + 2] - D[b0 + 2]) > 70) break; }
      tot += k;
    }
    return tot;
  };
  const r = reach(1) - reach(-1), sp = spread(2) - spread(W - 3);
  return r !== 0 ? (r > 0 ? 1 : -1) : (sp > 0 ? 1 : -1);
}
/* the outline: for each row, how far the face reaches toward the side it looks at */
export function trace(data, side){
  const W = data.width, H = data.height, D = data.data;
  const bx = side > 0 ? W - 3 : 2, col = [];
  for (let y = Math.round(H * .1); y < H * .9; y += 3) { const i = (y * W + bx) * 4; col.push([D[i], D[i + 1], D[i + 2]]); }
  const bg = [0, 1, 2].map(c => col.reduce((a, p) => a + p[c], 0) / col.length);
  const noise = col.reduce((a, p) => a + Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]), 0) / col.length;
  // light skin on a light wall differs only a little: a low threshold over the wall's own noise, held for six pixels
  const far = i => Math.abs(D[i] - bg[0]) + Math.abs(D[i + 1] - bg[1]) + Math.abs(D[i + 2] - bg[2]);
  const edge = new Float32Array(H).fill(NaN), lim = Math.round(W * .92), d = new Float32Array(lim);
  for (let y = 0; y < H; y++) {
    for (let k = 0; k < lim; k++) { const x = side > 0 ? W - 1 - k : k; d[k] = far((y * W + x) * 4); }
    const th = Math.max(noise * 3 + 8, 13);
    for (let k = 3; k < lim - 6; k++) {
      let ok = true; for (let j = 0; j < 6; j++) if (d[k + j] <= th) { ok = false; break; }
      if (ok) { edge[y] = W - 1 - k; break; }
    }
  }
  const sm = new Float32Array(H).fill(NaN);
  for (let y = 0; y < H; y++) { let a = 0, n = 0; for (let j = -3; j <= 3; j++) { const v = edge[y + j]; if (v === v) { a += v; n++; } } if (n) sm[y] = a / n; }
  return {e:sm, side, W, H};
}
const at = (T, y) => ({x:T.side > 0 ? T.e[y] : T.W - 1 - T.e[y], y});
function arg(T, a, b, best){
  let m = best === 'max' ? -1e9 : 1e9, w = -1;
  for (let y = Math.max(2, Math.round(a)); y < Math.min(T.H - 2, Math.round(b)); y++) {
    const v = T.e[y]; if (v !== v) continue;
    if (best === 'max' ? v > m : v < m) { m = v; w = y; }
  }
  return w;
}
/* the first hollow met going from row y0 in direction dir: the lowest point before the outline comes
   forward again by more than rise. Falls back to the lowest point in the span */
function dip(T, y0, dir, span, rise){
  let w = -1, m = 1e9;
  for (let k = 0; k < span; k++) {
    const y = Math.round(y0 + dir * k); if (y < 2 || y >= T.H - 2) break;
    const v = T.e[y]; if (v !== v) continue;
    if (v < m) { m = v; w = y; } else if (v > m + rise) break;
  }
  return w;
}
function bump(T, y0, dir, span, drop){
  let w = -1, m = -1e9;
  for (let k = 0; k < span; k++) {
    const y = Math.round(y0 + dir * k); if (y < 2 || y >= T.H - 2) break;
    const v = T.e[y]; if (v !== v) continue;
    if (v > m) { m = v; w = y; } else if (v < m - drop) break;
  }
  return w;
}
/* the nose on one side's outline: tip, nasion and subnasale rows, or null when that side shows no face */
function noseOn(T){
  const H = T.H, e = T.e;
  // a face side has a smooth outline; the far side of the head, or a head cut by the frame, jumps about
  let jumps = 0, rows = 0;
  for (let y = Math.round(H * .15); y < H * .85; y++) { const a = e[y], b = e[y + 1]; if (a !== a || b !== b) continue; rows++; if (Math.abs(a - b) > H * .02) jumps++; }
  if (!rows || jumps / rows > .04) return null;
  const yt = arg(T, H * .22, H * .78, 'max');
  if (yt < 0) return null;
  // the tip stands out: the outline drops back sharply just below it
  const yb = arg(T, yt + H * .01, yt + H * .08, 'min');
  if (yb < 0 || e[yt] - e[yb] < H * .012) return null;
  // the nasion: the deepest point under the line from the tip up to the forehead
  const y0 = Math.max(3, Math.round(yt - H * .25)), et = e[yt], e0 = e[y0];
  if (e0 !== e0) return null;
  let yn = -1, deep = -1e9;
  for (let y = Math.round(yt - H * .04); y > y0; y--) {
    const v = e[y]; if (v !== v) continue;
    const chord = e0 + (et - e0) * (y - y0) / (yt - y0), d = chord - v;
    if (d > deep) { deep = d; yn = y; }
  }
  const ys = dip(T, yt + 2, 1, H * .1, H * .004);
  if (yn < 0 || ys < 0) return null;
  const Ls = ys - yn;
  if (Ls < H * .06 || e[yt] - e[yn] < .1 * Ls) return null;
  return {yt, yn, ys, Ls, score:(e[yt] - e[yb]) / H - jumps / rows};
}
/* points on a traced side photo; null when the outline does not look like a face */
export function autoPoints(area, data){
  let best = null;
  for (const sd of [-1, 1]) { const T = trace(data, sd), n = noseOn(T); if (n && (!best || n.score > best.n.score)) best = {T, n, side:sd}; }
  if (!best) return null;
  const {T, side} = best, {yt, yn, ys, Ls} = best.n, H = T.H;
  const pts = {NA:at(T, yn), TIP:at(T, yt), SN:at(T, ys)};
  // lips, the crease below them and the chin, found in turn going down the outline
  const r = H * .004;
  const yul = bump(T, ys + 2, 1, Ls * .6, r);
  const yst = yul > 0 ? dip(T, yul + 2, 1, Ls * .4, r) : -1;
  const yll = yst > 0 ? bump(T, yst + 2, 1, Ls * .5, r) : -1;
  const ylm = yll > 0 ? dip(T, yll + 2, 1, Ls * .6, r) : -1;
  const ypg = ylm > 0 ? bump(T, ylm + 2, 1, Ls * .7, r) : -1;
  if (ylm > 0 && ypg > 0) {
    pts.LM = at(T, ylm); pts.PG = at(T, ypg);
    // under the chin: the outline turns back toward the neck
    let yme = ypg;
    for (let y = ypg; y < Math.min(H - 3, ypg + Ls * .9); y++) { const v = T.e[y]; if (v === v && T.e[ypg] - v > Ls * .35) { yme = y; break; } }
    pts.ME = at(T, yme === ypg ? Math.min(H - 3, Math.round(ypg + Ls * .35)) : yme);
  }
  const ygl = arg(T, yn - Ls * .45, yn - Ls * .05, 'max');
  if (ygl > 0) {
    pts.GL = at(T, ygl);
    const yfh = arg(T, ygl - Ls * 1.0, ygl - Ls * .25, 'max');
    if (yfh > 0) pts.FH = at(T, yfh);
    const ytop = Math.max(3, Math.round(ygl - Ls * 1.1));
    if (T.e[ytop] === T.e[ytop]) pts.TOP = at(T, ytop);
  }
  const need = POINTS[area].map(p => p.k);
  if (!need.every(k => pts[k])) return null;
  const out = {}; need.forEach(k => out[k] = pts[k]);
  return {pts:out, side};
}
/* a starting layout when tracing fails, for a face looking toward side */
export function defaultPoints(area, W, H, side = -1){
  const u = Math.min(W, H) * .16, cx = W / 2 + side * u * .5, P = (dx, dy) => ({x:cx + side * dx * u, y:H * .42 + dy * u});
  if (area === 'breast') {
    const s = W * .18, y = H * .45;
    return {pts:{NR:{x:W / 2 + s, y}, NL:{x:W / 2 - s, y}, FR:{x:W / 2 + s * 1.02, y:y + s * .75}, FL:{x:W / 2 - s * 1.02, y:y + s * .75}}, side:1};
  }
  const all = {TOP:P(-.35, -1.9), FH:P(-.25, -1.3), GL:P(-.2, -.55), NA:P(-.35, -.3), TIP:P(.45, .55), SN:P(.05, .8),
    LM:P(-.1, 1.55), PG:P(.02, 1.95), ME:P(-.45, 2.25)};
  const pts = {}; POINTS[area].forEach(p => pts[p.k] = all[p.k]);
  return {pts, side};
}

/* ---------- warp controls ---------- */
/* outward normal of a profile segment a -> b on a face looking toward side */
const outward = (a, b, side) => { const t = V.norm(V.sub(b, a)); let n = {x:t.y, y:-t.x}; if (n.x * side < 0) n = V.mul(n, -1); return n; };
function along(pts, n){
  // points spaced evenly along a polyline, with the normal at each
  const seg = []; let L = 0;
  for (let i = 0; i < pts.length - 1; i++) { const l = V.len(V.sub(pts[i + 1], pts[i])); seg.push(l); L += l; }
  const out = [];
  for (let k = 0; k <= n; k++) {
    let d = L * k / n, i = 0;
    while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
    const t = seg[i] ? d / seg[i] : 0;
    out.push({p:V.lerp(pts[i], pts[i + 1], t), i, t:k / n});
  }
  return out;
}
const ellFor = (list, pad) => {
  let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
  for (const q of list) { a = Math.min(a, q.x); b = Math.min(b, q.y); c = Math.max(c, q.x); d = Math.max(d, q.y); }
  return {c:{x:(a + c) / 2, y:(b + d) / 2}, a:{x:1, y:0}, b:{x:0, y:1}, ra:(c - a) / 2 + pad, rb:(d - b) / 2 + pad};
};

/* imp: {area, mm, tipMm} for the face, {cc, width} for the breast. body: {sex, height, cup} */
export function controls(area, P, side, imp, body){
  const ctrl = [];
  const push = (p, d) => ctrl.push({p, d});
  if (area === 'breast') {
    const cmPx = V.len(V.sub(P.NL, P.NR)) / (NIP * (body.height || 160) / 160);
    const V0 = {AA:150, A:210, B:290, C:390, D:500, DD:620}[body.cup] || 290;
    const g = Math.cbrt((V0 + imp.cc) / V0);
    const all = [];
    for (const [N, F] of [[P.NR, P.FR], [P.NL, P.FL]]) {
      const nf = V.len(V.sub(F, N));
      const C = V.lerp(N, F, .15), Rb = Math.max(nf * 1.25, imp.width * cmPx * .55);
      const fill = (g - 1) * Rb;
      for (const r of [.35, .7, 1]) for (let k = 0; k < 16; k++) {
        const a = k / 16 * Math.PI * 2, dir = {x:Math.cos(a), y:Math.sin(a)};
        const p = V.add(C, V.mul(dir, Rb * r));
        // seen from the front the breast grows little sideways, a little down, and most at the upper pole
        const kx = .35, ky = dir.y < 0 ? .9 : .45;
        push(p, {x:dir.x * fill * r * kx * (r < 1 ? 1 : .6), y:dir.y * fill * r * ky * (r < 1 ? 1 : .6)});
      }
      for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; push(V.add(C, V.mul({x:Math.cos(a), y:Math.sin(a)}, Rb * 1.5)), {x:0, y:0}); }
      all.push(V.add(C, {x:-Rb * 1.9, y:-Rb * 1.9}), V.add(C, {x:Rb * 1.9, y:Rb * 1.9}));
    }
    // the breastbone between them stays put
    push(V.lerp(V.lerp(P.NR, P.NL, .5), V.lerp(P.FR, P.FL, .5), .3), {x:0, y:0});
    return {pts:ctrl, ell:ellFor(all, 0), scale:cmPx};
  }
  const sex = body.sex === 'male' ? 'male' : 'female';
  if (area === 'nose') {
    const px = V.len(V.sub(P.SN, P.NA)) / NOSE_LEN[sex], mm = imp.mm * px;
    const n = outward(P.NA, P.TIP, side);
    const S = V.lerp(P.TIP, P.NA, .14);
    for (const q of along([V.lerp(P.NA, P.TIP, -.08), S], 14)) {
      const t = q.t * 1.08 - .08;
      const w = smooth(-.12, .1, t) * (1 - .55 * smooth(.75, 1.02, t));
      push(q.p, V.mul(n, mm * w * .92));
      push(V.sub(q.p, V.mul(n, 9 * px)), {x:0, y:0});
    }
    // the tip: still for an I-shape, forward along the nose for an L-shape
    const tipDir = V.norm(V.sub(P.TIP, V.lerp(P.NA, P.SN, .5)));
    const tipD = imp.tipMm ? V.mul(tipDir, imp.tipMm * px) : V.mul(n, mm * .25);
    push(P.TIP, tipD); push(V.lerp(P.TIP, P.SN, .4), V.mul(tipD, .6));
    push(P.SN, imp.tipMm ? V.mul(tipD, .2) : {x:0, y:0});
    push(V.add(P.SN, V.mul(V.sub(P.SN, P.TIP), .8)), {x:0, y:0});
    push(V.add(P.NA, V.mul(V.sub(P.NA, P.TIP), .45)), {x:0, y:0});
    return {pts:ctrl, ell:ellFor([P.NA, P.TIP, P.SN], 26 * px), scale:px};
  }
  if (area === 'chin') {
    const px = V.len(V.sub(P.ME, P.SN)) / LOWER[sex], mm = imp.mm * px * .9;
    // the chin comes forward and a little down; nothing moves at the crease under the lip
    const dir = V.norm({x:side, y:.25});
    for (const q of along([P.LM, P.PG, P.ME], 20)) {
      const w = smooth(0, .5, q.t) * (1 - .5 * smooth(.62, 1, q.t));
      const n = q.i === 0 ? outward(P.LM, P.PG, side) : outward(P.PG, P.ME, side);
      push(q.p, V.mul(dir, mm * w));
      push(V.sub(q.p, V.mul(n, 22 * px)), {x:0, y:0});
    }
    for (const t of [0, .35, .7, .9]) push(V.lerp(P.SN, P.LM, t), {x:0, y:0});
    push(V.add(P.ME, V.mul(V.norm(V.sub(P.ME, P.PG)), 18 * px)), {x:0, y:0});
    return {pts:ctrl, ell:ellFor([P.LM, P.PG, P.ME], 24 * px), scale:px};
  }
  if (area === 'forehead') {
    const px = V.len(V.sub(P.NA, P.GL)) > 1 ? V.len(V.sub(P.TOP, P.NA)) / 66 : 1, mm = imp.mm * px * .95;
    const line = along([P.GL, P.FH, P.TOP], 18);
    for (const q of line) {
      const seg = q.i === 0 ? [P.GL, P.FH] : [P.FH, P.TOP], n = outward(seg[0], seg[1], side);
      const w = smooth(.0, .3, q.t) * (1 - .6 * smooth(.75, 1, q.t));
      push(q.p, V.mul(n, mm * w));
      push(V.sub(q.p, V.mul(n, 24 * px)), {x:0, y:0});
    }
    push(P.NA, {x:0, y:0});
    return {pts:ctrl, ell:ellFor([P.GL, P.FH, P.TOP], 26 * px), scale:px};
  }
  return {pts:[], ell:{c:{x:0, y:0}, a:{x:1, y:0}, b:{x:0, y:1}, ra:1, rb:1}, scale:1};
}
void clamp;
