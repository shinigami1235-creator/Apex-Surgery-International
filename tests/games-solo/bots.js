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

  // cfg: {seed, sigma (face units), see (min error the bot notices), skip (chance to ignore a wrong feature), think (ms per feature), react (ms)}
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
      const k = `${p.level}|${p.lives}|${p.T}`;
      if (k !== key) {
        key = k; doneTapped = false;
        const wrong = p.features.filter((f) => Math.abs(f.value - f.ideal) > cfg.see).sort((a, b) => Math.abs(b.value - b.ideal) - Math.abs(a.value - a.ideal));
        plan = wrong.filter((f, i) => i === 0 || r() >= cfg.skip).map((f) => f.key);
        waitUntil = t + cfg.react; step = null;
      }
      if (t < waitUntil) { requestAnimationFrame(tick); return; }
      if (!step && plan.length) {
        const fk = plan.shift();
        const f = p.features.find((q) => q.key === fk);
        const goal = f.ideal + gauss() * cfg.sigma;
        const dv = goal - f.value;
        const tx = f.x + f.ax * dv, ty = f.y + f.ay * dv;
        const al = Math.hypot(f.ax, f.ay), sgn = Math.sign(dv) || 1;
        const ox = f.x + (f.ax / al) * 14 * sgn, oy = f.y + (f.ay / al) * 14 * sgn;
        step = { pts: [[f.x, f.y], [ox, oy], [tx, ty]], i: 0, t0: t, dur: 260 + r() * 200 };
        fire(cv(), 'pointerdown', f.x, f.y);
      }
      if (step) {
        const e = clamp((t - step.t0) / step.dur, 0, 1);
        const [a, b, c] = step.pts;
        let x, y;
        if (e < 0.25) { const k2 = e / 0.25; x = a[0] + (b[0] - a[0]) * k2; y = a[1] + (b[1] - a[1]) * k2; }
        else { const k2 = (e - 0.25) / 0.75; x = b[0] + (c[0] - b[0]) * k2; y = b[1] + (c[1] - b[1]) * k2; }
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

  window.__bots = { steady, proportion };
})();
