"""Usage: MH_DATA=<makehuman>/makehuman/data python3 build_heads.py <out dir> [--debug <dir>]

Build the face-zoom head mesh from the MakeHuman hm08 base mesh (CC0).
The head uses the same morphs as the bodies (morphs.py) and the same units, so it
sits on the body's neck with no transform. Both genders share one topology, so the
switch morphs vertex to vertex.

Steps:
  1. Morph the base mesh with the macro and face targets in morphs.py.
  2. Cut the head and neck from the 'body' group with the same bone rule the body
     build uses for its head and neck regions, plus the front of both eyeballs.
  3. One Catmull-Clark step, so there are enough vertices to choose an even net from.
     Rig weights for the lips, jaw and eyelids ride along through the subdivision.
  4. Drop the inside of the mouth, nostrils and ear canals: a triangle is kept when it
     is visible from at least one of 42 directions.
  5. Close the mouth: each vertex on the lower lip's inner edge is welded to the nearest
     vertex on the upper lip's inner edge, so the lips meet in a single seam.
  6. Decimate by half-edge collapse to an even net, denser on the front of the face,
     then flip edges toward Delaunay triangles.
  7. Label face areas from rig weights and landmarks on the neutral mesh, and bake light
     occlusion per vertex.

Output heads.bin (little endian):
  Uint32   N vertices, Uint32 E edges
  Float32  x 6   cx, cy, cz, s, cutF, cutM     position = q / 32767 * s + c
               cutF / cutM: height where the head fades into the body neck
  Int16    x 3N  female position
  Int16    x 3N  male position
  Uint16   x 2E  edges (vertex index pairs)
  Uint8    x 2N  female normal, octahedral (u, v)
  Uint8    x 2N  male normal, octahedral
  Uint8    x N   area id (low 4 bits) | kind (high 4 bits)
     area: 0 face, 1 forehead and brows, 2 eyes, 3 nose, 4 chin and jaw, 5 neck, 15 none
     (eyes and neck are set by relabel_areas.py, run on heads.bin after this script)
     kind: 0 skin, 1 lips, 2 eyeball, 3 ear, 4 scalp, 5 upper lid margin, 6 lower lid margin, 7 lip seam
  Uint8    x N   light occlusion, 0 enclosed to 255 open
"""
import sys, os, json, struct, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from mhload import load_obj, apply, joints as mh_joints, D
from morphs import FEMALE, MALE
from meshlib import (cc_operator, quads_to_tris, vertex_normals, visibility, surface_samples, compact,
                     decimate, delaunay_flips, edges_of, octa, quant, unit)

OUT = sys.argv[1]
DEBUG = sys.argv[sys.argv.index('--debug') + 1] if '--debug' in sys.argv else None
TARGET = int(os.environ.get('HEAD_V', 3000))
CUT_Y = 5.84        # neutral height of the crossfade between head and body neck
KEEP_Y = CUT_Y - .2
rng = np.random.default_rng(11)

V0, F, G = load_obj()
J0 = mh_joints(V0, F, G)
nv0 = len(V0)

def morph(lst):
    V = V0.copy()
    for t, w in lst: apply(V, t, w)
    return V
VF, VM = morph(FEMALE), morph(MALE)

# rig weights -> per-vertex fields
W = json.load(open(D + '/rigs/default_weights.mhw'))['weights']
best = np.zeros(nv0); bone = np.array([''] * nv0, dtype=object)
def field(prefixes):
    f = np.zeros(nv0)
    for b, lst in W.items():
        if b.startswith(prefixes):
            for i, w in lst: f[i] = max(f[i], w)
    return f
for b, lst in W.items():
    for i, w in lst:
        if w > best[i]: best[i] = w; bone[i] = b
HEADB = ('head', 'jaw', 'eye', 'oculi', 'orbicularis', 'oris', 'risorius', 'levator', 'special', 'tongue')
headish = np.array([b.startswith(HEADB) or b.startswith('neck') for b in bone])
FIELDS = {
    'lipU': field(('oris03', 'oris05')), 'lipL': field(('oris01', 'oris07')),
    'jaw': field(('jaw', 'special04')), 'lid': field(('orbicularis', 'oculi')),
}

# ---------------- 1-2. cut ----------------
quads, part = [], []
for f, g in zip(F, G):
    if len(f) != 4: continue
    if g == 'body':
        if headish[f[0]] and V0[f, 1].max() > KEEP_Y: quads.append(f); part.append(0)
    elif g in ('helper-l-eye', 'helper-r-eye'):
        c = V0[f].mean(0); ec = J0['l-eye'] if c[0] > 0 else J0['r-eye']
        d = (c - ec) / np.linalg.norm(c - ec)
        if d[2] > .5: quads.append(f); part.append(2)
