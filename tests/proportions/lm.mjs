// Runs MediaPipe face mesh on every photo in faces/ and writes the landmarks to lm.json
import fs from 'fs';
import {chromium} from '../pw.mjs';
const MP = new URL('../../site/assets/vendor/face_mesh/', import.meta.url).pathname;
const DIR = new URL('./faces/', import.meta.url).pathname;
const b = await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const p = await b.newPage();
await p.route(/__mp\//, r => { const f = r.request().url().split('__mp/')[1].split('?')[0]; const t = f.endsWith('.js') ? 'text/javascript' : f.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream'; return r.fulfill({status:200, contentType:t, body:fs.readFileSync(MP + f)}); });
await p.route(/__face\//, r => r.fulfill({status:200, contentType:'image/jpeg', body:fs.readFileSync(DIR + r.request().url().split('__face/')[1])}));
await p.goto('http://localhost:8765/404.html');
await p.addScriptTag({url:'http://localhost:8765/__mp/face_mesh.js'});
const out = {};
for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.jpg'))) {
  const r = await p.evaluate(async f => {
    const im = new Image(); im.src = '/__face/' + f; await im.decode();
    const c = document.createElement('canvas'); const k = Math.min(1, 1100 / Math.max(im.width, im.height)); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    if (!window._fm) { window._fm = new FaceMesh({locateFile:x => '/__mp/' + x}); window._fm.setOptions({maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:.5, staticImageMode:true}); }
    const res = await new Promise(res => { window._fm.onResults(r => res(r.multiFaceLandmarks && r.multiFaceLandmarks[0])); window._fm.send({image:c}); });
    return {w:c.width, h:c.height, lm:res ? res.map(q => [+(q.x * c.width).toFixed(1), +(q.y * c.height).toFixed(1), +(q.z * c.width).toFixed(1)]) : null};
  }, f);
  out[f] = r; console.log(f, r.w, r.h, r.lm ? r.lm.length : 'no face');
}
fs.writeFileSync(new URL('./lm.json', import.meta.url), JSON.stringify(out));
await b.close();
