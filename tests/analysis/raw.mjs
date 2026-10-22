// Runs the raw face analysis readings on every test photo and prints them, for calibration
import {createRequire} from 'module';
import fs from 'fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const {chromium} = require('playwright');
const MP = '/tmp/claude-0/-home-claude/b5460f3c-e75e-551e-b4ae-fc0088d5c4d9/scratchpad/mp/node_modules/@mediapipe/face_mesh/';
const DIRS = process.env.FACES ? process.env.FACES.split(',') : ['tests/proportions/faces/', 'tests/analysis/faces/'];
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:900, height:900}})).newPage();
p.on('pageerror', e => console.log('pageerror', e.message));
p.on('console', m => { if (m.type() === 'error') console.log('console', m.text()); });
await p.route(u => new URL(u).pathname.startsWith('/__mp/'), r => { const f = r.request().url().split('__mp/')[1].split('?')[0]; if (!f || !fs.existsSync(MP + f)) return r.abort(); const t = f.endsWith('.js') ? 'text/javascript' : f.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream'; return r.fulfill({status:200, contentType:t, body:fs.readFileSync(MP + f)}); });
await p.route(u => new URL(u).pathname.startsWith('/__face/'), r => { const f = decodeURIComponent(new URL(r.request().url()).pathname.slice(8)); return r.fulfill({status:200, contentType:'image/jpeg', body:fs.readFileSync(f)}); });
await p.goto('http://localhost:8765/lab/analysis-raw.html?mp=http://localhost:8765/__mp/');
const out = {};
for (const d of DIRS) for (const f of fs.readdirSync(d).filter(x => x.endsWith('.jpg'))) {
  const r = await p.evaluate(u => window.run(u), 'http://localhost:8765/__face/' + encodeURIComponent(d + f));
  out[process.env.FACES ? f.replace(/\.jpg$/, '') : f.slice(0, 13)] = r;
}
fs.writeFileSync(process.argv[2] || '/tmp/claude-0/-home-claude/b5460f3c-e75e-551e-b4ae-fc0088d5c4d9/scratchpad/raw.json', JSON.stringify(out, null, 1));
const f2 = (x, k = 3) => x == null ? '-' : (+x).toFixed(k);
console.log('face          ms  shp   lgt  trn | fhd   glb   crw   und  | pore  rgh  | spot  tL   tA  | redP  rCF  | dark trgh | shine| fold  mar   drp   brow  jaw | crease | asym | q');
for (const [k, r] of Object.entries(out)) {
  if (!r) { console.log(k, 'no face'); continue; }
  console.log(k.slice(-14).padStart(14), String(r.ms).padStart(4), f2(r.sharp, 2), f2(r.light, 2), f2(r.turn, 2), '|', f2(r.lines.forehead.share), f2(r.lines.glabella.share), f2(r.lines.crows.share), f2(r.lines.under.share), '|', f2(r.texture.pores), f2(r.texture.rough, 2), '|', f2(r.even.spots, 1), f2(r.even.toneL, 2), f2(r.even.toneA, 2), '|', f2(r.redness.patch), f2(r.redness.cheekVsForehead, 1), '|', f2(r.under.dark), f2(r.under.trough), '|', f2(r.shine.share), '|', f2(r.sag.fold), f2(r.sag.mario), f2(r.sag.droop), f2(r.sag.brow, 2), f2(r.sag.jaw), '|', f2(r.lid.crease, 2), '|', f2(r.asym), '|', r.q.join(','));
}
await b.close();
