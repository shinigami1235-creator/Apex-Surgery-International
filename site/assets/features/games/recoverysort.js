/* Recovery Sort: cards ride a conveyor; drag each one (or tap it, then tap a bucket) into its recovery time. */
import { css, h, loop, recorder, sfx, shake, floatText, reduced, shuffle, tx, EASE } from './framework.js';
import { RECOVERY, BUCKETS, PROCS } from './content.js';

const TITLE = { en: 'Recovery Sort', th: 'จัดช่วงพักฟื้น' };
const UI = {
  level: { en: 'Level', th: 'ระดับ' },
  newTime: { en: 'New time', th: 'ช่วงเวลาใหม่' },
  newTag: { en: 'New', th: 'ใหม่' },
  hint: { en: 'Drag a card to its time, or tap the card and then the time.', th: 'ลากการ์ดไปยังช่วงเวลา หรือแตะการ์ดแล้วแตะช่วงเวลา' },
  missed: { en: 'Missed', th: 'พลาด' }
};

const LIVES = 3;
const PER_LEVEL = 5;
const crossMs = L => Math.max(2600, 8500 * Math.pow(0.88, L - 1));   // time for a card to cross the belt
const spawnMs = L => Math.max(700, 2500 * Math.pow(0.88, L - 1));
const points = (L, streak) => 10 * L + (streak >= 3 ? 5 * Math.min(streak - 2, 6) : 0);
const bucketsFor = L => Object.keys(BUCKETS).filter(k => BUCKETS[k].level <= L).sort((a, b) => BUCKETS[a].order - BUCKETS[b].order);

const CSS = `
.rs{position:absolute;inset:0;overflow:hidden;color:#fff;touch-action:none;user-select:none;-webkit-user-select:none;
  background:radial-gradient(120% 70% at 50% 100%,#3B1758 0%,var(--night,#1F0A30) 65%)}
.rs-belt{position:absolute;left:0;right:0;background:linear-gradient(#2E1146,#230A36);border-top:1px solid rgba(201,179,221,.22);border-bottom:1px solid rgba(201,179,221,.22);overflow:hidden}
.rs-belt i{position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(201,179,221,.09) 0 2px,transparent 2px 34px);will-change:transform}
.rs-belt::after{content:"";position:absolute;left:0;top:0;bottom:0;width:36px;background:linear-gradient(90deg,rgba(204,51,102,.55),rgba(204,51,102,0))}
.rs-hint{position:absolute;left:16px;right:16px;text-align:center;font-size:13px;line-height:1.4;color:var(--on-night-2,#CDB9DD)}
.rs-card{position:absolute;left:0;top:0;box-sizing:border-box;background:#fff;color:var(--ink,#2A1F33);border-radius:16px;padding:9px 12px 10px;box-shadow:0 14px 30px -14px rgba(0,0,0,.7);touch-action:none;cursor:grab;will-change:transform;z-index:2;display:flex;flex-direction:column;justify-content:center;transition:box-shadow .15s}
.rs-card .p{font-size:12px;line-height:1.3;font-weight:700;color:var(--plum,#6A388C);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rs-card .t{font-size:15px;line-height:1.28;font-weight:700;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.rs-card.sel{box-shadow:0 0 0 3px var(--lilac,#A886CD),0 0 24px 4px rgba(168,134,205,.6)}
.rs-card.drag{cursor:grabbing;z-index:9;box-shadow:0 0 0 3px var(--lilac-300,#C9B3DD),0 24px 44px -12px rgba(0,0,0,.8)}
.rs-bins{position:absolute;left:12px;right:12px;display:grid;gap:10px;max-width:980px;margin:0 auto}
.rs-bin{position:relative;border-radius:16px;border:2px dashed rgba(201,179,221,.5);background:rgba(106,56,140,.24);display:flex;align-items:center;justify-content:center;text-align:center;font:inherit;font-weight:800;font-size:16px;line-height:1.25;color:#fff;min-height:48px;padding:6px 8px;cursor:pointer;transition:background-color .15s,border-color .15s,transform .18s ${EASE}}
.rs-bin.hot{background:rgba(168,134,205,.42);border-style:solid;border-color:var(--lilac-300,#C9B3DD);transform:scale(1.04)}
.rs-bin.armed{border-color:var(--lilac,#A886CD)}
.rs-bin.ok{background:rgba(168,134,205,.75);border-style:solid;border-color:#fff}
.rs-bin.bad{background:rgba(204,51,102,.55);border-style:solid;border-color:#CC3366}
.rs-bin .new{position:absolute;top:-9px;right:8px;background:#CC3366;color:#fff;font-size:11px;line-height:18px;padding:0 8px;border-radius:999px;font-weight:800}
.rs-bin:focus-visible{outline:3px solid #fff;outline-offset:2px}
.rs-note{position:absolute;left:16px;right:16px;background:rgba(31,10,48,.95);border:1px solid rgba(204,51,102,.7);border-radius:16px;padding:10px 14px;font-size:14px;line-height:1.45;color:var(--on-night,#F6EEFB);opacity:0;transform:translateY(-6px);transition:opacity .2s,transform .25s ${EASE};pointer-events:none;z-index:20;max-width:560px;margin:0 auto}
.rs-note.show{opacity:1;transform:none}
.rs-note b{display:inline-block;margin-right:8px;padding:0 8px;border-radius:999px;background:var(--plum,#6A388C);color:#fff;font-size:12px;line-height:20px;vertical-align:1px}
.rs-toast{position:absolute;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;z-index:25;opacity:0;white-space:nowrap}
.rs-toast b{display:block;font-size:34px;line-height:1.1;font-weight:800}
.rs-toast span{font-size:15px;color:var(--on-night-2,#CDB9DD)}
@media (min-width:700px){.rs-card .t{font-size:16px}.rs-bin{font-size:18px}}
`;

