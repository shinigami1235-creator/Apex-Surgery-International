/* Prices in baht with an approximate conversion to the visitor's currency.
   price(thb, {lang, currency?}) -> HTML string for one price; every price on the page updates on apex:currency.
   picker(el, {lang}) -> {destroy()} renders the currency selector.
   mount(container, {lang, prices?}) -> {destroy()} renders the picker with a list of prices (lab demo).
   The chosen currency is kept in localStorage under apex.currency and broadcast as
   window CustomEvent('apex:currency', {detail:{code}}). */

/* ------------------------------------------------------------------------------------------
   RATES, dated 21 Oct 2026
   Source: European Central Bank euro foreign exchange reference rates for 20 Oct 2026, the latest set
   published on 21 Oct 2026 (Bangkok morning), from
   https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html
   Values are units of each currency per 1 EUR. Baht per unit = EUR_THB / EUR_X.
   AED is not in the ECB set; it is derived from the UAE dirham's fixed peg of 3.6725 AED per USD.
   Cross-check: poundsterlinglive.com USD/THB mid on 20 Oct 2026 was 33.586 (ECB cross gives 33.650).
   ------------------------------------------------------------------------------------------ */
export const RATES_DATE = '2026-10-21';
const EUR = { THB: 37.738, USD: 1.1215, JPY: 177.34, GBP: 0.84028, AUD: 1.6056, SGD: 1.4338, CNY: 7.4894, HKD: 8.8023, KRW: 1489.17, PHP: 70.804, EUR: 1 };
const AED_PER_USD = 3.6725;

/* Baht for one unit of each currency. */
export const THB_PER = Object.fromEntries(Object.keys(EUR).map(k => [k, EUR.THB / EUR[k]]));
THB_PER.AED = THB_PER.USD / AED_PER_USD;

export const CODES = ['THB', 'USD', 'AUD', 'GBP', 'EUR', 'SGD', 'CNY', 'JPY', 'AED', 'HKD', 'KRW', 'PHP'];
const KEY = 'apex.currency';

const CUR = {
  THB: { sym: '฿', en: 'Thai baht', th: 'บาท' },
  USD: { sym: 'US$', en: 'US dollar', th: 'ดอลลาร์สหรัฐ' },
  AUD: { sym: 'A$', en: 'Australian dollar', th: 'ดอลลาร์ออสเตรเลีย' },
  GBP: { sym: '£', en: 'British pound', th: 'ปอนด์สเตอร์ลิง' },
  EUR: { sym: '€', en: 'Euro', th: 'ยูโร' },
  SGD: { sym: 'S$', en: 'Singapore dollar', th: 'ดอลลาร์สิงคโปร์' },
  CNY: { sym: 'CN¥', en: 'Chinese yuan', th: 'หยวนจีน' },
  JPY: { sym: 'JP¥', en: 'Japanese yen', th: 'เยนญี่ปุ่น' },
  AED: { sym: 'AED ', en: 'UAE dirham', th: 'ดีแรห์มสหรัฐอาหรับเอมิเรตส์' },
  HKD: { sym: 'HK$', en: 'Hong Kong dollar', th: 'ดอลลาร์ฮ่องกง' },
  KRW: { sym: '₩', en: 'Korean won', th: 'วอนเกาหลีใต้' },
  PHP: { sym: '₱', en: 'Philippine peso', th: 'เปโซฟิลิปปินส์' }
};

const T = {
  label: { en: 'Currency', th: 'สกุลเงิน' },
  note: { en: 'Approximate, rates as of 21 Oct 2026.', th: 'ราคาโดยประมาณ อัตราแลกเปลี่ยน ณ 21 ต.ค. 2569' },
  title: { en: 'Prices', th: 'ราคา' },
  baht: { en: 'Price in baht', th: 'ราคาเป็นบาท' }
};
const tx = (o, lang) => o[lang] ?? o.en;

