// The filler page with the face model and sample photo served locally: desktop, phone and Thai tablet.
// Checks the totals against the paper's maths, the slider, the points switch and the saved image.
import {createRequire} from 'module';
import fs from 'fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const {chromium} = require('playwright');
const MP = '/tmp/claude-0/-home-claude/b5460f3c-e75e-551e-b4ae-fc0088d5c4d9/scratchpad/mp/node_modules/@mediapipe/face_mesh/';
const DIR = new URL('../proportions/faces/', import.meta.url).pathname, OUT = process.argv[2] || '/tmp/claude-0/prev';
const b = await chromium.launch({args:['--use-gl=swiftshader', '--enable-unsafe-swiftshader']});
const fails = [];
const want = {cheeks:'4', 'cheeks,temples':'6.4', 'cheeks,temples,chin':'10.9'};
for (const [w, h, path] of [[1440, 900, 'filler.html'], [390, 844, 'filler.html'], [820, 1180, 'th/filler.html']]) {
  const p = await (await b.newContext({viewport:{width:w, height:h}})).newPage();
  p.on('pageerror', e => fails.push(`${w} pageerror ${e.message}`));
  await p.route(/cdn\.jsdelivr\.net\/npm\/@mediapipe\/face_mesh[^/]*\/(.+)$/, r => { const f = r.request().url().match(/face_mesh[^/]*\/([^?]+)/)[1]; if (!fs.existsSync(MP + f)) return r.abort(); const t = f.endsWith('.js') ? 'text/javascript' : f.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream'; return r.fulfill({status:200, contentType:t, headers:{'access-control-allow-origin':'*'}, body:fs.readFileSync(MP + f)}); });
  await p.route(/images\.unsplash\.com\/photo-/, r => { const m = r.request().url().match(/photo-([0-9a-f]+-[0-9a-f]+)/); const f = m && fs.readdirSync(DIR).find(x => x.startsWith(m[1])); return f ? r.fulfill({status:200, contentType:'image/jpeg', headers:{'access-control-allow-origin':'*'}, body:fs.readFileSync(DIR + f)}) : r.abort(); });
  await p.route(/^https?:\/\/(?!localhost|cdn\.jsdelivr|images\.unsplash)/, r => r.abort());
  await p.goto('http://localhost:8765/' + path);
  await p.evaluate(() => { try { localStorage.removeItem('apex.filler'); } catch (e) {} });
  await p.reload();
  await p.waitForSelector('.ff', {timeout:20000});
  const ml = () => p.evaluate(() => document.querySelector('[data-r="ml"]').textContent);
  if (await ml() !== want.cheeks) fails.push(`${w} cheeks total ${await ml()}`);
  await p.click('[data-c="temples"]'); await p.waitForTimeout(120);
  if (await ml() !== want['cheeks,temples']) fails.push(`${w} cheeks+temples ${await ml()}`);
  await p.click('[data-c="chin"]'); await p.waitForTimeout(120);
  if (await ml() !== want['cheeks,temples,chin']) fails.push(`${w} +chin ${await ml()}`);
  await p.click('[data-c="tear"]'); await p.click('[data-c="lips"]'); await p.click('[data-c="folds"]');
  await p.click('.ff-panel [data-act="sample"]');
  await p.waitForSelector('.ff-fbox:not([hidden])', {timeout:60000});
  await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelectorAll('.rv,.rv-clip').forEach(e => e.classList.add('in', 'on')));
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (ov > 0) fails.push(`${w} overflow ${ov}`);
  const nPts = await p.evaluate(() => document.querySelectorAll('.ff-ga circle').length);
  if (nPts < 20) fails.push(`${w} only ${nPts} points`);
  // the after picture must differ from the before picture
  const diff = await p.evaluate(() => { const a = document.querySelector('.ff-before').getContext('2d').getImageData(0, 0, 400, 400).data, c = document.querySelector('.ff-after'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, e = document.querySelector('.ff-before').getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - e[i]) > 3) n++; return n; });
  if (diff < 2000) fails.push(`${w} after barely changed (${diff})`);
  console.log(w, path, 'total', await ml(), 'points', nPts, 'changed px', diff);
  await p.screenshot({path:`${OUT}/filler-${w}.png`, fullPage:true});
  await p.evaluate(() => document.querySelector('.ff-frame').scrollIntoView({block:'center'})); await p.waitForTimeout(300);
  const box = await p.locator('.ff-frame').boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); await p.mouse.move(box.x + box.width * .2, box.y + box.height / 2, {steps:6}); await p.mouse.up();
  const x = await p.evaluate(() => getComputedStyle(document.querySelector('.ff-frame')).getPropertyValue('--x'));
  if (!/^(19\.9|2\d)/.test(x.trim())) fails.push(`${w} slider at ${x}`);
  await p.click('[data-act="points"]');
  if (!await p.evaluate(() => document.querySelector('.ff').classList.contains('nopoints'))) fails.push(`${w} points switch`);
  const [dl] = await Promise.all([p.waitForEvent('download', {timeout:15000}).catch(() => null), p.click('[data-act="save"]')]);
  if (!dl) fails.push(`${w} no save download`); else { const fp = await dl.path(); fs.copyFileSync(fp, `${OUT}/filler-save-${w}.jpg`); }
  await p.close();
}
await b.close();
console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'PASS filler site');
process.exit(fails.length ? 1 : 0);