export default {
  id: 'recoverysort',
  title: TITLE,
  how: { en: 'Drag each card to its recovery time.', th: 'ลากการ์ดไปยังช่วงเวลาพักฟื้นที่ถูกต้อง' },

  run(host, { lang = 'en', level: startLevel = 1, rng = Math.random, signal, onHud = () => {} } = {}) {
    css('apxg-rs', CSS);
    return new Promise(resolve => {
      const rec = recorder();
      let level = startLevel, maxLevel = startLevel, lives = LIVES, score = 0, streak = 0, okInLevel = 0;
      let freeze = 0, sinceSpawn = 1e9, ended = false, noteTimer = 0, beltOff = 0;
      let active = bucketsFor(level), fresh = new Set(), boost = [];
      let selected = null;
      const cards = [];
      let deck = [];

      host.innerHTML = '';
      const root = h('div', { class: 'rs', role: 'application', 'aria-label': tx(TITLE, lang) });
      const stripes = h('i');
      const belt = h('div', { class: 'rs-belt' }, stripes);
      const hint = h('div', { class: 'rs-hint' }, tx(UI.hint, lang));
      const bins = h('div', { class: 'rs-bins' });
      const note = h('div', { class: 'rs-note', 'aria-live': 'polite' });
      const toast = h('div', { class: 'rs-toast' });
      root.append(belt, hint, bins, note, toast);
      host.appendChild(root);

      /* ---------- layout ---------- */
      let W = 0, H = 0, CW = 150, CH = 92, beltY = 12, beltH = 120, binEls = {};
      const geom = () => {
        W = root.clientWidth; H = root.clientHeight;
        const wide = W >= 640;
        CW = wide ? Math.min(210, W * 0.2) : Math.min(160, W * 0.42);
        CH = wide ? 100 : 96;
        beltH = CH + 28; beltY = 12;
        belt.style.top = beltY + 'px'; belt.style.height = beltH + 'px';
        hint.style.top = (beltY + beltH + 8) + 'px';
        const top = beltY + beltH + 44;
        note.style.top = (beltY + beltH + 6) + 'px';
        toast.style.top = (top + (H - top) / 2) + 'px';
        const n = active.length;
        const cols = wide ? Math.min(n, 5) : (n <= 4 ? 2 : 3);
        const rows = Math.ceil(n / cols), free = H - top - 12;
        const rowH = Math.max(48, Math.min(wide ? 130 : 150, (free - 10 * (rows - 1)) / rows));
        bins.style.gridTemplateColumns = `repeat(${cols},1fr)`;
        bins.style.gridAutoRows = rowH + 'px';
        bins.style.top = (top + Math.max(0, (free - (rowH * rows + 10 * (rows - 1))) / 2)) + 'px';
        cards.forEach(c => { c.el.style.width = CW + 'px'; c.el.style.height = CH + 'px'; });
      };
      const renderBins = () => {
        bins.innerHTML = ''; binEls = {};
        active.forEach(k => {
          const b = h('button', { class: 'rs-bin', type: 'button', 'data-b': k }, tx(BUCKETS[k], lang));
          if (fresh.has(k)) b.append(h('span', { class: 'new' }, tx(UI.newTag, lang)));
          b.addEventListener('click', () => { if (selected && !selected.done) assign(selected, k, 't'); });
          bins.appendChild(b); binEls[k] = b;
        });
        geom();
      };
      const ro = new ResizeObserver(geom);
      ro.observe(root);

      /* ---------- helpers ---------- */
      const hud = () => onHud({ score, level, lives });
      const draw = () => {
        if (boost.length) return boost.shift();
        const pool = RECOVERY.filter(r => active.includes(r.b));
        if (!deck.length) deck = shuffle(pool, rng);
        let it = deck.pop();
        const last = cards[cards.length - 1];
        if (last && last.it.id === it.id && deck.length) { deck.unshift(it); it = deck.pop(); }
        return it;
      };
      const showNote = (it, missed) => {
        note.innerHTML = '';
        note.append(h('b', null, tx(BUCKETS[it.b], lang)), `${tx(PROCS[it.proc], lang)}: ${tx(it.text, lang)}`);
        if (missed) note.prepend(h('b', { style: { background: '#CC3366' } }, tx(UI.missed, lang)));
        note.classList.add('show');
        clearTimeout(noteTimer);
        noteTimer = setTimeout(() => note.classList.remove('show'), 2600);
      };
      const showToast = (big, small) => {
        toast.innerHTML = '';
        toast.append(h('b', null, big));
        if (small) toast.append(h('span', null, small));
        if (reduced() || !toast.animate) { toast.style.opacity = 1; setTimeout(() => (toast.style.opacity = 0), 1200); return; }
        toast.animate([
          { opacity: 0, transform: 'translate(-50%,-50%) scale(.7)' },
          { opacity: 1, transform: 'translate(-50%,-50%) scale(1.06)', offset: .2 },
          { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: .78 },
          { opacity: 0, transform: 'translate(-50%,-60%) scale(1)' }
        ], { duration: 1400, easing: 'ease-out' });
      };
      const flashBin = (k, cls) => {
        const b = binEls[k]; if (!b) return;
        b.classList.add(cls);
        setTimeout(() => b.classList.remove(cls), 420);
      };
      const binAt = (x, y) => {
        for (const k in binEls) {
          const r = binEls[k].getBoundingClientRect();
          if (x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 6 && y <= r.bottom + 6) return k;
        }
        return null;
      };
      const select = c => {
        if (selected && selected !== c) selected.el.classList.remove('sel');
        selected = c && selected !== c ? c : null;
        if (c) c.el.classList.toggle('sel', selected === c);
        bins.querySelectorAll('.rs-bin').forEach(b => b.classList.toggle('armed', !!selected));
      };

      /* ---------- cards ---------- */
      const spawn = () => {
        const it = draw();
        const el = h('div', { class: 'rs-card', 'aria-label': `${tx(PROCS[it.proc], lang)}: ${tx(it.text, lang)}` },
          h('div', { class: 'p' }, tx(PROCS[it.proc], lang)),
          h('div', { class: 't' }, tx(it.text, lang)));
        el.style.width = CW + 'px'; el.style.height = CH + 'px';
        root.appendChild(el);
        const c = { it, el, x: W + 8, y: 0, done: false, drag: null, back: 0 };
        cards.push(c);
        rec.note('n:' + it.id);
        bindDrag(c);
        paint(c);
      };
      const beltCardY = () => beltY + (beltH - CH) / 2;
      const paint = c => {
        let x = c.x, y = beltCardY();
        if (c.drag) { x = c.drag.x; y = c.drag.y; }
        else if (c.back > 0) { y = y + c.backY * c.back; }
        c.el.style.transform = `translate3d(${x}px,${y}px,0)${c.drag ? ' scale(1.06)' : ''}`;
      };
      const bindDrag = c => {
        const el = c.el;
        let id = null, sx = 0, sy = 0, ox = 0, oy = 0, moved = false, rootR = null;
        const down = e => {
          if (c.done || ended || id !== null) return;
          id = e.pointerId; sx = e.clientX; sy = e.clientY; moved = false;
          rootR = root.getBoundingClientRect();
          ox = e.clientX - rootR.left - c.x; oy = e.clientY - rootR.top - beltCardY() - (c.back > 0 ? c.backY * c.back : 0);
          try { el.setPointerCapture(id); } catch (err) {}
          e.preventDefault();
        };
        const move = e => {
          if (e.pointerId !== id || c.done) return;
          if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) < 8) return;
          if (!moved) { moved = true; c.drag = { x: c.x, y: beltCardY() }; el.classList.add('drag'); if (selected === c) select(null); }
          c.drag.x = e.clientX - rootR.left - ox;
          c.drag.y = e.clientY - rootR.top - oy;
          const k = binAt(e.clientX, e.clientY);
          for (const b in binEls) binEls[b].classList.toggle('hot', b === k);
          paint(c);
        };
        const up = e => {
          if (e.pointerId !== id) return;
          id = null;
          if (c.done) return;
          for (const b in binEls) binEls[b].classList.remove('hot');
          if (!moved) { rec.note('sel:' + c.it.id); select(c); sfx.play('tap'); return; }
          el.classList.remove('drag');
          const k = e.type === 'pointerup' ? binAt(e.clientX, e.clientY) : null;
          if (k) { assign(c, k, 'd'); return; }
          // return to the belt from where it was dropped
          c.x = Math.min(W - CW * 0.5, c.drag.x);
          c.backY = c.drag.y - beltCardY(); c.back = 1;
          c.drag = null;
          paint(c);
        };
        el.addEventListener('pointerdown', down);
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
        c.off = () => {
          el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move);
          el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
        };
      };
      const removeCard = (c, mode, k) => {
        c.done = true; c.el.dataset.done = '1'; c.off && c.off();
        if (selected === c) select(null);
        c.el.classList.remove('drag', 'sel');
        const kill = () => { c.el.remove(); const i = cards.indexOf(c); if (i >= 0) cards.splice(i, 1); };
        if (reduced() || !c.el.animate) { c.el.style.opacity = 0; setTimeout(kill, 120); return; }
        const from = c.el.style.transform;
        let to = from + ' scale(.6)';
        if (mode === 'in' && binEls[k]) {
          const r = binEls[k].getBoundingClientRect(), rr = root.getBoundingClientRect();
          to = `translate3d(${r.left - rr.left + r.width / 2 - CW / 2}px,${r.top - rr.top + r.height / 2 - CH / 2}px,0) scale(.25)`;
        } else if (mode === 'miss') {
          to = `translate3d(${-CW - 20}px,${beltCardY() + 30}px,0) scale(.8)`;
        }
        c.el.animate([{ transform: from, opacity: 1 }, { transform: to, opacity: 0 }], { duration: 300, easing: 'cubic-bezier(.4,0,.7,1)', fill: 'forwards' }).onfinish = kill;
      };

      const assign = (c, k, via) => {
        if (!c || c.done || ended) return;
        rec.act(via + ':' + c.it.id + '>' + k);
        const ok = c.it.b === k;
        const r = binEls[k] && binEls[k].getBoundingClientRect(), rr = root.getBoundingClientRect();
        const fx = r ? r.left - rr.left + r.width / 2 : W / 2, fy = r ? r.top - rr.top + r.height / 2 : H / 2;
        removeCard(c, ok ? 'in' : 'out', k);
        if (ok) {
          streak++;
          const pts = points(level, streak);
          score += pts; okInLevel++;
          flashBin(k, 'ok');
          floatText(root, fx, fy - 10, '+' + pts);
          sfx.play('good');
          if (okInLevel >= PER_LEVEL) levelUp();
        } else {
          flashBin(k, 'bad');
          lose(c.it, false);
        }
        hud();
      };
      const lose = (it, missed) => {
        lives--; streak = 0; freeze = 700;
        sfx.play('bad');
        shake(root, 8);
        showNote(it, missed);
        rec.note('x' + lives);
        if (lives <= 0) finish();
      };
      const levelUp = () => {
        level++; okInLevel = 0;
        if (level > maxLevel) maxLevel = level;
        rec.note('lv' + level);
        sfx.play('level');
        const before = new Set(active);
        active = bucketsFor(level);
        const added = active.filter(k => !before.has(k));
        fresh = new Set(added);
        if (added.length) {
          boost = shuffle(RECOVERY.filter(r => added.includes(r.b)), rng).slice(0, 2);
          deck = [];
          renderBins();
          setTimeout(() => { fresh.clear(); bins.querySelectorAll('.new').forEach(n => n.remove()); }, 6000);
        }
        showToast(`${tx(UI.level, lang)} ${level}`, added.length ? `${tx(UI.newTime, lang)}: ${added.map(k => tx(BUCKETS[k], lang)).join(', ')}` : '');
      };

      /* ---------- loop ---------- */
      let stopLoop = null;
      const tick = dt => {
        if (ended) return false;
        rec.t += dt;
        if (freeze > 0) { freeze -= dt; return; }
        const speed = (W + CW) / crossMs(level);   // px per ms
        beltOff = (beltOff + speed * dt) % 34;
        stripes.style.transform = `translate3d(${-beltOff}px,0,0)`;
        sinceSpawn += dt;
        const last = cards.filter(c => !c.done).reduce((m, c) => (c.x > m ? c.x : m), -1e9);
        if (sinceSpawn >= spawnMs(level) && last < W - CW - 14) { spawn(); sinceSpawn = 0; }
        for (const c of cards) {
          if (c.done) continue;
          if (!c.drag) c.x -= speed * dt;
          if (c.back > 0) c.back = Math.max(0, c.back - dt / 160);
          if (!c.drag && c.x < -CW * 0.85) {
            rec.note('miss:' + c.it.id);
            removeCard(c, 'miss');
            lose(c.it, true);
            hud();
            if (ended) return false;
            continue;
          }
          paint(c);
        }
      };

      const cleanup = () => {
        ended = true;
        stopLoop && stopLoop();
        ro.disconnect();
        clearTimeout(noteTimer);
        cards.forEach(c => c.off && c.off());
      };
      const result = () => ({ score, level: maxLevel, durationMs: Math.round(rec.t), inputs: rec.inputs, log: rec.log });
      function finish() {
        if (ended) return;
        cleanup();
        rec.note('end');
        sfx.play('end');
        setTimeout(() => resolve(result()), 900);
      }
      if (signal) {
        if (signal.aborted) { cleanup(); resolve({ ...result(), aborted: true }); return; }
        signal.addEventListener('abort', () => { if (!ended) { cleanup(); resolve({ ...result(), aborted: true }); } }, { once: true });
      }

      renderBins();
      hud();
      stopLoop = loop(signal, tick);
    });
  }
};
