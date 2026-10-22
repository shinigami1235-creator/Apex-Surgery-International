// Drives the lab page with the sample face at phone, tablet and desktop sizes and saves screenshots
import {createRequire} from 'module';
import fs from 'fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const {chromium} = require('playwright');
const MP = '/tmp/claude-0/-home-claude/b5460f3c-e75e-551e-b4ae-fc0088d5c4d9/scratchpad/mp/node_modules/@mediapipe/face_mesh/';
const DIR = new URL('./faces/', import.meta.url).pathname, OUT = process.argv[2];
const route = async p => {
  await p.route(u => new URL(u).pathname.startsWith('/__mp/'), r => { const f = r.request().url().split('__mp/')[1].split('?')[0]; if (!f || !fs.existsSync(MP + f)) return r.abort(); const t = f.endsWith('.js') ? 'text/javascript' : f.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream'; return r.fulfill({status:200, contentType:t, body:fs.readFileSync(MP + f)}); });
  await p.route(/images\.unsplash\.com\/photo-([0-9a-f-]+)/, r => { const id = r.request().url().match(/photo-([0-9a-f]+-[0-9a-f]+)/)[1]; const f = fs.readdirSync(DIR).find(x => x.startsWith(id)); return f ? r.fulfill({status:200, contentType:'image/jpeg', headers:{'access-control-allow-origin':'*'}, body:fs.readFileSync(DIR + f)}) : r.abort(); });
  await p.route(/cdn\.jsdelivr\.net/, r => r.abort());
};
const b = await chromium.launch();
const fails = [];
for (const [w, h, lang] of [[1440, 900, 'en'], [390, 844, 'th'], [820, 1180, 'en']]) {
  const p = await (await b.newContext({viewport:{width:w, height:h}})).newPage();
  p.on('pageerror', e => fails.push(`${w} pageerror ${e.message}`));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|404/.test(m.text())) fails.push(`${w} console ${m.text()}`); });
  await route(p);
  await p.goto(`http://localhost:8765/lab/proportions.html?lang=${lang}&mp=http://localhost:8765/__mp/`);
  await p.waitForSelector('.fp');
  await p.click('.fp-panel [data-act="sample"]');
  await p.waitForSelector('.fp-fbox:not([hidden])', {timeout:60000});
  await p.waitForTimeout(1200);
  const info = await p.evaluate(() => { const c = window.__fp._cur(); return c && {M0:c.M0, M1:c.M1, info:c.P.info}; });
  console.log(w, JSON.stringify(info && Object.fromEntries(['thirds','nose','golden','lips','jaw'].map(k => [k, [info.M0[k].toFixed(3), info.M1[k].toFixed(3)]]))));
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (ov > 0) fails.push(`${w} overflow ${ov}`);
  await p.screenshot({path:`${OUT}/ui-${w}.png`, fullPage:true});
  // toggle the jaw off, change sex, move amount, check it redraws
  await p.click('[data-tog="jaw"]'); await p.waitForTimeout(400);
  const jawOff = await p.evaluate(() => window.__fp._cur().P.info.jaw);
  if (jawOff) fails.push(`${w} jaw still on after toggle`);
  await p.click('[data-sex="men"]'); await p.waitForTimeout(400);
  await p.screenshot({path:`${OUT}/ui-${w}-b.png`});
  await p.close();
}
await b.close();
console.log(fails.length ? 'FAILED\n' + fails.join('\n') : 'all passed');
