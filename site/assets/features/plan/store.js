/* My Plan store. One per page (ES module singleton), kept in localStorage under apexPlan.v1
   with an in-memory copy when storage is blocked.

   Shape: {procedures:[{key, area?, concern?, added}], trip:{...}|null, notes:'', vouchers:[...]}
     vouchers holds voucher data that arrived through a plan:voucher event, kept as a fallback
     for vouchers missing from the games' own storage (apxg.vouchers).

   Any module can add to the plan without importing this file:
     window.dispatchEvent(new CustomEvent('apex:event', {detail:{name:'plan:add', data:{procedure:'rhinoplasty'}}}))
   Handled names: plan:add, plan:remove, plan:voucher, plan:trip, plan:notes. */

import { PROC_KEYS } from './procedures.js';

export const KEY = 'apexPlan.v1';
export const GAMES_VOUCHER_KEY = 'apxg.vouchers'; /* written by features/games (games/index.js, K.vouchers) */

const blank = () => ({ procedures: [], trip: null, notes: '', vouchers: [] });
let mem = null;
const subs = new Set();

function readRaw(k) {
  try { const v = localStorage.getItem(k); return v == null ? null : JSON.parse(v); } catch (e) { return null; }
}
function writeRaw(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
}

function clean(s) {
  const o = blank();
  if (!s || typeof s !== 'object') return o;
  if (Array.isArray(s.procedures)) o.procedures = s.procedures.filter(p => p && PROC_KEYS.includes(p.key));
  if (s.trip && typeof s.trip === 'object') o.trip = s.trip;
  if (typeof s.notes === 'string') o.notes = s.notes;
  if (Array.isArray(s.vouchers)) o.vouchers = s.vouchers.filter(v => v && v.code);
  return o;
}

function load() {
  const s = readRaw(KEY);
  if (s) mem = clean(s);
  else if (!mem) mem = blank();
  return mem;
}

function save(s) {
  mem = clean(s);
  writeRaw(KEY, mem);
  notify();
}

function notify() {
  const snap = get();
  subs.forEach(fn => { try { fn(snap); } catch (e) { /* subscriber error */ } });
}

/* A deep copy of the plan. */
export function get() { return JSON.parse(JSON.stringify(load())); }

/* addProcedure('rhinoplasty') or addProcedure({key|procedure, area, concern}). Same key and area replaces the concern. */
export function addProcedure(p, extra) {
  const src = typeof p === 'string' ? { key: p, ...(extra || {}) } : { ...(p || {}) };
  const key = src.key || src.procedure;
  if (!PROC_KEYS.includes(key)) return false;
  const s = load();
  const item = { key, added: Date.now() };
  if (src.area) item.area = String(src.area);
  if (src.concern) item.concern = String(src.concern);
  const i = s.procedures.findIndex(x => x.key === key && (x.area || '') === (item.area || ''));
  if (i >= 0) { item.added = s.procedures[i].added; s.procedures[i] = { ...s.procedures[i], ...item }; }
  else s.procedures.push(item);
  save(s);
  return true;
}

/* removeProcedure('lipo') removes every lipo item; removeProcedure('lipo', 'thighs') removes one area. */
export function removeProcedure(key, area) {
  const s = load();
  const n = s.procedures.length;
  s.procedures = s.procedures.filter(x => !(x.key === key && (area === undefined || (x.area || '') === (area || ''))));
  if (s.procedures.length !== n) save(s);
}

export function setTrip(trip) { const s = load(); s.trip = trip && typeof trip === 'object' ? { ...trip, saved: Date.now() } : null; save(s); }
export function setNotes(text) { const s = load(); s.notes = String(text || '').slice(0, 2000); save(s); }
export function clear() { save(blank()); }

/* Vouchers claimed in the games, merged with any that arrived only through plan:voucher. Expired ones are left out. */
export function vouchers(now = Date.now()) {
  const g = readRaw(GAMES_VOUCHER_KEY);
  const list = Array.isArray(g) ? g.filter(v => v && v.code) : [];
  const seen = new Set(list.map(v => v.code));
  load().vouchers.forEach(v => { if (!seen.has(v.code)) { list.push(v); seen.add(v.code); } });
  return list.filter(v => !v.expires || v.expires > now).sort((a, b) => (b.issued || 0) - (a.issued || 0));
}

/* Number of items in the plan, used by the header badge. */
export function count() { return load().procedures.length + vouchers().length; }

/* subscribe(fn) calls fn(plan) after every change and returns an unsubscribe function. */
export function subscribe(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

/* Dispatch a module event the same way the store listens for it. */
export function emit(name, data) {
  try { window.dispatchEvent(new CustomEvent('apex:event', { detail: { name, data } })); } catch (e) { /* no window */ }
}

function onAppEvent(e) {
  const d = (e && e.detail) || {};
  const data = d.data || {};
  switch (d.name) {
    case 'plan:add': addProcedure(data); break;
    case 'plan:remove': removeProcedure(data.procedure || data.key, 'area' in data ? (data.area || '') : undefined); break;
    case 'plan:trip': setTrip(data); break;
    case 'plan:notes': setNotes(data.notes); break;
    case 'plan:voucher': {
      if (!data.code) break;
      const s = load();
      if (!s.vouchers.some(v => v.code === data.code)) {
        s.vouchers.push({ code: data.code, game: data.game, prize: data.prize, score: data.score, expires: data.expires, issued: data.issued });
        save(s);
      } else notify();
      break;
    }
    case 'games:voucher': notify(); break;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('apex:event', onAppEvent);
  window.addEventListener('storage', e => {
    if (e.key === KEY) { mem = null; load(); notify(); }
    else if (e.key === GAMES_VOUCHER_KEY) notify();
  });
}
