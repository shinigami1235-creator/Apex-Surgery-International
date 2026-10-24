/* Filler areas and amounts.
   Source: de Maio M. MD Codes™: A Methodological Approach to Facial Aesthetic Treatment with Injectable Hyaluronic
   Acid Fillers. Aesthetic Plast Surg. 2021;45(2):690–709. doi:10.1007/s00266-020-01762-7. CC BY 4.0.
   Table 3 gives each code and its "active number", the minimum mL per side for a visible result. Table 4 groups the
   codes by concern. Depth, needle or cannula and the alert notes are left out since this is for patients.

   Each code: vol = mL per side (or in total when mid is true, for codes injected only on the midline).
   at = MediaPipe face mesh points [right side, left side] (one pair per injection point), or [i] on the midline,
   with an optional sideways shift (share of face width, toward the outside) for points between two landmarks.
   fx = what the simulation does there: fill lifts the shadow, mv moves the skin (u down the face, v outward),
   lit adds a soft highlight. Sizes are shares of the face width at the code's active number. */

export const CODES = {
  // foundation: cheek
  Ck1: {vol:.3, parts:3, at:[[227, 447], [116, 345], [111, 340]], fx:{mv:{u:-.004, v:.007}}},
  Ck2: {vol:.2, at:[[117, 346]], fx:{mv:{u:-.004, v:.003}, lit:.05}},
  Ck3: {vol:.3, at:[[101, 330]], fx:{fill:.06, mv:{u:-.004}}},
  Ck4: {vol:.5, at:[[147, 376]], fx:{mv:{u:-.006, v:.002}}},
  Ck5: {vol:.5, at:[[207, 427]], fx:{fill:.065}},
  // contour: temple
  T1: {vol:.5, at:[[21, 251]], fx:{fill:.07, mv:{v:.006}}},
  T2: {vol:.5, at:[[162, 389]], fx:{fill:.06, mv:{v:.006}}},
  // contour: chin
  C1: {vol:.5, at:[[83, 313]], fx:{fill:.035}},
  C2: {vol:.3, at:[[152, 152, .03]], fx:{mv:{u:.010}}},
  C3: {vol:.3, at:[[208, 428]], fx:{mv:{u:.006}, lit:.03}},
  C4: {vol:.3, mid:true, at:[[199]], fx:{mv:{u:.008}}},
  C5: {vol:.3, at:[[171, 396]], fx:{mv:{u:.004, v:.004}}},
  C6: {vol:.5, at:[[32, 262]], fx:{fill:.035, mv:{v:.003}}},
  // contour: jawline
  Jw1: {vol:.5, at:[[172, 397]], fx:{mv:{v:.010}}},
  Jw2: {vol:.5, at:[[93, 323]], fx:{fill:.04}},
  Jw3: {vol:1, at:[[150, 379]], fx:{mv:{u:.003, v:.006}}},
  Jw4: {vol:.5, at:[[149, 378]], fx:{fill:.035, mv:{v:.003}}},
  Jw5: {vol:.5, at:[[176, 400]], fx:{mv:{u:.005}}},
  // refinement: forehead, brows, outer eye, tear trough
  F1: {vol:.5, at:[[108, 337]], fx:{fill:.07}},
  F2: {vol:.5, at:[[103, 332]], fx:{fill:.07}},
  F3: {vol:.5, at:[[151, 151, .04]], fx:{fill:.06}},
  E1: {vol:.2, at:[[70, 300]], fx:{mv:{u:-.007}}},
  E2: {vol:.2, at:[[52, 282]], fx:{mv:{u:-.006}}},
  E3: {vol:.1, at:[[65, 295]], fx:{mv:{u:-.004}}},
  O1: {vol:.2, at:[[143, 372]], fx:{fill:.04}},
  O2: {vol:.2, at:[[31, 261]], fx:{fill:.035}},
  O3: {vol:.1, at:[[124, 353]], fx:{fill:.035}},
  Tt1: {vol:.2, at:[[230, 450]], fx:{fill:.04}},
  Tt2: {vol:.2, at:[[229, 449]], fx:{fill:.035}},
  Tt3: {vol:.1, at:[[232, 452]], fx:{fill:.03}},
  // refinement: around the mouth. NL depends on how deep the fold is
  NL1: {vol:.3, vol2:.5, at:[[203, 423]], fx:{fill:.04}},
  NL2: {vol:.2, vol2:.3, at:[[206, 426]], fx:{fill:.04}},
  NL3: {vol:0, vol2:.2, at:[[216, 436]], fx:{fill:.035}},
  M1: {vol:.2, at:[[43, 273]], fx:{fill:.03}},
  M2: {vol:.2, at:[[202, 422]], fx:{fill:.03}},
  M3: {vol:.1, at:[[210, 430]], fx:{fill:.03}},
  Lp1: {vol:.4, parts:2, at:[[39, 269], [84, 314]], fx:{mv:{u:[-.008, .010]}}},
  Lp2: {vol:.05, at:[[37, 267]], fx:{lit:.012}},
  Lp3: {vol:.3, parts:2, at:[[40, 270], [91, 321]], fx:{lit:.015}},
  Lp4: {vol:.1, mid:true, at:[[0]], fx:{mv:{u:-.004}}},
  Lp5: {vol:.05, at:[[86, 316]], fx:{mv:{u:.004}}},
  Lp6: {vol:.1, at:[[61, 291]], fx:{mv:{u:-.006}}},
  Lp7: {vol:.05, at:[[167, 393]], fx:{lit:.014}},
  Lp8: {vol:.5, parts:2, at:[[92, 322], [182, 406]], fx:{fill:.03}},
  // nose: all on the midline
  N1: {vol:.3, mid:true, at:[[2]], fx:{mv:{u:-.003}}},
  N2: {vol:.2, mid:true, at:[[94]], fx:{mv:{u:-.003}}},
  N3: {vol:.3, mid:true, at:[[168]], fx:{lit:.03}},
  N4: {vol:.2, mid:true, at:[[6]], fx:{lit:.022}},
  N5: {vol:.2, mid:true, at:[[195]], fx:{lit:.022}},
};

