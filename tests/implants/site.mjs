// The real implant viewer pages with three.js served locally: each area on desktop and phone, both languages,
// plus the home card, menu and footer links and an accessibility check
import {createRequire} from 'module';
import fs from 'fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const {chromium} = require('playwright');
const SP = '/tmp/claude-0/-home-claude/b5460f3c-e75e-551e-b4ae-fc0088d5c4d9/scratchpad/', OUT = process.argv[2] || SP + 'im';
fs.mkdirSync(OUT, {recursive:true});
async function routes(p){
  await p.route(/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\/build\/three\.module\.js/, r => r.fulfill({status:200, contentType:'text/javascript', headers:{'access-control-allow-origin':'*'}, body:fs.readFileSync('site/lab/vendor/three.module.js')}));
  await p.route(/images\.unsplash\.com\/photo-1736439538470/, r => r.fulfill({status:200, contentType:'image/jpeg', headers:{'access-control-allow-origin':'*'}, body:fs.readFileSync('tests/implants/profile-female.jpg')}));
  await p.route(/^https?:\/\/(?!localhost|cdn\.jsdelivr|images\.unsplash)/, r => r.abort());
}
const b = await chromium.launch({args:['--use-gl=swiftshader', '--enable-unsafe-swiftshader']});
const fails = [];
for (const [w, h, path] of [[1440, 900, 'breast-implants.html'], [390, 844, 'th/breast-implants.html'], [1440, 900, 'chin-implants.html'], [390, 844, 'forehead-implants.html'], [820, 1180, 'th/nose-implants.html']]) {
  const p = await (await b.newContext({viewport:{width:w, height:h}})).newPage();
  p.on('pageerror', e => fails.push(`${path} ${w} pageerror ${e.message}`));
  await routes(p);
  await p.goto('http://localhost:8765/' + path);
  await p.waitForSelector('.im', {timeout:20000});
  await p.waitForFunction(() => document.querySelector('[data-r="busy3"]').hidden, null, {timeout:30000}).catch(() => fails.push(`${path} ${w} 3D never loaded`));
  await p.evaluate(() => document.querySelectorAll('.rv,.rv-clip').forEach(e => e.classList.add('in', 'on')));
  await p.waitForTimeout(500);
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (ov > 0) fails.push(`${path} ${w} overflow ${ov}`);
  const title = await p.title();
  console.log(w, path, title, '|', await p.evaluate(() => [...document.querySelectorAll('.im-card b')].map(x => x.textContent).join(' / ')));
  await p.screenshot({path:`${OUT}/site-${path.replace('/', '-')}-${w}.png`, fullPage:true});
  // the area links go to the other viewers
  const hrefs = await p.evaluate(() => [...document.querySelectorAll('.im-areas a')].map(a => a.getAttribute('href')).join(','));
  if (hrefs !== 'breast-implants.html,chin-implants.html,forehead-implants.html,nose-implants.html') fails.push(`${path} area links ${hrefs}`);
  if (path.includes('breast') || path.includes('nose')) {
    await p.click('[data-act="plan"]');
    const planned = await p.evaluate(() => Object.keys(localStorage).filter(k => /plan/i.test(k)).map(k => localStorage.getItem(k)).join(''));
    if (!/breast|rhinoplasty/.test(planned)) fails.push(`${path} plan not stored`);
  }
  if (w === 1440) {
    await p.addScriptTag({path:SP + 'axe/node_modules/axe-core/axe.min.js'});
    const ax = await p.evaluate(async () => (await axe.run(document.querySelector('.im'), {runOnly:['wcag2a', 'wcag2aa']})).violations.map(v => `${v.id}: ${v.nodes.length} ${v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' / ')}`));
    if (ax.length) fails.push(`${path} axe ` + ax.join('; '));
    // photo tab keyboard and the photo panel
    await p.click('[data-mode="photo"]');
    const ax2 = await p.evaluate(async () => (await axe.run(document.querySelector('.im'), {runOnly:['wcag2a', 'wcag2aa']})).violations.map(v => `${v.id}: ${v.nodes.length} ${v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' / ')}`));
    if (ax2.length) fails.push(`${path} photo axe ` + ax2.join('; '));
  }
  await p.close();
}
const p = await (await b.newContext({viewport:{width:1440, height:900}})).newPage();
await p.route(/^https?:\/\/(?!localhost)/, r => r.abort());
for (const [path, sel] of [['index.html', '.tool-impl'], ['services.html', '.mini-tool[href="breast-implants.html"]'], ['th/index.html', '.tool-impl']]) {
  await p.goto('http://localhost:8765/' + path); await p.waitForTimeout(1200);
  if (!await p.$(sel)) fails.push(`${path} missing ${sel}`);
  if (!await p.$('.mega-tools a[href="breast-implants.html"]')) fails.push(`${path} missing menu link`);
  if (!await p.$('footer a[href="breast-implants.html"], .ftr a[href="breast-implants.html"]')) fails.push(`${path} missing footer link`);
}
for (const w of [1440, 390]) {
  await p.setViewportSize({width:w, height:900});
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(800);
  await p.evaluate(() => { document.querySelectorAll('.rv,.rv-clip').forEach(e => e.classList.add('in', 'on')); document.querySelector('.tools-s').scrollIntoView(); });
  await p.waitForTimeout(500);
  await (await p.$('.tools-s')).screenshot({path:`${OUT}/home-tools-${w}.png`});
}
await b.close();
console.log(fails.length ? 'FAILED\n' + fails.join('\n') : 'all passed');
if (fails.length) process.exit(1);
