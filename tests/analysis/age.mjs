// Prints the face model's age guess for every test photo, at three crop sizes
import {createRequire} from 'module';
import fs from 'fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const {chromium} = require('playwright');
const MP = '/tmp/claude-0/-home-claude/b5460f3c-e75e-551e-b4ae-fc0088d5c4d9/scratchpad/mp/node_modules/@mediapipe/face_mesh/';
const FA = '/tmp/claude-0/-home-claude/b5460f3c-e75e-551e-b4ae-fc0088d5c4d9/scratchpad/fa/node_modules/@vladmandic/face-api/';
const b = await chromium.launch({args:['--use-gl=swiftshader', '--enable-unsafe-swiftshader']});
const p = await (await b.newContext({viewport:{width:900, height:900}})).newPage();
p.on('pageerror', e => console.log('pageerror', e.message));
const serve = (pre, dir) => p.route(u => new URL(u).pathname.startsWith(pre), r => { const f = r.request().url().split(pre)[1].split('?')[0]; if (!f || !fs.existsSync(dir + f)) return r.abort(); const t = f.endsWith('.js') ? 'text/javascript' : f.endsWith('.wasm') ? 'application/wasm' : f.endsWith('.json') ? 'application/json' : 'application/octet-stream'; return r.fulfill({status:200, contentType:t, body:fs.readFileSync(dir + f)}); });
await serve('/__mp/', MP); await serve('/__fa/', FA);
await p.route(u => new URL(u).pathname.startsWith('/__face/'), r => r.fulfill({status:200, contentType:'image/jpeg', body:fs.readFileSync(decodeURIComponent(new URL(r.request().url()).pathname.slice(8)))}));
await p.goto('http://localhost:8765/lab/analysis-raw.html?mp=http://localhost:8765/__mp/&fa=http://localhost:8765/__fa/');
for (const d of ['tests/proportions/faces/', 'tests/analysis/faces/']) for (const f of fs.readdirSync(d).filter(x => x.endsWith('.jpg'))) {
  const r = await p.evaluate(u => window.run(u), 'http://localhost:8765/__face/' + encodeURIComponent(d + f));
  if (!r) { console.log(f.slice(0, 13), 'no face'); continue; }
  const a = []; for (const pad of [1, 1.15, 1.3]) a.push(await p.evaluate(x => window.age(x), pad));
  console.log(f.slice(0, 13), a.map(x => `${x.age}${x.g}${x.gp}`).join('  '), a[0].backend, 'turn', r.turn.toFixed(2));
}
await b.close();
