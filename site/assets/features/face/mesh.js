/* The face model shared by the face tools: loading MediaPipe Face Mesh (478 points), finding a face in a photo
   and cropping to it. The model loads once per page and photos are sent one at a time. */
export const MP_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let meshP = null, meshBase = '', queue = Promise.resolve();
export function loadMesh(base){
  if (meshP && meshBase === base) return meshP;
  meshBase = base;
  meshP = new Promise((res, rej) => {
    const done = () => {
      try { const fm = new window.FaceMesh({locateFile:f => base + f}); fm.setOptions({maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:.5, staticImageMode:true}); res(fm); }
      catch (e) { rej(e); }
    };
    if (window.FaceMesh) return done();
    const s = document.createElement('script'); s.src = base + 'face_mesh.js'; s.crossOrigin = 'anonymous';
    s.onload = done; s.onerror = e => { meshP = null; rej(e); };
    document.head.append(s);
  });
  return meshP;
}
export function detect(base, canvas){
  const run = async () => {
    const fm = await loadMesh(base);
    return new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error('timeout')), 25000);
      fm.onResults(r => { clearTimeout(t); res(r.multiFaceLandmarks && r.multiFaceLandmarks[0] || null); });
      // the model keeps tracking state from the last photo even in still-image mode, which makes it miss the next face
      try { fm.reset && fm.reset(); } catch (e) {}
      fm.send({image:canvas}).catch(e => { clearTimeout(t); rej(e); });
    });
  };
  const p = queue.then(run, run);
  queue = p.catch(() => {});
  return p;
}
export const cut = (c, x, y, w, h, max = 1100, up = false) => {
  const k = up ? max / Math.max(w, h) : Math.min(1, max / Math.max(w, h)), o = document.createElement('canvas');
  o.width = Math.round(w * k); o.height = Math.round(h * k);
  o.getContext('2d').drawImage(c, x, y, w, h, 0, 0, o.width, o.height);
  return o;
};
/* the face detector misses faces that fill only a small part of a wide photo, so a miss tries closer crops */
export async function find(base, canvas){
  let lm = await detect(base, canvas);
  if (lm) return {canvas, lm};
  const W = canvas.width, H = canvas.height, s = Math.min(W, H);
  const tries = [[(W - s) / 2, 0, s, s], [(W - s * .7) / 2, H * .05, s * .7, s * .7], [(W - s * .5) / 2, H * .12, s * .5, s * .5]];
  for (const [x, y, w, h] of tries) {
    const c = cut(canvas, x, Math.max(0, Math.min(H - h, y)), w, h);
    lm = await detect(base, c);
    if (lm) return {canvas:c, lm};
  }
  return null;
}
/* crop to the head and shoulders so the face is large enough to work on; wide sets the crop as a multiple of the face width */
export function frameFace(canvas, lm, wide = 2.1, min = 720, max = 1100){
  const W = canvas.width, H = canvas.height;
  let a = 1, b = 1, c = 0, d = 0;
  for (const p of lm) { a = Math.min(a, p.x); b = Math.min(b, p.y); c = Math.max(c, p.x); d = Math.max(d, p.y); }
  const fw = (c - a) * W, fh = (d - b) * H;
  const cw = Math.min(W, fw * wide), ch = Math.min(H, cw * 1.28);
  const cx = clamp((a + c) / 2 * W - cw / 2, 0, W - cw), cy = clamp((b + d) / 2 * H - ch * .46, 0, H - ch);
  let out = cut(canvas, cx, cy, cw, ch, max);
  if (out.width < min) { const k = min / out.width; out = cut(out, 0, 0, out.width, out.height, Math.max(out.width, out.height) * k, true); }
  const kx = out.width / cw, ky = out.height / ch;
  return {base:out, L:lm.map(p => ({x:(p.x * W - cx) * kx, y:(p.y * H - cy) * ky}))};
}
export const loadImage = src => new Promise((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = rej; im.src = src; });
export function toCanvas(im, max = 1100){
  const w0 = im.naturalWidth || im.videoWidth || im.width, h0 = im.naturalHeight || im.videoHeight || im.height, r = Math.min(1, max / Math.max(w0, h0));
  const c = document.createElement('canvas'); c.width = Math.round(w0 * r); c.height = Math.round(h0 * r);
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return c;
}
