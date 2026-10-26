// Drives the implant viewer lab page: every area, 3D and photo, phone and desktop, both languages
import {createRequire} from 'module';
import fs from 'fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const {chromium} = require('playwright');
const SP = '/tmp/claude-0/-home-claude/b5460f3c-e75e-551e-b4ae-fc0088d5c4d9/scratchpad/';
const OUT = process.argv[2] || SP + 'im';
fs.mkdirSync(OUT, {recursive:true});
const only = process.argv[3];
const b = await chromium.launch({args:['--use-gl=swiftshader', '--enable-unsafe-swiftshader']});
const fails = [];
const runs = [['breast', 1440, 900, 'en'], ['chin', 1440, 900, 'en'], ['forehead', 390, 844, 'th'], ['nose', 390, 844, 'en'], ['breast', 390, 844, 'th']].filter(r => !only || r[0] === only);
for (const [area, w, h, lang] of runs) {
  const p = await (await b.newContext({viewport:{width:w, height:h}, acceptDownloads:true})).newPage();
  p.on('pageerror', e => fails.push(`${area} ${w} pageerror ${e.message}`));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|404|ERR_ABORTED/.test(m.text())) fails.push(`${area} ${w} console ${m.text()}`); });
  await p.route(/images\.unsplash\.com/, r => r.fulfill({status:200, contentType:'image/jpeg', headers:{'access-control-allow-origin':'*'}, body:fs.readFileSync('tests/nose-guide/side.jpg')}));
  await p.goto(`http://localhost:8765/lab/implants.html?lang=${lang}&area=${area}`);
  await p.waitForSelector('.im');
  await p.waitForFunction(() => document.querySelector('[data-r="busy3"]').hidden, null, {timeout:30000}).catch(() => fails.push(`${area} ${w} 3D never loaded`));
  await p.waitForTimeout(600);
  const sum = await p.evaluate(() => [...document.querySelectorAll('.im-card')].map(c => c.innerText.replace(/\n/g, ' ')).join(' | '));
  console.log(area, w, lang, sum);
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (ov > 0) fails.push(`${area} ${w} overflow ${ov}`);
  await p.screenshot({path:`${OUT}/${area}-${w}-3d.png`, fullPage:true});
  // views and toggles
  await p.click('[data-yaw="1.57"]'); await p.waitForTimeout(700);
  await p.click(area === 'breast' ? '[data-act="xray"]' : '[data-act="change"]'); await p.waitForTimeout(300);
  await p.locator('.im-stage').screenshot({path:`${OUT}/${area}-${w}-side.png`});
  if (area === 'breast') {
    await p.selectOption('[data-r="line"]', 'mentor-cpg');
    await p.click('[data-act="compare"]'); await p.waitForTimeout(400);
    console.log('  compare', await p.evaluate(() => [...document.querySelectorAll('.im-tag')].map(t => t.textContent).join(' / ')));
    await p.locator('.im-stage').screenshot({path:`${OUT}/${area}-${w}-compare.png`});
  }
  // photo: switched off for now, so the tab must be hidden
  const photoOn = await p.isVisible('[data-mode="photo"]');
  if (photoOn) await p.click('[data-mode="photo"]');
  else console.log('  photo tab hidden');
  if (photoOn && area !== 'breast') {
    await p.click('.im-empty [data-act="sample"]');
    await p.waitForSelector('.im-fbox:not([hidden])', {timeout:20000});
    await p.waitForTimeout(300);
    const st = await p.evaluate(() => ({err:__im._state.err, edit:__im._state.edit, pts:__im._state.photo.pts}));
    console.log('  photo', JSON.stringify(st).slice(0, 300));
    await p.locator('.im-stage').screenshot({path:`${OUT}/${area}-${w}-photo.png`});
    if (st.edit) { await p.click('[data-act="edit"]'); await p.waitForTimeout(200); await p.locator('.im-stage').screenshot({path:`${OUT}/${area}-${w}-photo2.png`}); }
  }
  const ov2 = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (ov2 > 0) fails.push(`${area} ${w} photo overflow ${ov2}`);
  // save
  if (photoOn) await p.click('[data-mode="3d"]');
  const dl = p.waitForEvent('download', {timeout:15000}).catch(() => null);
  await p.click('[data-act="save"]');
  const d = await dl; if (!d) fails.push(`${area} ${w} no download`); else await d.saveAs(`${OUT}/${area}-${w}-saved.jpg`);
  await p.context().close();
}
await b.close();
if (fails.length) { console.log('FAIL\n' + fails.join('\n')); process.exit(1); } else console.log('ok');
