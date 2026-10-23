"""Usage: MH_DATA=<makehuman>/makehuman/data python3 build_implants.py <out dir>

Build the two meshes the implant viewers draw, from the MakeHuman hm08 base mesh (CC0),
with the same female and male morphs as the Body Map (../../bodymap/build/morphs.py).

torso.bin  A dress-form torso: the female body from the upper thighs to the middle of the neck,
           arms taken off at the shoulder, openings closed with flat caps, one Catmull-Clark step.
           Carries the morphs the visitor sets (body weight, current breast size, firmness) as
           deltas, and per-vertex fields the breast viewer needs (breast weight, fold weight).
face.bin   Head and neck, female and male, one Catmull-Clark step, inside of the mouth and
           nostrils dropped, lips closed, plus landmark vertices for the chin, forehead and nose.

File layout (little endian): Uint32 length of a JSON header, the JSON (utf-8, padded to 4 bytes),
then the binary sections at the offsets the header lists (offsets count from the end of the header).
Positions are Int16, value = q / 32767 * s + c, in MakeHuman decimetres, figure facing +Z, Y up.
"""
import sys, os, json, struct, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'bodymap', 'build'))
from mhload import load_obj, apply, joints as mh_joints, D
from morphs import FEMALE, MALE
from headshapes import HEAD_FEMALE, male_fit
from meshlib import cc_operator, quads_to_tris, vertex_normals, visibility, surface_samples, compact, unit

OUT = sys.argv[1]
rng = np.random.default_rng(7)
V0, F, G = load_obj()
J0 = mh_joints(V0, F, G)
nv0 = len(V0)
W = json.load(open(D + '/rigs/default_weights.mhw'))['weights']
best = np.zeros(nv0); bone = np.array([''] * nv0, dtype=object)
for b, lst in W.items():
    for i, w in lst:
        if w > best[i]: best[i] = w; bone[i] = b
def field(prefixes):
    f = np.zeros(nv0)
    for b, lst in W.items():
        if b.startswith(prefixes):
            for i, w in lst: f[i] = max(f[i], w)
    return f

def morph(lst, V=None):
    V = (V0 if V is None else V).copy()
    for t, w in lst: apply(V, t, w)
    return V
def delta(name):
    d = np.zeros_like(V0); apply(d, name, 1.0); return d

class Pack:
    """Collects binary sections and their header entries."""
    def __init__(self): self.parts = []; self.size = 0; self.h = {}
    def add(self, key, arr, **meta):
        b = arr.tobytes(); pad = (-len(b)) % 4
        self.h[key] = dict(off=self.size, n=int(arr.size), type=arr.dtype.str, **meta)
        self.parts.append(b + b'\0' * pad); self.size += len(b) + pad
    def write(self, path, header):
        header = dict(header, sections=self.h)
        js = json.dumps(header, separators=(',', ':')).encode()
        js += b' ' * ((-len(js)) % 4)
        blob = struct.pack('<I', len(js)) + js + b''.join(self.parts)
        open(path, 'wb').write(blob)
        return len(blob)

def qpos(P, c, s): return np.round((P - c) / s * 32767).astype('<i2')

def boundary_loops(T):
    e = np.concatenate([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]])
    key = np.sort(e, 1)
    u, inv, cnt = np.unique(key, axis=0, return_inverse=True, return_counts=True)
    be = e[cnt[inv.ravel()] == 1]          # directed boundary edges, in triangle winding
    nxt = {int(a): int(b) for a, b in be}
    loops, seen = [], set()
    for a in nxt:
        if a in seen: continue
        loop = [a]; seen.add(a); b = nxt[a]
        while b != a and b not in seen and b in nxt: loop.append(b); seen.add(b); b = nxt[b]
        loops.append(loop)
    return loops

