/* Prices by country.

   The offers on the page arrive with Thailand's prices in baht and the poster Apex uploaded. A country price
   list (a region) can change that for visitors from its countries: its own currency, a percentage on the baht
   price, its own price for an offer, its own poster, or "Ask for the price". Most posters have the baht price
   printed on them, so where the price differs the poster gives way to a plain card with the right price, or the
   offer is hidden, as the region says.

   bind(root, ctx) applies the visitor's region to every offer under root and puts the "Prices for" picker into
   each [data-cur-picker] slot when visitors may choose.
   ctx: {lang, t, ic, fmtNum, img, gal, rest, multi, rates, emit}. rates is the page's currency module.
   Each offer element carries data-offer (the poster's file name, the same key the backend uses), data-price
   (the baht price), data-name and data-label.

   Where the region comes from:
   - WordPress (ctx.rest): GET rest + 'pricing' returns only the visitor's region, worked out on the server from
     the country header (Cloudflare and most hosts send one), else from the browser's time zone. It is called
     only when Apex has made at least one region (ctx.multi), so the page cache stays as it is.
   - The design preview has no server: regions.js stands in for the backend and the time zone gives the
     country. ?pricing=demo loads regions-demo.js, example prices for review. ?country=AU tries a country.

   The chosen region is kept in localStorage under apex.region and broadcast as window CustomEvent
   'apex:region'. */

const KEY = 'apex.region';
const BASE = 'base';

