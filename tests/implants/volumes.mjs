// Checks the breast viewer adds exactly the implant's volume, and how much each cup size adds.
import {readFileSync} from 'node:fs';
import * as S from '../../site/assets/features/implants/shapes.js';
const buf = readFileSync(new URL('../../site/assets/features/implants/torso.bin', import.meta.url));
const M = S.torsoModel(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const cc = (P, cm) => S.volume(P, M.tri) * cm ** 3;
let fail = 0;
const body = {height:160, weight:52, cup:'B'};
const bp = S.bodyParams(body), cm = 10 * bp.scale;
const P = S.morphTorso(M, bp), N = S.normals(P, M.tri, M.N);
const v0 = cc(P, cm);
console.log('torso volume', Math.round(v0), 'cc');
// cup sizes against AA
const vAA = cc(S.morphTorso(M, S.bodyParams({...body, cup:'AA'})), cm);
for (const c of S.CUPS) console.log('cup', c, '+', Math.round((cc(S.morphTorso(M, S.bodyParams({...body, cup:c})), cm) - vAA) / 2), 'cc a side over AA');
for (const imp of [{cc:245, width:11.0, projection:4.1, sag:.3}, {cc:300, width:11.4, projection:4.6, sag:.15}, {cc:400, width:12.5, projection:5.0, sag:.1},
                   {cc:300, width:11.5, height:10.9, projection:4.5, teardrop:true, sag:.05}]) {
  const F = S.blurField(S.breastField(imp), 1.2);
  const Q = S.fitBreasts(M, P, N, F, cm);
  const add = (cc(Q, cm) - v0) / 2, err = Math.abs(add - imp.cc) / imp.cc;
  console.log(JSON.stringify(imp), 'field', Math.round(F.vol), 'cc, n', F.n.toFixed(2), '-> added', Math.round(add), 'cc a side', (err * 100).toFixed(1) + '%');
  if (err > .02) fail++;
}
if (fail) { console.error(fail, 'implants off by more than 2%'); process.exit(1); }
