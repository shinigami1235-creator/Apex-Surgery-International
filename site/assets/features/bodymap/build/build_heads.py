"""Usage: MH_DATA=<makehuman>/makehuman/data python3 build_heads.py <out dir> [--debug <dir>]

Build the face-zoom head point cloud from the MakeHuman hm08 base mesh (CC0).
The head uses the same morphs as the bodies (morphs.py) and the same units, so it
sits on the body's neck with no transform.

Both genders share one sample: point i lies on the same subdivided quad with the
same parameters in the female and the male head, so the switch morphs point to point.

Steps:
  1. Morph the base mesh with the macro and face targets in morphs.py.
  2. Cut the head and neck from the 'body' group with the same bone rule the body
     build uses for its head and neck regions, plus the front of both eyeballs.
  3. Catmull-Clark subdivide twice, so the surface is smooth between the original quads.
     Rig weights for the lips, jaw and eyelids ride along through the subdivision.
  4. Sample area weighted: front of the face densest, sides next, scalp and ears sparse.
     Oversample five times, then thin by weighted sample elimination to blue noise.
  5. Drop the inside of the mouth, nostrils and ear canals: a sample is kept when it is
     visible from at least one of 42 directions. The share of directions that see a
     sample is kept as its light occlusion, which shades eye sockets, nostrils and creases.
  6. Label face areas from rig weights and landmarks on the neutral mesh.

Output heads.bin (little endian):
  Uint32   N
  Float32  x 8   cx, cy, cz, sx, sy, sz, cutF, cutM
               position = (q / qmax * 2 - 1) * s + c per axis
               cutF / cutM: height where the head fades into the body neck
  Uint32   x N   female position, 11/11/10 bits (x, y, z)
  Uint32   x N   male position, same packing
  Uint8    x 2N  female normal, octahedral (u, v)
  Uint8    x 2N  male normal, octahedral
  Uint8    x N   area id (low 4 bits) | kind (high 4 bits)
     area: 0 face and neck, 1 forehead and brows, 2 eyes, 3 nose, 4 chin and jaw, 15 none
     kind: 0 skin, 1 lips, 2 eyeball, 3 ear, 4 scalp, 5 upper lid margin, 6 lower lid margin
  Uint8    x N   light occlusion, 0 enclosed to 255 open
"""
import sys, os, json, struct, numpy as np
import scipy.sparse as sp
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from mhload import load_obj, apply, joints as mh_joints, D
from morphs import FEMALE, MALE

OUT = sys.argv[1]
DEBUG = sys.argv[sys.argv.index('--debug') + 1] if '--debug' in sys.argv else None
TARGET_N = int(os.environ.get('HEAD_N', 16000))
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
    'nose': field(('levator06',)),
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
P = {'n': V0[used], 'f': VF[used], 'm': VM[used]}
FL = np.stack([FIELDS[k][used] for k in FIELDS], 1)

