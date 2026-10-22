// The WordPress theme draws every page in PHP (inc/render-*.php) as a copy of what assets/js/pages.js draws.
// This test opens each address twice: once as the server sent it, once with the scripts drawing the page
// themselves (window.APEX_CSR), and compares the two DOM trees section by section.
//   node tests/wordpress/ssr.mjs [http://localhost:8080] [filter]
import {createRequire} from 'module';
import {execSync} from 'child_process';
const require = createRequire('/opt/npm-tools/node_modules/');
const {chromium} = require('playwright');

const BASE = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, '');
const FILTER = process.argv[3] || '';
const WP = process.env.WP_PATH || '/home/claude/wp/site';
let urls = JSON.parse(execSync(`wp --allow-root --path=${WP} eval-file ${new URL('./urls.php', import.meta.url).pathname}`, {encoding:'utf8'}));
urls = urls.map(u => u.replace(/^https?:\/\/[^/]+/, BASE));
urls.push(BASE + '/offers/?c=breast', BASE + '/th/promotions/?c=lipo', BASE + '/articles/?c=news', BASE + '/th/blogs/?c=review', BASE + '/no-such-page/', BASE + '/th/no-such-page/');
if (FILTER) urls = urls.filter(u => u.includes(FILTER));

/* runs in the page: a canonical text form of an element, leaving out what the scripts change while running */
function canon(root, html) {
  const SKIP_CHILDREN = '#bodymap,.stories-host,#ba,#consult,.feat-page-host,[data-cur-picker],.apx-fx,.br-map';
  const DROP_CLASS = new Set(['in', 'img-x', 'no-logo', 'has-sx', 'has-curve', 'sx-join', 'feat-host', 'feat-on', 'feat-off', 'loaded', 'fb-fail', 'playing', 'done']);
  const DROP_ATTR = new Set(['data-sheen', 'data-par-on', 'data-w', 'data-go', 'data-ok', 'data-bound', 'data-tone', 'data-fb-on']);
  const DROP_STYLE = /^(transition-delay|transform|--mx|--my|width)$/;
  const pick = html ? new DOMParser().parseFromString(html, 'text/html') : document;
  const el = pick.querySelector(root);
  if (!el) return null;
  const out = [];
  const walk = (n, path) => {
    if (n.nodeType === 3) { const t = n.nodeValue.replace(/\s+/g, ' ').trim(); if (t) out.push(path + ' "' + t + '"'); return; }
    if (n.nodeType !== 1) return;
    if (n.matches('.sx,.read-bar,.ck-wrap')) return;
    const tag = n.tagName.toLowerCase();
    const attrs = [];
    for (const a of n.attributes) {
      let v = a.value;
      if (DROP_ATTR.has(a.name)) continue;
      if (a.name === 'class') { v = v.split(/\s+/).filter(c => c && !DROP_CLASS.has(c) && !(c === 'on' && n.matches('.hb-stage,.toc a'))).sort().join(' '); if (!v) continue; }
      if (a.name === 'style') { v = v.split(';').map(s => s.trim().replace(/\s*:\s*/, ':')).filter(s => s && !DROP_STYLE.test(s.split(':')[0])).sort().join(';'); if (!v) continue; }
      if (a.name === 'src' && tag === 'iframe') continue;
      if (a.name === 'data-fb' && tag === 'img') continue;
      if (a.name === 'href') v = v.replace(/^https?:\/\/[^/]+/, '');
      if (a.name === 'aria-expanded' && n.matches('.fab-btn,.has-mega>button')) continue;
      attrs.push(a.name + '=' + JSON.stringify(v));
    }
    attrs.sort();
    const me = path + '/' + tag + (n.id ? '#' + n.id : '') + '[' + attrs.join(' ') + ']';
    out.push(me);
    if (n.matches(SKIP_CHILDREN)) return;
    if (n.matches('.os-n,.plan-n')) return;   // counting up, and the plan count from this browser's storage
    let i = 0;
    for (const c of n.childNodes) {
      if (c.nodeType === 1 && c.matches('.sx,.read-bar,.ck-wrap')) continue;
      walk(c, path + '/' + tag + (c.nodeType === 1 ? ':' + (i++) : ''));
    }
  };
  walk(el, '');
  return out;
}

const SECTIONS = ['header.hdr', 'main', '.sheet', 'footer.ftr', 'div.fab'];
const b = await chromium.launch();
const ctx = await b.newContext({viewport:{width:1280, height:900}});
await ctx.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, r => r.abort());
await ctx.addInitScript(() => { window.APEX_CSR = 1; document.addEventListener('apex:ready', () => { window.__ready = 1; }); });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(page.url() + ' pageerror ' + e.message));
let bad = 0, n = 0;
for (const u of urls) {
  n++;
  const res = await fetch(u);
  const html = await res.text();
  await page.goto(u, {waitUntil:'load'});
  await page.waitForFunction(() => window.__ready, null, {timeout:20000}).catch(() => errors.push(u + ' never ready'));
  await page.waitForTimeout(150);
  const diffs = [];
  for (const s of SECTIONS) {
    const [srv, cli] = await page.evaluate(([s, html, f]) => { const canon = eval('(' + f + ')'); return [canon(s, html), canon(s)]; }, [s, html, canon.toString()]);
    if (!srv || !cli) { if (srv || cli) diffs.push(`${s}: only on the ${srv ? 'server' : 'client'}`); continue; }
    const len = Math.max(srv.length, cli.length);
    for (let i = 0; i < len && diffs.length < 6; i++) if (srv[i] !== cli[i]) { diffs.push(`${s} #${i}\n      server ${String(srv[i]).slice(0, 400)}\n      client ${String(cli[i]).slice(0, 400)}`); break; }
  }
  if (diffs.length) { bad++; console.log(`DIFF ${u} (${res.status})`); diffs.forEach(d => console.log('   ' + d)); }
}
errors.forEach(e => console.log('ERROR ' + e));
console.log(`${n - bad}/${n} pages match` + (errors.length ? `, ${errors.length} script errors` : ''));
await b.close();
process.exit(bad || errors.length ? 1 : 0);
