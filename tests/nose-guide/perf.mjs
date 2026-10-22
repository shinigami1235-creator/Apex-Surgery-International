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
await p.click('.np-panel [data-act="sample"]'); await p.waitForSelector('.np-frame.pts .np-pt'); await p.click('.np-bar [data-act="done"]'); await p.waitForTimeout(500);
for (const glow of [false, true]) {
  if (glow) { await p.click('[data-act="glow"]'); await p.waitForTimeout(400); }
  const t = await p.evaluate(async () => {
    const amt = document.querySelector('.np input[type=range]'); const raf = () => new Promise(r => requestAnimationFrame(() => r()));
    const times = [];
    for (let v = 10; v <= 100; v += 10) { const t0 = performance.now(); amt.value = v; amt.dispatchEvent(new Event('input', {bubbles:true})); await raf(); await raf(); times.push(Math.round(performance.now() - t0)); }
    return times;
  });
  console.log('glow', glow, 'ms per amount step', t.join(','));
}
const sz = await p.evaluate(() => { const c = document.querySelector('.np-after'); return [c.width, c.height]; });
console.log('canvas', sz);
await b.close();