# ---------------- 3. Catmull-Clark as a sparse operator ----------------
def cc_operator(Q, nv):
    nf = len(Q)
    e = np.stack([Q, np.roll(Q, -1, 1)], 2).reshape(-1, 2)
    uk, einv, ecount = np.unique(np.sort(e, 1), axis=0, return_inverse=True, return_counts=True)
    einv = einv.ravel(); ne = len(uk)
    eface = np.repeat(np.arange(nf), 4)
    bnd = ecount == 1
    rows, cols, vals = [], [], []
    def add(r, c, v):
        r = np.asarray(r).ravel(); rows.append(r); cols.append(np.asarray(c).ravel()); vals.append(np.broadcast_to(np.asarray(v, float), r.shape).ravel())
    fbase = nv + ne
    for k in range(4): add(fbase + np.arange(nf), Q[:, k], .25)                    # face points
    ia, ib = uk[:, 0], uk[:, 1]
    eb = np.where(bnd)[0]; ei = np.where(~bnd)[0]
    add(nv + eb, ia[eb], .5); add(nv + eb, ib[eb], .5)                              # boundary edge: midpoint
    add(nv + ei, ia[ei], .25); add(nv + ei, ib[ei], .25)                            # interior edge: (a+b+f1+f2)/4
    m = ~bnd[einv]
    for k in range(4): add(nv + einv[m], Q[eface[m], k], 1 / 16)
    vb = np.zeros(nv, bool); vb[ia[eb]] = True; vb[ib[eb]] = True
    val = np.bincount(np.concatenate([ia, ib]), minlength=nv).astype(float)
    fv = Q.ravel(); ff = np.repeat(np.arange(nf), 4)
    nfv = np.bincount(fv, minlength=nv).astype(float)
    mm = ~vb[fv]
    for k in range(4): add(fv[mm], Q[ff[mm], k], .25 / nfv[fv[mm]] / val[fv[mm]])   # F / n
    for a_, b_ in ((ia, ib), (ib, ia)):
        mm = ~vb[a_]
        add(a_[mm], a_[mm], 1 / val[a_[mm]] / val[a_[mm]])                             # 2R / n
        add(a_[mm], b_[mm], 1 / val[a_[mm]] / val[a_[mm]])
    vi = np.where(~vb)[0]
    add(vi, vi, (val[vi] - 3) / val[vi])                                               # (n-3)P / n
    vbi = np.where(vb)[0]
    add(vbi, vbi, .75)                                                                 # boundary vertex
    for a_, b_ in ((ia, ib), (ib, ia)):
        mm = bnd & vb[a_]
        add(a_[mm], b_[mm], .125)
    S = sp.csr_matrix((np.concatenate(vals), (np.concatenate(rows), np.concatenate(cols))), shape=(fbase + nf, nv))
    eidx = nv + einv.reshape(nf, 4); fidx = fbase + np.arange(nf)
    NQ = np.concatenate([np.stack([Q[:, k], eidx[:, k], fidx, eidx[:, (k - 1) % 4]], 1) for k in range(4)])
    return S, NQ

nv = len(used); partq = part
for it in range(2):
    S, Q2 = cc_operator(Q, nv)
    P = {k: S @ v for k, v in P.items()}
    FL = S @ FL
    partq = np.tile(partq, 4); Q = Q2; nv = S.shape[0]
print('subdivided quads', len(Q), 'verts', nv)

def vnormals(V):
    a, b, c, d = (V[Q[:, k]] for k in range(4))
    fn = np.cross(c - a, d - b)
    N = np.zeros_like(V)
    for k in range(4): np.add.at(N, Q[:, k], fn)
    return N / (np.linalg.norm(N, axis=1, keepdims=True) + 1e-12), np.linalg.norm(fn, axis=1) * .5
NN, _ = vnormals(P['n']); NF, AF = vnormals(P['f']); NM, AM = vnormals(P['m'])

