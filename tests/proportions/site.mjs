// The real page, with the face model and sample photo served locally: phone, tablet, desktop, both languages
import {createRequire} from 'module';
import fs from 'fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const {chromium} = require('playwright');
const MP = '/tmp/claude-0/-home-claude/b5460f3c-e75e-551e-b4ae-fc0088d5c4d9/scratchpad/mp/node_modules/@mediapipe/face_mesh/';
const DIR = new URL('./faces/', import.meta.url).pathname, OUT = process.argv[2];
const b = await chromium.launch();
const fails = [];
for (const [w, h, path] of [[1440, 900, 'proportions.html'], [390, 844, 'proportions.html'], [820, 1180, 'th/proportions.html']]) {
  const p = await (await b.newContext({viewport:{width:w, height:h}})).newPage();
  p.on('pageerror', e => fails.push(`${w} pageerror ${e.message}`));
  await p.route(/cdn\.jsdelivr\.net\/npm\/@mediapipe\/face_mesh[^/]*\/(.+)$/, r => { const f = r.request().url().match(/face_mesh[^/]*\/([^?]+)/)[1]; if (!fs.existsSync(MP + f)) return r.abort(); const t = f.endsWith('.js') ? 'text/javascript' : f.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream'; return r.fulfill({status:200, contentType:t, headers:{'access-control-allow-origin':'*'}, body:fs.readFileSync(MP + f)}); });
  await p.route(/images\.unsplash\.com\/photo-/, r => { const m = r.request().url().match(/photo-([0-9a-f]+-[0-9a-f]+)/); const f = m && fs.readdirSync(DIR).find(x => x.startsWith(m[1])); return f ? r.fulfill({status:200, contentType:'image/jpeg', headers:{'access-control-allow-origin':'*'}, body:fs.readFileSync(DIR + f)}) : r.abort(); });
  await p.route(/^https?:\/\/(?!localhost|cdn\.jsdelivr|images\.unsplash)/, r => r.abort());
  await p.goto('http://localhost:8765/' + path);
  await p.waitForSelector('.fp', {timeout:20000});
  await p.click('.fp-panel [data-act="sample"]');
  await p.waitForSelector('.fp-fbox:not([hidden])', {timeout:60000});
  await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelectorAll('.rv,.rv-clip').forEach(e => e.classList.add('in', 'on')));
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (ov > 0) fails.push(`${w} overflow ${ov}`);
  const sum = await p.evaluate(() => [document.querySelector('[data-r="m0"]').textContent, document.querySelector('[data-r="m1"]').textContent]);
  console.log(w, path, 'golden match', sum.join(' -> '));
  await p.screenshot({path:`${OUT}/site-${w}.png`, fullPage:true});
  // the slider: drag the knob to 20%
  await p.evaluate(() => document.querySelector('.fp-frame').scrollIntoView({block:'center'})); await p.waitForTimeout(300);
  const box = await p.locator('.fp-frame').boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); await p.mouse.move(box.x + box.width * .2, box.y + box.height / 2, {steps:6}); await p.mouse.up();
  const x = await p.evaluate(() => getComputedStyle(document.querySelector('.fp-frame')).getPropertyValue('--x'));
  if (!/^(19\.9|2\d)/.test(x.trim())) fails.push(`${w} slider at ${x}`);
  // save: check a jpeg comes out
  const [dl] = await Promise.all([p.waitForEvent('download', {timeout:15000}).catch(() => null), p.click('[data-act="save"]')]);
  if (!dl) fails.push(`${w} no save download`); else { const fp = await dl.path(); fs.copyFileSync(fp, `${OUT}/save-${w}.jpg`); }
  await p.close();
}
// home card and services tools
const p = await (await b.newContext({viewport:{width:1440, height:900}})).newPage();
await p.route(/^https?:\/\/(?!localhost)/, r => r.abort());
await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(800);
await p.evaluate(() => { document.querySelectorAll('.rv,.rv-clip').forEach(e => e.classList.add('in', 'on')); document.querySelector('.tools-s').scrollIntoView(); });
await p.waitForTimeout(500); await p.screenshot({path:`${OUT}/home-tools.png`});
await b.close();
console.log(fails.length ? 'FAILED\n' + fails.join('\n') : 'all passed');
