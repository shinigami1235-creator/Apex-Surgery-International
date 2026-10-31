// The site's working parts, run as a visitor and as reception staff would:
//  1. online consultation with a photo, in both languages: saved, emailed link, photo private
//  2. game voucher: recorded, rejected when the score is too low, checked and used at reception
//  3. old addresses from the Thai site forward to their new pages
//  4. every page's head: title, description, canonical, hreflang, Open Graph, structured data that parses
//  5. the cookie banner: nothing granted before a choice, the choice is kept
//  6. the server-drawn pages work: gallery, filters, branch tabs, menu, language switch
//  7. editor tools: preview of a draft, inline formatting and tags, page templates, 302 redirects,
//     custom code boxes, uploads saved as WebP
//   WP_PASS_FILE=... node tests/wordpress/flows.mjs [http://localhost:8080]
import {execSync} from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {chromium} from '../pw.mjs';

const BASE = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, '');
const WP = process.env.WP_PATH || '/home/claude/wp/site';
const USER = process.env.WP_USER || 'apex-admin';
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
  ok(/only staff|เจ้าหน้าที่/i.test(note), `${lang} consult: photo note says photos go to staff`);
  await p.click('.apxc .c-submit');
  await p.waitForSelector('.apxc .c-done', {timeout:20000}).catch(() => {});
  const head = await p.textContent('.apxc .c-done h3').catch(() => '');
  const ref = await p.textContent('.apxc .c-done-h p').catch(() => '');
  ok(/Enquiry sent|ส่งคำถามแล้ว/.test(head), `${lang} consult: "${head}" ${ref}`);
  const tag = await p.evaluate(() => (window.dataLayer || []).find(x => x && x.event === 'apex_consult_submit'));
  ok(tag && !JSON.stringify(tag).includes('rhinoplasty'), `${lang} consult: Tag Manager hears of the enquiry without the procedure (${JSON.stringify(tag && tag.apex)})`);
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