# ---------------- 4. sample ----------------
unit = lambda x: x / (np.linalg.norm(x, axis=1, keepdims=True) + 1e-12)
cen = P['n'][Q].mean(1); qn = unit(NN[Q].mean(1))
eyeY = J0['l-eye'][1]
ear = (partq == 0) & (np.abs(cen[:, 0]) > .6) & (np.abs(cen[:, 1] - eyeY + .12) < .42) & (cen[:, 2] < .5) & (cen[:, 2] > -.4) & (np.abs(qn[:, 0]) > .2)
scalp = (partq == 0) & ~ear & ((cen[:, 1] > eyeY + .75) | ((cen[:, 2] < .15) & (cen[:, 1] > CUT_Y + .45)))
ss = lambda e0, e1, v: np.clip((v - e0) / (e1 - e0), 0, 1) ** 2 * (3 - 2 * np.clip((v - e0) / (e1 - e0), 0, 1))
# continuous density, so no seam shows where one weight meets the next:
# sides 1.7, front of the face 4.2, top and back of the head .5
qz, qy = qn[:, 2], cen[:, 1]
dens = .5 + 1.2 * ss(-.45, .15, qz) + 2.5 * ss(.05, .6, qz) * ss(eyeY + 1.15, eyeY + .55, qy) * ss(CUT_Y - .1, CUT_Y + .45, qy)
dens *= .65 + .35 * ss(CUT_Y - .25, CUT_Y + .1, qy)
dens *= 1 - .45 * ss(eyeY + .75, eyeY + 1.25, qy)   # crown
dens[ear] = .35
dens[partq == 2] = .6
w = (AF + AM) * .5 * dens
M0 = TARGET_N * 5
cdf = np.cumsum(w); cdf /= cdf[-1]
pick = np.searchsorted(cdf, (np.arange(M0) + rng.random(M0)) / M0)
u = rng.random(M0); v = rng.random(M0)
def at(V):
    a, b, c, d = (V[Q[pick, k]] for k in range(4))
    return a * ((1 - u) * (1 - v))[:, None] + b * (u * (1 - v))[:, None] + c * (u * v)[:, None] + d * ((1 - u) * v)[:, None]
Pn, Pf, Pm = at(P['n']), at(P['f']), at(P['m'])
Nn, Nf, Nm = unit(at(NN)), unit(at(NF)), unit(at(NM))
FS = at(FL); fld = {k: FS[:, i] for i, k in enumerate(FIELDS)}
kind = np.zeros(M0, np.uint8)
kind[partq[pick] == 2] = 2; kind[ear[pick]] = 3; kind[scalp[pick]] = 4

# ---------------- 5. visibility: point z-buffer from 42 directions ----------------
def fib_dirs(n):
    i = np.arange(n) + .5
    phi = np.arccos(1 - 2 * i / n); th = np.pi * (1 + 5 ** .5) * i
    return np.stack([np.cos(th) * np.sin(phi), np.cos(phi), np.sin(th) * np.sin(phi)], 1)
def visible(Pt, Nt, res=320, eps=.03):
    vis = np.zeros(len(Pt), bool); seen = np.zeros(len(Pt)); tot = np.zeros(len(Pt))
    c = (Pt.max(0) + Pt.min(0)) / 2; R = np.abs(Pt - c).max() * 1.05
    for d in fib_dirs(42):
        if d[1] < -.6: continue      # the neck cut is open underneath
        up = np.array([0, 1, 0.]) if abs(d[1]) < .9 else np.array([1, 0, 0.])
        ax = unit(np.cross(up, d)[None])[0]; ay = np.cross(d, ax)
        X = Pt - c
        ix = np.clip(np.round(((X @ ax) / R * .5 + .5) * (res - 1)).astype(int), 0, res - 1)
        iy = np.clip(np.round(((X @ ay) / R * .5 + .5) * (res - 1)).astype(int), 0, res - 1)
        dz = X @ d
        zb = np.full((res, res), -1e9)
        for ox in (-1, 0, 1):
            for oy in (-1, 0, 1):
                np.maximum.at(zb, (np.clip(iy + oy, 0, res - 1), np.clip(ix + ox, 0, res - 1)), dz)
        nd = Nt @ d
        hit = (nd > -.05) & (dz >= zb[iy, ix] - eps)
        vis |= hit
        cw = np.clip(nd, 0, None); tot += cw; seen += cw * hit
    return vis, seen / np.maximum(tot, 1e-6)
vis, ao = visible(Pn, Nn)
print('visible', int(vis.sum()), 'of', len(vis))
idx = np.where(vis)[0]
assert len(idx) >= TARGET_N, 'too few visible samples'

