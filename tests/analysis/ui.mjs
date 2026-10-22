// Drives the face analysis lab page: sample face, a side photo, factor selection, save; phone, tablet and desktop, both languages
import {createRequire} from 'module';
import fs from 'fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const {chromium} = require('playwright');
const SP = '/tmp/claude-0/-home-claude/b5460f3c-e75e-551e-b4ae-fc0088d5c4d9/scratchpad/';
const MP = SP + 'mp/node_modules/@mediapipe/face_mesh/', FA = SP + 'fa/node_modules/@vladmandic/face-api/';
const DIRS = ['tests/proportions/faces/', 'tests/analysis/faces/'], OUT = process.argv[2] || SP + 'sp';
const findFace = id => { for (const d of DIRS) { const f = fs.readdirSync(d).find(x => x.startsWith(id)); if (f) return d + f; } return null; };
export async function routes(p){
  const serve = (pre, dir) => p.route(u => new URL(u).pathname.startsWith(pre), r => { const f = r.request().url().split(pre)[1].split('?')[0]; if (!f || !fs.existsSync(dir + f)) return r.abort(); const t = f.endsWith('.js') ? 'text/javascript' : f.endsWith('.wasm') ? 'application/wasm' : f.endsWith('.json') ? 'application/json' : 'application/octet-stream'; return r.fulfill({status:200, contentType:t, headers:{'access-control-allow-origin':'*'}, body:fs.readFileSync(dir + f)}); });
  await serve('/__mp/', MP); await serve('/__fa/', FA);
  await p.route(/images\.unsplash\.com\/photo-/, r => { const m = r.request().url().match(/photo-([0-9a-f]+-[0-9a-f]+)/); const f = m && findFace(m[1]); return f ? r.fulfill({status:200, contentType:'image/jpeg', headers:{'access-control-allow-origin':'*'}, body:fs.readFileSync(f)}) : r.abort(); });
  await p.route(/cdn\.jsdelivr\.net/, r => r.abort());
}
if (process.argv[1].endsWith('ui.mjs')) {
  const b = await chromium.launch({args:['--use-gl=swiftshader', '--enable-unsafe-swiftshader']});
  const fails = [];
  for (const [w, h, lang] of [[1440, 900, 'en'], [390, 844, 'th'], [820, 1180, 'en']]) {
    const p = await (await b.newContext({viewport:{width:w, height:h}, acceptDownloads:true})).newPage();
    p.on('pageerror', e => fails.push(`${w} pageerror ${e.message}`));
    p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|404|ERR_ABORTED/.test(m.text())) fails.push(`${w} console ${m.text()}`); });
    await routes(p);
    const t0 = Date.now();
    await p.goto(`http://localhost:8765/lab/analysis.html?lang=${lang}&mp=http://localhost:8765/__mp/&fa=http://localhost:8765/__fa/`);
    await p.waitForSelector('.fa');
    await p.click('.fa-panel [data-act="sample"]');
    await p.waitForSelector('.fa-res:not([hidden])', {timeout:90000});
    const tRes = Date.now() - t0;
    await p.waitForFunction(() => !/…|–/.test(document.querySelector('[data-r="age"]').textContent), null, {timeout:60000}).catch(() => fails.push(`${w} no skin age`));
    const sum = await p.evaluate(() => ['score', 'age', 'gold'].map(k => document.querySelector(`[data-r="${k}"]`).textContent));
    const rows = await p.evaluate(() => [...document.querySelectorAll('.fa-fs')].map(f => f.dataset.f + ':' + f.querySelector('.fa-lv').textContent));
    console.log(w, lang, 'results in', tRes, 'ms', sum.join(' | '), '\n   ', rows.join('  '));
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (ov > 0) fails.push(`${w} overflow ${ov}`);
    await p.screenshot({path:`${OUT}/fa-${w}.png`, fullPage:true});
    // each factor draws its overlay
    for (const k of ['lines', 'spots', 'redness', 'sag', 'lid', 'balance', 'texture', 'under', 'shine']) {
      await p.click(`.fa-chip[data-f="${k}"]`);
      const on = await p.evaluate(k => document.querySelector(`.fa-fs[data-f="${k}"]`).getAttribute('aria-pressed'), k);
      if (on !== 'true') fails.push(`${w} ${k} not selected`);
    }
    await p.click('.fa-chip[data-f="lines"]');
    await (await p.$('.fa-fbox')).screenshot({path:`${OUT}/fa-${w}-lines.png`});
    await p.click('.fa-chip[data-f="spots"]');
    await (await p.$('.fa-fbox')).screenshot({path:`${OUT}/fa-${w}-spots.png`});
    // a side photo
    const side = findFace('1551706362');
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-side="1"]')]);
    await fc.setFiles(side);
    await p.waitForFunction(() => document.querySelector('[data-side="1"]').classList.contains('has') || !document.querySelector('[data-r="sideerr"]').hidden, null, {timeout:60000});
    const sideOk = await p.evaluate(() => document.querySelector('[data-side="1"]').classList.contains('has'));
    if (!sideOk) fails.push(`${w} side photo refused: ` + await p.evaluate(() => document.querySelector('[data-r="sideerr"]').textContent));
    // save
    const [dl] = await Promise.all([p.waitForEvent('download', {timeout:15000}).catch(() => null), p.click('[data-act="save"]')]);
    if (!dl) fails.push(`${w} no save`); else fs.copyFileSync(await dl.path(), `${OUT}/fa-save-${w}.jpg`);
    await p.close();
  }
  await b.close();
  console.log(fails.length ? 'FAILED\n' + fails.join('\n') : 'all passed');
}
