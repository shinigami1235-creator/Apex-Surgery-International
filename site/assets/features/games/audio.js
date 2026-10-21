/* Apex games audio: looping lounge music and sound effects on one WebAudio graph.
   Both are off by default and remembered per visitor (localStorage, wrapped in try/catch).

   Music: one loop per game plus a hub theme, composed with music21 and rendered with FluidSynth
   (FluidR3 GM soundfont). Each file holds one cycle plus one second of margin on both sides, so the
   player loops the window [1 s, 1 s + cycle] and MP3 encoder padding never reaches the seam.

   Sound effects: CC0 recordings from Kenney (kenney.nl, Interface Sounds and Impact Sounds) and
   Freesound users Jummit (528561), migoreng1 (786514), LegitCheese (571513), cabled_mess (349504)
   and MeanRaccoon (830856), trimmed and levelled. */

const BASE = new URL('./audio/', import.meta.url).href;
const KEY_MUSIC = 'apxg.music', KEY_SFX = 'apxg.sound';
const get = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } };

const TRACKS = {
  hub: { file: 'music-hub.mp3', cycle: 25.6 },
  steady: { file: 'music-steady.mp3', cycle: 30 },
  proportion: { file: 'music-proportion.mp3', cycle: 25.6 },
  factrush: { file: 'music-factrush.mp3', cycle: 20 },
  recoverysort: { file: 'music-recoverysort.mp3', cycle: 24 },
  memorymatch: { file: 'music-memorymatch.mp3', cycle: 24 }
};
/* name -> [file, gain] */
const SFX = {
  tap: ['sfx-tap.mp3', 0.45], flip: ['sfx-flip.mp3', 0.35], good: ['sfx-good.mp3', 0.55], bad: ['sfx-bad.mp3', 0.5],
  level: ['sfx-level.mp3', 0.55], tick: ['sfx-tick.mp3', 0.4], go: ['sfx-go.mp3', 0.5], end: ['sfx-end.mp3', 0.45],
  tier: ['sfx-tier.mp3', 0.6], prize: ['sfx-tier.mp3', 0.6], stitch: ['sfx-stitch.mp3', 0.3], swipe: ['sfx-swipe.mp3', 0.3],
  drop: ['sfx-drop.mp3', 0.45]
};
const MUSIC_LEVEL = 0.34, DUCK_LEVEL = 0.28;

let ctx = null, master = null, musicBus = null, duckBus = null, sfxBus = null;
function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    duckBus = ctx.createGain(); duckBus.gain.value = 1; duckBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = MUSIC_LEVEL; musicBus.connect(duckBus);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
  } catch (e) { ctx = null; }
  return ctx;
}
const resume = () => { try { if (ctx && ctx.state === 'suspended') return ctx.resume(); } catch (e) {} return Promise.resolve(); };

/* Browsers start audio only after a user gesture: the first tap or key anywhere unlocks it. */
let unlockBound = false;
function bindUnlock() {
  if (unlockBound) return;
  unlockBound = true;
  const go = () => {
    if (!music.on && !sfx.on) return;
    ensure(); resume().then(() => { if (music.on && music.want && !cur) start(music.want); });
  };
  ['pointerdown', 'keydown', 'touchend'].forEach(t => document.addEventListener(t, go, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    try { if (document.hidden) ctx.suspend(); else if (music.on || sfx.on) ctx.resume(); } catch (e) {}
  });
}

const buffers = new Map();
function load(file) {
  if (!buffers.has(file)) {
    const p = fetch(BASE + file)
      .then(r => { if (!r.ok) throw new Error(file); return r.arrayBuffer(); })
      .then(ab => new Promise((res, rej) => { const d = ctx.decodeAudioData(ab, res, rej); if (d && d.then) d.then(res, rej); }))
      .catch(e => { buffers.delete(file); throw e; });
    buffers.set(file, p);
  }
  return buffers.get(file);
}

