// Saves the image with the sample face and writes it out, to check the layout of the saved file
import fs from 'fs';
import {chromium} from '../pw.mjs';
const MP = new URL('../../site/assets/vendor/face_mesh/', import.meta.url).pathname;
const DIR = new URL('./faces/', import.meta.url).pathname, OUT = process.argv[2], lang = process.argv[3] || 'en';
const b = await chromium.launch();
const p = await (await b.newContext({viewport:{width:1440, height:900}, acceptDownloads:true})).newPage();
await p.route(u => new URL(u).pathname.startsWith('/__mp/'), r => { const f = r.request().url().split('__mp/')[1].split('?')[0]; if (!f || !fs.existsSync(MP + f)) return r.abort(); const t = f.endsWith('.js') ? 'text/javascript' : f.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream'; return r.fulfill({status:200, contentType:t, body:fs.readFileSync(MP + f)}); });
await p.route(/images\.unsplash\.com\/photo-([0-9a-f-]+)/, r => { const id = r.request().url().match(/photo-([0-9a-f]+-[0-9a-f]+)/)[1]; const f = fs.readdirSync(DIR).find(x => x.startsWith(id)); return f ? r.fulfill({status:200, contentType:'image/jpeg', headers:{'access-control-allow-origin':'*'}, body:fs.readFileSync(DIR + f)}) : r.abort(); });
await p.route(/cdn\.jsdelivr\.net/, r => r.abort());
await p.goto(`http://localhost:8765/lab/proportions.html?lang=${lang}&mp=http://localhost:8765/__mp/`);
await p.waitForSelector('.fp');
await p.click('.fp-panel [data-act="sample"]');
await p.waitForSelector('.fp-fbox:not([hidden])', {timeout:60000});
await p.waitForTimeout(800);
const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-act="save"]')]);
await dl.saveAs(`${OUT}/saved-${lang}.jpg`);
await b.close();
console.log('saved');
