// The real Face analysis page with the models and photos served locally: desktop, phone and tablet, both languages,
// plus the home card, the services tool and an accessibility check
import fs from 'fs';
import os from 'os';
import {chromium} from '../pw.mjs';
const SP = fs.mkdtempSync(os.tmpdir() + '/apex-');   // screenshots
const MP = new URL('../../site/assets/vendor/face_mesh/', import.meta.url).pathname, FA = new URL('../../site/assets/vendor/face-api/', import.meta.url).pathname, OUT = process.argv[2] || SP;
const DIRS = ['tests/proportions/faces/', 'tests/analysis/faces/'];
const findFace = id => { for (const d of DIRS) { const f = fs.readdirSync(d).find(x => x.startsWith(id)); if (f) return d + f; } return null; };
const type = f => f.endsWith('.js') ? 'text/javascript' : f.endsWith('.wasm') ? 'application/wasm' : f.endsWith('.json') ? 'application/json' : 'application/octet-stream';
async function routes(p){
  await p.route(/cdn\.jsdelivr\.net\/npm\/@mediapipe\/face_mesh[^/]*\/(.+)$/, r => { const f = r.request().url().match(/face_mesh[^/]*\/([^?]+)/)[1]; return fs.existsSync(MP + f) ? r.fulfill({status:200, contentType:type(f), headers:{'access-control-allow-origin':'*'}, body:fs.readFileSync(MP + f)}) : r.abort(); });
  await p.route(/cdn\.jsdelivr\.net\/npm\/@vladmandic\/face-api@[^/]+\/(.+)$/, r => { const f = r.request().url().match(/face-api@[^/]+\/([^?]+)/)[1]; return fs.existsSync(FA + f) ? r.fulfill({status:200, contentType:type(f), headers:{'access-control-allow-origin':'*'}, body:fs.readFileSync(FA + f)}) : r.abort(); });
  await p.route(/images\.unsplash\.com\/photo-/, r => { const m = r.request().url().match(/photo-([0-9a-f]+-[0-9a-f]+)/); const f = m && findFace(m[1]); return f ? r.fulfill({status:200, contentType:'image/jpeg', headers:{'access-control-allow-origin':'*'}, body:fs.readFileSync(f)}) : r.abort(); });
  await p.route(/^https?:\/\/(?!localhost|cdn\.jsdelivr|images\.unsplash)/, r => r.abort());
}
const b = await chromium.launch({args:['--use-gl=swiftshader', '--enable-unsafe-swiftshader']});
const fails = [];
for (const [w, h, path] of [[1440, 900, 'analysis.html'], [390, 844, 'th/analysis.html'], [820, 1180, 'analysis.html']]) {
  const p = await (await b.newContext({viewport:{width:w, height:h}, acceptDownloads:true})).newPage();
  p.on('pageerror', e => fails.push(`${w} pageerror ${e.message}`));
  await routes(p);
  await p.goto('http://localhost:8765/' + path);
  await p.waitForSelector('.fa', {timeout:20000});
  await p.click('.fa-panel [data-act="sample"]');
  await p.waitForSelector('.fa-res:not([hidden])', {timeout:90000});
  await p.waitForFunction(() => !/…/.test(document.querySelector('[data-r="age"]').textContent), null, {timeout:60000}).catch(() => fails.push(`${w} no skin age`));
  await p.evaluate(() => document.querySelectorAll('.rv,.rv-clip').forEach(e => e.classList.add('in', 'on')));
  const sum = await p.evaluate(() => ['score', 'age', 'gold'].map(k => document.querySelector(`[data-r="${k}"]`).textContent));
  console.log(w, path, sum.join(' | '));
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (ov > 0) fails.push(`${w} overflow ${ov}`);
  await p.screenshot({path:`${OUT}/fas-${w}.png`, fullPage:true});
  // plan button sends procedures to My Plan
  await p.click('[data-act="plan"]');
  const planned = await p.evaluate(() => { try { return localStorage.getItem('apex.plan') || Object.keys(localStorage).join(','); } catch (e) { return ''; } });
  if (!planned) fails.push(`${w} nothing in plan storage`);
  if (w === 1440 && process.env.AXE_PATH) {   // accessibility check with axe-core: AXE_PATH=<folder>/axe.min.js
    await p.addScriptTag({path:process.env.AXE_PATH});
    const ax = await p.evaluate(async () => (await axe.run(document.querySelector('.fa'), {runOnly:['wcag2a', 'wcag2aa']})).violations.map(v => `${v.id}: ${v.nodes.length} ${v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' / ')}`));
    if (ax.length) fails.push('axe ' + ax.join('; '));
  }
  await p.close();
}
// home card and services tool link to the page
const p = await (await b.newContext({viewport:{width:1440, height:900}})).newPage();
await p.route(/^https?:\/\/(?!localhost)/, r => r.abort());
for (const [path, sel] of [['index.html', '.tool-ana'], ['services.html', '.mini-tool[href="analysis.html"]'], ['th/index.html', '.tool-ana']]) {
  await p.goto('http://localhost:8765/' + path); await p.waitForTimeout(1200);
  if (!await p.$(sel)) fails.push(`${path} missing ${sel}`);
  if (!await p.$('.mega-tools a[href="analysis.html"]')) fails.push(`${path} missing menu link`);
  if (!await p.$('footer a[href="analysis.html"], .ftr a[href="analysis.html"]')) fails.push(`${path} missing footer link`);
}
await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(800);
await p.evaluate(() => { document.querySelectorAll('.rv,.rv-clip').forEach(e => e.classList.add('in', 'on')); document.querySelector('.tools-s').scrollIntoView(); });
await p.waitForTimeout(500);
await (await p.$('.tools-s')).screenshot({path:`${OUT}/home-tools.png`});
await b.close();
console.log(fails.length ? 'FAILED\n' + fails.join('\n') : 'all passed');
