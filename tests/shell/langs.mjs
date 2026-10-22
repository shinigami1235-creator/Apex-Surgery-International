// Opens every page in English (root) and Thai (/th/), checks for failed local files and script errors,
// that the EN and TH links point at the same page in the other language, and that old /en/ links forward
import {createRequire} from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const {chromium} = require('playwright');
const B = 'http://localhost:8765/';
const PAGES = ['index.html','about.html','services.html','service.html?p=rhinoplasty','doctor.html','promotions.html','reviews.html','blog.html','surgery-wars.html','surgery-wars.html?ep=3','contact.html','nose.html','proportions.html','play.html','plan.html','trip.html','consult.html'];
const b = await chromium.launch(), fails = [];
const p = await (await b.newContext({viewport:{width:1280, height:900}})).newPage();
p.on('pageerror', e => fails.push(`${p.url()} pageerror ${e.message}`));
p.on('response', r => { if (r.url().startsWith(B) && r.status() >= 400) fails.push(`${r.status()} ${r.url()}`); });
await p.route(/^https?:\/\/(?!localhost)/, r => r.abort());
for (const [pre, lang, other] of [['', 'en', 'th'], ['th/', 'th', 'en']]) {
  for (const pg of PAGES) {
    await p.goto(B + pre + pg); await p.waitForSelector('.hdr .lang a', {timeout:15000}).catch(() => fails.push(`${pre}${pg} no header`));
    const r = await p.evaluate(o => ({lang:document.documentElement.lang, main:document.querySelector('main').innerText.length,
      link:new URL(document.querySelector(`.hdr .lang a[hreflang="${o}"]`).getAttribute('href'), location.href).href,
      first:document.querySelector('.hdr .lang a').textContent}), other);
    const want = B + (other === 'th' ? 'th/' : '') + pg;
    if (r.lang !== lang) fails.push(`${pre}${pg} lang ${r.lang}`);
    if (r.main < 200) fails.push(`${pre}${pg} empty main ${r.main}`);
    if (r.link !== want) fails.push(`${pre}${pg} ${other} link ${r.link} want ${want}`);
    if (r.first !== 'EN') fails.push(`${pre}${pg} first lang ${r.first}`);
  }
}
for (const pg of ['en/', 'en/about.html', 'en/service.html?p=facelift']) {
  await p.goto(B + pg); await p.waitForLoadState('load'); await p.waitForTimeout(300);
  const want = B + pg.slice(3);
  if (p.url() !== want) fails.push(`${pg} forwarded to ${p.url()} want ${want}`);
}
await b.close();
console.log(fails.length ? 'FAILED\n' + [...new Set(fails)].join('\n') : 'all passed');