/* concerns, from Table 4, in the paper's order: foundation first, contour second, refinement last */
export const CONCERNS = [
  {k:'cheeks', step:'foundation', codes:['Ck1', 'Ck2', 'Ck3', 'Ck4', 'Ck5']},
  {k:'temples', step:'contour', codes:['T1', 'T2']},
  {k:'chin', step:'contour', codes:['C1', 'C2', 'C3', 'C4', 'C5', 'C6']},
  {k:'jowls', step:'contour', codes:['Jw1', 'Jw2', 'Jw3', 'Jw4', 'Jw5']},
  {k:'forehead', step:'refine', codes:['F1', 'F2', 'F3']},
  {k:'brows', step:'refine', codes:['E1', 'E2', 'E3']},
  {k:'orbit', step:'refine', codes:['O1', 'O2', 'O3']},
  {k:'tear', step:'refine', codes:['Tt1', 'Tt2', 'Tt3']},
  {k:'folds', step:'refine', codes:['NL1', 'NL2', 'NL3'], deep:true},
  {k:'lips', step:'refine', codes:['Lp1', 'Lp2', 'Lp3', 'Lp4', 'Lp5', 'Lp7', 'Lp8']},
  {k:'corners', step:'refine', codes:['Lp6']},
  {k:'marionette', step:'refine', codes:['M1', 'M2', 'M3']},
  {k:'nose', step:'refine', codes:['N1', 'N2', 'N3', 'N4', 'N5']},
];
export const STEPS = ['foundation', 'contour', 'refine'];
export const PER_SESSION = 4;   // the paper suggests about 4 mL in one session
export const SYRINGE = 1;       // mL in one syringe

/* The codes for a set of concerns, with the paper's combination rules:
   C1 goes from 0.5 to 0.7 mL with C2, and T1 or Ck4 go from 0.5 to 0.7 mL with Ck1, so each pair fills one syringe.
   deep: true uses the amounts for severe nasolabial folds. */
export function planFor(keys, deep = false){
  const on = new Set(keys), list = [];
  for (const c of CONCERNS) if (on.has(c.k)) for (const k of c.codes) {
    const d = CODES[k];
    let vol = c.deep && deep ? (d.vol2 ?? d.vol) : d.vol;
    if (!vol) continue;
    list.push({k, concern:c.k, step:c.step, vol, mid:!!d.mid});
  }
  const has = k => list.some(x => x.k === k), set = (k, v) => list.forEach(x => { if (x.k === k) x.vol = v; });
  if (has('C1') && has('C2')) set('C1', .7);
  if (has('Ck1') && has('T1')) set('T1', .7);
  if (has('Ck1') && has('Ck4')) set('Ck4', .7);
  const r2 = x => Math.round(x * 100) / 100;
  const total = r2(list.reduce((a, x) => a + (x.mid ? x.vol : x.vol * 2), 0));
  const byConcern = {};
  for (const x of list) { const b = byConcern[x.concern] = byConcern[x.concern] || {total:0, codes:[]}; b.codes.push(x); b.total = r2(b.total + (x.mid ? x.vol : x.vol * 2)); }
  return {list, total, byConcern, syringes:Math.ceil(total / SYRINGE - 1e-9), sessions:Math.max(1, Math.ceil(total / PER_SESSION - 1e-9))};
}
