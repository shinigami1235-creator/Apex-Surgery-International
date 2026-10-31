/* Main flows for plan, trip, consult, stories, compare and currency.
   Run: python3 -m http.server 8765 (in site/), then
   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node flows.mjs */
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = 'http://localhost:8765/lab/';
const OUT = new URL('../../_shots/features6/', import.meta.url).pathname;
let fails = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`); if (!cond) fails++; };

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, acceptDownloads: true, hasTouch: false });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));

/* future dates relative to today */
const iso = d => d.toISOString().slice(0, 10);
const t0 = new Date(); const arrival = iso(new Date(Date.UTC(t0.getFullYear(), t0.getMonth(), t0.getDate() + 14)));
const plus = (s, n) => iso(new Date(Date.parse(s + 'T00:00:00Z') + n * 864e5));

/* ---------------- 1. My Plan ---------------- */
await p.goto(BASE + 'plan.html');
await p.evaluate(() => localStorage.clear());
await p.reload();
ok(await p.locator('[data-empty]').count() === 1, 'plan: empty state shows');
ok(await p.locator('.p-empty a').count() === 3, 'plan: empty state links to body map, nose preview and games');
ok(await p.locator('#badge').isHidden(), 'plan: badge hidden at zero');
await p.evaluate(() => {
  const fire = (name, data) => window.dispatchEvent(new CustomEvent('apex:event', { detail: { name, data } }));
  fire('plan:add', { procedure: 'lipo', area: 'thighs', concern: 'Inner thighs that rub' });
  fire('plan:add', { procedure: 'rhinoplasty' });
  fire('plan:add', { procedure: 'rhinoplasty' });
  fire('plan:add', { procedure: 'nonsense' });
});
ok(await p.locator('.p-proc').count() === 2, 'plan: fake plan:add events add two procedures (duplicate and unknown ignored)');
ok((await p.locator('.p-proc[data-key=lipo] .p-area').innerText()).includes('Thighs'), 'plan: body map area and concern shown');
ok((await p.locator('.p-proc[data-key=rhinoplasty] .p-facts').innerText()).includes('Soft food for 1 to 2 weeks.'), 'plan: recovery facts shown');
ok((await p.locator('.p-proc[data-key=rhinoplasty] a.p-link').getAttribute('href')).includes('service.html?p=rhinoplasty'), 'plan: service link');
/* voucher from the games' own storage, then one from a plan:voucher event */
await p.evaluate(() => {
  const now = Date.now();
  localStorage.setItem('apxg.vouchers', JSON.stringify([{ code: 'APX-GAME01', game: 'steady', prize: { en: 'Skincare kit', th: 'ชุดผลิตภัณฑ์ดูแลผิว' }, score: 1300, issued: now, expires: now + 60 * 864e5 },
    { code: 'APX-OLD001', game: 'steady', prize: { en: 'Old', th: 'Old' }, score: 1, issued: now - 90 * 864e5, expires: now - 864e5 }]));
  window.dispatchEvent(new CustomEvent('apex:event', { detail: { name: 'games:voucher', data: { code: 'APX-GAME01' } } }));
});
await p.click('#fake-voucher');
ok(await p.locator('.p-v').count() === 2, 'plan: vouchers read from apxg.vouchers plus plan:voucher event, expired one hidden');
ok(await p.locator('#badge').innerText() === '4', 'plan: header badge counts 4 items');
const wa = await p.locator('a[data-act=wa]').getAttribute('href');
ok(wa.startsWith('https://wa.me/66850002001?text=') && decodeURIComponent(wa).includes('Rhinoplasty') && decodeURIComponent(wa).includes('APX-GAME01'), 'plan: WhatsApp link carries the summary');
const line = await p.locator('a[data-act=line]').getAttribute('href');
ok(line.startsWith('https://line.me/R/oaMessage/@apexsurgery/?') && decodeURIComponent(line).includes('Liposuction: Thighs'), 'plan: LINE link carries the summary');
await p.fill('#apxp-notes', 'Can I fly home 10 days after rhinoplasty?');
await p.waitForTimeout(450);
ok((await p.evaluate(() => JSON.parse(localStorage.getItem('apexPlan.v1')).notes)).includes('fly home'), 'plan: notes saved');
const [dl] = await Promise.all([p.waitForEvent('download'), p.click('button[data-act=png]')]);
const pngPath = OUT + 'plan-card.png';
await dl.saveAs(pngPath);
ok(dl.suggestedFilename() === 'apex-my-plan.png' && fs.statSync(pngPath).size > 10000, 'plan: Save to phone downloads the PNG card');
await p.locator('.p-proc[data-key=lipo] .p-rm').click();
ok(await p.locator('.p-proc').count() === 1 && await p.locator('#badge').innerText() === '3', 'plan: remove updates list and badge');
await p.evaluate(() => window.dispatchEvent(new CustomEvent('apex:event', { detail: { name: 'plan:add', data: { procedure: 'lipo', area: 'thighs', concern: 'Inner thighs that rub' } } })));

/* ---------------- 2. Trip planner ---------------- */
await p.goto(BASE + 'trip.html');
ok(await p.locator('.t-chip input:checked').count() === 2, 'trip: procedures prefilled from My Plan');
ok(await p.locator('.t-wait').count() === 1, 'trip: waits for an arrival date');
await p.fill('input[type=date]', arrival);
await p.waitForSelector('.t-sum');
ok(await p.locator('.t-sum').getAttribute('data-fly') === plus(arrival, 2 + 10 + 2), `trip: rhinoplasty + lipo fly home at arrival + 2 + 12 days (${plus(arrival, 14)})`);
await p.locator('.t-chip:has(input[value=lipo])').click();
ok(await p.locator('.t-sum').getAttribute('data-fly') === plus(arrival, 2 + 10), 'trip: rhinoplasty alone flies home at surgery + 10');
await p.locator('.t-chip:has(input[value=facelift])').click();
ok(await p.locator('.t-sum').getAttribute('data-fly') === plus(arrival, 2 + 14 + 2), 'trip: facelift + rhinoplasty use the longest stay plus 2');
ok((await p.locator('.t-ev').count()) >= 6, 'trip: day-by-day timeline rendered');
ok((await p.locator('.t-confirm').innerText()) === 'Your surgeon confirms these dates at consultation.', 'trip: confirmation line');
await p.waitForSelector('.t-branch');
ok((await p.locator('.t-branch').innerText()).includes('088-870-0039'), 'trip: branch phone from shared data');
await p.locator('.t-br:has(input[value=phuket])').click();
ok((await p.locator('.t-branch').innerText()).includes('088-870-0053'), 'trip: Phuket branch phone');
await p.screenshot({ path: OUT + 'flow-trip-375.png', fullPage: true });
const [ics] = await Promise.all([p.waitForEvent('download'), p.click('button[data-act=ics]')]);
const icsPath = OUT + 'trip.ics';
await ics.saveAs(icsPath);
const icsText = fs.readFileSync(icsPath, 'utf8');
ok((icsText.match(/BEGIN:VEVENT/g) || []).length === 3 && icsText.includes('DTSTART;VALUE=DATE:' + plus(arrival, 1).replace(/-/g, '')) &&
  icsText.includes('DTSTART;VALUE=DATE:' + plus(arrival, 18).replace(/-/g, '')) && icsText.includes('\r\n'), 'trip: .ics has consult, surgery and fly-home events');
await p.click('button[data-act=save]');
const savedTrip = await p.evaluate(() => JSON.parse(localStorage.getItem('apexPlan.v1')).trip);
ok(savedTrip && savedTrip.flyHome === plus(arrival, 18) && savedTrip.branch === 'phuket', 'trip: Save to My Plan stores the trip');
await p.fill('input[type=date]', '2020-01-01');
ok(await p.locator('.t-err:visible').count() === 1, 'trip: past date shows an error');

/* ---------------- 3. Consultation ---------------- */
await p.goto(BASE + 'consult.html');
await p.evaluate(() => localStorage.removeItem('apexPlan.v1'));
await p.reload();
await p.click('button[type=submit]');
const errText = await p.locator('.c-sum').innerText();
ok(['Procedure:', 'Branch:', 'Name:', 'Country:', 'Contact method:', 'Consent:'].every(s => errText.includes(s)), 'consult: empty submit lists errors naming each field');
ok(await p.locator('.c-err:visible').count() >= 6, 'consult: inline errors shown');
await p.screenshot({ path: OUT + 'flow-consult-errors-375.png', fullPage: true });
await p.locator('.c-opt:has(input[value=rhinoplasty])').click();
await p.locator('.c-opt:has(input[value=ploenchit])').click();
await p.fill('input[name=name]', 'Sarah Collins');
await p.fill('input[name=country]', 'Australia');
await p.locator('.c-opt:has(input[value=email])').click();
await p.fill('input[name=contact]', 'sarah@');
await p.click('button[type=submit]');
ok((await p.locator('.c-sum').innerText()).includes('Email address: the address is not valid.'), 'consult: invalid email named');
await p.fill('input[name=contact]', 'sarah@example.com');
await p.fill('input[name=from]', arrival);
await p.fill('input[name=to]', plus(arrival, 12));
await p.fill('textarea[name=questions]', 'Can the tip be revised?');
await p.setInputFiles('input[type=file] >> nth=0', new URL('../../site/lab/compare-demo/before.svg', import.meta.url).pathname);
ok(await p.locator('.c-slot.has img').count() === 1, 'consult: photo previewed');
await p.locator('label.c-consent').click();
await p.click('button[type=submit]');
await p.waitForSelector('.c-done');
const ev = await p.evaluate(() => window.__events.filter(e => e.name === 'consult:submit'));
ok(ev.length === 1 && ev[0].data.contact === 'sarah@example.com' && ev[0].data.photoViews.join() === 'front', 'consult: consult:submit emitted with the fields');
const cwa = await p.locator('.c-done a[data-act=wa]').getAttribute('href');
ok(decodeURIComponent(cwa).includes('Sarah Collins') && decodeURIComponent(cwa).includes('Rhinoplasty'), 'consult: WhatsApp prefilled');
await p.screenshot({ path: OUT + 'flow-consult-done-375.png', fullPage: true });

/* ---------------- 4. Stories ---------------- */
await p.goto(BASE + 'stories.html');
await p.waitForSelector('.s-th');
const nThumbs = await p.locator('.s-th').count();
ok(nThumbs > 10, `stories: ${nThumbs} thumbnails grouped by procedure`);
ok((await p.locator('.s-group h3').allInnerTexts()).join('|').startsWith('Facelift|Rhinoplasty'), 'stories: groups labelled by procedure');
await p.locator('.s-th').nth(1).click();
await p.waitForSelector('.apxs-v');
await p.waitForTimeout(600);
const st = await p.evaluate(() => ({ s: document.querySelector('.apxs-v').dataset.state, n: document.querySelectorAll('.v-slide').length, i: document.querySelector('.apxs-v').dataset.index }));
ok(['loading', 'error'].includes(st.s) && st.n === 3 && st.i === '1', `stories: viewer open at index 1, state ${st.s}, ${st.n} slides in DOM`);
ok((await p.locator('.v-cap').innerText()) === 'Results may vary from person to person.', 'stories: caption under the viewer');
ok((await p.locator('.v-label a').getAttribute('href')).includes('p=facelift'), 'stories: label links to the service page');
ok(await p.locator('[data-act=sound]').getAttribute('aria-pressed') === 'false', 'stories: muted by default');
await p.click('[data-act=sound]');
ok(await p.locator('[data-act=sound]').getAttribute('aria-pressed') === 'true', 'stories: sound toggle');
await p.keyboard.press('ArrowDown');
ok(await p.locator('.apxs-v').getAttribute('data-index') === '2', 'stories: arrow key moves to next');
const fr = await p.locator('.v-frame').boundingBox();
await p.mouse.move(fr.x + fr.width / 2, fr.y + fr.height * .75);
await p.mouse.down();
await p.mouse.move(fr.x + fr.width / 2, fr.y + fr.height * .5, { steps: 6 });
await p.mouse.move(fr.x + fr.width / 2, fr.y + fr.height * .25, { steps: 6 });
await p.mouse.up();
await p.waitForTimeout(500);
ok(await p.locator('.apxs-v').getAttribute('data-index') === '3', 'stories: swipe up moves to next');
await p.mouse.click(fr.x + 30, fr.y + fr.height * .6);
ok(await p.locator('.apxs-v').getAttribute('data-index') === '2', 'stories: tap left side moves back');
ok(await p.locator('.v-slide').count() === 3, 'stories: only previous, current and next kept in the DOM');
await p.screenshot({ path: OUT + 'flow-stories-viewer-375.png' });
await p.keyboard.press('Escape');
ok(await p.locator('.apxs-v').count() === 0, 'stories: Escape closes');

/* ---------------- 5. Compare ---------------- */
await p.goto(BASE + 'compare.html');
await p.waitForTimeout(500);
const stage = await p.locator('#one .b-stage').boundingBox();
const knob = await p.locator('#one .b-knob').boundingBox();
await p.mouse.move(knob.x + knob.width / 2, knob.y + knob.height / 2);
await p.mouse.down();
await p.mouse.move(stage.x + stage.width * .2, knob.y + knob.height / 2, { steps: 8 });
await p.mouse.up();
const pos = +(await p.locator('#one .b-cmp').getAttribute('data-pos'));
ok(pos >= 17 && pos <= 23, `compare: drag moves the divider to ${pos}%`);
await p.locator('#one .b-knob').focus();
await p.keyboard.press('ArrowRight');
ok(await p.locator('#one .b-knob').getAttribute('aria-valuenow') === String(pos + 2), 'compare: keyboard moves the divider');
ok((await p.locator('#one .b-cap').innerText()).includes('ใช้เป็นตัวอย่าง ผลจากการเข้ารับการรักษาพยาบาลสำหรับผู้ป่วยเฉพาะราย'), 'compare: Thai rule caption present');
await p.screenshot({ path: OUT + 'flow-compare-drag-375.png' });
await p.locator('.b-th').nth(0).click();
await p.waitForSelector('.apxb-lb');
await p.keyboard.press('ArrowRight');
ok(await p.locator('.apxb-lb').getAttribute('data-index') === '1', 'compare: lightbox arrow key');
await p.keyboard.press('ArrowRight');
await p.waitForTimeout(400);
const lbm = await p.locator('.apxb-lb .lb-main').boundingBox();
await p.mouse.move(lbm.x + lbm.width * .8, lbm.y + lbm.height / 2);
await p.mouse.down(); await p.mouse.move(lbm.x + lbm.width * .2, lbm.y + lbm.height / 2, { steps: 6 }); await p.mouse.up();
await p.waitForTimeout(1500);
ok(await p.locator('.apxb-lb').getAttribute('data-index') === '3', 'compare: lightbox swipe on a single image');
ok(await p.locator('.apxb-lb .b-stage.err').count() === 1, 'compare: offline client image shows the load error');
await p.screenshot({ path: OUT + 'flow-compare-lightbox-375.png' });
await p.keyboard.press('Escape');

/* ---------------- 6. Currency ---------------- */
await p.goto(BASE + 'currency.html');
await p.evaluate(() => localStorage.removeItem('apex.currency'));
await p.reload();
await p.selectOption('.apxk select', 'USD');
const fx = await p.locator('.apx-fx').allInnerTexts();
ok(fx[0] === '≈ US$591' && fx[3] === '≈ US$5,350', `currency: USD prices ${fx.join(', ')}`);
ok(await p.evaluate(() => localStorage.getItem('apex.currency')) === 'USD', 'currency: choice stored');
await p.reload();
ok(await p.locator('.apxk select').inputValue() === 'USD' && (await p.locator('.apx-fx').first().innerText()) === '≈ US$591', 'currency: choice restored after reload');
await p.evaluate(() => window.dispatchEvent(new CustomEvent('apex:currency', { detail: { code: 'JPY' } })));
ok((await p.locator('.apx-fx').first().innerText()).startsWith('≈ JP¥') && await p.locator('.apxk select').inputValue() === 'JPY', 'currency: apex:currency updates prices and picker');
await p.selectOption('.apxk select', 'THB');
ok(await p.locator('.apx-fx').first().isHidden(), 'currency: THB hides the conversion');

ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
await b.close();
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
process.exit(fails ? 1 : 0);
