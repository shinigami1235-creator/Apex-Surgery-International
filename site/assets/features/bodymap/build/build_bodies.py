"""Usage: MH_DATA=<makehuman>/makehuman/data python3 build_bodies.py <out dir>

Build the Body Map point clouds from the MakeHuman hm08 base mesh (CC0).

Output per body: <name>.bin
  Uint32  N
  Float32 x 12: cx, cy, cz, s (pos = int16/32767*s + c),
                eyeMid x,y,z, chinY, crownY, faceFrontZ, faceHalfW, reserved
  Int16   pos[N*3]
  Int8    nrm[N*3]   (n * 127)
  Uint8   reg[N]
"""
import sys, json, struct, numpy as np
sys.path.insert(0, '.')
from mhload import load_obj, apply, D

OUT = sys.argv[1]
rng = np.random.default_rng(7)

R = dict(other=0, head=1, neck=2, breast=3, abdomen=4, arms=5, waistback=6, hips=7, thighs=8, calves=9)
TARGET_N = 12800

V0, F, G = load_obj()
W = json.load(open(D + '/rigs/default_weights.mhw'))['weights']
nv = len(V0)
# dominant bone per vertex
best = np.zeros(nv); bone = np.array([''] * nv, dtype=object)
breastw = np.zeros(nv)
for b, lst in W.items():
    for i, w in lst:
        if w > best[i]: best[i] = w; bone[i] = b
        if b.startswith('breast'): breastw[i] = max(breastw[i], w)

def coarse(b):
    if not b: return 'other'
    if b.startswith(('head', 'jaw', 'eye', 'oculi', 'orbicularis', 'oris', 'risorius', 'levator', 'special', 'tongue')): return 'head'
    if b.startswith('neck'): return 'neck'
    if b.startswith('breast'): return 'breast'
    if b.startswith(('upperarm', 'shoulder')): return 'upperarm' if b.startswith('upperarm') else 'shoulder'
    if b.startswith('lowerarm'): return 'forearm'
    if b.startswith(('wrist', 'metacarpal', 'finger')): return 'hand'
    if b.startswith(('foot', 'toe')): return 'foot'
    if b.startswith('upperleg'): return 'thigh'
    if b.startswith('lowerleg'): return 'calf'
    if b.startswith('pelvis'): return 'pelvis'
    if b.startswith(('spine', 'clavicle', 'root')): return 'torso'
    return 'other'
CO = np.array([coarse(b) for b in bone], dtype=object)

body_faces = [f for f, g in zip(F, G) if g == 'body']
tris = []
for f in body_faces:
    tris.append([f[0], f[1], f[2]])
    if len(f) == 4: tris.append([f[0], f[2], f[3]])
tris = np.array(tris)

def joints(V):
    J = {}
    for f, g in zip(F, G):
        if g and g.startswith('joint-'): J.setdefault(g[6:], set()).update(f)
    return {k: V[list(v)].mean(0) for k, v in J.items()}

def morph(morphs):
    V = V0.copy()
    for t, w in morphs: apply(V, t, w)
    return V

def normals(V):
    N = np.zeros_like(V)
    a, b, c = V[tris[:, 0]], V[tris[:, 1]], V[tris[:, 2]]
    fn = np.cross(b - a, c - a)
    for k in range(3): np.add.at(N, tris[:, k], fn)
    N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-9
    return N, np.linalg.norm(fn, axis=1) * .5

def label(V):
    """Region per triangle, from dominant rig bone plus geometric rules on the neutral mesh."""
    J = joints(V)
    N, _ = normals(V)
    a, b, c = V[tris[:, 0]], V[tris[:, 1]], V[tris[:, 2]]
    cen = (a + b + c) / 3
    co = CO[tris[:, 0]]
    yPel = J['pelvis'][1]; ySp3 = J['spine-3'][1]; ySp2 = J['spine-2'][1]; ySp1 = J['spine-1'][1]
    yLeg = J['l-upper-leg'][1]
    nz = (N[tris[:, 0]] + N[tris[:, 1]] + N[tris[:, 2]])[:, 2] / 3
    reg = np.zeros(len(tris), np.uint8)
    x, y, z = cen[:, 0], cen[:, 1], cen[:, 2]
    spineZ = np.interp(y, [yPel, ySp3, ySp2, ySp1], [J['pelvis'][2], J['spine-3'][2], J['spine-2'][2], J['spine-1'][2]])
    front = z > spineZ + .05
    reg[co == 'head'] = R['head']
    reg[co == 'neck'] = R['neck']
    reg[co == 'upperarm'] = R['arms']
    reg[co == 'thigh'] = R['thighs']
    reg[co == 'calf'] = R['calves']
    bw = breastw[tris].max(1)
    torso = np.isin(co, ['torso', 'breast', 'pelvis'])
    reg[(bw > .1) & front & (y > ySp2)] = R['breast']
    absel = torso & front & (y < ySp2 + .15) & (y > yLeg + .35) & (np.abs(x) < 1.45) & (reg == 0)
    reg[absel] = R['abdomen']
    wb = torso & (reg == 0) & (y > yPel + .1) & (y < ySp1 - .2) & (~front | (np.abs(x) >= 1.45))
    reg[wb] = R['waistback']
    hb = (np.isin(co, ['pelvis', 'torso', 'thigh'])) & (y <= yPel + .1) & (y > yLeg - 1.3) & ((z < J['l-upper-leg'][2] + .05) | (np.abs(x) > 1.55))
    reg[hb & (reg != R['abdomen'])] = R['hips']
    dens = np.ones(len(tris))
    dens[co == 'hand'] = .32
    dens[co == 'foot'] = .45
    dens[co == 'forearm'] = .85
    head = reg == R['head']
    dens[head] = 2.2
    dens[head & (nz > .25)] = 3.6
    dens[reg == R['neck']] = 1.4
    return reg, dens