def eliminate(Pt, r, n_keep):
    """Weighted sample elimination (Yuksel 2015): drop the most crowded sample until n_keep
    remain, so the kept points are evenly spaced (blue noise) at the local target spacing r."""
    import heapq
    from scipy.spatial import cKDTree
    pairs = cKDTree(Pt).query_pairs(2 * r.max(), output_type='ndarray')
    a, b = pairs[:, 0], pairs[:, 1]
    rr = (r[a] + r[b])                                    # 2 x mean radius
    dd = np.linalg.norm(Pt[a] - Pt[b], axis=1)
    keep = dd < rr
    a, b, w = a[keep], b[keep], (1 - dd[keep] / rr[keep]) ** 8
    n = len(Pt)
    W = np.bincount(a, w, n) + np.bincount(b, w, n)
    nb = [[] for _ in range(n)]
    for i, j, ww in zip(a.tolist(), b.tolist(), w.tolist()): nb[i].append((j, ww)); nb[j].append((i, ww))
    alive = np.ones(n, bool); heap = [(-W[i], i) for i in range(n)]; heapq.heapify(heap)
    left = n
    while left > n_keep:
        wv, i = heapq.heappop(heap)
        if not alive[i] or -wv != W[i]: continue
        alive[i] = False; left -= 1
        for j, ww in nb[i]:
            if alive[j]: W[j] -= ww; heapq.heappush(heap, (-W[j], j))
    return np.where(alive)[0]
dloc = dens[pick[idx]]
Aw = w.sum()
r0 = np.sqrt(Aw / (2 * np.sqrt(3) * TARGET_N))
rad = r0 / np.sqrt(dloc / (Aw / ((AF + AM) * .5).sum()))
idx = idx[eliminate(Pn[idx], rad, TARGET_N)]
print('blue noise target spacing (dm): face', round(float(rad.min()), 4), 'scalp', round(float(rad.max()), 4))
Pn, Pf, Pm, Nn, Nf, Nm, kind, ao = Pn[idx], Pf[idx], Pm[idx], Nn[idx], Nf[idx], Nm[idx], kind[idx], ao[idx]
# light occlusion (0 = enclosed, 1 = open sky), stretched so the open cheek and forehead reach 1
ao = np.clip(ao / np.percentile(ao, 90), 0, 1)
print('ao percentiles', np.percentile(ao, [5, 25, 50, 75]).round(2))
fld = {k: v[idx] for k, v in fld.items()}

# ---------------- 6. face areas on the neutral mesh ----------------
x, y, z = Pn.T
skin = kind == 0
lidZ = J0['l-upperlid'][2]
ex = np.abs(x) - J0['l-eye'][0]
lips = skin & ((fld['lipU'] > .5) | (fld['lipL'] > .5)) & (z > 1.2)
kind[lips] = 1
from scipy.spatial import cKDTree
eyeball = np.where(kind == 2)[0]
if len(eyeball):
    de, je = cKDTree(Pn[eyeball]).query(Pn, 1)
    ecy = np.where(x > 0, J0['l-eye'][1], J0['r-eye'][1])
    kind[skin & ~lips & (de < .06) & (y > ecy + .01)] = 5          # upper lid margin
    kind[skin & ~lips & (de < .035) & (y <= ecy + .01)] = 6         # lower lid margin