const CSS = `
.apx-price{display:inline-flex;flex-wrap:wrap;align-items:baseline;gap:2px 10px;font-variant-numeric:tabular-nums}
.apx-price .apx-thb{font-weight:800}
.apx-price .apx-fx{font-size:.82em;font-weight:700;color:var(--ink-2,#5A4A66)}
.apx-price .apx-fx[hidden]{display:none}
.apxk{--k-plum:var(--plum,#6A388C);--k-plum7:var(--plum-700,#55286F);--k-lilac:var(--lilac,#A886CD);--k-l3:var(--lilac-300,#C9B3DD);--k-l2:var(--lilac-200,#E4D8EE);--k-l1:var(--lilac-100,#F1EAF7);--k-ink:var(--ink,#2A1F33);--k-ink2:var(--ink-2,#5A4A66);
  font-family:"LINE Seed","Sarabun","Noto Sans Thai",system-ui,sans-serif;color:var(--k-ink);font-size:16px;line-height:1.5}
.apxk *,.apxk *::before,.apxk *::after{box-sizing:border-box}
.apxk.k-pick{display:inline-flex;flex-direction:column;gap:4px;max-width:100%}
.apxk .k-row{display:inline-flex;align-items:center;gap:10px}
.apxk label{font-size:14px;font-weight:800;color:var(--k-ink)}
.apxk .k-sel{position:relative;display:inline-flex}
.apxk select{appearance:none;-webkit-appearance:none;min-height:44px;min-width:0;max-width:100%;padding:0 40px 0 14px;border-radius:999px;border:1.5px solid var(--k-l3);background:#fff;color:var(--k-plum7);font:inherit;font-size:15px;font-weight:700;cursor:pointer}
.apxk select:hover{border-color:var(--k-plum)}
.apxk select:focus-visible{outline:3px solid var(--k-lilac);outline-offset:2px}
.apxk .k-sel::after{content:"";position:absolute;right:16px;top:50%;width:8px;height:8px;margin-top:-6px;border-right:2px solid var(--k-plum);border-bottom:2px solid var(--k-plum);transform:rotate(45deg);pointer-events:none}
.apxk .k-note{font-size:12px;color:var(--k-ink2)}
.apxk .k-wrap{max-width:860px;margin:0 auto;padding:24px 16px 48px}
.apxk .k-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px;margin-bottom:16px}
.apxk h2{margin:0;font-size:clamp(24px,4.5vw,32px);font-weight:800;line-height:1.2}
.apxk .k-list{list-style:none;margin:0;padding:0;display:grid;gap:10px}
@media (min-width:640px){.apxk .k-list{grid-template-columns:1fr 1fr}}
.apxk .k-list li{background:#fff;border:1px solid var(--k-l2);border-radius:20px;padding:16px 18px;display:flex;flex-direction:column;gap:2px}
.apxk .k-list small{font-size:13px;font-weight:700;color:var(--k-ink2)}
.apxk .k-list .apx-price{font-size:26px;line-height:1.25}
.apxk .k-list .apx-thb{color:var(--k-plum7)}
.apxk .k-list .apx-fx{font-size:17px}
`;

function injectCSS() {
  if (document.getElementById('apxk-css')) return;
  const s = document.createElement('style'); s.id = 'apxk-css'; s.textContent = CSS; document.head.append(s);
}

/* ---------- chosen currency ---------- */
let mem = null;
function guess() {
  try {
    const l = (navigator.language || '').toLowerCase();
    const map = { 'en-us': 'USD', 'en-au': 'AUD', 'en-gb': 'GBP', 'en-sg': 'SGD', 'zh-cn': 'CNY', 'zh-hk': 'HKD', 'ja': 'JPY', 'ko': 'KRW', 'en-ph': 'PHP', 'fil': 'PHP', 'ar-ae': 'AED' };
    if (map[l]) return map[l];
    if (map[l.split('-')[0]]) return map[l.split('-')[0]];
    if (/^(de|fr|es|it|nl|fi|pt|el|ga)\b/.test(l)) return 'EUR';
  } catch (e) { /* no navigator */ }
  return 'THB';
}
export function get() {
  if (mem) return mem;
  try { const v = localStorage.getItem(KEY); if (v && CODES.includes(v)) return (mem = v); } catch (e) { /* storage blocked */ }
  return (mem = guess());
}
export function set(code) {
  if (!CODES.includes(code)) return;
  mem = code;
  try { localStorage.setItem(KEY, code); } catch (e) { /* storage blocked */ }
  try { window.dispatchEvent(new CustomEvent('apex:currency', { detail: { code } })); } catch (e) { /* no window */ }
}

