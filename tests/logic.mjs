// The rules the pages run on, checked without a browser: the trip planner for every procedure, the games'
// daily tries and Bangkok midnight, country pricing, the contact numbers the tools send to, and dates in
// My Plan for a visitor outside Thailand.
//   node tests/logic.mjs
import fs from 'fs';
process.env.TZ = 'America/Los_Angeles';   // a visitor west of Bangkok, where a date can slip by a day
// the modules add their styles when they load; the stubs let them load outside a browser
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.dispatchEvent = () => true;
globalThis.document = { getElementById: () => true };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };

const F = new URL('../site/assets/features/', import.meta.url);
const imp = p => import(new URL(p, F).href);
const { PROC_KEYS, contactOf } = await imp('plan/procedures.js');
const trip = await imp('trip/index.js');
const games = await imp('games/config.js');
const fw = await imp('games/framework.js');
const pricing = await imp('pricing/index.js');
const plan = await imp('plan/index.js');

let fails = 0;
const ok = (cond, what) => { if (!cond) { fails++; console.log('FAIL', what); } };
const iso = /^\d{4}-\d{2}-\d{2}$/;

// trip planner: every procedure has a stay, alone and with every other procedure
for (const k of PROC_KEYS) ok(trip.STAY_DAYS[k] > 0, `STAY_DAYS has ${k}`);
const plans = [...PROC_KEYS.map(k => [k]), PROC_KEYS];
for (const procedures of plans) {
  const p = trip.planTrip({ procedures, arrival: '2026-12-01', branch: 'ploenchit' });
  const dates = ['arrival', 'consult', 'surgery', 'flyHome'].map(f => p[f]);
  ok(dates.every(d => iso.test(d || '')), `planTrip(${procedures.join('+')}) gives four dates: ${dates.join(' ')}`);
  ok(p.flyHome > p.surgery && p.surgery > p.arrival, `planTrip(${procedures.join('+')}) flies home after surgery`);
}

// games: tries reset at midnight Bangkok time, and the server allows every voucher the phone can claim
const at = s => Date.parse(s);
ok(fw.bkkDay(at('2026-12-30T23:59:00+07:00')) === '2026-12-30', 'bkkDay at 23:59 Bangkok is the same day');
ok(fw.bkkDay(at('2026-12-31T00:00:00+07:00')) === '2026-12-31', 'bkkDay at 00:00 Bangkok is the next day');
ok(fw.msToBkkMidnight(at('2026-12-30T23:59:00+07:00')) === 60e3, 'one minute to the reset at 23:59');
const php = fs.readFileSync(new URL('../wordpress/theme/apex-surgery/inc/forms.php', import.meta.url), 'utf8');
const perDay = +(php.match(/'perDay' => (\d+)/) || [])[1];
ok(perDay === games.DAILY_TRIES + games.LEARN_BONUS_TRIES, `server vouchers per day (${perDay}) = daily tries + Learn bonus (${games.DAILY_TRIES + games.LEARN_BONUS_TRIES})`);

// country pricing
const C = {
  regions: [{ id: 'eu', name: { en: 'Europe' }, cur: 'EUR', adjust: 10, countries: ['DE', 'FR'] }, { id: 'ask', name: { en: 'Ask' }, ask: true, countries: ['US'] }],
  offers: { a: { rows: { eu: { price: 9000, poster: 'eu-a.webp' } } }, b: { rows: {} } }
};
const de = pricing.slice(C, 'DE', ''), th = pricing.slice(C, 'TH', ''), us = pricing.slice(C, 'US', ''), pick = pricing.slice(C, 'DE', 'base');
ok(de.region.id === 'eu' && th.region.id === 'base' && us.region.id === 'ask', 'visitors get their country\'s list, others the baht list');
ok(pick.region.id === 'base', 'choosing Thailand overrides the country');
const a = pricing.decide(de, 'a', 100000), b = pricing.decide(de, 'b', 100000), u = pricing.decide(us, 'b', 100000), t = pricing.decide(th, 'b', 100000);
ok(a.price === 9000 && a.show === 'poster' && a.poster === 'eu-a.webp', 'an offer with its own price and poster shows them');
ok(b.price > 0 && b.show === 'card' && !b.poster, 'a converted price with a markup hides the baht poster');
ok(u.ask, 'an "ask for the price" list asks');
ok(t.price === 100000 && t.show === 'poster', 'the baht list keeps the poster and price');

// the tools send to the numbers set in WordPress
ok(contactOf({ contact: { wa: '66811112222', line: '@other' } }).wa === '66811112222', 'contactOf uses the site\'s WhatsApp');
ok(contactOf({}).line === '@apexsurgery', 'contactOf falls back on its own');
ok(plan.whatsappUrl('hi', contactOf({ contact: { wa: '66811112222' } })).startsWith('https://wa.me/66811112222?'), 'My Plan sends to the site\'s WhatsApp');

// a voucher that expires on 30 Dec in Bangkok shows 30 Dec in Los Angeles too
ok(/30 Dec/.test(plan.fmtDate(at('2026-12-30T01:00:00+07:00'), 'en')), `voucher expiry in Bangkok time: ${plan.fmtDate(at('2026-12-30T01:00:00+07:00'), 'en')}`);
ok(/1 Dec/.test(plan.fmtDate('2026-12-01', 'en')), 'a plain date stays the same date');

console.log(fails ? `${fails} failed` : 'all logic checks pass');
process.exit(fails ? 1 : 0);
