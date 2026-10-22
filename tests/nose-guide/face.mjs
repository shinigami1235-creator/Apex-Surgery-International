// Direction switch: the turned views mirror the sample face, its points and the guide.
import {createRequire} from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const {chromium} = require('playwright');
import fs from 'fs';
const OUT = '/home/claude/apex-surgery/_shots/nose-guide';
const DIR = '/home/claude/apex-surgery/tests/nose-guide';
const FACES = {'photo-1589525231707': 'front.jpg', 'photo-1641351841616': '45.jpg', 'photo-1736439538470': 'side.jpg'};
const b = await chromium.launch();
const fails = []; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails.push(m); };
for (const [w, h] of [[1440, 900], [375, 812]]) {
  const p = await (await b.newContext({viewport:{width:w, height:h}})).newPage();
  p.on('pageerror', e => fails.push('pageerror ' + e.message));
  await p.route(/images\.unsplash\.com/, r => { const k = Object.keys(FACES).find(k => r.request().url().includes(k)); return r.fulfill({status:200, contentType:'image/jpeg', headers:{'access-control-allow-origin':'*'}, body:fs.readFileSync(`${DIR}/${FACES[k]}`)}); });
  await p.route(/cdn\.jsdelivr\.net/, r => r.abort());
  await p.goto('http://localhost:8765/lab/nose.html?lang=en'); await p.waitForSelector('.np');
  ok(await p.evaluate(() => document.querySelector('.np-face').hidden), `${w} direction hidden on front`);
  for (const view of ['90', '45']) {
    await p.click(`.np-tab[data-view="${view}"]`);
    ok(!(await p.evaluate(() => document.querySelector('.np-face').hidden)), `${w} ${view} direction shown`);
    await p.click('.np-panel [data-act="sample"]'); await p.waitForSelector('.np-frame.pts .np-pt'); await p.waitForTimeout(600);
    const pos = () => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.np-pt')].filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return [e.dataset.k, Math.round(r.x + r.width / 2)]; })));
    const a = await pos();
    await p.evaluate(() => document.querySelector('.np-stage').scrollIntoView({block:'start'}));
    await p.screenshot({path:`${OUT}/face-${view}-left-${w}.png`});
    await p.click('.np-fb[data-f="1"]'); await p.waitForSelector('.np-frame.pts .np-pt'); await p.waitForTimeout(800);
    const bpos = await pos();
    ok(view === '45' ? Math.abs((a.T - a.AL) - (bpos.AR - bpos.T)) < 3 && a.T !== bpos.T : a.T < a.N && bpos.T > bpos.N, `${w} ${view} points mirror (${a.T},${a.N} to ${bpos.T},${bpos.N})`);
    if (a.AL !== undefined) ok(bpos.AL < bpos.AR, `${w} ${view} left nostril point stays on the left`);
    await p.evaluate(() => document.querySelector('.np-stage').scrollIntoView({block:'start'}));
    await p.screenshot({path:`${OUT}/face-${view}-right-${w}.png`});
    await p.click('.np-bar [data-act="done"]'); await p.waitForTimeout(700);
    await p.evaluate(() => document.querySelector('.np-stage').scrollIntoView({block:'start'}));
    await p.screenshot({path:`${OUT}/face-${view}-right-result-${w}.png`});
  }
  await p.close();
}
await b.close();
console.log(fails.length ? 'FAILED ' + fails.join(' | ') : 'all passed');