const T = {
  pricesFor: { en: 'Prices for', th: 'ราคาสำหรับ' },
  empty: { en: 'This month\'s offers for {r} are sent on request. Ask on LINE or WhatsApp.', th: 'โปรโมชั่นเดือนนี้สำหรับ{r} สอบถามได้ทาง LINE หรือ WhatsApp' },
  emptyMsg: { en: 'Hello, I would like to ask about this month\'s offers ({r} prices).', th: 'สวัสดี ขอสอบถามโปรโมชั่นเดือนนี้ (ราคา{r})' },
  demo: { en: 'Example prices for review. Apex sets the real ones in the backend.', th: 'ราคาตัวอย่างสำหรับตรวจแบบ Apex ตั้งราคาจริงในระบบหลังบ้าน' },
  list: { en: 'prices', th: 'ราคา' }
};
const tx = (o, lang) => (o && (o[lang] ?? o.en)) ?? '';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
.rx-off{display:none!important}
[data-cur-picker]:has(.rx-pick){display:flex;flex-wrap:wrap;align-items:flex-start;gap:12px 22px}
.rx-art{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;gap:8px;padding:clamp(18px,2.4vw,26px);text-align:left;color:#fff;overflow:hidden;
  background:radial-gradient(120% 80% at 90% 0%,rgba(168,134,205,.55),transparent 62%),radial-gradient(90% 70% at 0% 100%,rgba(106,56,140,.7),transparent 70%),linear-gradient(165deg,#55286F,#2A1F33 78%)}
.rx-art::before{content:"";position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,.4) 1.1px,transparent 1.7px);background-size:17px 17px;
  -webkit-mask-image:linear-gradient(205deg,#000 8%,transparent 62%);mask-image:linear-gradient(205deg,#000 8%,transparent 62%)}
.rx-art::after{content:"";position:absolute;right:-18%;bottom:-30%;width:78%;aspect-ratio:1;border-radius:50%;border:1px solid rgba(255,255,255,.18);box-shadow:0 0 0 22px rgba(255,255,255,.04),0 0 0 46px rgba(255,255,255,.03)}
.rx-art>*{position:relative;z-index:1}
.rx-art .rx-brand{font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.72)}
.rx-art .rx-name{margin-top:auto;font-size:clamp(22px,2.6vw,32px);line-height:1.12;font-weight:800;letter-spacing:-.01em;text-wrap:balance}
.rx-art .rx-tags{display:flex;flex-wrap:wrap;gap:6px}
.rx-art .rx-tags span{font-size:12px;font-weight:700;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22)}
.rx-art .rx-where{font-size:13px;font-weight:700;color:rgba(255,255,255,.8)}
.rx-plain>img{visibility:hidden}
.rx-plain{cursor:default}
.rx-plain .o-zoom,.rx-plain .os-glare{display:none}
.offer.rx-empty{grid-column:1/-1;align-self:start}
.offer.rx-empty .offer-body{padding:clamp(20px,3vw,32px)}
.offer.rx-empty .o-title{font-size:clamp(18px,1.8vw,22px);text-wrap:balance;margin-bottom:14px}
.rx-note{flex-basis:100%;font-size:12px;color:var(--ink-3,#7A6A86)}
.night .rx-note,.offer-spot .rx-note{color:var(--on-night-2,#CDBFDB)}
`;
function injectCSS() {
  if (document.getElementById('rx-css')) return;
  const s = document.createElement('style'); s.id = 'rx-css'; s.textContent = CSS; document.head.append(s);
}

/* ---------- which region ---------- */
const qp = k => { try { return new URLSearchParams(location.search).get(k) || ''; } catch (e) { return ''; } };
export function stored() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
function store(id) { try { id ? localStorage.setItem(KEY, id) : localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ } }
const timeZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } };
async function tzCountry() {
  const tz = timeZone();
  if (!tz) return '';
  try {
    const M = (await import('./tz.js')).default;
    const i = tz.indexOf('/');
    return (i < 0 ? (M[''] || {})[tz] : (M[tz.slice(0, i)] || {})[tz.slice(i + 1)]) || '';
  } catch (e) { return ''; }
}

/* The full price lists (preview) cut down to one visitor's region: the same shape the WordPress endpoint returns. */
export function slice(C, country, want) {
  const regions = C.regions || [];
  const find = id => regions.find(r => r.id === id);
  let r = want && find(want);
  if (!r && want !== BASE && country) r = regions.find(x => (x.countries || []).includes(country));
  if (!r && want !== BASE && C.other && C.other !== BASE) r = find(C.other);
  const region = r ? { id: r.id, name: r.name, cur: r.cur || 'THB', adjust: +r.adjust || 0, ask: !!r.ask, mismatch: r.mismatch === 'hide' ? 'hide' : 'card' }
    : { id: BASE, name: (C.base && C.base.name) || { en: 'Thailand', th: 'ประเทศไทย' }, cur: 'THB', adjust: 0, ask: false, mismatch: 'card' };
  const offers = {};
  Object.entries(C.offers || {}).forEach(([k, o]) => {
    const row = (o.rows || {})[region.id] || {};
    offers[k] = { noPrice: !!o.noPrice, price: +row.price || 0, poster: row.poster || '', show: row.show || 'auto' };
  });
  return {
    choose: C.choose !== false, demo: !!C.demo, country,
    regions: [{ id: BASE, name: (C.base && C.base.name) || { en: 'Thailand', th: 'ประเทศไทย' } }, ...regions.map(x => ({ id: x.id, name: x.name }))],
    region, offers
  };
}

let loading = null, current = null, rates = null;
async function load(ctx, want) {
  rates = ctx.rates || null;
  if (ctx.rest) {
    if (!ctx.multi) return null;
    const u = new URL(ctx.rest + 'pricing', location.href);
    u.searchParams.set('lang', ctx.lang);
    const tz = timeZone(); if (tz) u.searchParams.set('tz', tz);
    if (want) u.searchParams.set('region', want);
    if (qp('country')) u.searchParams.set('country', qp('country').toUpperCase());
    const r = await fetch(u, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('pricing ' + r.status);
    return r.json();
  }
  const demo = qp('pricing') === 'demo';
  const C = (await import(demo ? './regions-demo.js' : './regions.js')).default;
  if (!(C.regions || []).length) return null;
  const country = qp('country').toUpperCase() || await tzCountry();
  return slice({ ...C, demo }, country, want);
}

/* ---------- one offer in one region ---------- */
const THB = () => (rates && rates.THB_PER) || { THB: 1 };
function nice(v) {
  const step = v >= 100000 ? 1000 : v >= 10000 ? 100 : 10;
  return Math.max(step, Math.round(v / step) * step);
}
/* What an offer shows: {show:'poster'|'card'|'hide', poster, price, ask} in the region's currency. */
export function decide(R, key, base) {
  const g = R.region, o = (R.offers || {})[key] || {};
  const rate = THB()[g.cur] || 1;
  let price = 0, ask = false, exact = false;
  if (o.price > 0) { price = o.price; exact = true; }
  else if (g.ask || !base) ask = true;
  else price = g.cur === 'THB' && !g.adjust ? base : nice(base * (1 + g.adjust / 100) / rate);
  // the baht printed on the poster still holds when the price is the same baht, shown in baht or converted
  const same = !ask && (exact ? (g.cur === 'THB' && price === base) : !g.adjust);
  let show = o.show && o.show !== 'auto' ? o.show : '';
  if (!show) show = o.poster || o.noPrice || same ? 'poster' : g.mismatch;
  return { show, poster: show === 'poster' ? o.poster : '', price, ask, cur: g.cur };
}

/* ---------- drawing ---------- */
function priceHtml(d, spot, ctx) {
  if (d.ask) return spot ? `<p class="os-ask">${ctx.ic('message-circle')}${esc(ctx.t('askPrice'))}</p>`
    : `<span class="op-ask">${ctx.ic('message-circle')}${esc(ctx.t('askPrice'))}</span>`;
  const unit = d.cur === 'THB' ? ctx.t('baht') : d.cur;
  const thb = Math.round(d.price * (THB()[d.cur] || 1));
  const fx = `<span class="apx-price op-fx" data-thb="${thb}" data-lang="${ctx.lang}"${d.cur === 'THB' ? '' : ` data-cur="${d.cur}"`}><span class="apx-fx" hidden></span><small>${esc(ctx.t('approx'))}</small></span>`;
  const n = esc(ctx.fmtNum(d.price));
  return spot ? `<div class="os-price"><span class="op-row"><b class="os-n">${n}</b><span class="op-u">${esc(unit)}</span></span>${fx}</div>`
    : `<span class="op-row"><b class="op-n">${n}</b><span class="op-u">${esc(unit)}</span></span>${fx}`;
}
function priceText(d, ctx) {
  if (d.ask || !d.price) return '';
  if (d.cur === 'THB') return `${ctx.fmtNum(d.price)} ${ctx.t('baht')}`;
  const sym = rates && rates.symbol ? rates.symbol(d.cur) : d.cur + ' ';
  return `${sym}${new Intl.NumberFormat('en-US').format(d.price)}`;
}
function message(label, d, R, ctx) {
  const p = priceText(d, ctx);
  const where = R.region.id === BASE ? '' : tx(R.region.name, ctx.lang);
  const extra = [p, where && (ctx.lang === 'th' ? `${tx(T.list, 'th')}${where}` : `${where} ${T.list.en}`)].filter(Boolean).join(', ');
  return (ctx.lang === 'th' ? `สวัสดี ขอสอบถามโปรโมชั่น ${label}` : `Hello, I would like to ask about this offer: ${label}`) + (extra ? ` (${extra})` : '') + (ctx.lang === 'th' ? '' : '.');
}
const withMsg = (href, msg, wa) => href.split('?')[0] + (wa ? '?text=' : '?') + encodeURIComponent(msg);

function remember(el) {
  if (el._rx) return el._rx;
  const spot = el.classList.contains('offer-spot');
  const btn = el.querySelector(spot ? '.os-card' : '.offer-img');
  const img = btn && btn.querySelector('img');
  const pr = spot ? el.querySelector('.os-price,.os-ask') : el.querySelector('.o-price');
  return (el._rx = {
    spot, btn, img, src: img ? img.getAttribute('src') : '', srcset: img ? img.getAttribute('srcset') : null,
    gal: btn ? [btn.getAttribute('data-gal'), btn.getAttribute('data-i')] : [],
    price: pr ? (spot ? pr.outerHTML : pr.innerHTML) : '',
    links: [...el.querySelectorAll('a.o-btn')].map(a => [a, a.getAttribute('href')])
  });
}
function restore(el) {
  const m = el._rx;
  if (!m || !m.dirty) return;
  m.dirty = false;
  el.classList.remove('rx-off');
  if (m.btn) {
    m.btn.classList.remove('rx-plain');
    const art = m.btn.querySelector('.rx-art'); if (art) art.remove();
    if (m.gal[0] !== null) { m.btn.setAttribute('data-gal', m.gal[0]); m.btn.setAttribute('data-i', m.gal[1]); m.btn.removeAttribute('aria-disabled'); }
  }
  if (m.img) { m.img.setAttribute('src', m.src); if (m.srcset !== null) m.img.setAttribute('srcset', m.srcset); }
  setPrice(el, m.price);
  m.links.forEach(([a, h]) => a.setAttribute('href', h));
}
function setPrice(el, html) {
  const m = el._rx;
  if (m.spot) {
    const old = el.querySelector('.os-price,.os-ask');
    if (!old) return;
    const t = document.createElement('template'); t.innerHTML = html.trim();
    old.replaceWith(t.content);
  } else {
    const box = el.querySelector('.o-price');
    if (box) box.innerHTML = html;
  }
}
function plainArt(el, R, ctx) {
  const name = el.dataset.name || '';
  const tags = [...el.querySelectorAll('.o-tags .o-tag,.o-title')].map(x => x.textContent.trim()).filter(x => x && x !== name);
  const where = R.region.id === BASE ? '' : `${tx(T.pricesFor, ctx.lang)} ${tx(R.region.name, ctx.lang)}`;
  return `<span class="rx-art" aria-hidden="true"><span class="rx-brand">Apex Surgery International</span><span class="rx-name">${esc(name)}</span>`
    + (tags.length ? `<span class="rx-tags">${[...new Set(tags)].slice(0, 3).map(x => `<span>${esc(x)}</span>`).join('')}</span>` : '')
    + (where ? `<span class="rx-where">${esc(where)}</span>` : '') + '</span>';
}

function applyOne(el, R, ctx) {
  const m = remember(el);
  restore(el);
  if (!R || R.region.id === BASE) return;
  const d = decide(R, el.dataset.offer || '', +el.dataset.price || 0);
  m.dirty = true;
  if (d.show === 'hide') { el.classList.add('rx-off'); return; }
  if (m.btn && d.show === 'card') {
    m.btn.classList.add('rx-plain');
    m.btn.insertAdjacentHTML('afterbegin', plainArt(el, R, ctx));
    m.btn.removeAttribute('data-gal'); m.btn.removeAttribute('data-i'); m.btn.setAttribute('aria-disabled', 'true');
  } else if (m.img && d.poster) {
    const src = ctx.img ? ctx.img(d.poster) : d.poster;
    m.img.setAttribute('src', src); m.img.removeAttribute('srcset');
    const g = ctx.gal && ctx.gal[+m.gal[0]];
    if (g && g[+m.gal[1]]) g[+m.gal[1]] = { ...g[+m.gal[1]], src: d.poster };
  }
  setPrice(el, priceHtml(d, m.spot, ctx));
  const msg = message(el.dataset.label || el.dataset.name || '', d, R, ctx);
  m.links.forEach(([a, h]) => a.setAttribute('href', withMsg(h, msg, a.classList.contains('wa'))));
}

/* the promotions page: counts on the procedure chips, the featured offer's band, and a line to ask when a
   region hides every offer in a grid */
function tidy(root, R, ctx) {
  root.querySelectorAll('.offer-spot-s').forEach(s => s.classList.toggle('rx-off', !!s.querySelector('.offer-spot.rx-off')));
  root.querySelectorAll('.offer-grid').forEach(g => {
    g.querySelectorAll('.rx-empty').forEach(x => x.remove());
    const all = [...g.querySelectorAll('[data-offer]')];
    if (!R || !all.length || all.some(o => !o.classList.contains('rx-off'))) return;
    const name = tx(R.region.name, ctx.lang);
    const msg = tx(T.emptyMsg, ctx.lang).replace('{r}', name);
    const links = ((all[0]._rx || {}).links || []).map(([a, h]) => {
      const c = a.cloneNode(true); c.setAttribute('href', withMsg(h, msg, a.classList.contains('wa'))); return c.outerHTML; }).join('');
    g.insertAdjacentHTML('afterbegin', `<div class="offer rx-empty"><div class="offer-body"><h3 class="o-title">${esc(tx(T.empty, ctx.lang).replace('{r}', name))}</h3><div class="o-acts">${links}</div></div></div>`);
  });
  const grid = root.querySelector('#pgrid');
  const chips = root.querySelector('.chips.c-count');
  if (!grid || !chips) return;
  const live = [...grid.querySelectorAll('.offer:not(.offer-game):not(.rx-off):not(.rx-empty)')];
  chips.querySelectorAll('.chip').forEach(c => {
    const k = c.dataset.k, n = k === 'all' ? live.length : live.filter(o => o.dataset.cat === k).length;
    const i = c.querySelector('i'); if (i) i.textContent = n;
    c.classList.toggle('rx-off', k !== 'all' && !n);
  });
}

/* ---------- the "Prices for" picker ---------- */
let pid = 0;
function picker(slot, R, ctx) {
  slot.querySelectorAll('.rx-pick').forEach(x => x.remove());
  if (!R || !R.choose || (R.regions || []).length < 2) return;
  const id = 'rx-sel-' + (++pid);
  const box = document.createElement('div');
  box.className = 'apxk k-pick rx-pick';
  box.lang = ctx.lang;
  box.innerHTML = `<div class="k-row"><label for="${id}">${esc(tx(T.pricesFor, ctx.lang))}</label><span class="k-sel"><select id="${id}">${R.regions.map(r =>
    `<option value="${esc(r.id)}"${r.id === R.region.id ? ' selected' : ''}>${esc(tx(r.name, ctx.lang))}</option>`).join('')}</select></span></div>`
    + (R.demo ? `<span class="rx-note">${esc(tx(T.demo, ctx.lang))}</span>` : '');
  box.querySelector('select').addEventListener('change', e => choose(e.target.value, ctx));
  slot.prepend(box);
}

const roots = new Set();
function paint(ctx) {
  const R = current;
  roots.forEach(root => {
    if (!root.isConnected) { roots.delete(root); return; }
    root.querySelectorAll('[data-offer]').forEach(el => applyOne(el, R, ctx));
    root.querySelectorAll('[data-cur-picker]').forEach(slot => picker(slot, R, ctx));
    tidy(root, R, ctx);
    if (rates && rates.refresh) rates.refresh(root);
  });
  if (R && rates && rates.setDefault && R.region.cur !== 'THB') rates.setDefault(R.region.cur);
}
async function choose(id, ctx) {
  store(id === BASE ? BASE : id);
  try {
    current = await load(ctx, id);
  } catch (e) { return; }
  paint(ctx);
  try { window.dispatchEvent(new CustomEvent('apex:region', { detail: { id, country: current && current.country } })); } catch (e) { /* no window */ }
  try { ctx.emit && ctx.emit('pricing:region', { region: id }); } catch (e) { /* host */ }
}

export async function bind(root, ctx) {
  if (!root) return;
  injectCSS();
  roots.add(root);
  if (!loading) loading = load(ctx, qp('region') || stored()).then(R => (current = R)).catch(() => (current = null));
  await loading;
  paint(ctx);
}
