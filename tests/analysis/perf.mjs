// Times the skin reading with the CPU slowed four times, close to a mid-range phone
import {createRequire} from 'module';
import fs from 'fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const {chromium} = require('playwright');
const MP = '/tmp/claude-0/-home-claude/b5460f3c-e75e-551e-b4ae-fc0088d5c4d9/scratchpad/mp/node_modules/@mediapipe/face_mesh/';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:900, height:900}})).newPage();
await p.route(u => new URL(u).pathname.startsWith('/__mp/'), r => { const f = r.request().url().split('__mp/')[1].split('?')[0]; return fs.existsSync(MP + f) ? r.fulfill({status:200, contentType:f.endsWith('.js') ? 'text/javascript' : f.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream', body:fs.readFileSync(MP + f)}) : r.abort(); });
await p.route(u => new URL(u).pathname.startsWith('/__face/'), r => r.fulfill({status:200, contentType:'image/jpeg', body:fs.readFileSync(decodeURIComponent(new URL(r.request().url()).pathname.slice(8)))}));
await p.goto('http://localhost:8765/lab/analysis-raw.html?mp=http://localhost:8765/__mp/');
await p.evaluate(u => window.run(u), 'http://localhost:8765/__face/' + encodeURIComponent('tests/analysis/faces/1774437895887-d1e801bae1a9.jpg'));
const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', {rate:4});
for (const f of ['tests/analysis/faces/1774437895887-d1e801bae1a9.jpg', 'tests/analysis/faces/1732888646671-7ceaf1155bea.jpg', 'tests/proportions/faces/1534751516642-a1af1ef26a56.jpg']) {
  const r = await p.evaluate(u => window.run(u), 'http://localhost:8765/__face/' + encodeURIComponent(f));
  console.log(f.split('/').pop().slice(0, 13), 'read', r.ms, 'ms at 4x slower CPU, work image', r.W + 'x' + r.H);
}
await b.close();
