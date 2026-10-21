// Hub, detail, learn and voucher screenshots at 1440x900 and 375x812.
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || 'http://127.0.0.1:8765';
const OUT = path.join(here, 'shots');
const which = process.argv[2] || 'hub';
const lang = process.env.LANG2 || 'en';
const browser = await chromium.launch();
for (const [tag, vp] of [['1440', { width: 1440, height: 900 }], ['375', { width: 375, height: 812 }]]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: tag === '375' ? 2 : 1, reducedMotion: process.env.RM ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    const now = Date.now();
    if (!localStorage.getItem('apxg.seeded')) {
      localStorage.setItem('apxg.seeded', '1');
      localStorage.setItem('apxg.best', JSON.stringify({ factrush: { score: 1460, level: 6, at: now }, memorymatch: { score: 2600, level: 4, at: now } }));
      localStorage.setItem('apxg.vouchers', JSON.stringify([{ code: 'APX-K7M2QD', game: 'factrush', prize: { en: 'Skincare kit', th: 'ชุดผลิตภัณฑ์ดูแลผิว' }, tier: 1, score: 1460, level: 6, name: 'Anna Lee', issued: now, expires: now + 60 * 864e5, seed: 1 }]));
    }
  });
  await page.goto(`${BASE}/lab/games.html?lang=${lang}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  if (which === 'hub') {
    await page.screenshot({ path: path.join(OUT, `hub-${lang}-${tag}.png`), fullPage: true });
  } else if (which === 'detail') {
    await page.click('[data-game=factrush] [data-act=open]');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, `detail-${lang}-${tag}.png`), fullPage: true });
  } else if (which === 'learn') {
    await page.click('[data-act=learn]');
    await page.waitForTimeout(400);
    await page.click('.lr-btns button >> nth=1');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `learn-${lang}-${tag}.png`), fullPage: true });
  } else if (which === 'voucher') {
    await page.click('.g-vrow .g-btn');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT, `voucher-${lang}-${tag}.png`) });
  }
  console.log(tag, which, errors.length ? 'ERRORS ' + errors.join(' | ') : 'no errors');
  await ctx.close();
}
await browser.close();
