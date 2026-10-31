// Every test photo through "Choose photo": detection (with the closer-crop retry), warnings, timing, screenshot
import fs from 'fs';
import {chromium} from '../pw.mjs';
const MP = new URL('../../site/assets/vendor/face_mesh/', import.meta.url).pathname;
const DIR = new URL('./faces/', import.meta.url).pathname, OUT = process.argv[2];
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:1280, height:900}})).newPage();
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.route(u => new URL(u).pathname.startsWith('/__mp/'), r => { const f = r.request().url().split('__mp/')[1].split('?')[0]; if (!f || !fs.existsSync(MP + f)) return r.abort(); return r.fulfill({status:200, body:fs.readFileSync(MP + f), contentType:f.endsWith('.wasm') ? 'application/wasm' : 'text/javascript'}); });
await p.goto('http://localhost:8765/lab/proportions.html?lang=en&mp=http://localhost:8765/__mp/');
for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.jpg'))) {
  const t0 = Date.now();
  await p.setInputFiles('.fp input[type=file]', DIR + f);
  await p.waitForFunction(() => { const s = window.__fp._state; return document.querySelector('.fp-busy').hidden && (s.base || s.err); }, null, {timeout:90000});
  await p.waitForTimeout(700);
  const r = await p.evaluate(() => { const s = window.__fp._state, c = window.__fp._cur(); return {err:s.err, w:s.base && s.base.width, h:s.base && s.base.height, warns:[...document.querySelectorAll('.fp-warn span')].map(x => x.textContent), m:[document.querySelector('[data-r="m0"]').textContent, document.querySelector('[data-r="m1"]').textContent]}; });
  console.log(f.slice(0, 13), (Date.now() - t0) + 'ms', r.err || `${r.w}x${r.h} match ${r.m.join('->')}`, r.warns.join(' | '));
  await p.locator('.fp-stage').screenshot({path:`${OUT}/f-${f.slice(0, 13)}.png`});
}
await b.close();
