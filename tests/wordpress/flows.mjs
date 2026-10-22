// The site's working parts, run as a visitor and as reception staff would:
//  1. online consultation with a photo, in both languages: saved, emailed link, photo private
//  2. game voucher: recorded, rejected when the score is too low, checked and used at reception
//  3. old addresses from the Thai site forward to their new pages
//  4. every page's head: title, description, canonical, hreflang, Open Graph, structured data that parses
//  5. the cookie banner: nothing granted before a choice, the choice is kept
//  6. the server-drawn pages work: gallery, filters, branch tabs, menu, language switch
//   WP_PASS_FILE=... node tests/wordpress/flows.mjs [http://localhost:8080]
import {createRequire} from 'module';
import {execSync} from 'child_process';
import fs from 'fs';
const require = createRequire('/opt/npm-tools/node_modules/');
const {chromium} = require('playwright');

const BASE = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, '');
const WP = process.env.WP_PATH || '/home/claude/wp/site';
const PASS = fs.readFileSync(process.env.WP_PASS_FILE, 'utf8').trim();
const PHOTO = new URL('../implants/profile-female.jpg', import.meta.url).pathname;   // a render of the 3D head, not a person
const wp = c => execSync(`wp --allow-root --path=${WP} ${c}`, {encoding:'utf8'}).trim();
let fails = 0;
wp('transient delete --all');   // the per-connection limits would otherwise remember earlier runs
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'} ${m}`); if (!c) fails++; };

const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:1280, height:900}});
await ctx.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(p.url() + ' ' + e.message));

/* 1. consultation */
for (const [path, lang] of [['/consultation/', 'en'], ['/th/consultation/', 'th']]) {
  const before = +wp('post list --post_type=apex_lead --post_status=any --format=count');
  await p.goto(BASE + path);
  await p.waitForSelector('.apxc form');
  await p.click('.apxc input[name=procedure][value=rhinoplasty]');
  await p.click('.apxc input[value=ploenchit]');
  await p.fill('.apxc input[name=name]', 'Test Visitor ' + lang);
  await p.fill('.apxc input[name=country]', lang === 'th' ? 'ไทย' : 'Australia');
  await p.click('.apxc input[value=email]');
  await p.fill('.apxc input[name=contact]', `visitor-${lang}@example.test`);
  await p.fill('.apxc textarea[name=questions]', 'How long is the recovery?');
  await p.setInputFiles('.apxc .c-slot[data-view=front] input[type=file]', PHOTO);
  await p.click('.apxc input[name=consent]');
  const note = await p.textContent('.apxc .c-note');
  ok(/Only staff|เจ้าหน้าที่/.test(note), `${lang} consult: photo note says photos go to staff`);
  await p.click('.apxc .c-submit');
  await p.waitForSelector('.apxc .c-done', {timeout:20000}).catch(() => {});
  const head = await p.textContent('.apxc .c-done h3').catch(() => '');
  const ref = await p.textContent('.apxc .c-done-h p').catch(() => '');
  ok(/Enquiry sent|ส่งคำถามแล้ว/.test(head), `${lang} consult: "${head}" ${ref}`);
  const after = +wp('post list --post_type=apex_lead --post_status=any --format=count');
  ok(after === before + 1, `${lang} consult: one enquiry saved (${before} -> ${after})`);
  const id = wp('post list --post_type=apex_lead --post_status=any --orderby=ID --order=DESC --posts_per_page=1 --format=ids');
  const photos = JSON.parse(wp(`post meta get ${id} apex_photos --format=json`) || '{}');
  ok(photos.front && fs.existsSync(`${WP}/wp-content/uploads/apex-private/${photos.front}`), `${lang} consult: photo stored privately (${photos.front})`);
  const anon = await fetch(`${BASE}/wp-admin/admin-post.php?action=apex_photo&lead=${id}&view=front`, {redirect:'manual'});
  ok(anon.status !== 200, `${lang} consult: photo link refuses a visitor who is not logged in (${anon.status})`);
  const fields = JSON.parse(wp(`post meta get ${id} apex_fields --format=json`));
  ok(fields.procedures[0] === 'rhinoplasty' && fields.lang === lang && fields.contact === `visitor-${lang}@example.test`, `${lang} consult: fields saved as sent`);
}
// a bot that fills the hidden field is told "ok" and nothing is saved
{
  const before = +wp('post list --post_type=apex_lead --post_status=any --format=count');
  const fd = new FormData();
  fd.append('enquiry', JSON.stringify({procedures:['facelift'], branch:'phuket', name:'Bot', country:'X', method:'email', contact:'bot@example.test', consent:true}));
  fd.append('website', 'http://spam.example');
  const r = await (await fetch(BASE + '/wp-json/apex/v1/consult', {method:'POST', body:fd})).json();
  ok(r.ok && +wp('post list --post_type=apex_lead --post_status=any --format=count') === before, 'consult: honeypot answer looks normal and saves nothing');
  const fd2 = new FormData();
  fd2.append('enquiry', JSON.stringify({procedures:[], branch:'', name:'', consent:false}));
  const r2 = await fetch(BASE + '/wp-json/apex/v1/consult', {method:'POST', body:fd2});
  ok(r2.status === 422, `consult: an empty enquiry is refused (${r2.status})`);
}