/* ---------------- music ---------------- */
let cur = null, token = 0, pending = null;
function fadeOut(node, src, sec) {
  if (!node) return;
  const t = ctx.currentTime;
  try {
    node.gain.cancelScheduledValues(t);
    node.gain.setValueAtTime(node.gain.value, t);
    node.gain.linearRampToValueAtTime(0, t + sec);
    src.stop(t + sec + 0.05);
  } catch (e) {}
}
function start(name) {
  const tr = TRACKS[name] || TRACKS.hub;
  if (!ensure() || (cur && cur.name === name) || pending === name) return;
  const my = ++token;
  pending = name;
  load(tr.file).then(buf => {
    if (pending === name) pending = null;
    if (my !== token || !music.on) return;
    resume();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.loopStart = 1;
    src.loopEnd = Math.min(buf.duration - 0.05, 1 + tr.cycle);
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1, t + 1.6);
    src.connect(g); g.connect(musicBus);
    src.start(t, 0.6);
    if (cur) fadeOut(cur.gain, cur.src, 0.9);
    cur = { name, src, gain: g };
  }).catch(() => { if (pending === name) pending = null; });
}

export const music = {
  on: get(KEY_MUSIC, false) === true,
  want: 'hub',
  /* switch to a track; plays only while music is on */
  play(name) {
    this.want = TRACKS[name] ? name : 'hub';
    bindUnlock();
    if (!this.on) return;
    if (cur && cur.name === this.want) return;
    if (ctx && ctx.state === 'running') start(this.want);
    else if (ctx) resume().then(() => { if (this.on && (!cur || cur.name !== this.want)) start(this.want); });
    else { ensure(); resume(); start(this.want); }
  },
  set(on) {
    this.on = !!on;
    put(KEY_MUSIC, this.on);
    bindUnlock();
    if (this.on) { ensure(); resume(); cur = null; start(this.want); }
    else { token++; pending = null; if (cur && ctx) fadeOut(cur.gain, cur.src, 0.6); cur = null; }
  },
  /* lower the music under a game over and the result screen */
  duck(down) {
    if (!ctx || !duckBus) return;
    const t = ctx.currentTime;
    try {
      duckBus.gain.cancelScheduledValues(t);
      duckBus.gain.setValueAtTime(duckBus.gain.value, t);
      duckBus.gain.linearRampToValueAtTime(down ? DUCK_LEVEL : 1, t + (down ? 0.35 : 1.2));
    } catch (e) {}
  },
  stop() { token++; pending = null; if (cur && ctx) fadeOut(cur.gain, cur.src, 0.5); cur = null; }
};

/* ---------------- sound effects ---------------- */
let sfxLoading = null;
function loadSfx() {
  if (!sfxLoading && ensure()) sfxLoading = Promise.all([...new Set(Object.values(SFX).map(s => s[0]))].map(f => load(f).catch(() => null)));
  return sfxLoading;
}
export const sfx = {
  on: get(KEY_SFX, false) === true,
  set(on) {
    this.on = !!on;
    put(KEY_SFX, this.on);
    bindUnlock();
    if (this.on) { ensure(); resume(); loadSfx(); }
  },
  play(name, opts = {}) {
    if (!this.on || !SFX[name]) return;
    bindUnlock();
    if (!ensure()) return;
    resume();
    const [file, gain] = SFX[name];
    const asked = performance.now();
    loadSfx();
    load(file).then(buf => {
      if (!this.on || performance.now() - asked > 250) return;   // too late to still match the action
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = (opts.rate || 1) * (1 + (Math.random() - 0.5) * 0.05);
      const g = ctx.createGain();
      g.gain.value = gain * (opts.vol == null ? 1 : opts.vol);
      src.connect(g); g.connect(sfxBus);
      src.start();
    }).catch(() => { /* effects are optional */ });
  }
};

if (sfx.on || music.on) bindUnlock();