neckY = 6.2 + np.clip(np.abs(x) - .15, 0, None) * .55 - np.clip(1.3 - z, 0, None) * .05   # under-jaw line
area = np.full(len(Pn), 15, np.uint8)
front = skin & (Nn[:, 2] > -.15) & (z > .2)
area[front & (y < eyeY + .1) & (y > neckY)] = 0                             # cheeks, temples, smile lines
area[skin & (y <= neckY) & (z > -.4)] = 0                                   # neck
area[skin & (fld['jaw'] > .3) & (y < 6.56) & (y > neckY - .18)] = 4        # chin and jaw, incl. under the chin
area[skin & (y > 6.1) & (y < 6.5) & (z > .35) & (y > neckY - .1) & (Nn[:, 1] < .5) & (np.abs(x) > .25) & (np.abs(x) < .8) & (y < 6.25 + (np.abs(x) - .25) * .5)] = 4  # jawline to the angle
area[skin & (y > eyeY + .12) & (y < eyeY + 1.0) & (Nn[:, 2] > .3) & (np.abs(x) < .72)] = 1   # forehead and brows
eyes = (((ex / .29) ** 2 + ((y - eyeY - .01) / .16) ** 2) < 1) & (z > lidZ - .2)
area[eyes | (kind == 2)] = 2
nose_w = np.interp(y, [6.72, 6.82, 7.0, 7.2, 7.32], [.12, .19, .15, .1, .085])
nose = skin & (np.abs(x) < nose_w) & (y > 6.74) & (y < 7.33) & (z > lidZ - .12) & ~lips
area[nose] = 3
area[lips | (kind == 3) | (kind == 4)] = 15
names = [(0, 'facelift'), (1, 'brows'), (2, 'eyes'), (3, 'nose'), (4, 'chin'), (15, 'none')]
print('area counts', {k: int((area == i).sum()) for i, k in names})
print('kind counts', np.bincount(kind, minlength=6).tolist())

# ---------------- write ----------------
def pack(Pt, c, s):
    q = np.clip((Pt - c) / s, -1, 1) * .5 + .5
    qx = np.round(q[:, 0] * 2047).astype(np.uint32); qy = np.round(q[:, 1] * 2047).astype(np.uint32); qz = np.round(q[:, 2] * 1023).astype(np.uint32)
    return (qx | (qy << 11) | (qz << 22)).astype('<u4')
def octa(Nt):
    n = Nt / np.abs(Nt).sum(1, keepdims=True)
    o = n[:, :2].copy(); neg = n[:, 2] < 0
    sx = np.where(n[neg, 0] >= 0, 1., -1.); sy = np.where(n[neg, 1] >= 0, 1., -1.)
    o[neg, 0] = (1 - np.abs(n[neg, 1])) * sx; o[neg, 1] = (1 - np.abs(n[neg, 0])) * sy
    return np.clip(np.round((o * .5 + .5) * 255), 0, 255).astype(np.uint8)
def cut_for(V):
    band = (np.abs(V0[:, 1] - CUT_Y) < .08) & headish
    return float(CUT_Y + (V[band, 1] - V0[band, 1]).mean())
cutF, cutM = cut_for(VF), cut_for(VM)
allP = np.concatenate([Pf, Pm])
c = (allP.max(0) + allP.min(0)) / 2
s = (allP.max(0) - allP.min(0)) / 2 * 1.0005
hdr = struct.pack('<I8f', TARGET_N, *c, *s, cutF, cutM)
blob = hdr + pack(Pf, c, s).tobytes() + pack(Pm, c, s).tobytes() + octa(Nf).tobytes() + octa(Nm).tobytes() + (area | (kind << 4)).astype(np.uint8).tobytes() + np.round(ao * 255).astype(np.uint8).tobytes()
open(os.path.join(OUT, 'heads.bin'), 'wb').write(blob)
print('heads.bin', len(blob), 'bytes,', TARGET_N, 'points, cut', round(cutF, 3), round(cutM, 3))
if DEBUG:
    # dense, unweighted sample of the subdivided surface for clay previews
    K = 500000; pk = rng.integers(0, len(Q), K); uu = rng.random(K); vv = rng.random(K)
    def atd(V):
        a, b, c_, d = (V[Q[pk, k]] for k in range(4))
        return a * ((1 - uu) * (1 - vv))[:, None] + b * (uu * (1 - vv))[:, None] + c_ * (uu * vv)[:, None] + d * ((1 - uu) * vv)[:, None]
    np.savez(os.path.join(DEBUG, 'heads_dbg.npz'), Pf=Pf, Pm=Pm, Pn=Pn, Nf=Nf, Nm=Nm, area=area, kind=kind, ao=ao,
             Df=atd(P['f']), Dm=atd(P['m']), DNf=unit(atd(NF)), DNm=unit(atd(NM)))