VF = morph(FEMALE)
PART = os.environ.get('PART', 'all')
ARM_CUT = float(os.environ.get('ARM_CUT', .28))
# =====================================================================
# torso
# =====================================================================
def build_torso():
    # arms end in short stumps, cut square to the upper arm a little below the shoulder, like a bust form
    ARM = ('upperarm', 'lowerarm', 'wrist', 'finger', 'metacarpal')
    arm = np.array([b.startswith(ARM) for b in bone])
    armAx = {}
    for sd in ('l', 'r'):
        S0, E0 = J0[sd + '-shoulder'], J0[sd + '-elbow']
        armAx[sd] = (S0, unit(E0 - S0), np.linalg.norm(E0 - S0))
    def beyond(v):
        sd = 'l' if V0[v, 0] > 0 else 'r'
        S0, a, ln = armAx[sd]
        return (V0[v] - S0) @ a > ln * ARM_CUT
    yLow = J0['l-upper-leg'][1] + .3
    yHigh = J0['neck'][1] + .12
    HEADB = ('head', 'jaw', 'eye', 'oculi', 'orbicularis', 'oris', 'risorius', 'levator', 'special', 'tongue')
    headb = np.array([b.startswith(HEADB) for b in bone])
    quads = [f for f, g in zip(F, G) if g == 'body' and len(f) == 4 and not headb[f].any()
             and not any(arm[v] and beyond(v) for v in f) and V0[f, 1].min() > yLow and V0[f, 1].max() < yHigh]
    quads = np.array(quads)
    used = np.unique(quads); remap = -np.ones(nv0, int); remap[used] = np.arange(len(used))
    Q = remap[quads]

    BR = 'breast/female-young-averagemuscle-averageweight-'
    MORPHS = {
        'weightUp':   delta('macrodetails/universal-female-young-averagemuscle-maxweight.target'),
        'weightDown': delta('macrodetails/universal-female-young-averagemuscle-minweight.target'),
        'cupUp':      delta(BR + 'maxcup-averagefirmness.target'),
        'cupDown':    delta(BR + 'mincup-averagefirmness.target'),
        'firmDown':   delta(BR + 'averagecup-minfirmness.target'),
        'firmUp':     delta(BR + 'averagecup-maxfirmness.target'),
    }
    SH = {'base': VF, **MORPHS}
    SH = {k: v[used] for k, v in SH.items()}
    breastw = field('breast')[used]

    S, Q = cc_operator(Q, len(used))
    SH = {k: S @ v for k, v in SH.items()}
    breastw = S @ breastw
    T = quads_to_tris(Q)

    # arm and leg openings leave ragged edges: smooth each boundary loop a little (the same linear step on
    # every shape, so the morphs stay consistent), then close it with a fan around its centre
    loops = boundary_loops(T)
    def loop_plane(L):
        c = SH['base'][L].mean(0)
        if abs(c[0]) > .9:                                   # an arm stump: square to the upper arm
            return c, armAx['l' if c[0] > 0 else 'r'][1]
        return c, np.array([0, 1., 0])
    for loop in loops:
        L = np.array(loop)
        for _ in range(8):
            for k in SH: SH[k][L] = .5 * SH[k][L] + .25 * (SH[k][np.roll(L, 1)] + SH[k][np.roll(L, -1)])
        # each opening lies in one plane, so the cap is flat and the edge is clean
        c, n = loop_plane(L)
        for k in SH:
            d = SH[k][L] @ n
            target = (c @ n) if k == 'base' else d.mean()
            SH[k][L] -= np.outer(d - target, n)
    cap = []
    nv = len(SH['base'])
    kind = np.zeros(nv, np.uint8)
    newT = [T]
    for loop in loops:
        L = np.array(loop); ci = nv + len(cap)
        cap.append(L)
        # the loop runs with the mesh winding, so the fan winds the other way to face out
        newT.append(np.stack([np.roll(L, -1), L, np.full(len(L), ci)], 1))
    for k in SH:
        SH[k] = np.concatenate([SH[k], np.stack([SH[k][L].mean(0) for L in cap])])
    breastw = np.concatenate([breastw, np.zeros(len(cap))])
    kind = np.concatenate([kind, np.ones(len(cap), np.uint8)])
    T = np.concatenate(newT)
    # cap rims share their vertices with the skin, so mark cap triangles by their centre vertex only;
    # the viewer gives caps flat shading through a separate index range
    capStart = len(T) - sum(len(L) for L in cap)

    P = SH['base']
    N = len(P)
    Nn = vertex_normals(P, T[:capStart])

    # nipples: the most forward vertex on each breast
    nip = []
    for side in (1, -1):
        m = (breastw > .5) & (np.sign(P[:, 0]) == side)
        idx = np.where(m)[0]; nip.append(int(idx[np.argmax(P[idx, 2])]))
    # breast weight from the cup delta, so the fold follows the real breast mound
    cupMag = np.linalg.norm(SH['cupUp'], axis=1)
    bw = np.clip(cupMag / np.percentile(cupMag[breastw > .5], 90), 0, 1)
    # the fold under each breast: lowest point of the breast mound at each height band across x
    fold = np.ones(N)
    foldY = []
    for k, side in enumerate((1, -1)):
        x0 = P[nip[k], 0]
        mound = (bw > .35) & (np.sign(P[:, 0]) == side) & (P[:, 2] > P[nip[k], 2] - 1.2)
        xs = P[mound, 0]; ys = P[mound, 1]
        for i in np.where((np.sign(P[:, 0]) == side) & (Nn[:, 2] > -.2))[0] if True else []:
            sel = np.abs(xs - P[i, 0]) < .12
            if not sel.any(): continue
            fy = ys[sel].min()
            t = np.clip((P[i, 1] - (fy - .28)) / .32, 0, 1)
            fold[i] = max(t * t * (3 - 2 * t), bw[i])
        sel = np.abs(xs - x0) < .12
        foldY.append(float(ys[sel].min() - P[nip[k], 1]))
    fold[N - len(cap):] = 0

    # implant axis: the chest-wall normal around each nipple, read off the smallest-breast shape
    Pmin = P + SH['cupDown']
    Nmin = vertex_normals(Pmin, T[:capStart])
    axes = []
    for k in range(2):
        d = np.linalg.norm((Pmin - Pmin[nip[k]])[:, :2], axis=1)
        m = (d < .55) & (Nmin[:, 2] > .3)
        axes.append(unit(Nmin[m].mean(0)).round(4).tolist())

    allP = np.concatenate([P, P + SH['weightUp'], P + SH['weightDown'], P + SH['cupUp']])
    c = (allP.max(0) + allP.min(0)) / 2; s = float(np.abs(allP - c).max() * 1.0001)
    pk = Pack()
    pk.add('pos', qpos(P, c, s))
    for k in MORPHS:
        d = SH[k]; mag = np.linalg.norm(d, axis=1)
        idx = np.where(mag > 1e-4)[0].astype('<u2')
        ds = float(np.abs(d[idx]).max() * 1.0001) if len(idx) else 1.0
        pk.add(k + '.i', idx)
        pk.add(k + '.d', np.round(d[idx] / ds * 32767).astype('<i2'), scale=ds)
    assert N < 65536
    pk.add('tri', T.astype('<u2'))
    pk.add('breast', np.round(bw * 255).astype(np.uint8))
    pk.add('fold', np.round(fold * 255).astype(np.uint8))
    yTop, yBot = float(P[:, 1].max()), float(P[:, 1].min())
    size = pk.write(os.path.join(OUT, 'torso.bin'), dict(
        N=N, T=len(T), capStart=int(capStart), c=c.round(6).tolist(), s=s,
        nipples=nip, axes=axes, foldBelowNipple=[round(f, 4) for f in foldY],
        # the whole base figure, so the viewer can scale it to the visitor's height
        figureHeight=float(VF[:, 1].max() - VF[:, 1].min()), figureTop=float(VF[:, 1].max()),
        yTop=yTop, yBot=yBot))
    print('torso.bin', size, 'bytes,', N, 'vertices,', len(T), 'triangles, caps', len(cap), 'nipples', nip, 'axes', axes, 'fold', foldY)

