// After a fast slider drag, the picture must match a clean full redraw at the same settings.
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
await p.goto('http://localhost:8765/lab/nose.html?lang=en&x=' + Date.now()); await p.waitForSelector('.np');
let fails = 0;
for (const view of ['front', '90']) {
  if (view !== 'front') await p.click(`.np-tab[data-view="${view}"]`);
  await p.click('.np-panel [data-act="sample"]'); await p.waitForSelector('.np-frame.pts .np-pt'); await p.click('.np-bar [data-act="done"]'); await p.waitForTimeout(300);
  for (const glow of [false, true]) {
    const r = await p.evaluate(async glow => {
      const raf = () => new Promise(r => requestAnimationFrame(() => r()));
      const g = document.querySelector('[data-act="glow"]'); if ((g.getAttribute('aria-checked') === 'true') !== glow) { g.click(); await raf(); await raf(); }
      const amt = document.querySelector('.np input[type=range]');
      for (const pr of ['hump-reduction', 'refined-tip']) { document.querySelector(`.np-chip[data-preset="${pr}"]`).click(); await raf(); for (let v = 100; v >= 10; v -= 7) { amt.value = v; amt.dispatchEvent(new Event('input', {bubbles:true})); await raf(); } }
      amt.value = 55; amt.dispatchEvent(new Event('input', {bubbles:true})); amt.dispatchEvent(new Event('change', {bubbles:true})); await raf(); await raf(); await raf();
      const cv = document.querySelector('.np-after'); const a = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      // force a clean full redraw: forget what was drawn, then draw again at the same settings
      cv._src = null; amt.dispatchEvent(new Event('change', {bubbles:true})); await raf(); await raf(); await raf();
      const bb = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let diff = 0, maxd = 0; for (let i = 0; i < a.length; i += 4) { const d = Math.abs(a[i] - bb[i]) + Math.abs(a[i + 1] - bb[i + 1]) + Math.abs(a[i + 2] - bb[i + 2]); if (d > 6) diff++; maxd = Math.max(maxd, d); }
      const mean = d => { let s = 0, al = 0; for (let i = 0; i < d.length; i += 4) { s += d[i] + d[i+1] + d[i+2]; al += d[i+3]; } return [Math.round(s / (d.length / 4)), Math.round(al / (d.length / 4))]; };
      return {diff, maxd, ma: mean(a), mb: mean(bb), w: cv.width};
    }, glow);
    const ok = r.diff === 0; if (!ok) fails++;
    console.log(ok ? 'ok  ' : 'FAIL', view, 'glow', glow, JSON.stringify(r));
  }
}
await b.close();
console.log(fails ? 'FAILED' : 'all passed');
