// Extra checks: Thai strings render, abort cleans up, real-time play works, resize mid-run, reduced motion.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || 'http://127.0.0.1:8765';
const SHOTS = path.join(here, 'shots');
const botSrc = fs.readFileSync(path.join(here, 'bots.js'), 'utf8');
const CFG = {
  steady: { seed: 3, sigma: 2.6, vmin: 0.45, vmax: 1.35, react: 350, lift: 0 },
  proportion: { seed: 3, sigma: 0.004, see: 0.003, skip: 0, think: 650, react: 900 },
};
const browser = await chromium.launch();
const ok = (c, m) => console.log(`${c ? 'PASS' : 'FAIL'} ${m}`);

for (const game of ['steady', 'proportion']) {
  // Thai, real time, mid-run resize, then abort
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/lab/games-solo.html?game=${game}&seed=9&lang=th&probe=1&autostart=0`, { waitUntil: 'load' });
  await page.addScriptTag({ content: botSrc });
  await page.evaluate(({ game, cfg }) => { window.__start(); window.__bots[game](window.__host, cfg); }, { game, cfg: CFG[game] });
  await page.waitForTimeout(game === 'steady' ? 2600 : 2200);
  await page.screenshot({ path: path.join(SHOTS, `${game}-375-th.png`) });
  const before = await page.evaluate(() => window.__host.__probe());
  await page.setViewportSize({ width: 812, height: 375 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SHOTS, `${game}-812x375-resized.png`) });
  const after = await page.evaluate(() => window.__host.__probe());
  ok(after && after.phase !== undefined, `${game}: real-time run alive after resize (level ${before.level} -> ${after.level}, score ${after.score})`);
  // abort: start() aborts the previous run; check the old root is gone and the promise rejected with AbortError
  const ab = await page.evaluate(async (game) => {
    const mod = await import(`../assets/features/games/${game === 'steady' ? 'steady' : 'proportion'}.js`);
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:0;top:0;width:300px;height:400px';
    document.body.appendChild(host);
    const ac = new AbortController();
    const p = mod.default.run(host, { lang: 'th', level: 1, rng: Math.random, signal: ac.signal, onHud() {} });
    await new Promise((r) => setTimeout(r, 300));
    ac.abort();
    let name = 'resolved';
    try { await p; } catch (e) { name = e.name; }
    const left = host.childElementCount;
    host.remove();
    return { name, left };
  }, game);
  ok(ab.name === 'AbortError' && ab.left === 0, `${game}: abort rejects with AbortError and empties host (${JSON.stringify(ab)})`);
  ok(errors.length === 0, `${game}: no page errors ${errors.join(' | ')}`);
  await ctx.close();
}
await browser.close();
