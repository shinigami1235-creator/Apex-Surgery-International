/* Memory Match: pair each procedure card with its fact card. Cards show briefly, then flip face down. */
import { css, h, loop, recorder, sfx, shake, pop, floatText, reduced, shuffle, tx, EASE } from './framework.js';
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

const CSS = `
.mm{position:absolute;inset:0;overflow:hidden;color:#fff;user-select:none;-webkit-user-select:none;touch-action:manipulation;
  background:radial-gradient(110% 80% at 50% 50%,#341451 0%,var(--night,#1F0A30) 70%)}
.mm-grid{position:absolute;left:0;top:0}
.mm-card{position:absolute;left:0;top:0;padding:0;border:0;background:none;cursor:pointer;perspective:700px;font:inherit;color:inherit;-webkit-tap-highlight-color:transparent}
.mm-card:focus-visible{outline:3px solid #fff;outline-offset:3px;border-radius:14px}
.mm-in{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .26s ${EASE}}
.mm-card.up .mm-in{transform:rotateY(180deg)}
.mm-side{position:absolute;inset:0;border-radius:14px;backface-visibility:hidden;-webkit-backface-visibility:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:6px;box-sizing:border-box;overflow:hidden}
.mm-back{background:
  linear-gradient(135deg,rgba(255,255,255,.08) 25%,transparent 25%) 0 0/18px 18px,
  linear-gradient(225deg,rgba(255,255,255,.08) 25%,transparent 25%) 0 0/18px 18px,
  linear-gradient(160deg,var(--plum,#6A388C),var(--plum-700,#55286F));
  border:1px solid rgba(201,179,221,.35);box-shadow:0 10px 24px -14px rgba(0,0,0,.8)}
.mm-back::after{content:"";width:28%;aspect-ratio:1;border:2px solid rgba(241,234,247,.55);transform:rotate(45deg);border-radius:4px}
.mm-face{transform:rotateY(180deg);box-shadow:0 10px 24px -14px rgba(0,0,0,.8)}
.mm-face.p{background:var(--lilac-100,#F1EAF7);color:var(--plum-700,#55286F);border:2px solid var(--lilac,#A886CD)}
.mm-face.f{background:#fff;color:var(--ink,#2A1F33);border:2px solid #fff}
.mm-face small{display:block;font-size:.72em;font-weight:700;letter-spacing:.02em;opacity:.7;margin-bottom:.3em}
.mm-face span{display:block;font-weight:800;line-height:1.22}
.mm-face.f span{font-weight:700}
.mm-card.done .mm-face{box-shadow:0 0 0 3px var(--lilac-300,#C9B3DD),0 0 18px 2px rgba(168,134,205,.55)}
.mm-card.done{opacity:.55;transition:opacity .5s .35s;cursor:default}
.mm-card.no .mm-face{box-shadow:0 0 0 3px #CC3366}
.mm-toast{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;z-index:25;opacity:0;white-space:nowrap;background:rgba(31,10,48,.88);padding:14px 26px;border-radius:20px;border:1px solid rgba(201,179,221,.3)}
.mm-toast b{display:block;font-size:30px;line-height:1.15;font-weight:800}
.mm-toast span{font-size:15px;color:var(--on-night-2,#CDB9DD)}
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
          const area = cw * ch;
          if (!best || area > best.area) best = { cols, rows, cw, ch, area };
        }
        const { cols, rows, cw, ch } = best;
        const gw = cols * cw + (cols - 1) * gap, gh = rows * ch + (rows - 1) * gap;
        const ox = (W - gw) / 2, oy = (H - gh) / 2;
        const fs = Math.max(11, Math.min(17, Math.min(cw / 8.2, ch / 6.2)));
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
            ? h('div', { class: 'mm-side mm-face p' }, h('small', null, tx(UI.procedure, lang)), h('span', null, tx(PROCS[d.proc], lang)))
            : h('div', { class: 'mm-side mm-face f' }, h('span', null, tx(d.pair.text, lang)));
          const el = h('button', { class: 'mm-card', type: 'button', 'aria-label': tx(UI.procedure, lang) },
            h('div', { class: 'mm-in' }, h('div', { class: 'mm-side mm-back' }), face));
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
