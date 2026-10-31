// The filler page: desktop, phone and Thai tablet.
// Checks the totals against the paper's maths, that the head draws and lifts, the controls and the saved image.
import fs from 'fs';
import os from 'os';
import path from 'path';
import {chromium, SITE} from '../pw.mjs';
const OUT = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'apex-filler-'));   // screenshots
const b = await chromium.launch({args:['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const fails = [];
const want = {cheeks:'4', 'cheeks,temples':'6.4', 'cheeks,temples,chin':'10.9'};
for (const [w, h, path] of [[1440, 900, 'filler.html'], [390, 844, 'filler.html'], [820, 1180, 'th/filler.html']]) {
  const p = await (await b.newContext({viewport:{width:w, height:h}})).newPage();
  p.on('pageerror', e => fails.push(`${w} pageerror ${e.message}`));
  p.on('console', m => { if (m.type() === 'warning' && /filler/.test(m.text())) fails.push(`${w} ${m.text()}`); });
  await p.route(/^https?:\/\/(?!localhost)/, r => r.abort());
  await p.goto(SITE + path);
  await p.evaluate(() => { try { localStorage.removeItem('apex.filler'); } catch (e) {} });
  await p.reload();
  await p.waitForSelector('.ff', {timeout:20000});
  await p.waitForSelector('[data-r="load"][hidden]', {timeout:30000, state:'attached'});
  const ml = () => p.evaluate(() => document.querySelector('[data-r="ml"]').textContent);
  if (await ml() !== want.cheeks) fails.push(`${w} cheeks total ${await ml()}`);
  await p.click('[data-c="temples"]'); await p.waitForTimeout(120);
  if (await ml() !== want['cheeks,temples']) fails.push(`${w} cheeks+temples ${await ml()}`);
  await p.click('[data-c="chin"]'); await p.waitForTimeout(120);
  if (await ml() !== want['cheeks,temples,chin']) fails.push(`${w} +chin ${await ml()}`);
  for (const k of ['tear', 'lips', 'folds']) await p.click(`[data-c="${k}"]`);
  if (await p.evaluate(() => /[A-Z][a-z]?\d/.test(document.querySelector('.ff-props').textContent.replace(/CC BY 4\.0|45:690|2021/g, '')))) fails.push(`${w} a code shows in the list`);
  await p.waitForTimeout(1800);
  await p.evaluate(() => document.querySelectorAll('.rv,.rv-clip').forEach(e => e.classList.add('in', 'on')));
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (ov > 0) fails.push(`${w} overflow ${ov}`);
  const st = await p.evaluate(() => { const c = document.querySelector('.ff-3d canvas'); return c ? [c.width, c.height] : null; });
  if (!st || st[0] < 200) fails.push(`${w} no 3D canvas ${st}`);
  console.log(w, path, 'total', await ml(), 'canvas', st);
  await p.evaluate(() => document.querySelector('.ff-stage').scrollIntoView({block:'start'})); await p.waitForTimeout(500);
  await p.screenshot({path:`${OUT}/filler3d-${w}.png`});
  await p.click('[data-v="side"]'); await p.waitForTimeout(1200);
  await p.screenshot({path:`${OUT}/filler3d-side-${w}.png`});
  await p.click('[data-g="male"]'); await p.waitForTimeout(1200);
  await p.click('[data-act="points"]');
  if (await p.evaluate(() => document.querySelector('[data-act="points"]').getAttribute('aria-checked')) !== 'false') fails.push(`${w} points switch`);
  const [dl] = await Promise.all([p.waitForEvent('download', {timeout:15000}).catch(() => null), p.click('[data-act="save"]')]);
  if (!dl) fails.push(`${w} no save download`); else { const fp = await dl.path(); fs.copyFileSync(fp, `${OUT}/filler3d-save-${w}.jpg`); }
  await p.close();
}
await b.close();
console.log(fails.length ? 'FAIL\n' + fails.join('\n') : 'PASS filler site');
process.exit(fails.length ? 1 : 0);
