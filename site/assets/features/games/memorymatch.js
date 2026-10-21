/* Memory Match: pair each procedure card with its fact card. Cards show briefly, then flip face down. */
import { css, h, loop, recorder, sfx, shake, pop, floatText, reduced, shuffle, tx, EASE, GRAIN, LATTICE } from './framework.js';
import { procIcon } from './art.js';
import { PAIRS, PROCS } from './content.js';

const TITLE = { en: 'Memory Match', th: 'จับคู่ความจำ' };
const UI = {
  level: { en: 'Level', th: 'ระดับ' },
  memorise: { en: 'Memorise', th: 'จำตำแหน่งการ์ด' },
  clear: { en: 'Level clear', th: 'ผ่านระดับ' },
  timeBonus: { en: 'Time bonus', th: 'โบนัสเวลา' },
  procedure: { en: 'Procedure', th: 'หัตถการ' },
  fact: { en: 'Fact', th: 'ข้อมูล' },
  timeUp: { en: 'Time up', th: 'หมดเวลา' }
};

const MAX_LIVES = 5;                                   // run-wide mismatch budget; each cleared level gives one back
const pairsFor = L => Math.min(12, 3 + L);
const previewMs = L => Math.max(900, 4200 - 450 * (L - 1));
const timeFor = L => pairsFor(L) * Math.max(1200, 5200 * Math.pow(0.9, L - 1));
const matchPts = (L, combo) => 20 * L + (combo >= 2 ? 10 * Math.min(combo - 1, 4) : 0);

const BACK = `<svg viewBox="0 0 60 60" aria-hidden="true"><path d="M30 8l18 22-18 22-18-22z" fill="none" stroke="rgba(241,234,247,.75)" stroke-width="1.6"/><path d="M30 17l10.5 13L30 43 19.5 30z" fill="rgba(241,234,247,.16)" stroke="rgba(241,234,247,.55)" stroke-width="1.2"/><path d="M19.5 30H40.5M30 17v26" stroke="rgba(241,234,247,.35)" stroke-width="1"/></svg>`;
const CSS = `
.mm{position:absolute;inset:0;overflow:hidden;color:#fff;user-select:none;-webkit-user-select:none;touch-action:manipulation;
  background:radial-gradient(70% 60% at 50% 45%,#3E185C 0%,transparent 75%),radial-gradient(50% 40% at 100% 100%,rgba(204,51,102,.22),transparent 70%),var(--night,#1F0A30)}
.mm::before{content:"";position:absolute;inset:0;background:${LATTICE('#C9B3DD', 0.06)} center/40px 40px;pointer-events:none}
.mm::after{content:"";position:absolute;inset:0;background:${GRAIN};mix-blend-mode:overlay;opacity:.3;pointer-events:none}
.mm-grid{position:absolute;left:0;top:0;z-index:1}
.mm-card{position:absolute;left:0;top:0;padding:0;border:0;background:none;cursor:pointer;perspective:900px;font:inherit;color:inherit;-webkit-tap-highlight-color:transparent}
.mm-card:focus-visible{outline:3px solid #fff;outline-offset:3px;border-radius:16px}
.mm-in{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .5s cubic-bezier(.34,1.3,.64,1)}
.mm-card.up .mm-in{transform:rotateY(180deg)}
.mm-card:not(.up):not(.done):hover .mm-in{transform:translateY(-3px) rotateX(6deg)}
.mm-card:active .mm-in{transform:scale(.97)}
.mm-card.up:active .mm-in{transform:rotateY(180deg)}
.mm-side{position:absolute;inset:0;border-radius:16px;backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden;box-sizing:border-box}
.mm-back{display:grid;place-items:center;
  background:${LATTICE('#C9B3DD', 0.28)} center/16px 16px,radial-gradient(80% 70% at 30% 20%,rgba(255,255,255,.18),transparent 60%),linear-gradient(155deg,#7B45A0,#55286F 55%,#3A1556);
  box-shadow:inset 0 0 0 1px rgba(201,179,221,.5),inset 0 0 0 5px rgba(42,15,64,.35),inset 0 0 0 6px rgba(201,179,221,.35),0 14px 26px -14px rgba(0,0,0,.9)}
.mm-back svg{width:40%;max-width:86px;height:auto;filter:drop-shadow(0 2px 6px rgba(20,4,34,.5))}
.mm-back::after{content:"";position:absolute;inset:-30%;background:linear-gradient(115deg,transparent 42%,rgba(255,255,255,.18) 50%,transparent 58%);transform:translateX(-40%);transition:transform .6s ${EASE}}
.mm-card:hover .mm-back::after{transform:translateX(40%)}
.mm-face{transform:rotateY(180deg);display:grid;grid-template-rows:auto 1fr;justify-items:center;align-items:center;row-gap:.35em;padding:.65em .55em .75em;text-align:center;box-shadow:0 14px 26px -14px rgba(0,0,0,.9)}
.mm-face small{display:inline-flex;align-items:center;height:1.7em;padding:0 .7em;border-radius:999px;font-size:.68em;font-weight:800;letter-spacing:.03em;line-height:1}
.mm-face span{display:block;font-weight:800;line-height:1.22;align-self:center}
.mm-face.p{background:linear-gradient(160deg,#F7F1FB,#E4D5F0);color:var(--plum-700,#55286F);box-shadow:inset 0 0 0 1.5px #C9B3DD,0 14px 26px -14px rgba(0,0,0,.9)}
.mm-face.p small{background:var(--plum,#6A388C);color:#fff}
.mm-face.p .ic{display:block;width:1.9em;height:1.9em;margin:0 auto .2em;color:var(--plum,#6A388C)}
.mm-face.p .ic svg{width:100%;height:100%}
.mm-face.f{background:linear-gradient(180deg,#fff,#FBF7FD);color:var(--ink,#2A1F33);box-shadow:inset 0 0 0 1.5px #EFE6F5,0 14px 26px -14px rgba(0,0,0,.9)}
.mm-face.f small{background:#F1EAF7;color:var(--plum-700,#55286F)}
.mm-face.f span{font-weight:700}
.mm-card.done .mm-face{box-shadow:0 0 0 3px var(--lilac-300,#C9B3DD),0 0 22px 4px rgba(168,134,205,.5)}
.mm-card.done{opacity:.6;transition:opacity .5s .35s;cursor:default}
.mm-card.done .mm-face::after{content:"";position:absolute;top:6px;right:6px;width:16px;height:16px;border-radius:50%;background:var(--plum,#6A388C) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4.5 8.3l2.2 2.2 4.8-5' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/100% no-repeat}
.mm-card.no .mm-face{box-shadow:0 0 0 3px #CC3366,0 0 22px 4px rgba(204,51,102,.45)}
.mm-toast{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;z-index:25;opacity:0;white-space:nowrap;background:rgba(31,10,48,.9);padding:16px 28px;border-radius:22px;border:1px solid rgba(201,179,221,.3);box-shadow:0 24px 50px -20px rgba(0,0,0,.8)}
.mm-toast b{display:block;font-size:30px;line-height:1.15;font-weight:800}
.mm-toast span{display:block;margin-top:4px;font-size:15px;color:var(--on-night-2,#CDB9DD)}
.mm.reduced .mm-in{transition:none}
`;

