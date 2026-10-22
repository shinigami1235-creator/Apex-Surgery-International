// Screenshots and checks for the nose preview: colour-coded points, placement guide, zoom, soft light.
// node shots.mjs  (site served on :8765 from /home/claude/apex-surgery/site)
import {createRequire} from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const {chromium} = require('playwright');
import fs from 'fs';

const OUT = '/home/claude/apex-surgery/_shots/nose-guide';
const DIR = '/home/claude/apex-surgery/tests/nose-guide';
const FACES = {'photo-1589525231707': 'front.jpg', 'photo-1641351841616': '45.jpg', 'photo-1736439538470': 'side.jpg'};
const BASE = 'http://localhost:8765/lab/nose.html';
const fails = [];
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails.push(m); };

const browser = await chromium.launch();
async function page(w, h, lang, opts = {}){
  const ctx = await browser.newContext({viewport:{width:w, height:h}, deviceScaleFactor:w < 500 ? 2 : 1, hasTouch:w < 500, isMobile:w < 500});
  const p = await ctx.newPage();
  p.on('pageerror', e => fails.push('pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/jsdelivr|ERR_FAILED|Failed to load resource/.test(m.text())) console.log('console:', m.text()); });
  await p.route(/images\.unsplash\.com/, r => {
    if (opts.noSample) return r.abort();
    const k = Object.keys(FACES).find(k => r.request().url().includes(k));
    return r.fulfill({status:200, contentType:'image/jpeg', headers:{'access-control-allow-origin':'*'}, body:fs.readFileSync(`${DIR}/${FACES[k]}`)});
  });
  await p.route(/cdn\.jsdelivr\.net/, r => r.abort());
  await p.goto(`${BASE}?lang=${lang}`);
  await p.waitForSelector('.np');
  return p;
}
const stage = p => p.evaluate(() => document.querySelector('.np-stage').scrollIntoView({block:'start'}));
const shot = async (p, name) => { await p.waitForTimeout(250); await p.screenshot({path:`${OUT}/${name}.png`}); console.log('shot', name); };
async function sample(p, viewId){
  if (viewId !== 'front') await p.click(`.np-tab[data-view="${viewId}"]`);
  await p.click('.np-panel [data-act="sample"]');
  await p.waitForSelector('.np-frame.pts .np-pt');
  await p.waitForFunction(() => !document.querySelector('.np-gd canvas').hidden, null, {timeout:5000}).catch(() => {});
}
const noHScroll = p => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);

for (const [w, h, tag] of [[375, 812, 'phone'], [1440, 900, 'desktop']]) {
  for (const lang of ['en', 'th']) {
    const p = await page(w, h, lang);
    await sample(p, 'front');
    await stage(p);
    ok(await p.locator('.np-gd').isVisible(), `${tag} ${lang}: guide visible in points mode`);
    ok(!(await p.locator('.np-gd canvas').isHidden()), `${tag} ${lang}: guide picture drawn`);
    const cols = await p.$$eval('.np-pt', els => els.map(e => getComputedStyle(e, '::before').backgroundColor));
    ok(new Set(cols).size === cols.length && cols.length === 6, `${tag} ${lang}: six distinct point colours ${cols.join(' ')}`);
    const sizes = await p.$$eval('.np-pt', els => els.map(e => e.getBoundingClientRect().width));
    ok(sizes.every(s => Math.abs(s - 44) < .5), `${tag} ${lang}: handles are 44px`);
    ok(await noHScroll(p), `${tag} ${lang}: no horizontal scroll`);
    // guide sits beside (desktop) or below (phone) the photo and never over it
    const [fb, gb] = await p.$$eval('.np-fbox, .np-gd', els => els.map(e => e.getBoundingClientRect().toJSON()));
    const overlap = !(gb.left >= fb.right - 1 || gb.right <= fb.left + 1 || gb.top >= fb.bottom - 1 || gb.bottom <= fb.top + 1);
    ok(!overlap, `${tag} ${lang}: guide does not cover the photo (${w > 1000 ? 'beside' : 'below'}: ${w > 1000 ? gb.left > fb.right : gb.top > fb.bottom})`);
    await shot(p, `${tag}-${lang}-points-front`);
    if (lang === 'en') {
      for (const vid of ['45', '90']) {
        await sample(p, vid); await stage(p);
        const n = await p.$$eval('.np-pt', els => new Set(els.map(e => getComputedStyle(e, '::before').backgroundColor)).size);
        ok(n === (vid === '90' ? 5 : 6), `${tag}: ${vid} view distinct colours`);
        await shot(p, `${tag}-en-points-${vid}`);
      }
      await p.click('.np-tab[data-view="front"]');
      await p.waitForSelector('.np-fbox:not([hidden])');
      // zoom in points mode
      await p.click('[data-act="zin"]'); await stage(p);
      ok(await p.$eval('[data-r="zoomv"]', e => e.textContent) === '2×', `${tag}: zoom 2x`);
      await p.click('[data-act="adjust"]');
      await shot(p, `${tag}-en-points-zoom2`);
      await p.click('[data-act="zin"]');
      ok(await p.$eval('[data-r="zoomv"]', e => e.textContent) === '3×', `${tag}: zoom 3x`);
      ok(await p.$eval('[data-act="zin"]', e => e.disabled), `${tag}: zoom in disabled at 3x`);
      await shot(p, `${tag}-en-points-zoom3`);
      // drag a point while zoomed: it must land under the pointer
      const tip = p.locator('.np-pt[data-k="T"]');
      const tb = await tip.boundingBox();
      const tx = tb.x + tb.width / 2 + 30, ty = tb.y + tb.height / 2 + 20;
      if (w < 500) {
        const cdp = await p.context().newCDPSession(p);
        const t = (type, x, y) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints:type === 'touchEnd' ? [] : [{x, y}]});
        await t('touchStart', tb.x + 22, tb.y + 22); await t('touchMove', tx - 10, ty - 10); await t('touchMove', tx, ty); await t('touchEnd');
      } else {
        await p.mouse.move(tb.x + 22, tb.y + 22); await p.mouse.down(); await p.mouse.move(tx, ty, {steps:4}); await p.mouse.up();
      }
      const nb = await tip.boundingBox();
      ok(Math.hypot(nb.x + 22 - tx, nb.y + 22 - ty) < 1.5, `${tag}: point lands under the pointer at 3x (off by ${Math.hypot(nb.x + 22 - tx, nb.y + 22 - ty).toFixed(2)}px)`);
      // stored photo coordinates agree with the screen position
      const err = await p.evaluate(([x, y]) => {
        const fr = document.querySelector('.np-frame').getBoundingClientRect(), st = window.__nose._state.views.front;
        const z = 3, tr = document.querySelector('.np-zl').style.transform;
        const m = tr.match(/translate\(([-\d.]+)%,\s*([-\d.]+)%\)/), ox = -m[1] / 100, oy = -m[2] / 100;
        const fx = ox + (x - fr.left) / fr.width / z, fy = oy + (y - fr.top) / fr.height / z;
        return Math.hypot(fx * st.base.width - st.h.T.x, fy * st.base.height - st.h.T.y);
      }, [tx, ty]);
      ok(err < 1, `${tag}: stored tip matches pointer in photo pixels (err ${err.toFixed(2)})`);
      // view change resets zoom
      await p.click('.np-tab[data-view="45"]'); await p.click('.np-tab[data-view="front"]');
      ok(await p.$eval('[data-r="zoomv"]', e => e.textContent) === '1×', `${tag}: zoom resets on view change`);
      // result mode, glow off then on
      if (await p.locator('[data-act="done"]').isVisible()) await p.click('[data-act="done"]');
      await p.waitForTimeout(400); await stage(p);
      ok(await p.locator('.np-gd').isHidden(), `${tag}: guide hidden in result mode`);
      ok(await p.$eval('[data-act="glow"]', e => e.getAttribute('aria-checked')) === 'false', `${tag}: soft light off by default`);
      await shot(p, `${tag}-en-result-glow-off`);
      const beforeHash = await p.$eval('.np-before', c => c.toDataURL().length);
      const afterOff = await p.$eval('.np-after', c => c.toDataURL());
      await p.click('[data-act="glow"]'); await p.waitForTimeout(500);
      const afterOn = await p.$eval('.np-after', c => c.toDataURL());
      ok(afterOn !== afterOff, `${tag}: soft light changes the after picture`);
      ok(await p.$eval('.np-before', c => c.toDataURL().length) === beforeHash, `${tag}: before picture unchanged`);
      await shot(p, `${tag}-en-result-glow-on`);
      // zoom in result mode and drag the slider: the split lands under the pointer
      await p.click('[data-act="zin"]'); await p.click('[data-act="zin"]');
      await shot(p, `${tag}-en-result-zoom3`);
      const fr = await p.locator('.np-frame').boundingBox();
      const lineX = fr.x + fr.width / 2, gx = fr.x + fr.width * .3, gy = fr.y + fr.height * .3;
      if (w < 500) {
        const cdp = await p.context().newCDPSession(p);
        const t = (type, x, y) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints:type === 'touchEnd' ? [] : [{x, y}]});
        await t('touchStart', lineX, gy); await t('touchMove', lineX - 20, gy); await t('touchMove', gx, gy); await t('touchEnd');
      } else {
        await p.mouse.move(lineX, gy); await p.mouse.down(); await p.mouse.move(gx, gy, {steps:5}); await p.mouse.up();
      }
      const split = await p.evaluate(() => {
        const f = document.querySelector('.np-frame'), r = f.getBoundingClientRect(), cs = getComputedStyle(f);
        const cx = parseFloat(f.style.getPropertyValue('--cx')) / 100, tr = document.querySelector('.np-zl').style.transform;
        const m = tr.match(/scale\(([\d.]+)\) translate\(([-\d.]+)%/), z = +m[1], ox = -m[2] / 100;
        const line = document.querySelector('.np-line').getBoundingClientRect();
        return {clip:r.left + (cx - ox) * z * r.width, line:line.left + line.width / 2};
      });
      ok(Math.abs(split.clip - gx) < 1.5 && Math.abs(split.line - gx) < 1.5, `${tag}: slider split under pointer at 3x (clip ${split.clip.toFixed(1)}, line ${split.line.toFixed(1)}, pointer ${gx.toFixed(1)})`);
      // pan when zoomed
      const z0 = await p.$eval('.np-zl', e => e.style.transform);
      const px = fr.x + fr.width * .8, py = fr.y + fr.height * .6;
      if (w < 500) {
        const cdp = await p.context().newCDPSession(p);
        const t = (type, x, y) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints:type === 'touchEnd' ? [] : [{x, y}]});
        await t('touchStart', px, py); await t('touchMove', px - 30, py - 30); await t('touchMove', px - 60, py - 50); await t('touchEnd');
      } else {
        await p.mouse.move(px, py); await p.mouse.down(); await p.mouse.move(px - 60, py - 50, {steps:5}); await p.mouse.up();
      }
      ok(await p.$eval('.np-zl', e => e.style.transform) !== z0, `${tag}: drag pans when zoomed`);
      ok(await noHScroll(p), `${tag}: no horizontal scroll in result mode`);
    }
    await p.context().close();
  }
}
// sample image blocked: the guide shows the legend alone
{
  const p = await page(375, 812, 'en', {noSample:true});
  await p.setInputFiles('input[type=file]', `${DIR}/front.jpg`);
  await p.waitForSelector('.np-error:not([hidden])', {timeout:30000});
  await p.click('.np-error [data-act="manual"]');
  await p.waitForSelector('.np-frame.pts .np-pt');
  await p.waitForTimeout(500); await stage(p);
  ok(await p.locator('.np-gd').isVisible() && await p.locator('.np-gd canvas').isHidden() && await p.locator('.np-legend li').count() === 6, 'sample blocked: guide shows the legend alone');
  ok(await noHScroll(p), 'sample blocked: no horizontal scroll');
  await shot(p, 'phone-en-points-legend-only');
  await p.context().close();
}
await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED\n` + fails.join('\n') : '\nall passed');
