// Touch drag on the before/after slider at 1x and 2x, starting on the line and away from it.
import {createRequire} from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const {chromium} = require('playwright');
import fs from 'fs';
const DIR = '/home/claude/apex-surgery/tests/nose-guide';
const FACES = {'photo-1589525231707': 'front.jpg', 'photo-1641351841616': '45.jpg', 'photo-1736439538470': 'side.jpg'};
const b = await chromium.launch();
const fails = []; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails.push(m); };
const ctx = await b.newContext({viewport:{width:800, height:1100}, hasTouch:true, isMobile:true, deviceScaleFactor:2});
const p = await ctx.newPage();
p.on('pageerror', e => fails.push('pageerror ' + e.message));
await p.route(/images\.unsplash\.com/, r => { const k = Object.keys(FACES).find(k => r.request().url().includes(k)); return r.fulfill({status:200, contentType:'image/jpeg', headers:{'access-control-allow-origin':'*'}, body:fs.readFileSync(`${DIR}/${FACES[k]}`)}); });
await p.route(/cdn\.jsdelivr\.net/, r => r.abort());
await p.goto('http://localhost:8765/lab/nose.html?lang=en'); await p.waitForSelector('.np');
await p.tap('.np-panel [data-act="sample"]'); await p.waitForSelector('.np-frame.pts .np-pt'); await p.tap('.np-bar [data-act="done"]'); await p.waitForTimeout(500);
await p.evaluate(() => document.querySelector('.np-frame').scrollIntoView({block:'center'})); await p.waitForTimeout(300);
const cdp = await ctx.newCDPSession(p);
const drag = async (x0, y0, x1, y1) => {
  await cdp.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[{x:x0, y:y0}]});
  for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', {type:'touchMove', touchPoints:[{x:x0 + (x1 - x0) * i / 10, y:y0 + (y1 - y0) * i / 10}]}); await p.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]}); await p.waitForTimeout(150);
};
const X = () => p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.np-frame')).getPropertyValue('--x')));
const r = await p.evaluate(() => { const q = document.querySelector('.np-frame').getBoundingClientRect(); return {x:q.x, y:q.y, w:q.width, h:q.height}; });
const lx = () => X().then(v => r.x + r.w * v / 100);
// 1x, start on the line, slightly diagonal
let x0 = await lx(); await drag(x0, r.y + r.h * .7, x0 - r.w * .3, r.y + r.h * .7 + 20);
ok(await X() < 30, `1x drag from the line moves it (now ${(await X()).toFixed(1)}%)`);
// 1x, start away from the line, sideways
await drag(r.x + r.w * .8, r.y + r.h * .4, r.x + r.w * .6, r.y + r.h * .4 + 8);
ok(Math.abs(await X() - 60) < 6, `1x sideways drag away from the line moves it (now ${(await X()).toFixed(1)}%)`);
// 2x zoom, drag the knob
await p.tap('[data-act="zin"]'); await p.waitForTimeout(300);
x0 = await lx(); await drag(x0, r.y + r.h * .5, x0 + r.w * .2, r.y + r.h * .5 - 30);
ok(await X() > 70, `2x drag from the line moves it (now ${(await X()).toFixed(1)}%)`);
await b.close();
console.log(fails.length ? 'FAILED ' + fails.join(' | ') : 'all passed');