quads = np.array(quads); part = np.array(part)
used = np.unique(quads)
remap = -np.ones(nv0, int); remap[used] = np.arange(len(used))
Q = remap[quads]
SH = np.stack([V0[used], VF[used], VM[used]])                 # neutral, female, male
FL = np.stack([FIELDS[k][used] for k in FIELDS], 1)
EYE = np.zeros(len(used)); EYE[np.unique(Q[part == 2])] = 1

# ---------------- 3. one Catmull-Clark step ----------------
S, Q = cc_operator(Q, len(used))
SH = np.stack([S @ v for v in SH]); FL = S @ FL; EYE = S @ EYE
T = quads_to_tris(Q)

# ---------------- 4. visibility ----------------
Pz = surface_samples(SH[0], T, 400000, rng)
tc = SH[0][T].mean(1)
tn = unit(np.cross(SH[0][T[:, 1]] - SH[0][T[:, 0]], SH[0][T[:, 2]] - SH[0][T[:, 0]]))
tvis, _ = visibility(tc, tn, Pz)
T = T[tvis]
T, keep, FL, EYE = compact(T, FL, EYE)
SH = SH[:, keep]
print('subdivided and visible:', len(keep), 'vertices,', len(T), 'triangles')

# ---------------- 5. close the mouth ----------------
def boundary_verts(T):
    e = np.sort(np.concatenate([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]]), 1)
    u, c = np.unique(e, axis=0, return_counts=True)
    return np.unique(u[c == 1])
Pn = SH[0]
bv = boundary_verts(T)
lipw = np.maximum(FL[:, 0], FL[:, 1])
mouth = bv[(lipw[bv] > .3) & (Pn[bv, 2] > 1.2) & (np.abs(Pn[bv, 0]) < .4)]
upper = mouth[FL[mouth, 0] >= FL[mouth, 1]]; lower = mouth[FL[mouth, 0] < FL[mouth, 1]]
weld = np.arange(len(Pn))
for v in lower:
    d = np.linalg.norm(Pn[upper] - Pn[v], axis=1)
    if len(d) and d.min() < .08: weld[v] = upper[np.argmin(d)]
T = weld[T]
T = T[(T[:, 0] != T[:, 1]) & (T[:, 1] != T[:, 2]) & (T[:, 2] != T[:, 0])]
print('mouth edge: welded', int((weld != np.arange(len(Pn))).sum()), 'lower-lip vertices onto', len(upper), 'upper-lip vertices')
seam = np.zeros(len(Pn), bool); seam[upper] = True

# ---------------- 6. decimate ----------------
Nn = vertex_normals(Pn, T)
eyeY = J0['l-eye'][1]
ss = lambda e0, e1, v: np.clip((v - e0) / (e1 - e0), 0, 1) ** 2 * (3 - 2 * np.clip((v - e0) / (e1 - e0), 0, 1))
qz, qy = Nn[:, 2], Pn[:, 1]
dens = .5 + 1.2 * ss(-.45, .15, qz) + 2.5 * ss(.05, .6, qz) * (1 - ss(eyeY + .55, eyeY + 1.15, qy)) * ss(CUT_Y - .1, CUT_Y + .45, qy)
dens *= 1 - .45 * ss(eyeY + .75, eyeY + 1.25, qy)
# features draw the eye, as on the atlas: denser net around the eyes, nose and mouth
def near(c, r): return np.exp(-np.sum((Pn - np.array(c)) ** 2, 1) / r ** 2)
feat = (near([J0['l-eye'][0], eyeY, 1.45], .24) + near([J0['r-eye'][0], eyeY, 1.45], .24)
        + near([0, 7.05, 1.6], .22) + near([0, 6.85, 1.62], .2) + .7 * near([0, 6.62, 1.5], .24))
dens *= 1 + 2.2 * np.clip(feat, 0, 1) * ss(-.1, .4, qz)
dens[EYE > .5] *= .5
scale = 1 / np.sqrt(dens)
scale[seam] *= .6                       # keep the seam smooth
T = decimate([SH[0], SH[1], SH[2]], T, TARGET, scale)
T = delaunay_flips([SH[0], SH[1], SH[2]], T)
T, keep, FL, EYE, seam = compact(T, FL, EYE, seam)
SH = SH[:, keep]
Pn, Pf, Pm = SH
E = edges_of(T)
print('decimated:', len(Pn), 'vertices,', len(E), 'edges,', len(T), 'triangles')

