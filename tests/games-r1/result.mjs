// Plays a scored Fact Rush run in the hub with a bot under a fake clock, screenshots the result
// count-up mid-way and settled, then claims the voucher. node result.mjs [tag] [lang]
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || 'http://127.0.0.1:8765';
const [tag = '1440', lang = 'en', game = 'factrush'] = process.argv.slice(2);
const vp = tag === '375' ? { width: 375, height: 812 } : { width: 1440, height: 900 };
const botSrc = fs.readFileSync(path.join(here, 'bots.js'), 'utf8');
const CFG = { factrush: { seed: 3, acc: 0.93, react: 700 }, recoverysort: { seed: 3, acc: 0.93, react: 700 }, memorymatch: { seed: 3, mem: 0.9, think: 500 } };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.clock.install({ time: new Date('2026-10-21T10:00:00+07:00') });
await page.goto(`${BASE}/lab/games.html?lang=${lang}`, { waitUntil: 'load' });
await page.evaluate(() => { try { Object.keys(localStorage).filter(k => k.startsWith('apxg.')).forEach(k => localStorage.removeItem(k)); } catch (e) {} });
await page.reload({ waitUntil: 'load' });
await page.clock.runFor(800);
await page.addScriptTag({ content: botSrc });
await page.click(`[data-game=${game}] [data-act=open]`);
await page.clock.runFor(300);
await page.click('[data-act=scored]');
await page.clock.runFor(1200);
await page.screenshot({ path: path.join(here, 'shots', `count-${lang}-${tag}.png`) });
await page.clock.runFor(2200);
await page.evaluate(({ game, cfg }) => window.__bots[game](document.querySelector('.g-host'), cfg), { game, cfg: CFG[game] });
let t = 0;
while (!(await page.$('[data-result]')) && t < 400000) { await page.clock.runFor(100); t += 100; if (t === 8000) await page.screenshot({ path: path.join(here, 'shots', `hubplay-${game}-${lang}-${tag}.png`) }); }
const seq = [];
for (let i = 0; i < 8; i++) { seq.push(await page.textContent('[data-score]')); if (i === 2) await page.screenshot({ path: path.join(here, 'shots', `result-mid-${lang}-${tag}.png`) }); await page.clock.runFor(120); }
console.log('count-up samples', seq.join(' '));
await page.clock.runFor(2500);
await page.screenshot({ path: path.join(here, 'shots', `result-${lang}-${tag}.png`) });
const score = await page.getAttribute('[data-score]', 'data-score');
const shown = await page.textContent('[data-score]');
console.log('result score', score, 'shown', shown, 'sim', t / 1000, 's');
if (await page.$('[data-act=claim]')) {
  await page.click('[data-act=claim]'); await page.clock.runFor(300);
  await page.click('[data-act=line]'); await page.clock.runFor(300);
  await page.fill('#apxg-name', lang === 'th' ? 'สมหญิง ใจดี' : 'Anna Lee');
  await page.check('#apxg-consent');
  await page.click('[data-act=create]'); await page.clock.runFor(1500);
  await page.screenshot({ path: path.join(here, 'shots', `voucher-new-${lang}-${tag}.png`) });
  console.log('voucher', await page.getAttribute('.g-vc', 'data-code'));
}
console.log(errors.length ? 'ERRORS ' + errors.join(' | ') : 'no errors');
await browser.close();
