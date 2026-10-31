// Accessibility (WCAG 2 A and AA rules in axe-core) on the WordPress pages as the server sends them,
// with the cookie banner open, in both languages.
//   AXE=/path/to/axe.min.js node tests/wordpress/axe.mjs [http://localhost:8080]
import {chromium} from '../pw.mjs';
const BASE = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, '');
const AXE = process.env.AXE;
const PAGES = ['/', '/about/', '/services/', '/surgery/facelift/', '/doctors/', '/offers/', '/patient-reviews/', '/articles/', '/articles/smas/', '/surgery-wars/', '/surgery-wars/ep-3/', '/contact/', '/consultation/', '/no-such-page/'];
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:1280, height:900}, reducedMotion:'reduce'});   // no fade-ins half way through when the contrast is measured
await ctx.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
const p = await ctx.newPage();
let bad = 0;
for (const pre of ['', '/th']) for (const path of PAGES) {
  const url = BASE + (pre && path === '/' ? '/th/' : pre + (pre ? path.replace('/about/', '/about-us/').replace('/services/', '/surgery/').replace('/surgery/facelift/', '/surgery/facelift-apex-sugery/').replace('/offers/', '/promotions/').replace('/patient-reviews/', '/reviews/').replace('/articles/smas/', '/blog/smas/').replace('/articles/', '/blogs/').replace('/contact/', '/contact-us/') : path));
  await p.goto(url, {waitUntil:'load'});
  await p.waitForFunction(() => window.__r || (document.addEventListener('apex:ready', () => window.__r = 1), false), null, {timeout:3000}).catch(() => {});
  await p.waitForTimeout(700);
  await p.evaluate(() => document.querySelectorAll('.rv,.rv-clip').forEach(e => e.classList.add('in')));   // as after scrolling through
  await p.addScriptTag({path:AXE});
  const v = await p.evaluate(async () => (await axe.run(document, {runOnly:['wcag2a', 'wcag2aa']})).violations.map(v => `${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`));
  if (v.length) { bad++; console.log(url); v.forEach(x => console.log('   ' + x)); }
}
console.log(bad ? `${bad} pages with problems` : 'no axe violations');
await b.close();
process.exit(bad ? 1 : 0);
