// Loads each test face and saves the after view with the golden spiral, to check where the spiral lands
import {createRequire} from 'module';
import fs from 'fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const {chromium} = require('playwright');
const MP = '/tmp/claude-0/-home-claude/b5460f3c-e75e-551e-b4ae-fc0088d5c4d9/scratchpad/mp/node_modules/@mediapipe/face_mesh/';
const DIR = new URL('./faces/', import.meta.url).pathname, OUT = process.argv[2];
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:1440, height:900}})).newPage();
const fails = [];
p.on('pageerror', e => fails.push('pageerror ' + e.message));
await p.route(u => new URL(u).pathname.startsWith('/__mp/'), r => { const f = r.request().url().split('__mp/')[1].split('?')[0]; if (!f || !fs.existsSync(MP + f)) return r.abort(); const t = f.endsWith('.js') ? 'text/javascript' : f.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream'; return r.fulfill({status:200, contentType:t, body:fs.readFileSync(MP + f)}); });
await p.route(/cdn\.jsdelivr\.net/, r => r.abort());
await p.goto('http://localhost:8765/lab/proportions.html?lang=en&mp=http://localhost:8765/__mp/');
await p.waitForSelector('.fp');
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.jpg')).slice(0, +(process.argv[3] || 99));
for (const f of files) {
  await p.evaluate(() => { window.__prev = window.__fp._cur(); });
  await p.setInputFiles('.fp input[type=file]', DIR + f);
  try { await p.waitForFunction(() => window.__fp._cur() && window.__fp._cur() !== window.__prev, null, {timeout:60000}); } catch (e) { fails.push('no face ' + f); continue; }
  await p.waitForTimeout(900);
  await p.evaluate(() => { const fr = document.querySelector('.fp-frame'); fr.style.setProperty('--x', '0%'); });
  await p.evaluate(() => document.querySelector('.fp').classList.add('noguides'));
  await (await p.$('.fp-frame')).screenshot({path:`${OUT}/sp-${f.slice(0, 10)}.png`});
}
await b.close();
console.log(fails.length ? 'FAILED\n' + fails.join('\n') : 'ok ' + files.length);