/* 2. vouchers */
{
  const code = 'APX-' + Array.from({length:6}, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
  const post = body => fetch(BASE + '/wp-json/apex/v1/voucher', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
  const low = await post({code, game:'factrush', tier:2, score:500, name:'Low', lang:'en'});
  ok(low.status === 422, `voucher: a score below the prize is refused (${low.status})`);
  const good = await (await post({code, game:'factrush', tier:0, score:520, name:'Reception Test', lang:'en', run:{durationMs:60000, inputs:40, logLength:40}})).json();
  ok(good.ok && good.code === code, `voucher: recorded ${code}`);
  // reception, in its own browser session so the visitor tests below stay logged out
  const staff = await b.newContext();
  const s = await staff.newPage();
  await s.goto(BASE + '/wp-login.php');
  await s.fill('#user_login', 'apexadmin'); await s.fill('#user_pass', PASS);
  await Promise.all([s.waitForNavigation(), s.click('#wp-submit')]);
  await s.goto(`${BASE}/wp-admin/edit.php?post_type=apex_voucher&page=apex-voucher-check&code=${code}`);
  ok(/Valid/.test(await s.textContent('.wrap')), 'voucher: reception sees it as valid');
  await Promise.all([s.waitForNavigation(), s.click('button[name=apex_use]')]);
  ok(/Used/.test(await s.textContent('.wrap')), 'voucher: marked as used');
  await s.goto(`${BASE}/wp-admin/edit.php?post_type=apex_voucher&page=apex-voucher-check&code=APX-ZZZZZZ`);
  ok(/not on record/.test(await s.textContent('.wrap')), 'voucher: an unknown code is flagged');
  // the photo opens for staff
  const id = wp('post list --post_type=apex_lead --post_status=any --orderby=ID --order=DESC --posts_per_page=1 --format=ids');
  await s.goto(`${BASE}/wp-admin/post.php?post=${id}&action=edit`);
  const img = await s.$('#apex-lead img');
  const loaded = img ? await img.evaluate(i => i.complete && i.naturalWidth > 0) : false;
  ok(loaded, 'consult: staff see the photo on the enquiry');
  // the toolbar does not cover the site's header for logged-in editors
  await s.goto(BASE + '/');
  const clash = await s.evaluate(() => { const a = document.getElementById('wpadminbar'), h = document.querySelector('.hdr-in'); if (!a || !h) return 0; const r1 = a.getBoundingClientRect(), r2 = h.getBoundingClientRect(); return Math.max(0, r1.bottom - r2.top); });
  ok(clash === 0, `toolbar: the header starts below the editor toolbar (${clash}px overlap)`);
  await staff.close();
}

/* 3. old addresses */
const OLD = [
  ['/about-us/', '/th/about-us/'], ['/surgery/', '/th/surgery/'], ['/reviews/', '/th/reviews/'], ['/blogs/', '/th/blogs/'], ['/promotions/', '/th/promotions/'], ['/contact-us/', '/th/contact-us/'],
  ['/facelift-apex-sugery/', '/th/surgery/facelift-apex-sugery/'], ['/eyebrow-lift-apex-surgery/', '/th/surgery/eyebrow-lift-apex-surgery/'], ['/facelift-service/', '/th/surgery/facelift-apex-sugery/'],
  ['/blog/smas/', '/th/blog/smas/'], ['/review/rhinoplasty-faq-questions/', '/th/review/rhinoplasty-faq-questions/'], ['/review/facelift-faq/', '/th/review/facelift-faq/'],
  ['/news/%e0%b8%99%e0%b8%b2%e0%b8%a2%e0%b9%81%e0%b8%9e%e0%b8%97%e0%b8%a2%e0%b9%8c%e0%b8%aa%e0%b8%a1%e0%b8%9a%e0%b8%b9%e0%b8%a3%e0%b8%93%e0%b9%8c-%e0%b9%84%e0%b8%ab%e0%b8%a7%e0%b8%9e%e0%b8%a3%e0%b8%b4%e0%b8%9a/', '/th/news/'],
  ['/category/review/', '/th/category/review/'],
];
for (const [from, want] of OLD) {
  const r = await fetch(BASE + from, {redirect:'manual'});
  const to = decodeURIComponent((r.headers.get('location') || '').replace(BASE, ''));
  if (want === null) { ok(r.status === 301 || r.status === 404, `redirect ${from}: ${r.status} ${to}`); continue; }
  ok(r.status === 301 && to.startsWith(decodeURIComponent(want)), `redirect ${from} -> ${to || r.status}`);
}

/* 4. heads */
const urls = JSON.parse(wp(`eval-file ${new URL('./urls.php', import.meta.url).pathname}`)).map(u => u.replace(/^https?:\/\/[^/]+/, BASE));
let headBad = 0;
for (const u of urls) {
  const html = await (await fetch(u)).text();
  const get = re => (html.match(re) || [])[1] || '';
  const title = get(/<title>([^<]*)<\/title>/), desc = get(/<meta name="description" content="([^"]*)"/), canon = get(/<link rel="canonical" href="([^"]*)"/);
  const hl = (html.match(/hreflang="(en|th|x-default)"/g) || []).length;
  const og = get(/<meta property="og:image" content="([^"]*)"/);
  let ld = 0, ldBad = 0;
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { ld++; try { JSON.parse(m[1]); } catch (e) { ldBad++; } }
  const isPlan = /my-plan/.test(u);
  const problems = [];
  if (!title || title.length > 140) problems.push('title ' + title.length);
  if (!desc && !isPlan) problems.push('no description');
  if (!canon) problems.push('no canonical');
  if (hl < 2) problems.push('hreflang ' + hl);
  if (!og) problems.push('no og:image');
  if (ldBad) problems.push(ldBad + ' bad JSON-LD');
  if (canon && canon.replace(/\/$/, '') !== u.replace(/\/$/, '')) problems.push('canonical ' + canon);
  if (problems.length) { headBad++; console.log(`   ${u}: ${problems.join(', ')}`); }
}
ok(!headBad, `head tags on ${urls.length} pages${headBad ? ` (${headBad} with problems)` : ''}`);

/* 5. cookie banner */
{
  const c2 = await b.newContext();
  await c2.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
  const q = await c2.newPage();
  await q.goto(BASE + '/');
  const consent = await q.evaluate(() => (window.dataLayer || []).filter(x => x && x[0] === 'consent').map(x => [x[1], x[2].analytics_storage, x[2].ad_storage]));
  ok(consent.length && consent[0][0] === 'default' && consent[0][1] === 'denied' && consent[0][2] === 'denied', 'cookies: analytics and ads denied before a choice');
  ok(await q.isVisible('#apex-ck'), 'cookies: banner shows on the first visit');
  await q.click('#apex-ck [data-ck=set]');
  await q.check('#apex-ck [name=analytics]');
  await q.click('#apex-ck [data-ck=save]');
  const upd = await q.evaluate(() => (window.dataLayer || []).filter(x => x && x[0] === 'consent' && x[1] === 'update').map(x => [x[2].analytics_storage, x[2].ad_storage]).pop());
  ok(upd && upd[0] === 'granted' && upd[1] === 'denied', 'cookies: choosing analytics only grants analytics only');
  await q.goto(BASE + '/th/');
  ok(!(await q.isVisible('#apex-ck')), 'cookies: the choice is remembered on the next page');
  const dflt = await q.evaluate(() => (window.dataLayer || []).find(x => x && x[0] === 'consent')[2].analytics_storage);
  ok(dflt === 'granted', 'cookies: the remembered choice is the default on the next page');
  ok(await q.isVisible('.ck-link'), 'cookies: "Cookie settings" link in the footer');
  await c2.close();
}

/* 6. the server-drawn pages behave */
await p.goto(BASE + '/');
await p.waitForFunction(() => document.querySelector('.hdr .burger') && window.APEX && window.APEX.lightbox);
await p.click('#rv-rail .ba-card >> nth=2');
await p.waitForSelector('.lb.open');
const lbSrc = await p.getAttribute('.lb .lb-stage img', 'src');
const wantSrc = await p.getAttribute('#rv-rail .ba-card >> nth=2 >> img', 'src');
ok(lbSrc === wantSrc, 'home: a before and after card opens its own photo in the viewer');
await p.keyboard.press('Escape');
await p.click('.reviews-s .chip[data-k=breast]');
const shown = await p.$$eval('#rv-rail .ba-card', cs => cs.filter(c => !c.hidden).map(c => c.dataset.cat));
ok(shown.length && shown.every(c => c === 'breast'), `home: the procedure filter shows only that procedure (${shown.length})`);
const tabs = await p.$$('.br-tabs [role=tab]');
if (tabs.length > 1) { await tabs[1].click(); ok(await p.isVisible('.br-card[data-i="1"]'), 'home: branch tabs switch branch'); }
await p.setViewportSize({width:390, height:844});
await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(400);
await p.click('.hdr .burger');
ok(await p.isVisible('.sheet.open'), 'mobile: the menu opens');
await p.setViewportSize({width:1280, height:900});
await p.goto(BASE + '/offers/');
const nOffers = await p.$$eval('#pgrid .offer:not(.offer-game)', x => x.length);
await p.click('.offers-s .chip[data-k=breast]');
const visible = await p.$$eval('#pgrid .offer:not(.offer-game)', x => x.filter(e => !e.hidden).length);
ok(visible > 0 && visible < nOffers, `promotions: the filter narrows ${nOffers} offers to ${visible}`);
await p.goto(BASE + '/surgery/rhinoplasty/');
await p.click('.plan-add');
ok(/Added|เพิ่ม/.test(await p.textContent('.plan-add')), 'service: Add to My Plan works');
const th = await p.getAttribute('.hdr .lang a[hreflang=th]', 'href');
ok(/\/th\/surgery\/rhinoplasty-apex-surgery\/$/.test(th), `service: the TH switch goes to the Thai page (${th})`);
await p.goto(BASE + '/surgery-wars/ep-2/');
await p.click('.ws-poster');
ok(await p.isVisible('.war-stage iframe'), 'episode: the video starts in place');
await p.goto(BASE + '/play/');
await p.waitForSelector('.apxg', {timeout:20000}).catch(() => {});
ok(await p.isVisible('.apxg'), 'games: the hub loads');
await p.goto(BASE + '/nose-preview/');
await p.waitForSelector('#nose.feat-on, #nose.feat-off', {timeout:20000}).catch(() => {});
ok(await p.$('#nose.feat-on'), 'nose preview: the tool loads');

errors.forEach(e => console.log('ERROR ' + e));
ok(!errors.length, `no script errors (${errors.length})`);
await b.close();
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exit(fails ? 1 : 0);
