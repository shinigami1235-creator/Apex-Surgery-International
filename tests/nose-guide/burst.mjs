// Fast slider input (every 4ms, like a 120Hz touch screen) must still redraw the picture while the finger moves.
import {createRequire} from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const {chromium} = require('playwright');
import fs from 'fs';
const DIR = '/home/claude/apex-surgery/tests/nose-guide';
const FACES = {'photo-1589525231707': 'front.jpg', 'photo-1641351841616': '45.jpg', 'photo-1736439538470': 'side.jpg'};
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:1000, height:700}})).newPage();
await p.route(/images\.unsplash\.com/, r => { const k = Object.keys(FACES).find(k => r.request().url().includes(k)); return r.fulfill({status:200, contentType:'image/jpeg', headers:{'access-control-allow-origin':'*'}, body:fs.readFileSync(`${DIR}/${FACES[k]}`)}); });
await p.route(/cdn\.jsdelivr\.net/, r => r.abort());
await p.goto('http://localhost:8765/lab/nose.html?lang=en'); await p.waitForSelector('.np');
await p.click('.np-panel [data-act="sample"]'); await p.waitForSelector('.np-frame.pts .np-pt'); await p.click('.np-bar [data-act="done"]'); await p.waitForTimeout(400);
await p.click('.np-chip[data-preset="refined-tip"]'); await p.waitForTimeout(300);
const n = await p.evaluate(async () => {
  const cv = document.querySelector('.np-after'), g = cv.getContext('2d'), orig = g.drawImage.bind(g); let c = 0;
  g.drawImage = (...a) => { if (a[0] !== cv) c++; return orig(...a); };
  const amt = document.querySelector('.np input[type=range]');
  const t0 = performance.now(); let v = 0;
  await new Promise(done => { const id = setInterval(() => { v = (v + 1) % 100; amt.value = v; amt.dispatchEvent(new Event('input', {bubbles:true})); if (performance.now() - t0 > 600) { clearInterval(id); done(); } }, 4); });
  return c;
});
console.log(n > 8 ? 'ok  ' : 'FAIL', 'redraws during a 600ms fast drag:', n);
await b.close();
