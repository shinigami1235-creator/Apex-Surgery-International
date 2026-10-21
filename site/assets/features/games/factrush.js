/* Fact Rush: statement cards fall; swipe right or press the right arrow for Fact, left for Myth. */
import { css, h, loop, recorder, sfx, shake, floatText, reduced, shuffle, drag, tx, EASE, GRAIN, LATTICE } from './framework.js';
import { procIcon } from './art.js';
import { FACTS, PROCS } from './content.js';

const UI = {
  fact: { en: 'Fact', th: 'จริง' },
  myth: { en: 'Myth', th: 'เข้าใจผิด' },
  level: { en: 'Level', th: 'ระดับ' },
  two: { en: 'Two cards at once', th: 'การ์ดมาพร้อมกัน 2 ใบ' },
  missed: { en: 'Missed', th: 'ตอบไม่ทัน' }
};

const LIVES = 3;
const PER_LEVEL = 5;                         // correct answers to clear a level
const fallMs = L => Math.max(1500, 7200 * Math.pow(0.86, L - 1));   // time for a card to reach the floor
const secondAt = L => Math.max(0.3, 0.55 - 0.04 * (L - 3));          // progress of the live card before a second one drops
const points = (L, streak) => 10 * L + (streak >= 3 ? 5 * Math.min(streak - 2, 6) : 0);