def write(name, V, pick, bary, RG):
    J = joints(V)
    N, _ = normals(V)
    T = tris[pick]; u, v, wq = bary
    P = V[T[:, 0]] * u[:, None] + V[T[:, 1]] * v[:, None] + V[T[:, 2]] * wq[:, None]
    Nn = N[T[:, 0]] * u[:, None] + N[T[:, 1]] * v[:, None] + N[T[:, 2]] * wq[:, None]
    Nn /= np.linalg.norm(Nn, axis=1, keepdims=True) + 1e-9
    RG = RG.copy()
    if name == 'male': RG[RG == R['breast']] = R['other']
    eyes = (J['l-eye'] + J['r-eye']) / 2
    hv = P[RG == R['head']]
    crown = hv[:, 1].max()
    faceFront = hv[:, 2].max()
    chin = hv[(np.abs(hv[:, 0]) < .3) & (hv[:, 2] > eyes[2] - .9)][:, 1].min()
    faceHalfW = np.percentile(np.abs(hv[(np.abs(hv[:, 1] - eyes[1]) < .3)][:, 0]), 96)
    c = (P.max(0) + P.min(0)) / 2
    s = np.abs(P - c).max()
    Q = np.round((P - c) / s * 32767).astype(np.int16)
    NQ = np.round(Nn * 127).astype(np.int8)
    hdr = struct.pack('<I12f', len(P), *c, s, *eyes, chin, crown, faceFront, faceHalfW, 0)
    blob = hdr + Q.tobytes() + NQ.tobytes() + RG.astype(np.uint8).tobytes()
    open(f'{OUT}/{name}.bin', 'wb').write(blob)
    counts = {k: int((RG == v).sum()) for k, v in R.items()}
    print(name, len(P), 'bytes', len(blob), 'height', round(P[:, 1].max() - P[:, 1].min(), 2), counts)
    print('  eyes', eyes.round(2), 'chin', round(chin, 2), 'crown', round(crown, 2), 'front', round(faceFront, 2), 'halfW', round(faceHalfW, 2))

def build_all(morphF, morphM):
    VF, VM = morph(morphF), morph(morphM)
    reg, dens = label(V0)
    _, aF = normals(VF); _, aM = normals(VM)
    w = (aF + aM) * .5 * dens
    cdf = np.cumsum(w); cdf /= cdf[-1]
    pick = np.searchsorted(cdf, (np.arange(TARGET_N) + rng.random(TARGET_N)) / TARGET_N)
    rng.shuffle(pick)
    r1 = np.sqrt(rng.random(TARGET_N)); r2 = rng.random(TARGET_N)
    bary = (1 - r1, r1 * (1 - r2), r1 * r2)
    RG = reg[pick]
    write('female', VF, pick, bary, RG)
    write('male', VM, pick, bary, RG)

M = 'macrodetails/'
mix = [('african', .2), ('asian', .5), ('caucasian', .3)]
female = [(M + f'{r}-female-young.target', w) for r, w in mix] + [
    (M + 'proportions/female-young-averagemuscle-averageweight-idealproportions.target', .6),
    (M + 'universal-female-young-averagemuscle-minweight.target', .15)]
male = [(M + f'{r}-male-young.target', w) for r, w in mix] + [
    (M + 'proportions/male-young-averagemuscle-averageweight-idealproportions.target', .6),
    (M + 'universal-male-young-maxmuscle-averageweight.target', .3),
]
build_all(female, male)
