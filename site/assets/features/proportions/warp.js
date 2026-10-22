/* The warp: a backward displacement map on a coarse grid, feathered to zero at the ellipse edge,
   then bilinear resampling of the original pixels. The feather is wide so the jawline and chin sit
   inside the full-strength area. */
import {clamp, smooth} from './geometry.js';

export function warpInto(srcData, out, ctrl, grid = 4){
  const W = srcData.width, H = srcData.height, {pts, ell} = ctrl;
  if (!pts.some(q => Math.abs(q.d.x) + Math.abs(q.d.y) > .05)) return false;
  const n = pts.length, Dx = new Float64Array(n), Dy = new Float64Array(n);
  pts.forEach((q, i) => { Dx[i] = q.p.x + q.d.x; Dy[i] = q.p.y + q.d.y; });
  const ex = Math.hypot(ell.a.x * ell.ra, ell.b.x * ell.rb), ey = Math.hypot(ell.a.y * ell.ra, ell.b.y * ell.rb);
  const x0 = Math.max(0, Math.floor(ell.c.x - ex)), x1 = Math.min(W - 1, Math.ceil(ell.c.x + ex));
  const y0 = Math.max(0, Math.floor(ell.c.y - ey)), y1 = Math.min(H - 1, Math.ceil(ell.c.y + ey));
  if (x1 <= x0 || y1 <= y0) return false;
  const w = x1 - x0 + 1, h = y1 - y0 + 1, G = grid, gw = Math.ceil(w / G) + 2, gh = Math.ceil(h / G) + 2;
  const gx = new Float32Array(gw * gh), gy = new Float32Array(gw * gh);
  const mask = (x, y) => {
    const dx = x - ell.c.x, dy = y - ell.c.y;
    const a = (dx * ell.a.x + dy * ell.a.y) / ell.ra, b = (dx * ell.b.x + dy * ell.b.y) / ell.rb;
    return 1 - smooth(.78, 1, Math.sqrt(a * a + b * b));
  };
  // displacement at each grid node: inverse-distance weighting of the control displacements, placed at
  // their moved positions so the map runs backward from the result to the photo. A pure shift with no
  // rotation stays smooth where the controls form a single curve, such as below the chin
  const DX = new Float64Array(n), DY = new Float64Array(n);
  pts.forEach((q, i) => { DX[i] = q.d.x; DY[i] = q.d.y; });
  const eps = Math.pow(Math.max(w, h) * .01, 2);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const vx = x0 + i * G, vy = y0 + j * G, mk = mask(vx, vy);
    if (mk <= 0) continue;
    let sw = 0, sx = 0, sy = 0;
    for (let k = 0; k < n; k++) {
      const dx = Dx[k] - vx, dy = Dy[k] - vy, r2 = dx * dx + dy * dy + eps, ww = 1 / (r2 * r2);
      sw += ww; sx += ww * DX[k]; sy += ww * DY[k];
    }
    gx[j * gw + i] = -sx / sw * mk; gy[j * gw + i] = -sy / sw * mk;
  }
  const S = srcData.data, img = new ImageData(w, h), D = img.data;
  for (let y = 0; y < h; y++) D.set(S.subarray(((y0 + y) * W + x0) * 4, ((y0 + y) * W + x0 + w) * 4), y * w * 4);
  for (let y = 0; y < h; y++) {
    const fy = y / G, j = fy | 0, ty = fy - j;
    for (let x = 0; x < w; x++) {
      const fx = x / G, i = fx | 0, tx = fx - i, o = j * gw + i;
      const dx = (gx[o] * (1 - tx) + gx[o + 1] * tx) * (1 - ty) + (gx[o + gw] * (1 - tx) + gx[o + gw + 1] * tx) * ty;
      const dy = (gy[o] * (1 - tx) + gy[o + 1] * tx) * (1 - ty) + (gy[o + gw] * (1 - tx) + gy[o + gw + 1] * tx) * ty;
      if (dx * dx + dy * dy < .0004) continue;
      const sx = clamp(x0 + x + dx, 0, W - 1.001), sy = clamp(y0 + y + dy, 0, H - 1.001);
      const ix = sx | 0, iy = sy | 0, ax = sx - ix, ay = sy - iy;
      const p00 = (iy * W + ix) * 4, p10 = p00 + 4, p01 = p00 + W * 4, p11 = p01 + 4, d = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) D[d + c] = (S[p00 + c] * (1 - ax) + S[p10 + c] * ax) * (1 - ay) + (S[p01 + c] * (1 - ax) + S[p11 + c] * ax) * ay;
    }
  }
  out.getContext('2d').putImageData(img, x0, y0);
  return true;
}