# ---------------- 7. labels and occlusion ----------------
Nn = vertex_normals(Pn, T); Nf = vertex_normals(Pf, T); Nm = vertex_normals(Pm, T)
_, ao = visibility(Pn, Nn, Pz)
ao = np.clip(ao / np.percentile(ao, 90), 0, 1)
x, y, z = Pn.T
fld = {k: FL[:, i] for i, k in enumerate(FIELDS)}
kind = np.zeros(len(Pn), np.uint8)
ear = (np.abs(x) > .6) & (np.abs(y - eyeY + .12) < .42) & (z < .5) & (z > -.4) & (np.abs(Nn[:, 0]) > .2)
scalp = ~ear & ((y > eyeY + .75) | ((z < .15) & (y > CUT_Y + .45)))
kind[EYE > .5] = 2; kind[ear & (kind == 0)] = 3; kind[scalp & (kind == 0)] = 4
skin = kind == 0
seamY = np.median(y[seam]) if seam.any() else 6.61
lips = skin & ((fld['lipU'] > .5) | (fld['lipL'] > .5)) & (z > 1.2) & (np.abs(y - seamY) < .13)
kind[lips] = 1
kind[seam] = 7
eyeball = np.where(kind == 2)[0]
if len(eyeball):
    from scipy.spatial import cKDTree
    de, _ = cKDTree(Pn[eyeball]).query(Pn, 1)
    ecy = np.where(x > 0, J0['l-eye'][1], J0['r-eye'][1])
    kind[skin & ~lips & (de < .06) & (y > ecy + .01)] = 5
    kind[skin & ~lips & (de < .045) & (y <= ecy + .01)] = 6
skin = kind == 0
lidZ = J0['l-upperlid'][2]
ex = np.abs(x) - J0['l-eye'][0]
neckY = 6.2 + np.clip(np.abs(x) - .15, 0, None) * .55 - np.clip(1.3 - z, 0, None) * .05
area = np.full(len(Pn), 15, np.uint8)
skinish = np.isin(kind, [0, 5, 6])
front = skinish & (Nn[:, 2] > -.15) & (z > .2)
area[front & (y < eyeY + .1) & (y > neckY)] = 0
area[skinish & (y <= neckY) & (z > -.4)] = 0
area[skinish & (fld['jaw'] > .3) & (y < 6.56) & (y > neckY - .18)] = 4
area[skinish & (y > 6.1) & (y < 6.5) & (z > .35) & (y > neckY - .1) & (Nn[:, 1] < .5) & (np.abs(x) > .25) & (np.abs(x) < .8) & (y < 6.25 + (np.abs(x) - .25) * .5)] = 4
area[skinish & (y > eyeY + .12) & (y < eyeY + 1.0) & (Nn[:, 2] > .3) & (np.abs(x) < .72)] = 1
eyes = (((ex / .29) ** 2 + ((y - eyeY - .01) / .16) ** 2) < 1) & (z > lidZ - .2)
area[eyes | (kind == 2)] = 2
nose_w = np.interp(y, [6.72, 6.82, 7.0, 7.2, 7.32], [.12, .19, .15, .1, .085])
area[skinish & (np.abs(x) < nose_w) & (y > 6.74) & (y < 7.33) & (z > lidZ - .12)] = 3
area[np.isin(kind, [1, 3, 4, 7])] = 15
names = [(0, 'facelift'), (1, 'brows'), (2, 'eyes'), (3, 'nose'), (4, 'chin'), (15, 'none')]
print('area counts', {k: int((area == i).sum()) for i, k in names})
print('kind counts', np.bincount(kind, minlength=8).tolist())

# ---------------- write ----------------
def cut_for(V):
    band = (np.abs(V0[:, 1] - CUT_Y) < .08) & headish
    return float(CUT_Y + (V[band, 1] - V0[band, 1]).mean())
cutF, cutM = cut_for(VF), cut_for(VM)
allP = np.concatenate([Pf, Pm])
c = (allP.max(0) + allP.min(0)) / 2
s = float(np.abs(allP - c).max() * 1.0001)
N = len(Pn)
assert N < 65536
hdr = struct.pack('<II6f', N, len(E), *c, s, cutF, cutM)
blob = (hdr + quant(Pf, c, s).tobytes() + quant(Pm, c, s).tobytes() + E.astype('<u2').tobytes()
        + octa(Nf).tobytes() + octa(Nm).tobytes() + (area | (kind << 4)).astype(np.uint8).tobytes()
        + np.round(ao * 255).astype(np.uint8).tobytes())
open(os.path.join(OUT, 'heads.bin'), 'wb').write(blob)
print('heads.bin', len(blob), 'bytes,', N, 'vertices,', len(E), 'edges, cut', round(cutF, 3), round(cutM, 3))
if DEBUG:
    np.savez(os.path.join(DEBUG, 'headmesh_dbg.npz'), Pn=Pn, Pf=Pf, Pm=Pm, Nf=Nf, Nm=Nm, T=T, E=E, area=area, kind=kind, ao=ao)
