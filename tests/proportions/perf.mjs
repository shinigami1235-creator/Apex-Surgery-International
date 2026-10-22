// Time one full redraw and one quick (slider) redraw with the CPU slowed 4x, like a mid-range phone
import {createRequire} from 'module';
import fs from 'fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const {chromium} = require('playwright');
const MP = '/tmp/claude-0/-home-claude/b5460f3c-e75e-551e-b4ae-fc0088d5c4d9/scratchpad/mp/node_modules/@mediapipe/face_mesh/';
const DIR = new URL('./faces/', import.meta.url).pathname;
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:390, height:844}});
const p = await ctx.newPage();
await p.route(u => new URL(u).pathname.startsWith('/__mp/'), r => { const f = r.request().url().split('__mp/')[1].split('?')[0]; if (!f || !fs.existsSync(MP + f)) return r.abort(); return r.fulfill({status:200, body:fs.readFileSync(MP + f), contentType:f.endsWith('.wasm') ? 'application/wasm' : 'text/javascript'}); });
await p.route(/images\.unsplash\.com\/photo-/, r => { const m = r.request().url().match(/photo-([0-9a-f]+-[0-9a-f]+)/); const f = m && fs.readdirSync(DIR).find(x => x.startsWith(m[1])); return f ? r.fulfill({status:200, contentType:'image/jpeg', headers:{'access-control-allow-origin':'*'}, body:fs.readFileSync(DIR + f)}) : r.abort(); });
await p.goto('http://localhost:8765/lab/proportions.html?lang=en&mp=http://localhost:8765/__mp/');
await p.click('.fp-panel [data-act="sample"]'); await p.waitForSelector('.fp-fbox:not([hidden])', {timeout:60000}); await p.waitForTimeout(1000);
const cdp = await ctx.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', {rate:4});
const t = await p.evaluate(async () => {
  const amt = document.querySelector('.fp input[type=range]'), raf = () => new Promise(r => requestAnimationFrame(() => r()));
  const out = {fast:[], full:[]};
  for (let v = 30; v <= 90; v += 15) {
    let t0 = performance.now(); amt.value = v; amt.dispatchEvent(new Event('input', {bubbles:true})); await raf(); await raf(); out.fast.push(Math.round(performance.now() - t0));
  }
  let t0 = performance.now(); amt.dispatchEvent(new Event('change', {bubbles:true})); await raf(); await raf(); out.full.push(Math.round(performance.now() - t0));
  return out;
});
console.log('4x slower CPU, ms per redraw', JSON.stringify(t));
await b.close();
