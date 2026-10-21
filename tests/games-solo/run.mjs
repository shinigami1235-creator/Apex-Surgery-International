// Plays Steady Hand and Proportion with bots under a fake clock.
// Usage: node run.mjs [mode]   mode = stats | shots | determinism | all (default all)
// Needs the site served at BASE (default http://127.0.0.1:8765).
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');

const here = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || 'http://127.0.0.1:8765';
const SHOTS = process.env.SHOTS || path.join(here, 'shots');
const botSrc = fs.readFileSync(path.join(here, 'bots.js'), 'utf8');
const mode = process.argv[2] || 'all';

const BOTS = {
  steady: {
    good: { sigma: 2.6, vmin: 0.45, vmax: 1.35, react: 350, lift: 0 },
    sloppy: { sigma: 9, vmin: 0.35, vmax: 0.75, react: 600, lift: 0.08 },
  },
  proportion: {
    good: { sigma: 0.004, see: 0.003, skip: 0, think: 650, react: 900 },
    sloppy: { sigma: 0.02, see: 0.03, skip: 0.3, think: 900, react: 1300 },
  },
};

async function play(browser, { game, seed, bot, botSeed = 99, viewport = { width: 1440, height: 900 }, shots = null, lang = 'en', maxSec = 420 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: shots ? 2 : 1, hasTouch: false });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  // fake clock, paused: time only moves through runFor, so a run replays exactly
  await page.clock.install({ time: 0 });
  await page.goto(`${BASE}/lab/games-solo.html?game=${game}&seed=${seed}&lang=${lang}&probe=1&autostart=0`, { waitUntil: 'load' });
  await page.clock.pauseAt(20000);
  if (!(await page.evaluate(() => typeof window.__start === 'function'))) throw new Error('lab page not ready');
  await page.addScriptTag({ content: botSrc });
  await page.evaluate(({ game, cfg }) => { window.__start(); window.__bots[game](window.__host, cfg); }, { game, cfg: { ...BOTS[game][bot], seed: botSeed } });
  const levels = [];
  const taken = new Set();
  let simMs = 0;
  while (simMs < maxSec * 1000) {
    const step = shots ? 100 : 500;
    await page.clock.runFor(step);
    simMs += step;
    const st = await page.evaluate(() => {
      const p = window.__host.__probe && window.__host.__probe();
      return { res: window.__result, p: p ? { phase: p.phase, level: p.level, started: p.started, u: p.u, left: p.left, T: p.T } : null };
    });
    if (st.p && !levels.includes(st.p.level)) levels.push(st.p.level);
    if (shots && st.p && st.p.phase === 'play' && shots.levels.includes(st.p.level) && !taken.has(st.p.level)) {
      const ready = game === 'steady' ? st.p.started && st.p.u > 0.38 : st.p.T - st.p.left > (st.p.level === 1 ? 1.4 : 2.2);
      if (ready) {
        taken.add(st.p.level);
        const f = path.join(SHOTS, `${game}-${shots.tag}-L${st.p.level}.png`);
        await page.screenshot({ path: f });
        if (taken.size === shots.levels.length) { await ctx.close(); return { result: null, levels, errors, shotsOnly: true, simSec: simMs / 1000 }; }
      }
    }
    if (st.res) {
      await ctx.close();
      return { result: st.res, levels, errors, simSec: simMs / 1000 };
    }
  }
  const p = await page.evaluate(() => window.__host.__probe && window.__host.__probe());
  await ctx.close();
  return { result: null, levels, errors, timeout: true, probe: p };
}

const summary = (r) => r.shotsOnly ? `screenshots taken at ${r.simSec}s${r.errors.length ? ' ERR ' + r.errors.join(' | ') : ''}` : r.result ? `score=${r.result.score} level=${r.result.level} dur=${(r.result.durationMs / 1000).toFixed(1)}s inputs=${r.result.inputs} log=${r.result.log.length}${r.errors.length ? ' ERR ' + r.errors.join(' | ') : ''}` : `TIMEOUT ${JSON.stringify(r.probe)} ${r.errors.join(' | ')}`;