# =====================================================================
# head
# =====================================================================
def build_face():
    HEADB = ('head', 'jaw', 'eye', 'oculi', 'orbicularis', 'oris', 'risorius', 'levator', 'special', 'tongue')
    headish = np.array([b.startswith(HEADB) or b.startswith('neck') for b in bone])
    FIELDS = {'lipU': field(('oris03', 'oris05')), 'lipL': field(('oris01', 'oris07'))}
    CUT_Y = J0['neck'][1] + .05
    quads, part = [], []
    for f, g in zip(F, G):
        if len(f) != 4: continue
        if g == 'body':
            if headish[f[0]] and V0[f, 1].min() > CUT_Y: quads.append(f); part.append(0)
        elif g in ('helper-l-eye', 'helper-r-eye'):
            cc = V0[f].mean(0); ec = J0['l-eye'] if cc[0] > 0 else J0['r-eye']
            d = (cc - ec) / np.linalg.norm(cc - ec)
            if d[2] > .5: quads.append(f); part.append(2)
    quads = np.array(quads); part = np.array(part)
    used = np.unique(quads); remap = -np.ones(nv0, int); remap[used] = np.arange(len(used))
    Q = remap[quads]
    VM = morph(MALE)
    VFh = morph(HEAD_FEMALE)            # the face viewers' woman (headshapes.py); the torso keeps VF
    SHh = np.stack([V0[used], VFh[used], VM[used]])
    FL = np.stack([FIELDS[k][used] for k in FIELDS], 1)
    EYE = np.zeros(len(used)); EYE[np.unique(Q[part == 2])] = 1
    S, Q = cc_operator(Q, len(used))
    SHh = np.stack([S @ v for v in SHh]); FL = S @ FL; EYE = S @ EYE
    T = quads_to_tris(Q)
    Pz = surface_samples(SHh[0], T, 400000, rng)
    tc = SHh[0][T].mean(1)
    tn = unit(np.cross(SHh[0][T[:, 1]] - SHh[0][T[:, 0]], SHh[0][T[:, 2]] - SHh[0][T[:, 0]]))
    tvis, _ = visibility(tc, tn, Pz)
    T = T[tvis]
    T, keep, FL, EYE = compact(T, FL, EYE)
    SHh = SHh[:, keep]
    Pn = SHh[0]
    # close the mouth: weld the lower lip's inner edge onto the upper lip's
    e = np.sort(np.concatenate([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]]), 1)
    u, cnt = np.unique(e, axis=0, return_counts=True)
    bv = np.unique(u[cnt == 1])
    mouth = bv[(np.maximum(FL[bv, 0], FL[bv, 1]) > .3) & (Pn[bv, 2] > 1.2) & (np.abs(Pn[bv, 0]) < .4)]
    upper = mouth[FL[mouth, 0] >= FL[mouth, 1]]; lower = mouth[FL[mouth, 0] < FL[mouth, 1]]
    weld = np.arange(len(Pn))
    for v in lower:
        d = np.linalg.norm(Pn[upper] - Pn[v], axis=1)
        if len(d) and d.min() < .08: weld[v] = upper[np.argmin(d)]
    T = weld[T]
    T = T[(T[:, 0] != T[:, 1]) & (T[:, 1] != T[:, 2]) & (T[:, 2] != T[:, 0])]
    T, keep, FL, EYE = compact(T, FL, EYE)
    SHh = SHh[:, keep]
    Pn, Pf, Pm = SHh
    # the neck opening: smooth its edge and lay it level
    for loop in boundary_loops(T):
        L = np.array(loop)
        if len(L) < 40 or Pn[L, 1].mean() > CUT_Y + .4: continue
        for _ in range(10):
            for k in range(3): SHh[k][L] = .5 * SHh[k][L] + .25 * (SHh[k][np.roll(L, 1)] + SHh[k][np.roll(L, -1)])
        for k in range(3): SHh[k][L, 1] = SHh[k][L, 1].mean()
    Pn, Pf, Pm = SHh
    Nh = len(Pn)
    hkind = np.zeros(Nh, np.uint8)
    hkind[EYE > .5] = 2
    lips = (np.maximum(FL[:, 0], FL[:, 1]) > .5) & (Pn[:, 2] > 1.2)
    hkind[lips & (hkind == 0)] = 1
    hkind[(Pn[:, 1] < CUT_Y + .1) & (hkind == 0)] = 3
    if os.environ.get('FACE_DUMP'):
        # the cleaned head, for fitting onto a scan (fit_scan/)
        np.savez_compressed(os.environ['FACE_DUMP'], Pn=Pn, Pf=Pf, Pm=Pm, T=T, kind=hkind, FL=FL, cutY=CUT_Y)
    MF = male_fit()
    if MF is not None:
        assert MF.shape == Pm.shape, 'male_head_fit.npz no longer matches the face mesh: refit it (fit_scan/)'
        Pm = MF.copy()
        for loop in boundary_loops(T):              # level the neck opening again
            L = np.array(loop)
            if len(L) < 40 or Pn[L, 1].mean() > CUT_Y + .4: continue
            for _ in range(10): Pm[L] = .5 * Pm[L] + .25 * (Pm[np.roll(L, 1)] + Pm[np.roll(L, -1)])
            Pm[L, 1] = Pm[L, 1].mean()

    def landmarks(P):
        """Midline profile points: glabella, nasion, nose tip, subnasale, chin point, chin bottom, top of forehead."""
        eyeY = P[hkind == 2, 1].mean()
        mid = np.where((np.abs(P[:, 0]) < .03) & (P[:, 2] > .6) & (hkind == 0))[0]
        y, z = P[mid, 1], P[mid, 2]
        def pick(m, f): i = np.where(m)[0]; return int(mid[i[f(z[i])]])
        tip = pick((y > eyeY - .75) & (y < eyeY - .2), np.argmax)
        ty = P[tip, 1]
        nasion = pick((y > eyeY - .15) & (y < eyeY + .25), np.argmin)
        glab = pick((y > P[nasion, 1] + .05) & (y < P[nasion, 1] + .4), np.argmax)
        sub = pick((y < ty - .03) & (y > ty - .3), np.argmin)
        # chin: lowest third below the mouth seam
        mouthY = float(np.median(P[upper, 1])) if len(upper) else ty - .6
        pog = pick((y < mouthY - .2) & (y > mouthY - .75), np.argmax)
        labio = pick((y < mouthY - .05) & (y > P[pog, 1]), np.argmin)
        men = pick((y < P[pog, 1]) & (y > P[pog, 1] - .5), lambda zz: np.argmin(np.abs(zz - (P[pog, 2] - .35))))
        top = pick((y > P[glab, 1] + .5) & (y < P[glab, 1] + 1.0), lambda zz: np.argmin(np.abs(zz - (P[glab, 2] - .25))))
        return dict(glabella=glab, nasion=nasion, tip=tip, subnasale=sub, labiomental=labio, pogonion=pog, menton=men, foreheadTop=top)
    if os.environ.get('PROFILE'):
        mid = np.where(np.abs(Pf[:, 0]) < .03)[0]
        for i in mid[np.argsort(Pf[mid, 1])]: print(round(Pf[i, 1], 3), round(Pf[i, 2], 3), hkind[i])
        print('eyeY', J0['l-eye'][1]); return
    LMf, LMm = landmarks(Pf), landmarks(Pm)

    allP = np.concatenate([Pf, Pm]); c = (allP.max(0) + allP.min(0)) / 2; s = float(np.abs(allP - c).max() * 1.0001)
    Th = T.astype('<u2'); assert Nh < 65536
    pk = Pack()
    pk.add('female', qpos(Pf, c, s)); pk.add('male', qpos(Pm, c, s))
    pk.add('tri', Th); pk.add('kind', hkind)
    size = pk.write(os.path.join(OUT, 'face.bin'), dict(
        N=Nh, T=len(T), c=c.round(6).tolist(), s=s, landmarks=dict(female=LMf, male=LMm),
        eyeY=dict(female=float(Pf[hkind == 2, 1].mean()), male=float(Pm[hkind == 2, 1].mean())), cutY=float(CUT_Y)))
    el = np.linalg.norm(Pf[T[:, 0]] - Pf[T[:, 1]], axis=1)
    nose = np.linalg.norm(Pf[T[:, 0]] - Pf[LMf['tip']], axis=1) < .4
    print('face.bin', size, 'bytes,', Nh, 'vertices,', len(T), 'triangles; edge near nose', round(float(np.median(el[nose])) * 100, 1), 'mm')
    print('landmarks female', {k: Pf[v].round(3).tolist() for k, v in LMf.items()})

if PART in ('all', 'torso'): build_torso()
if PART in ('all', 'face'): build_face()