/* 1b. what the review found: nothing private through the data address, links in articles cannot carry script,
   and an editor account does not see enquiries */
{
  const id = wp('post list --post_type=apex_lead --post_status=any --orderby=ID --order=DESC --posts_per_page=1 --format=ids');
  const r = await fetch(`${BASE}/?apex_data=en/post/${id}`);
  const body = await r.text();
  ok(r.status === 404 && !/Test Visitor|visitor-/.test(body), `data address: enquiry ${id} is not readable by number (${r.status})`);
  const evil = 'https://x.example/&quot; onfocus=&quot;alert(1)&quot; autofocus=&quot;';
  const pid = wp(`post create --post_type=post --post_status=publish --post_title="XSS check" --post_content='<!-- wp:buttons --><div class="wp-block-buttons"><!-- wp:button --><div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="${evil}">Go</a></div><!-- /wp:button --></div><!-- /wp:buttons --><!-- wp:paragraph --><p>Text long enough.</p><!-- /wp:paragraph -->' --porcelain`);
  wp(`post meta update ${pid} _apex_key xss-check`);
  const link = wp(`post list --post_type=post --p=${pid} --field=url`);
  const html = await (await fetch(link.replace(/^https?:\/\/[^/]+/, BASE))).text();
  const btn = (html.match(/<a class="btn btn-plum btn-sm" href="[^"]*"[^>]*>/) || [''])[0];
  ok(btn && !/onfocus/.test(btn.replace(/href="[^"]*"/, '')), `article buttons: a quote in the link stays inside the link (${btn.slice(0, 120)})`);
  wp(`post delete ${pid} --force`);
  // a password-protected article: the form first, the text after the password, and no copy for the scripts
  const sid = wp(`post create --post_type=post --post_status=publish --post_title="Locked article" --post_password=open-sesame --post_content='<!-- wp:paragraph --><p>Secret paragraph for the password test.</p><!-- /wp:paragraph -->' --porcelain`);
  const surl = wp(`post list --post_type=post --p=${sid} --field=url`).replace(/^https?:\/\/[^/]+/, BASE);
  const lockedHtml = await (await fetch(surl)).text();
  ok(/post_password/.test(lockedHtml) && !/Secret paragraph/.test(lockedHtml), 'password: a protected article shows the password form only');
  const pp = await ctx.newPage();
  await pp.goto(surl);
  await pp.fill('input[name=post_password]', 'open-sesame');
  await Promise.all([pp.waitForNavigation(), pp.click('input[type=submit]')]);
  const unlocked = await pp.content();
  ok(/Secret paragraph/.test(await pp.textContent('main')), 'password: the right password opens the article');
  ok(!/Secret paragraph[^<]*<\/p>[\s\S]*Secret paragraph/.test(unlocked) && !/"Secret paragraph/.test(unlocked), 'password: the text is not repeated in the data for scripts');
  await pp.close();
  wp(`post delete ${sid} --force`);
  const eid = wp('user create apex-editor-test apex-editor-test@example.test --role=editor --porcelain');
  ok(wp(`eval 'echo current_user_can("edit_apex_leads") ? "yes" : "no";' --user=${eid}`) === 'no', 'roles: an editor cannot open enquiries');
  ok(wp(`eval 'echo current_user_can("edit_apex_vouchers") ? "yes" : "no";' --user=${eid}`) === 'yes', 'roles: an editor can check vouchers');
  wp(`user delete ${eid} --yes`);
}

/* 2. vouchers */
{
  const code = 'APX-' + Array.from({length:6}, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
  const post = body => fetch(BASE + '/wp-json/apex/v1/voucher', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
  const low = await post({code, game:'factrush', tier:2, score:500, name:'Low', lang:'en', run:{durationMs:60000, inputs:40}});
  const fake = await post({code, game:'factrush', tier:0, score:9999, name:'No game', lang:'en'});
  ok(fake.status === 422, `voucher: a claim with no game run behind it is refused (${fake.status})`);
  ok(low.status === 422, `voucher: a score below the prize is refused (${low.status})`);
  const good = await (await post({code, game:'factrush', tier:0, score:520, name:'Reception Test', lang:'en', run:{durationMs:60000, inputs:40, logLength:40}})).json();
  ok(good.ok && good.code === code, `voucher: recorded ${code}`);
  // reception, in its own browser session so the visitor tests below stay logged out
  const staff = await b.newContext();
  const s = await staff.newPage();
  await s.goto(BASE + '/wp-login.php');
  await s.fill('#user_login', USER); await s.fill('#user_pass', PASS);
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
  const audit = JSON.parse(wp(`option get apex_audit --format=json`) || '[]');
  const seenBy = audit.filter(e => +e.item === +id && e.name === USER).map(e => e.what);
  ok(seenBy.includes('lead_open') && seenBy.includes('photo_view'), `access log: opening enquiry A${id} and its photo is logged (${seenBy.join(', ')})`);
  await s.goto(`${BASE}/wp-admin/edit.php?post_type=apex_lead&page=apex-audit`);
  ok(/Viewed a patient photo/.test(await s.textContent('.wrap')), 'access log: Enquiries › Access log lists the photo view');
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
// the old nose preview address forwards to the nose implant viewer, which runs the same face tracking
await p.goto(BASE + '/nose-preview/');
await p.waitForURL(/nose-implant-viewer/, {timeout:20000}).catch(() => {});
await p.waitForSelector('.feat-on, .feat-off', {timeout:20000}).catch(() => {});
ok(/nose-implant-viewer/.test(p.url()) && await p.$('.feat-on'), `nose preview: forwards to the nose implant viewer and the tool loads (${p.url()})`);

/* 7. editor tools */
{
  const wpIn = (c, input) => execSync(`wp --allow-root --path=${WP} ${c}`, {encoding:'utf8', input}).trim();
  const tmp = path.join(os.tmpdir(), 'apex-flows-draft.html');
  fs.writeFileSync(tmp, '<!-- wp:paragraph --><p>Lead line of the draft.</p><!-- /wp:paragraph --><!-- wp:paragraph --><p>A <strong>firm</strong> word, a <em>soft</em> one and <a href="/contact/">a link</a>.</p><!-- /wp:paragraph --><!-- wp:heading {"level":5} --><h5 class="wp-block-heading">Fifth level</h5><!-- /wp:heading -->');
  const cat = wp(`eval 'foreach(get_terms(["taxonomy"=>"category","hide_empty"=>false,"lang"=>""]) as $t) if(get_term_meta($t->term_id,"_apex_cat",true)==="blog" && pll_get_term_language($t->term_id)==="en"){echo $t->term_id;break;}'`);
  const draft = wp(`post create ${tmp} --post_type=post --post_status=draft --post_title="Flows draft probe" --post_category=${cat} --tags_input="Flows tag" --porcelain`);
  wp(`eval 'pll_set_post_language(${draft},"en");'`);
  const page = wp(`post create ${tmp} --post_type=page --post_status=publish --post_title="Flows template probe" --post_name=flows-template-probe --porcelain`);
  wp(`eval 'pll_set_post_language(${page},"en");'`);
  wp(`post meta update ${page} _wp_page_template apex-consult`);
  const oldRedirects = wp(`eval 'echo get_option("apex_redirects","");'`);
  wpIn('option update apex_redirects', '/flows-temp/ -> /offers/ 302\n/flows-perm/ -> /offers/');
  wp(`option update apex_code_head '<meta name="flows-probe" content="1">'`);
  wp(`option update apex_code_js 'window.__flowsProbe=1;'`);
  const staff = await b.newContext();
  const s = await staff.newPage();
  try {
    await s.goto(BASE + '/wp-login.php');
    await s.fill('#user_login', USER); await s.fill('#user_pass', PASS);
    await Promise.all([s.waitForNavigation(), s.click('#wp-submit')]);
    await s.goto(`${BASE}/?p=${draft}&preview=true`);
    const h = await s.content();
    ok(/Flows draft probe/.test(await s.textContent('h1')), 'preview: an editor sees the draft');
    ok(h.includes('<strong>firm</strong>') && h.includes('<em>soft</em>') && h.includes('<a href="/contact/">a link</a>'), 'preview: bold, italic and links show');
    ok(h.includes('<h5>Fifth level</h5>'), 'preview: an H5 heading shows');
    ok(/<div class="art-tags"><span class="o-tag">Flows tag<\/span>/.test(h), 'preview: the article tags show');
    ok(/noindex/.test(await s.getAttribute('meta[name=robots]', 'content') || ''), 'preview: search engines are told to skip it');
    const anon = await fetch(`${BASE}/?p=${draft}&preview=true`, {redirect:'manual'});
    ok(anon.status === 404, `preview: a visitor gets not found (${anon.status})`);
    const tp = await (await fetch(BASE + '/flows-template-probe/')).text();
    ok(tp.includes('section washed'), 'page template: "Text, then the consultation band" adds the band');
    const r1 = await fetch(BASE + '/flows-temp/', {redirect:'manual'}), r2 = await fetch(BASE + '/flows-perm/', {redirect:'manual'});
    ok(r1.status === 302 && r2.status === 301, `redirects: a line ending in 302 is temporary (${r1.status}), others permanent (${r2.status})`);
    await p.goto(BASE + '/');
    ok(await p.$('meta[name=flows-probe]') && await p.evaluate(() => window.__flowsProbe === 1), 'custom code: the head box and the JavaScript box run');
    const att = wp(`media import ${PHOTO} --porcelain`);
    ok(wp(`post get ${att} --field=post_mime_type`) === 'image/webp', 'uploads: a JPEG is saved as WebP');
    wp(`post delete ${att} --force`);
  } finally {
    await staff.close();
    wp(`post delete ${draft} ${page} --force`);
    wp(`eval '$t=get_term_by("name","Flows tag","post_tag"); if($t) wp_delete_term($t->term_id,"post_tag");'`);
    wpIn('option update apex_redirects', oldRedirects);
    wp('option delete apex_code_head apex_code_js');
    fs.rmSync(tmp, {force:true});
  }
}

/* a patient asks for their data, then for it to be deleted (Tools › Export / Erase Personal Data) */
{
  const who = 'visitor-en@example.test';
  const run = kind => JSON.parse(wp(`eval 'foreach (apply_filters("wp_privacy_personal_data_${kind}s", []) as $k => $x) if ($k === "apex-leads") echo wp_json_encode(call_user_func($x["callback"], "${who}", 1));'`));
  const ex = run('exporter');
  const fields = ex.data.length ? ex.data[0].data.map(d => d.name) : [];
  ok(ex.data.length > 0 && ['contact', 'consent', 'photos'].every(k => fields.includes(k)), `privacy: the export has ${ex.data.length} enquiries with contact, consent and photos (${fields.join(', ')})`);
  const er = run('eraser');
  ok(er.items_removed === ex.data.length, `privacy: erasing removes them all (${er.items_removed})`);
  ok(run('exporter').data.length === 0, 'privacy: nothing is left to export');
  const log = JSON.parse(wp(`eval 'echo wp_json_encode(get_option("apex_audit"));'`) || '[]');
  ok(log.some(e => e.what === 'erase'), 'privacy: the erase is in the access log');
}

errors.forEach(e => console.log('ERROR ' + e));
ok(!errors.length, `no script errors (${errors.length})`);
await b.close();
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exit(fails ? 1 : 0);
