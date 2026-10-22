/* Runs the skin reading off the main thread so the page stays smooth while it works */
import {read} from './skin.js';
self.onmessage = e => {
  const {id, img, L, side} = e.data;
  try {
    const r = read({img, L});
    const out = side ? {turn:r.turn, near:r.near, fold:r.sag.folds[r.near], jaw:r.sag.jaws[r.near]} : r;
    self.postMessage({id, r:out});
  } catch (err) { self.postMessage({id, error:String(err && err.message || err)}); }
};