function checkResult(r) {
  const x = r.result;
  const bad = [];
  if (!x) return ['no result'];
  for (const k of ['score', 'level', 'durationMs', 'inputs']) if (!Number.isFinite(x[k])) bad.push(`${k} not a number`);
  if (!Array.isArray(x.log) || !x.log.every((e) => Array.isArray(e) && e.length === 2 && Number.isFinite(e[0]) && typeof e[1] === 'string')) bad.push('log shape');
  if (x.level !== Math.max(...r.levels.filter((l) => l <= x.level + 1))) { /* level tracked in-game includes the next level after a pass */ }
  if (x.level < 1) bad.push('level < 1');
  x.log.forEach((e, i) => { if (i && e[0] < x.log[i - 1][0]) bad.push('log not ordered ' + JSON.stringify(x.log.slice(Math.max(0, i - 3), i + 2))); });
  const fails = x.log.filter((e) => /^x/.test(e[1])).length;
  if (fails !== 3) bad.push(`fails=${fails}`);
  return bad;
}

const browser = await chromium.launch();
fs.mkdirSync(SHOTS, { recursive: true });
const out = {};

if (mode === 'stats' || mode === 'all') {
  for (const game of (process.env.GAMES || 'steady,proportion').split(',')) {
    for (const bot of ['good', 'sloppy']) {
      const rows = [];
      for (let seed = 1; seed <= (+process.env.SEEDS || 6); seed++) {
        const r = await play(browser, { game, seed, bot, botSeed: 1000 + seed, viewport: seed % 2 ? { width: 1440, height: 900 } : { width: 375, height: 812 } });
        const bad = checkResult(r);
        console.log(`${game} ${bot} seed=${seed} ${summary(r)}${bad.length ? ' BAD ' + bad.join(',') : ''}`);
        if (r.result) rows.push(r.result);
      }
      const sc = rows.map((x) => x.score).sort((a, b) => a - b);
      const lv = rows.map((x) => x.level).sort((a, b) => a - b);
      const du = rows.map((x) => Math.round(x.durationMs / 1000)).sort((a, b) => a - b);
      out[`${game}-${bot}`] = { scores: sc, levels: lv, seconds: du, median: sc[Math.floor(sc.length / 2)] };
      console.log(`== ${game} ${bot}: scores ${sc.join(' ')} | levels ${lv.join(' ')} | seconds ${du.join(' ')}`);
    }
  }
}

if (mode === 'determinism' || mode === 'all') {
  for (const game of (process.env.GAMES || 'steady,proportion').split(',')) {
    const a = await play(browser, { game, seed: 42, bot: 'good', botSeed: 7 });
    const b = await play(browser, { game, seed: 42, bot: 'good', botSeed: 7 });
    const c = await play(browser, { game, seed: 43, bot: 'good', botSeed: 7 });
    const same = JSON.stringify(a.result) === JSON.stringify(b.result);
    const diff = JSON.stringify(a.result.log) !== JSON.stringify(c.result.log);
    console.log(`determinism ${game}: same seed identical=${same}, other seed differs=${diff} (${summary(a)})`);
    if (!same) {
      const la = a.result.log, lb = b.result.log;
      const i = la.findIndex((e, k) => JSON.stringify(e) !== JSON.stringify(lb[k]));
      console.log('  first divergence', i, JSON.stringify(la.slice(Math.max(0, i - 2), i + 2)), JSON.stringify(lb.slice(Math.max(0, i - 2), i + 2)), summary(b));
    }
    // content check: the first line or face depends only on the game seed, not on the bot
    const d = await play(browser, { game, seed: 42, bot: 'sloppy', botSeed: 3 });
    const first = (r) => r.result.log.find((e) => /^n/.test(e[1]));
    console.log(`  first entry with sloppy bot: ${JSON.stringify(first(d))} vs ${JSON.stringify(first(a))}`);
  }
}

if (mode === 'shots' || mode === 'all') {
  for (const game of ['steady', 'proportion']) {
    for (const [tag, viewport] of [['375', { width: 375, height: 812 }], ['1440', { width: 1440, height: 900 }]]) {
      const r = await play(browser, { game, seed: 5, bot: 'good', botSeed: 11, viewport, shots: { levels: [1, 3, 6], tag } });
      console.log(`shots ${game} ${tag}: ${summary(r)}`);
    }
  }
}

if (Object.keys(out).length) fs.writeFileSync(path.join(here, 'stats.json'), JSON.stringify(out, null, 1));
await browser.close();