const CSS = `
.fr{position:absolute;inset:0;overflow:hidden;color:#fff;touch-action:none;user-select:none;-webkit-user-select:none;--ctrl:88px;--pull:0;
  background:radial-gradient(90% 60% at 50% 0%,#4A1E66 0%,transparent 70%),radial-gradient(60% 50% at 50% 100%,rgba(106,56,140,.45),transparent 70%),var(--night,#1F0A30)}
.fr::before{content:"";position:absolute;inset:0;background:${LATTICE('#C9B3DD', 0.07)} center/36px 36px;pointer-events:none}
.fr::after{content:"";position:absolute;inset:0;background:${GRAIN};mix-blend-mode:overlay;opacity:.3;pointer-events:none}
.fr-zone{position:absolute;top:0;bottom:var(--ctrl);width:46%;pointer-events:none;transition:opacity .25s}
.fr-zone.m{left:0;background:radial-gradient(70% 55% at 0% 50%,rgba(204,51,102,.55),transparent 70%);opacity:calc(.25 + max(0, var(--pull) * -1) * .75)}
.fr-zone.f{right:0;background:radial-gradient(70% 55% at 100% 50%,rgba(168,134,205,.6),transparent 70%);opacity:calc(.25 + max(0, var(--pull)) * .75)}
.fr-side{position:absolute;top:50%;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:800;letter-spacing:.06em;color:rgba(246,238,251,.55);pointer-events:none;transform:translateY(-50%)}
.fr-side svg{width:16px;height:16px}
.fr-side.m{left:10px}.fr-side.f{right:10px}
.fr-orb{position:absolute;border-radius:50%;filter:blur(30px);opacity:.35;pointer-events:none}
@media (prefers-reduced-motion:no-preference){.fr-orb{animation:frOrb 14s ease-in-out infinite alternate}}
@keyframes frOrb{to{transform:translate3d(30px,-40px,0) scale(1.15)}}
.fr-field{position:absolute;left:0;right:0;top:0;bottom:var(--ctrl)}
.fr-lane{position:absolute;top:0;bottom:0;width:0;border-left:1px dashed rgba(201,179,221,.18)}
.fr-floor{position:absolute;left:16px;right:16px;bottom:2px;height:2px;border-radius:2px;background:linear-gradient(90deg,rgba(204,51,102,0),#CC3366 20%,#E8668F 50%,#CC3366 80%,rgba(204,51,102,0));box-shadow:0 0 18px 2px rgba(204,51,102,.55)}
.fr-card{position:absolute;left:0;top:0;will-change:transform}
.fr-inner{position:relative;color:var(--ink,#2A1F33);border-radius:22px;padding:14px 16px 18px;touch-action:none;cursor:grab;
  background:linear-gradient(180deg,#fff 0%,#FBF7FD 100%);
  box-shadow:0 1px 0 rgba(255,255,255,.9) inset,0 2px 4px rgba(12,2,22,.2),0 24px 44px -20px rgba(0,0,0,.75);transform-origin:50% 120%;transition:box-shadow .2s}
.fr-card::before,.fr-card::after{content:"";position:absolute;left:10px;right:10px;border-radius:22px;z-index:-1;pointer-events:none;transition:opacity .2s}
.fr-card::before{bottom:-7px;top:7px;background:#E9DDF3;box-shadow:0 10px 20px -12px rgba(0,0,0,.6)}
.fr-card::after{bottom:-13px;top:13px;left:20px;right:20px;background:#C9B3DD;opacity:.7}
.fr-card[data-done]::before,.fr-card[data-done]::after{opacity:0}
.fr-face{position:relative;border-radius:inherit}
.fr-face::after{content:"";position:absolute;right:-6px;bottom:-10px;width:56px;height:56px;background:${LATTICE('#6A388C', 0.16)} center/14px 14px;-webkit-mask:radial-gradient(circle,#000 30%,transparent 72%);mask:radial-gradient(circle,#000 30%,transparent 72%);pointer-events:none}
.fr-card.active .fr-inner{box-shadow:0 0 0 3px var(--lilac,#A886CD),0 24px 44px -20px rgba(0,0,0,.75)}
.fr-inner.ok{box-shadow:0 0 0 4px var(--lilac-300,#C9B3DD),0 0 34px 8px rgba(168,134,205,.65)}
.fr-inner.no{box-shadow:0 0 0 4px #CC3366,0 0 34px 8px rgba(204,51,102,.5)}
.fr-hd{display:flex;align-items:center;gap:10px;padding-bottom:10px;margin-bottom:10px;border-bottom:1px solid #EFE6F5}
.fr-ic{flex:none;width:34px;height:34px;border-radius:12px;display:grid;place-items:center;color:var(--plum,#6A388C);background:linear-gradient(145deg,#F6EFFB,#E6D8F1);box-shadow:inset 0 1px 0 #fff}
.fr-ic svg{width:20px;height:20px}
.fr-tag{font-size:13px;line-height:1.2;font-weight:800;color:var(--plum-700,#55286F);letter-spacing:.01em}
.fr-text{font-size:17px;line-height:1.45;font-weight:600;color:var(--ink,#2A1F33)}
.fr.two .fr-text{font-size:15px}
.fr.two .fr-inner{padding:12px 12px 14px}
.fr.two .fr-ic{width:28px;height:28px;border-radius:10px}.fr.two .fr-ic svg{width:17px;height:17px}
.fr-stamp{position:absolute;top:12px;display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 12px;border-radius:999px;font-weight:800;font-size:13px;line-height:1;opacity:0;pointer-events:none;color:#fff;box-shadow:0 6px 14px -6px rgba(0,0,0,.5)}
.fr-stamp.f{right:12px;background:var(--plum,#6A388C);transform:rotate(6deg)}
.fr-stamp.m{left:12px;background:#CC3366;transform:rotate(-6deg)}
.fr-ghost{position:absolute;inset:0;border-radius:22px;pointer-events:none;background:linear-gradient(90deg,rgba(201,179,221,0),rgba(201,179,221,.55));filter:blur(6px)}
.fr-ghost.m{background:linear-gradient(270deg,rgba(204,51,102,0),rgba(204,51,102,.5))}
.fr-ctrl{position:absolute;left:0;right:0;bottom:0;height:var(--ctrl);display:flex;gap:12px;padding:14px 16px;box-sizing:border-box;z-index:5}
.fr-btn{flex:1;min-height:56px;border-radius:999px;font:inherit;font-weight:800;font-size:18px;line-height:1;display:flex;align-items:center;justify-content:center;gap:10px;cursor:pointer;transition:transform .12s ${EASE},filter .15s}
.fr-btn:active{transform:scale(.95)}
.fr-btn svg{width:22px;height:22px;flex:none}
.fr-btn.m{background:linear-gradient(180deg,rgba(204,51,102,.28),rgba(204,51,102,.12));color:#FFE1EA;border:1.5px solid rgba(232,102,143,.8);box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 10px 24px -14px rgba(204,51,102,.9)}
.fr-btn.f{background:linear-gradient(180deg,#7A44A0,var(--plum,#6A388C) 55%,var(--plum-700,#55286F));color:#fff;border:1.5px solid rgba(201,179,221,.7);box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 10px 24px -14px rgba(106,56,140,.95)}
.fr-btn:focus-visible{outline:3px solid #fff;outline-offset:2px}
.fr-note{position:absolute;left:16px;right:16px;top:12px;display:grid;grid-template-columns:auto 1fr;column-gap:10px;align-items:start;background:rgba(31,10,48,.95);border:1px solid rgba(204,51,102,.6);border-radius:18px;padding:12px 14px;font-size:14px;line-height:1.5;color:var(--on-night,#F6EEFB);opacity:0;transform:translateY(-8px);transition:opacity .2s,transform .25s ${EASE};pointer-events:none;z-index:20;max-width:560px;margin:0 auto;box-shadow:0 20px 40px -20px rgba(0,0,0,.8)}
.fr-note.show{opacity:1;transform:none}
.fr-note .chips{display:flex;flex-direction:column;gap:6px}
.fr-note b{display:inline-flex;align-items:center;justify-content:center;height:22px;padding:0 10px;border-radius:999px;background:#CC3366;color:#fff;font-size:12px;line-height:1;white-space:nowrap}
.fr-note b.fact{background:var(--plum,#6A388C)}
.fr-toast{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;z-index:25;opacity:0;white-space:nowrap;padding:16px 28px;border-radius:22px;background:rgba(31,10,48,.86);border:1px solid rgba(201,179,221,.3);box-shadow:0 24px 50px -20px rgba(0,0,0,.8)}
.fr-toast b{display:block;font-size:34px;line-height:1.1;font-weight:800}
.fr-toast span{display:block;margin-top:4px;font-size:15px;color:var(--on-night-2,#CDB9DD)}
@media (min-width:700px){.fr-text{font-size:21px}.fr.two .fr-text{font-size:18px}.fr-tag{font-size:14px}}
@media (max-width:420px){.fr-side{display:none}}
`;