/* Pick `n` pairs. A fact is used only when no other procedure it fits is in the round. */
function buildRound(n, rng) {
  const procs = shuffle(Object.keys(PROCS), rng);
  const slots = [];
  for (let i = 0; i < n; i++) slots.push(procs[i % procs.length]);
  const inRound = new Set(slots);
  const used = new Set();
  const pairs = [];
  for (const p of slots) {
    const pool = PAIRS.filter(x => x.proc === p && !used.has(x.id) && x.procs.every(q => q === p || !inRound.has(q)));
    if (!pool.length) continue;
    const pick = pool[Math.floor(rng() * pool.length)];
    used.add(pick.id);
    pairs.push(pick);
  }
  return pairs;
}

export default {
  id: 'memorymatch',
  title: TITLE,
  how: { en: 'Match each procedure with its fact.', th: 'จับคู่หัตถการกับข้อมูลของหัตถการนั้น' },

  run(host, { lang = 'en', level: startLevel = 1, rng = Math.random, signal, onHud = () => {} } = {}) {
    css('apxg-mm', CSS);
    return new Promise(resolve => {
      const rec = recorder();
      let level = startLevel, maxLevel = startLevel, lives = MAX_LIVES, score = 0, combo = 0;
      let timeLeft = 0, playing = false, ended = false, open = [], cards = [], flipBack = 0, levelTimer = 0;

      host.innerHTML = '';
      const root = h('div', { class: 'mm' + (reduced() ? ' reduced' : ''), role: 'application', 'aria-label': tx(TITLE, lang) });
      const grid = h('div', { class: 'mm-grid' });
      const toast = h('div', { class: 'mm-toast' });
      root.append(grid, toast);
      host.appendChild(root);

      const hud = () => onHud({ score, level, lives, time: Math.max(0, Math.ceil(timeLeft / 1000)) });
      const showToast = (big, small, ms = 1200) => {
        toast.innerHTML = '';
        toast.append(h('b', null, big));
        if (small) toast.append(h('span', null, small));
        if (reduced() || !toast.animate) { toast.style.opacity = 1; setTimeout(() => (toast.style.opacity = 0), ms); return; }
        toast.animate([
          { opacity: 0, transform: 'translate(-50%,-50%) scale(.75)' },
          { opacity: 1, transform: 'translate(-50%,-50%) scale(1.04)', offset: .18 },
          { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: .8 },
          { opacity: 0, transform: 'translate(-50%,-50%) scale(.96)' }
        ], { duration: ms, easing: 'ease-out' });
      };

      /* ---------- layout: pick the column count that gives the largest cards ---------- */
      const layout = () => {
        const W = root.clientWidth, H = root.clientHeight, n = cards.length;
        if (!n || !W || !H) return;
        const pad = 12, gap = W < 500 ? 8 : 12;
        let best = null;
        for (let cols = 2; cols <= Math.min(8, n); cols++) {
          const rows = Math.ceil(n / cols);
          let cw = (W - pad * 2 - gap * (cols - 1)) / cols;
          let ch = (H - pad * 2 - gap * (rows - 1)) / rows;
          if (ch > cw * 1.45) ch = cw * 1.45;
          if (cw > ch * 1.3) cw = ch * 1.3;
          if (cw > 230) { ch *= 230 / cw; cw = 230; }
          const area = cw * ch;
          if (!best || area > best.area) best = { cols, rows, cw, ch, area };
        }
        const { cols, rows, cw, ch } = best;
        const gw = cols * cw + (cols - 1) * gap, gh = rows * ch + (rows - 1) * gap;
        const ox = (W - gw) / 2, oy = (H - gh) / 2;
        const fs = Math.max(11, Math.min(19, Math.min(cw / 8.4, ch / 7)));
        cards.forEach((c, i) => {
          const r = Math.floor(i / cols), k = i % cols;
          Object.assign(c.el.style, { width: cw + 'px', height: ch + 'px', left: (ox + k * (cw + gap)) + 'px', top: (oy + r * (ch + gap)) + 'px', fontSize: fs + 'px' });
        });
      };
      const ro = new ResizeObserver(layout);
      ro.observe(root);

      /* ---------- level ---------- */
      const startLevel_ = () => {
        playing = false; open = []; combo = 0;
        grid.innerHTML = '';
        const pairs = buildRound(pairsFor(level), rng);
        const list = [];
        pairs.forEach(p => { list.push({ kind: 'p', proc: p.proc, pair: p }); list.push({ kind: 'f', proc: p.proc, pair: p }); });
        cards = shuffle(list, rng).map((d, i) => {
          const face = d.kind === 'p'
            ? h('div', { class: 'mm-side mm-face p' }, h('small', null, tx(UI.procedure, lang)), h('span', null, h('i', { class: 'ic', html: procIcon(d.proc) }), tx(PROCS[d.proc], lang)))
            : h('div', { class: 'mm-side mm-face f' }, h('small', null, tx(UI.fact, lang)), h('span', null, tx(d.pair.text, lang)));
          const el = h('button', { class: 'mm-card', type: 'button', 'aria-label': tx(UI.procedure, lang), 'data-proc': d.proc, 'data-kind': d.kind },
            h('div', { class: 'mm-in' }, h('div', { class: 'mm-side mm-back', html: BACK }), face));
          const c = { ...d, i, el, up: false, done: false };
          el.addEventListener('click', () => tap(c));
          grid.appendChild(el);
          return c;
        });
        rec.note('lv' + level + ':' + cards.map(c => (c.kind === 'p' ? c.proc : c.pair.id)).join(','));
        cards.forEach(c => setUp(c, false));
        layout();
        timeLeft = timeFor(level);
        hud();
        // announce the level over face-down cards, then reveal them for the preview, then hide them again
        const intro = reduced() ? 600 : 900;
        showToast(`${tx(UI.level, lang)} ${level}`, tx(UI.memorise, lang), intro);
        levelTimer = setTimeout(() => {
          if (ended) return;
          cards.forEach(c => setUp(c, true));
          sfx.play('flip');
          levelTimer = setTimeout(() => {
            if (ended) return;
            cards.forEach((c, i) => setTimeout(() => { if (!ended) setUp(c, false); }, reduced() ? 0 : i * 18));
            sfx.play('flip');
            setTimeout(() => { if (!ended) playing = true; }, reduced() ? 0 : cards.length * 18 + 120);
          }, previewMs(level) + (reduced() ? 0 : 260));
        }, intro);
      };
      const setUp = (c, up) => {
        c.up = up;
        c.el.classList.toggle('up', up);
        c.el.setAttribute('aria-label', up ? (c.kind === 'p' ? tx(PROCS[c.proc], lang) : tx(c.pair.text, lang)) : (lang === 'th' ? 'การ์ดคว่ำ' : 'Face-down card'));
      };

      const tap = c => {
        if (!playing || ended || c.done || c.up) return;
        if (open.length === 2) { clearTimeout(flipBack); open.forEach(o => { o.el.classList.remove('no'); setUp(o, false); }); open = []; }
        rec.act('c' + c.i);
        setUp(c, true);
        sfx.play('flip');
        open.push(c);
        if (open.length < 2) return;
        const [a, b] = open;
        if (a.kind !== b.kind && a.proc === b.proc) {
          a.done = b.done = true;
          a.el.classList.add('done'); b.el.classList.add('done');
          combo++;
          const pts = matchPts(level, combo);
          score += pts;
          const rr = root.getBoundingClientRect(), r = b.el.getBoundingClientRect();
          floatText(root, r.left - rr.left + r.width / 2, r.top - rr.top + r.height / 2, '+' + pts);
          pop(a.el, 1.08); pop(b.el, 1.08);
          sfx.play('good');
          open = [];
          hud();
          if (cards.every(x => x.done)) clearLevel();
        } else {
          combo = 0;
          lives--;
          a.el.classList.add('no'); b.el.classList.add('no');
          shake(a.el, 5); shake(b.el, 5);
          sfx.play('bad');
          rec.note('x' + lives);
          hud();
          if (lives <= 0) { finish(); return; }
          flipBack = setTimeout(() => {
            if (ended) return;
            open.forEach(o => { o.el.classList.remove('no'); setUp(o, false); });
            open = [];
          }, 750);
        }
      };
      const clearLevel = () => {
        playing = false;
        const bonus = Math.ceil(timeLeft / 1000) * 3 * level;
        score += bonus;
        lives = Math.min(MAX_LIVES, lives + 1);
        rec.note('clear' + level + ':' + Math.round(timeLeft));
        sfx.play('level');
        showToast(tx(UI.clear, lang), `${tx(UI.timeBonus, lang)} +${bonus}`, 1300);
        level++;
        if (level > maxLevel) maxLevel = level;
        hud();
        levelTimer = setTimeout(() => { if (!ended) startLevel_(); }, 1350);
      };

      /* ---------- loop ---------- */
      let stopLoop = null, lastSec = -1;
      const tick = dt => {
        if (ended) return false;
        rec.t += dt;
        if (!playing) return;
        timeLeft -= dt;
        const s = Math.ceil(timeLeft / 1000);
        if (s !== lastSec) { lastSec = s; hud(); if (s <= 5 && s > 0) sfx.play('tick'); }
        if (timeLeft <= 0) {
          timeLeft = 0; hud();
          rec.note('timeout');
          showToast(tx(UI.timeUp, lang), '', 900);
          finish();
          return false;
        }
      };

      const cleanup = () => {
        ended = true; playing = false;
        stopLoop && stopLoop();
        ro.disconnect();
        clearTimeout(flipBack); clearTimeout(levelTimer);
      };
      const result = () => ({ score, level: maxLevel, durationMs: Math.round(rec.t), inputs: rec.inputs, log: rec.log });
      function finish() {
        if (ended) return;
        cleanup();
        rec.note('end');
        sfx.play('end');
        cards.forEach(c => { if (!c.done) setUp(c, true); });
        setTimeout(() => resolve(result()), 1200);
      }
      if (signal) {
        if (signal.aborted) { cleanup(); resolve({ ...result(), aborted: true }); return; }
        signal.addEventListener('abort', () => { if (!ended) { cleanup(); resolve({ ...result(), aborted: true }); } }, { once: true });
      }

      startLevel_();
      stopLoop = loop(signal, tick);
    });
  }
};
