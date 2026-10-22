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
for (const view of ['front', '90']) {
  if (view !== 'front') await p.click(`.np-tab[data-view="${view}"]`);
  await p.click('.np-panel [data-act="sample"]'); await p.waitForSelector('.np-frame.pts .np-pt'); await p.click('.np-bar [data-act="done"]'); await p.waitForTimeout(400);
  for (const pr of ['natural', 'hump-reduction', 'slim-nostrils']) {
    await p.click(`.np-chip[data-preset="${pr}"]`); await p.waitForTimeout(200);
    const r = await p.evaluate(async () => { self.__npT = []; const amt = document.querySelector('.np input[type=range]'); const raf = () => new Promise(r => requestAnimationFrame(() => r()));
      for (let v = 30; v <= 100; v += 10) { amt.value = v; amt.dispatchEvent(new Event('input', {bubbles:true})); await raf(); }
      const a = self.__npT; const avg = i => (a.reduce((s, x) => s + x[i], 0) / a.length).toFixed(1); return {ctrl: avg(0), warp: avg(1), shade: avg(2), pts: a[0] && a[0][3], n: a.length}; });
    console.log(view, pr, JSON.stringify(r));
  }
}
await b.close();
