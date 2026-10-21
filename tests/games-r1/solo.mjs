// Plays one game in the solo lab with a bot under a fake clock and screenshots it mid-play.
// node solo.mjs <game> <tag> [seed] [atSec...]
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || 'http://127.0.0.1:8765';
const [game, tag = '1440', seed = '5', ...at] = process.argv.slice(2);
const vp = tag === '375' ? { width: 375, height: 812 } : { width: 1440, height: 900 };
const botSrc = fs.readFileSync(path.join(here, 'bots.js'), 'utf8');
const CFG = {
  steady: { seed: 11, sigma: 2.6, vmin: 0.45, vmax: 1.35, react: 350, lift: 0 },
  proportion: { seed: 11, sigma: 0.004, see: 0.003, skip: 0, think: 650, react: 900 },
  factrush: { seed: 11, acc: 0.85, react: 900 },
  recoverysort: { seed: 11, acc: 0.85, react: 900 },
  memorymatch: { seed: 11, mem: 0.85, think: 500 }
};
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, reducedMotion: process.env.RM ? 'reduce' : 'no-preference' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.clock.install({ time: 0 });
await page.goto(`${BASE}/lab/games-solo.html?game=${game}&seed=${seed}&lang=${process.env.LANG2 || 'en'}&probe=1&autostart=0${process.env.LEVEL ? '&level=' + process.env.LEVEL : ''}`, { waitUntil: 'load' });
await page.clock.pauseAt(20000);
await page.addScriptTag({ content: botSrc });
await page.evaluate(({ game, cfg, nobot }) => { window.__noBot = nobot; window.__start(); if (!window.__noBot) window.__bots[game](window.__host, cfg); }, { game, cfg: CFG[game], nobot: !!process.env.NOBOT });
const times = (at.length ? at : ['3', '8']).map(Number);
let t = 0;
for (const s of times) {
  while (t < s * 1000) { await page.clock.runFor(100); t += 100; }
  const f = path.join(here, 'shots', `${game}-${process.env.LANG2 || 'en'}-${tag}-s${seed}${process.env.LEVEL ? 'L' + process.env.LEVEL : ''}-${s}s${process.env.RM ? '-rm' : ''}.png`);
  await page.screenshot({ path: f });
  console.log('shot', f);
}
console.log(errors.length ? 'ERRORS ' + errors.join(' | ') : 'no errors');
await browser.close();
