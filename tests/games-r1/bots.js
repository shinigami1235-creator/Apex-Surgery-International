// Browser-side bots for the skill games. Injected by run.mjs; they read host.__probe (opts.probe = true).
(function () {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  function fire(el, type, x, y) {
    el.dispatchEvent(new PointerEvent(type, {
      clientX: x, clientY: y, pointerId: 7, pointerType: 'touch', isPrimary: true,
      bubbles: true, cancelable: true, buttons: type === 'pointerup' ? 0 : 1,
    }));
  }

  // cfg: {seed, sigma (px lateral std), vmax (stage units per s), vmin, lift (chance per second of a long lift), react (ms)}
  function steady(host, cfg) {
    const r = mulberry32(cfg.seed);
    const gauss = () => { let u = 0, v = 0; while (!u) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283 * v); };
    let down = false, u = 0, off = 0, last = performance.now(), playSince = -1, liftUntil = 0, key = '';
    const cv = () => host.querySelector('canvas');
    function tick() {
      if (window.__result) return;
      const t = performance.now(), dt = Math.min(0.05, (t - last) / 1000); last = t;
      const p = host.__probe && host.__probe();
      if (!p || p.phase !== 'play') {
        if (down) { fire(cv(), 'pointerup', 0, 0); down = false; }
        playSince = -1; u = 0;
        requestAnimationFrame(tick); return;
      }
      const k = `${p.level}|${p.lives}`;
      if (k !== key) { key = k; playSince = t; u = 0; off = 0; }
      if (t < liftUntil) { requestAnimationFrame(tick); return; }
      if (!p.started) {
        if (t - playSince > cfg.react) {
          const s = p.at(0);
          fire(cv(), 'pointerdown', s.x + gauss() * cfg.sigma * 0.5, s.y + gauss() * cfg.sigma * 0.5);
          down = true; u = 0;
        }
        requestAnimationFrame(tick); return;
      }
      if (!down) {
        const q = p.at(p.u);
        fire(cv(), 'pointerdown', q.x, q.y); down = true;
      }
      const remain = Math.max(0.25, p.T - p.time - 0.35);
      const need = (p.Lpx * (1 - p.u)) / remain;
      const v = clamp(need * 1.15, cfg.vmin * p.unit, cfg.vmax * p.unit);
      u = Math.min(Math.max(u, p.u) + (v * dt) / p.Lpx, p.u + Math.max(p.hb * 2, 24) / p.Lpx, 1);
      // smooth lateral wobble (Ornstein-Uhlenbeck), larger when moving fast
      const speedK = 1 + (v / p.unit) * 0.6;
      off += -off * 5 * dt + cfg.sigma * speedK * 3.2 * Math.sqrt(dt) * gauss();
      const q = p.at(u);
      const jx = gauss() * 0.6, jy = gauss() * 0.6;
      fire(cv(), 'pointermove', q.x - q.ty * off + jx, q.y + q.tx * off + jy);
      if (cfg.lift && r() < cfg.lift * dt) {
        fire(cv(), 'pointerup', q.x, q.y); down = false;
        liftUntil = t + 150 + r() * 700;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // cfg: {seed, sigma (face units of placement noise), see (min error the bot notices), skip (chance to skip a wrong feature), think (ms per feature), react (ms)}
  function proportion(host, cfg) {
    const r = mulberry32(cfg.seed);
    const gauss = () => { let u = 0, v = 0; while (!u) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283 * v); };
    let key = '', plan = [], step = null, waitUntil = 0, doneTapped = false;
    const cv = () => host.querySelector('canvas');
    function tick() {
      if (window.__result) return;
      const t = performance.now();
      const p = host.__probe && host.__probe();
      if (!p || p.phase !== 'play') { key = ''; step = null; requestAnimationFrame(tick); return; }
      const k = `${p.level}|${p.lives}|${p.T}|${p.score}`;
      if (k !== key) {
        key = k; doneTapped = false;
        const wrong = p.features.filter((f) => f.err > cfg.see).sort((a, b) => b.err - a.err);
        plan = wrong.filter((f, i) => i === 0 || r() >= cfg.skip).map((f) => f.key);
        waitUntil = t + cfg.react; step = null;
      }
      if (t < waitUntil) { requestAnimationFrame(tick); return; }
      if (!step && plan.length) {
        const want = plan.shift();
        const f = p.features.find((q) => q.key === want);
        const tx = f.ix + gauss() * cfg.sigma * p.pxPerFU, ty = f.iy + gauss() * cfg.sigma * p.pxPerFU;
        step = { a: [f.x, f.y], b: [tx, ty], t0: t, dur: 260 + r() * 200 };
        fire(cv(), 'pointerdown', f.x, f.y);
      }
      if (step) {
        const e = clamp((t - step.t0) / step.dur, 0, 1);
        const x = step.a[0] + (step.b[0] - step.a[0]) * e, y = step.a[1] + (step.b[1] - step.a[1]) * e;
        fire(cv(), 'pointermove', x, y);
        if (e >= 1) { fire(cv(), 'pointerup', x, y); step = null; waitUntil = t + cfg.think * (0.7 + r() * 0.6); }
      } else if (!plan.length && !doneTapped) {
        doneTapped = true;
        host.querySelector('button').click();
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // Quiz games: the bot looks answers up in content.js and errs with probability 1 - acc.
  let content = null;
  const loadContent = () => content || (content = import('/assets/features/games/content.js'));
  const norm = (t) => (t || '').replace(/\s+/g, ' ').trim();
  function factrush(host, cfg) {
    const r = mulberry32(cfg.seed);
    loadContent().then(({ FACTS }) => {
      let next = 0;
      function tick() {
        if (window.__result) return;
        const t = performance.now();
        const cards = [...host.querySelectorAll('.fr-card:not([data-done])')];
        if (cards.length && t > next) {
          const c = cards.sort((a, b) => new DOMMatrix(getComputedStyle(b).transform).f - new DOMMatrix(getComputedStyle(a).transform).f)[0];
          const txt = norm(c.querySelector('.fr-text').textContent);
          const f = FACTS.find((x) => norm(x.text.en) === txt || norm(x.text.th) === txt);
          let ans = f ? f.answer : 'fact';
          if (r() > cfg.acc) ans = ans === 'fact' ? 'myth' : 'fact';
          host.querySelector(ans === 'fact' ? '.fr-btn.f' : '.fr-btn.m').click();
          next = t + cfg.react * (0.6 + r() * 0.8);
        }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }
  function recoverysort(host, cfg) {
    const r = mulberry32(cfg.seed);
    loadContent().then(({ RECOVERY }) => {
      let next = 0;
      function tick() {
        if (window.__result) return;
        const t = performance.now();
        const cards = [...host.querySelectorAll('.rs-card:not([data-done])')];
        if (cards.length && t > next) {
          const c = cards.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)[0];
          const txt = norm(c.querySelector('.t').textContent), p = norm(c.querySelector('.p').textContent);
          const it = RECOVERY.find((x) => norm(x.text.en) === txt || norm(x.text.th) === txt);
          const bins = [...host.querySelectorAll('.rs-bin')];
          let bin = it && bins.find((b) => b.dataset.b === it.b);
          if (!bin || r() > cfg.acc) bin = bins[Math.floor(r() * bins.length)];
          const cr = c.getBoundingClientRect();
          fire(c, 'pointerdown', cr.left + 10, cr.top + 10); fire(c, 'pointerup', cr.left + 10, cr.top + 10);
          bin.click();
          next = t + cfg.react * (0.6 + r() * 0.8);
        }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }
  function memorymatch(host, cfg) {
    const r = mulberry32(cfg.seed);
    let next = 0;
    function procOf(card) {
      return card.dataset.proc;
    }
    function tick() {
      if (window.__result) return;
      const t = performance.now();
      if (t > next) {
        const live = [...host.querySelectorAll('.mm-card:not(.done):not(.up)')];
        if (live.length >= 2) {
          const a = live[Math.floor(r() * live.length)];
          let b = live.find((x) => x !== a && procOf(x) === procOf(a) && x.dataset.kind !== a.dataset.kind);
          if (!b || r() > cfg.mem) b = live.find((x) => x !== a);
          a.click();
          setTimeout(() => b.click(), cfg.think * 0.5);
          next = t + cfg.think * (1.6 + r());
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  window.__bots = { steady, proportion, factrush, recoverysort, memorymatch };

})();