const ARROW_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
const ARROW_R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';

const TITLE = { en: 'Fact Rush', th: 'จริงหรือเข้าใจผิด' };

export default {
  id: 'factrush',
  title: TITLE,
  how: { en: 'Swipe right for fact, left for myth.', th: 'ปัดขวาถ้าจริง ปัดซ้ายถ้าเข้าใจผิด' },

  run(host, { lang = 'en', level: startLevel = 1, rng = Math.random, signal, onHud = () => {} } = {}) {
    css('apxg-fr', CSS);
    return new Promise(resolve => {
      const rec = recorder();
      let level = startLevel, maxLevel = startLevel, lives = LIVES, score = 0, streak = 0, okInLevel = 0;
      let freeze = 0, gap = 400, lastLane = 1, ended = false, noteTimer = 0;
      const cards = [];
      let deck = [];
      const lanesFor = L => (L >= 3 ? 2 : 1);

      /* ---------- DOM ---------- */
      host.innerHTML = '';
      const root = h('div', { class: 'fr', role: 'application', 'aria-label': tx(TITLE, lang) });
      const field = h('div', { class: 'fr-field' });
      const laneLine = h('div', { class: 'fr-lane' });
      const zones = [h('div', { class: 'fr-zone m' }), h('div', { class: 'fr-zone f' }),
        h('div', { class: 'fr-orb', style: { right: '-60px', top: '14%', width: '240px', height: '240px', background: '#8B5CB0' } }),
        h('div', { class: 'fr-orb', style: { left: '-90px', top: '58%', width: '240px', height: '240px', background: '#CC3366', animationDelay: '-6s' } }),
        h('div', { class: 'fr-side m', html: ARROW_L + `<span>${tx(UI.myth, lang)}</span>` }),
        h('div', { class: 'fr-side f', html: `<span>${tx(UI.fact, lang)}</span>` + ARROW_R })];
      const floor = h('div', { class: 'fr-floor' });
      const note = h('div', { class: 'fr-note', 'aria-live': 'polite' });
      const toast = h('div', { class: 'fr-toast' });
      const bMyth = h('button', { class: 'fr-btn m', type: 'button', html: ARROW_L + `<span>${tx(UI.myth, lang)}</span>` });
      const bFact = h('button', { class: 'fr-btn f', type: 'button', html: `<span>${tx(UI.fact, lang)}</span>` + ARROW_R });
      field.append(laneLine, floor);
      root.append(...zones, field, note, toast, h('div', { class: 'fr-ctrl' }, bMyth, bFact));
      host.appendChild(root);

      let W = 0, FH = 0;
      const geom = () => {
        W = field.clientWidth; FH = field.clientHeight;
        const two = lanesFor(level) === 2;
        root.classList.toggle('two', two);
        laneLine.style.display = two ? '' : 'none';
        laneLine.style.left = (W / 2) + 'px';
        cards.forEach(c => { if (!c.done) sizeCard(c); });
      };
      const cardW = lane => lane < 0 ? Math.min(W - 32, W >= 700 ? 560 : 460) : Math.min((W - 48) / 2, W >= 700 ? 420 : 340);
      const cardX = (lane, w) => lane < 0 ? (W - w) / 2 : (lane === 0 ? W / 2 - 8 - w : W / 2 + 8);
      const sizeCard = c => { c.w = cardW(c.lane); c.el.style.width = c.w + 'px'; c.h = c.el.offsetHeight; };
      const ro = new ResizeObserver(geom);
      ro.observe(field);

      /* ---------- helpers ---------- */
      const hud = () => onHud({ score, level, lives });
      const draw = () => {
        if (!deck.length) {
          const recent = new Set(cards.slice(-4).map(c => c.f.id));
          deck = shuffle(FACTS.filter(f => !recent.has(f.id)), rng);
        }
        return deck.pop();
      };
      const showNote = (f, missed) => {
        note.innerHTML = '';
        const chips = h('span', { class: 'chips' });
        if (missed) chips.append(h('b', null, tx(UI.missed, lang)));
        chips.append(h('b', { class: f.answer }, tx(f.answer === 'fact' ? UI.fact : UI.myth, lang)));
        note.append(chips, h('span', null, tx(f.why, lang)));
        note.classList.add('show');
        clearTimeout(noteTimer);
        noteTimer = setTimeout(() => note.classList.remove('show'), 2600);
      };
      const showToast = (big, small) => {
        toast.innerHTML = '';
        toast.append(h('b', null, big));
        if (small) toast.append(h('span', null, small));
        if (reduced() || !toast.animate) { toast.style.opacity = 1; setTimeout(() => (toast.style.opacity = 0), 1100); return; }
        toast.animate([
          { opacity: 0, transform: 'translate(-50%,-50%) scale(.7)' },
          { opacity: 1, transform: 'translate(-50%,-50%) scale(1.06)', offset: .2 },
          { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', offset: .75 },
          { opacity: 0, transform: 'translate(-50%,-60%) scale(1)' }
        ], { duration: 1300, easing: 'ease-out' });
      };

      /* ---------- cards ---------- */
      const spawn = lane => {
        const f = draw();
        const inner = h('div', { class: 'fr-inner' },
          h('div', { class: 'fr-face' },
            h('div', { class: 'fr-hd' }, h('span', { class: 'fr-ic', html: procIcon(f.proc) }), h('span', { class: 'fr-tag' }, tx(PROCS[f.proc], lang))),
            h('div', { class: 'fr-text' }, tx(f.text, lang))),
          h('span', { class: 'fr-stamp f' }, tx(UI.fact, lang)),
          h('span', { class: 'fr-stamp m' }, tx(UI.myth, lang)));
        const el = h('div', { class: 'fr-card' }, inner);
        field.appendChild(el);
        const c = { f, el, inner, lane, p: 0, dx: 0, done: false, w: 0, h: 0, dur: fallMs(level), stampF: inner.children[1], stampM: inner.children[2] };
        sizeCard(c);
        c.off = drag(inner, {
          start: () => !c.done && !ended,
          move: dx => { c.dx = dx; paint(c); },
          end: (dx, dy, vx) => {
            const T = Math.min(90, c.w * 0.28);
            if (dx > T || (vx > 0.55 && dx > 20)) answer(c, 'fact', 's');
            else if (dx < -T || (vx < -0.55 && dx < -20)) answer(c, 'myth', 's');
            else { c.dx = 0; c.springing = true; }
          }
        });
        cards.push(c);
        rec.note('n:' + f.id);
        paint(c);
      };
      const paint = c => {
        const y = -c.h * 0.55 + (FH - 6 - c.h + c.h * 0.55) * c.p;
        c.el.style.transform = `translate3d(${cardX(c.lane, c.w)}px,${y}px,0)`;
        c.inner.style.transform = c.dx ? `translate3d(${c.dx}px,0,0) rotate(${c.dx * 0.05}deg)` : '';
        const k = Math.max(-1, Math.min(1, c.dx / Math.min(90, c.w * 0.28)));
        c.stampF.style.opacity = k > 0 ? k : 0;
        c.stampM.style.opacity = k < 0 ? -k : 0;
        if (c.dx || c.pulled) { root.style.setProperty('--pull', k.toFixed(3)); c.pulled = !!c.dx; }
      };
      const remove = (c, dir) => {
        c.done = true;
        c.el.dataset.done = '1';
        c.off && c.off();
        c.el.classList.remove('active');
        const kill = () => { c.el.remove(); const i = cards.indexOf(c); if (i >= 0) cards.splice(i, 1); };
        if (reduced() || !c.inner.animate) { c.inner.style.opacity = 0; setTimeout(kill, 140); return; }
        const from = c.inner.style.transform || 'none';
        if (dir) {
          root.style.setProperty('--pull', '0');
          sfx.play('swipe');
          // motion trail: two soft ghosts follow the card out
          [0.5, 0.25].forEach((o, i) => {
            const g = h('div', { class: 'fr-ghost' + (dir < 0 ? ' m' : '') });
            c.el.insertBefore(g, c.inner);
            g.animate([{ transform: from, opacity: o }, { transform: `translate3d(${dir * (W * 0.8 + c.w)}px,-40px,0) rotate(${dir * 22}deg)`, opacity: 0 }],
              { duration: 300, delay: 35 * (i + 1), easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'both' });
          });
        }
        const to = dir === 0
          ? 'translate3d(0,40px,0) scale(.9)'
          : `translate3d(${dir * (W * 0.8 + c.w)}px,-40px,0) rotate(${dir * 22}deg)`;
        c.inner.animate([{ transform: from, opacity: 1 }, { transform: to, opacity: 0 }], { duration: dir ? 300 : 380, easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'forwards' }).onfinish = kill;
      };
      const active = () => {
        let best = null;
        for (const c of cards) if (!c.done && (!best || c.p > best.p)) best = c;
        return best;
      };

      const answer = (c, ans, via) => {
        if (!c || c.done || ended) return;
        rec.act((ans === 'fact' ? 'F' : 'M') + via + ':' + c.f.id);
        const ok = ans === c.f.answer;
        const cx = cardX(c.lane, c.w) + c.w / 2, cy = Math.max(40, -c.h * 0.55 + (FH - 6 - c.h + c.h * 0.55) * c.p + c.h / 2);
        c.inner.classList.add(ok ? 'ok' : 'no');
        remove(c, ans === 'fact' ? 1 : -1);
        gap = 260;
        if (ok) {
          streak++;
          const pts = points(level, streak);
          score += pts; okInLevel++;
          floatText(field, cx, cy, '+' + pts);
          sfx.play('good');
          if (okInLevel >= PER_LEVEL) levelUp();
        } else {
          lose(c.f, false);
          floatText(field, cx, cy, tx(c.f.answer === 'fact' ? UI.fact : UI.myth, lang), 'bad');
        }
        hud();
      };
      const lose = (f, missed) => {
        lives--; streak = 0; freeze = 900;
        sfx.play('bad');
        shake(root, 8);
        showNote(f, missed);
        rec.note('x' + lives);
        if (lives <= 0) finish();
      };
      const levelUp = () => {
        level++; okInLevel = 0;
        if (level > maxLevel) maxLevel = level;
        rec.note('lv' + level);
        sfx.play('level');
        const becameTwo = lanesFor(level) === 2 && lanesFor(level - 1) === 1;
        showToast(`${tx(UI.level, lang)} ${level}`, becameTwo ? tx(UI.two, lang) : '');
        geom();
      };

      /* ---------- input ---------- */
      const key = e => {
        if (ended) return;
        if (e.key === 'ArrowLeft') { e.preventDefault(); answer(active(), 'myth', 'k'); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); answer(active(), 'fact', 'k'); }
      };
      window.addEventListener('keydown', key);
      bMyth.addEventListener('click', () => answer(active(), 'myth', 'b'));
      bFact.addEventListener('click', () => answer(active(), 'fact', 'b'));

      /* ---------- loop ---------- */
      let stopLoop = null;
      const tick = dt => {
        if (ended) return false;
        rec.t += dt;
        if (freeze > 0) { freeze -= dt; return; }
        gap -= dt;
        const live = cards.filter(c => !c.done);
        const lanes = lanesFor(level);
        if (lanes === 1) {
          if (!live.length && gap <= 0) spawn(-1);
        } else if (!live.length && gap <= 0) {
          lastLane = rng() < 0.5 ? 0 : 1; spawn(lastLane);
        } else if (live.length === 1 && live[0].lane >= 0 && live[0].p >= secondAt(level) && gap <= 0) {
          lastLane = 1 - live[0].lane; spawn(lastLane);
        }
        const a = active();
        for (const c of cards) {
          if (c.done) continue;
          c.p += dt / c.dur;
          if (c.springing) { c.dx *= 0.7; if (Math.abs(c.dx) < 0.5) { c.dx = 0; c.springing = false; } }
          c.el.classList.toggle('active', c === a && live.length > 1);
          if (c.p >= 1) {
            c.p = 1; paint(c);
            rec.note('miss:' + c.f.id);
            c.inner.classList.add('no');
            remove(c, 0);
            gap = 260;
            lose(c.f, true);
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
        window.removeEventListener('keydown', key);
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

      geom();
      hud();
      stopLoop = loop(signal, tick);
    });
  }
};
