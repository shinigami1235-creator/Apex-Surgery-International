/* From raw readings to what the visitor sees: a level per factor, the area it shows most, a skin score and a
   skin age. The ranges were set on 28 test photos from people in their twenties to their eighties
   (tests/analysis). Apex's doctors should check the levels against their own patients' photos. */

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* low and high ends of each reading: below lo reads as minimal, above hi as marked */
export const RANGE = {
  forehead:[.012, .2], glabella:[.012, .18], crows:[.05, .26], underLines:[.04, .32],
  rough:[1.0, 3.6], pores:[.004, .03],
  spots:[8, 66], toneA:[1.6, 5.2],
  redPatch:[.06, .28], redCheek:[3.5, 9],
  dark:[.13, .46], trough:[.03, .3],
  shine:[.004, .05],
  fold:[.1, .56], mario:[.16, .46], droop:[.02, .12], brow:[.4, .18],
  asym:[.045, .13],
};
const c = (k, x) => smooth(RANGE[k][0], RANGE[k][1], x);

export const LEVELS = ['minimal', 'mild', 'moderate', 'marked'];
export const level = v => v < .2 ? 0 : v < .45 ? 1 : v < .7 ? 2 : 3;

/* weights in the skin score */
const W = {lines:.25, texture:.12, spots:.18, redness:.09, under:.12, sag:.19, shine:.05};

export function factors(raw, sides = []){
  const F = {};
  // lines: the worst area decides the level, the others add a little
  const la = {forehead:c('forehead', raw.lines.forehead.share), glabella:c('glabella', raw.lines.glabella.share),
    crows:c('crows', raw.lines.crows.share), under:c('underLines', raw.lines.under.share)};
  F.lines = mix(la);
  F.texture = {v:Math.max(c('rough', raw.texture.rough), c('pores', raw.texture.pores) * .8), area:'cheeks'};
  F.spots = {v:Math.max(c('spots', raw.even.spots), c('toneA', raw.even.toneA) * .6), area:'cheeks', n:raw.spots.length};
  F.redness = {v:Math.max(c('redPatch', raw.redness.patch), c('redCheek', raw.redness.cheekVsForehead) * .5), area:'cheeks'};
  F.under = {v:Math.max(c('dark', raw.under.dark), c('trough', raw.under.trough) * .85), area:'under'};
  F.shine = {v:c('shine', raw.shine.share), area:'tzone'};
  // sagging: folds beside the nose and below the mouth, the mouth corners and the brows; side photos add the folds seen from the side
  const sideFold = sides.length ? Math.max(...sides.map(s => s.fold)) : 0;
  const sa = {fold:c('fold', Math.max(raw.sag.fold, sideFold * .9)), mario:c('mario', raw.sag.mario) * .9, droop:c('droop', raw.sag.droop) * .7, brow:c('brow', raw.sag.brow) * .75};
  if (sides.length) sa.jaw = smooth(.11, .045, Math.min(...sides.map(s => s.jaw))) * .8;
  F.sag = mix(sa, {fold:'folds', mario:'mouth', droop:'mouth', brow:'brows', jaw:'jaw'});
  F.sag.sides = sides.length;
  // structure, not counted in the skin score
  const cr = raw.lid.crease;
  F.lid = {state:cr < 1.3 ? 'none' : cr < 2.6 ? 'faint' : 'clear', v:cr < 1.3 ? .6 : cr < 2.6 ? .35 : .05};
  F.balance = {v:c('asym', raw.asym)};
  for (const k in F) F[k].level = level(F[k].v);

  const wsum = Object.values(W).reduce((a, b) => a + b, 0);
  const concern = Object.entries(W).reduce((a, [k, w]) => a + F[k].v * w, 0) / wsum;
  const score = Math.round(100 - 72 * concern);
  return {F, concern, score};
}
function mix(parts, names){
  const e = Object.entries(parts).sort((a, b) => b[1] - a[1]);
  const top = e[0][1], rest = e.slice(1).reduce((a, x) => a + x[1], 0) / Math.max(1, e.length - 1);
  return {v:Math.min(1, top * .82 + rest * .25), area:names ? names[e[0][0]] : e[0][0], parts};
}

/* skin age: the face model's guess, pulled toward an age read from the skin readings so one odd guess does
   not stand alone, and never under 18 since the site is for adults */
export function skinAge(modelAge, concern){
  const fromSkin = 22 + 62 * Math.sqrt(Math.max(0, concern));
  const a = modelAge == null ? fromSkin : modelAge * .6 + fromSkin * .4;
  return Math.max(18, Math.round(a));
}