/* ---------- formatting ---------- */
const nf = lang => new Intl.NumberFormat(lang === 'th' ? 'th-TH' : 'en-US', { maximumFractionDigits: 0 });
export function convert(thb, code) { return thb / THB_PER[code]; }
function roundFx(v, code) {
  const step = code === 'KRW' ? 1000 : code === 'JPY' ? 100 : v >= 1000 ? 10 : 1;
  return Math.round(v / step) * step;
}
export function bahtText(thb, lang = 'en') { return lang === 'th' ? `${nf(lang).format(thb)} บาท` : `฿${nf(lang).format(thb)}`; }
export function fxText(thb, code, lang = 'en') {
  if (code === 'THB') return '';
  return `≈ ${CUR[code].sym}${nf('en').format(roundFx(convert(thb, code), code))}`;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* HTML for one price. The page keeps it current through the apex:currency listener below. */
export function price(thb, opts = {}) {
  injectCSS();
  const lang = opts.lang === 'th' ? 'th' : 'en';
  const code = opts.currency || get();
  const fx = fxText(thb, code, lang);
  return `<span class="apx-price" data-thb="${+thb}" data-lang="${lang}">` +
    `<span class="apx-thb">${esc(bahtText(thb, lang))}</span>` +
    `<span class="apx-fx" title="${esc(tx(T.note, lang))}"${fx ? '' : ' hidden'}>${esc(fx)}</span></span>`;
}

/* Re-render every price inside root for the chosen currency. */
export function refresh(root = document) {
  const code = get();
  root.querySelectorAll('.apx-price[data-thb]').forEach(el => {
    const fx = el.querySelector('.apx-fx');
    if (!fx) return;
    const v = fxText(+el.dataset.thb, code, el.dataset.lang);
    fx.textContent = v; fx.hidden = !v;
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('apex:currency', e => { if (e.detail && CODES.includes(e.detail.code)) mem = e.detail.code; refresh(); });
  window.addEventListener('storage', e => { if (e.key === KEY && CODES.includes(e.newValue)) { mem = e.newValue; refresh(); } });
}

/* ---------- picker ---------- */
let pid = 0;
export function picker(el, opts = {}) {
  injectCSS();
  const lang = opts.lang === 'th' ? 'th' : 'en';
  const id = 'apxk-sel-' + (++pid);
  const sel = document.createElement('select');
  sel.id = id;
  sel.setAttribute('aria-describedby', id + '-n');
  CODES.forEach(c => {
    const o = document.createElement('option');
    o.value = c; o.textContent = `${c}, ${tx(CUR[c], lang)}`;
    sel.append(o);
  });
  sel.value = get();
  const box = document.createElement('div');
  box.className = 'apxk k-pick';
  box.lang = lang;
  box.innerHTML = `<div class="k-row"><label for="${id}">${esc(tx(T.label, lang))}</label><span class="k-sel"></span></div><span class="k-note" id="${id}-n">${esc(tx(T.note, lang))}</span>`;
  box.querySelector('.k-sel').append(sel);
  sel.addEventListener('change', () => { set(sel.value); try { opts.onEvent && opts.onEvent('currency:set', { code: sel.value }); } catch (e) { /* host */ } });
  const onCur = () => { if (sel.value !== get()) sel.value = get(); };
  window.addEventListener('apex:currency', onCur);
  el.append(box);
  return { destroy() { window.removeEventListener('apex:currency', onCur); box.remove(); }, el: box };
}

/* ---------- module mount: picker plus a list of prices ---------- */
export function mount(container, opts = {}) {
  injectCSS();
  const lang = opts.lang === 'th' ? 'th' : 'en';
  const prices = opts.prices || [{ thb: 19900 }, { thb: 69000 }, { thb: 100000 }, { thb: 180000 }];
  const root = document.createElement('div');
  root.className = 'apxk';
  root.lang = lang;
  root.innerHTML = `<div class="k-wrap"><div class="k-head"><h2>${esc(opts.title || tx(T.title, lang))}</h2><div class="k-p"></div></div><ul class="k-list"></ul></div>`;
  const p = picker(root.querySelector('.k-p'), { lang, onEvent: opts.onEvent });
  root.querySelector('.k-list').innerHTML = prices.map(x =>
    `<li data-thb="${+x.thb}"><small>${esc(x.label ? (x.label[lang] ?? x.label.en ?? x.label) : tx(T.baht, lang))}</small>${price(x.thb, { lang })}</li>`).join('');
  container.append(root);
  return { destroy() { p.destroy(); root.remove(); } };
}
