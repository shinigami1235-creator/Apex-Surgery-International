// Renders before/after with guides for every test face from lm.json, using the real geometry and warp modules
import {createRequire} from 'module';
import fs from 'fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const {chromium} = require('playwright');
const DIR = new URL('./faces/', import.meta.url).pathname, OUT = process.argv[2], AMT = +(process.argv[3] || 1);
const lm = JSON.parse(fs.readFileSync(new URL('./lm.json', import.meta.url)));
const b = await chromium.launch();
const p = await b.newPage();
p.on('pageerror', e => console.log('ERR', e.message));
await p.route(/__face\//, r => r.fulfill({status:200, contentType:'image/jpeg', body:fs.readFileSync(DIR + r.request().url().split('__face/')[1])}));
await p.goto('http://localhost:8765/404.html');
for (const [f, v] of Object.entries(lm)) {
  if (!v.lm) continue;
  const res = await p.evaluate(async ({f, v, AMT}) => {
    const G = await import('/assets/features/proportions/geometry.js'), W = await import('/assets/features/proportions/warp.js');
    const im = new Image(); im.src = '/__face/' + f; await im.decode();
    const c = document.createElement('canvas'); c.width = v.w; c.height = v.h; const g = c.getContext('2d'); g.drawImage(im, 0, 0, v.w, v.h);
    const L = v.lm.map(q => ({x:q[0], y:q[1]}));
    const data = g.getImageData(0, 0, v.w, v.h);
    const P = G.plan(L, {thirds:true, nose:true, lips:true, jaw:true}, AMT, 'women');
    const out = document.createElement('canvas'); out.width = v.w; out.height = v.h; out.getContext('2d').drawImage(c, 0, 0);
    const t0 = performance.now(); W.warpInto(data, out, P, 4); const ms = performance.now() - t0;
    const M0 = G.measure(L), M1 = G.measure(G.moved(L, P));
    const both = document.createElement('canvas'); both.width = v.w * 2 + 10; both.height = v.h; const bg = both.getContext('2d');
    bg.fillStyle = '#fff'; bg.fillRect(0, 0, both.width, both.height); bg.drawImage(c, 0, 0); bg.drawImage(out, v.w + 10, 0);
    const r = k => [M0[k].toFixed(3), M1[k].toFixed(3)];
    return {png:both.toDataURL('image/jpeg', .85), ms:Math.round(ms), m:Object.fromEntries(['thirds','nose','golden','lips','jaw'].map(k => [k, r(k)])), checks:G.checks(L), info:P.info, n:P.pts.length};
  }, {f, v, AMT});
  fs.writeFileSync(`${OUT}/${f.slice(0, 13)}.jpg`, Buffer.from(res.png.split(',')[1], 'base64'));
  console.log(f.slice(0, 13), res.ms + 'ms', 'ctrl', res.n, JSON.stringify(res.m), res.checks.join(','), JSON.stringify(res.info));
}
await b.close();
